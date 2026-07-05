<?php
/**
 * WP-Cron model synchronization manager.
 *
 * Handles fetching the available model catalogue from the
 * OpenRouter API and caching it as a WordPress option.
 *
 * @package Vitrus
 */

namespace Vitrus\Models;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Manages the cached model list and its background sync schedule.
 *
 * @since v0.1.0
 */
class ModelManager {

	/**
	 * OpenRouter models endpoint.
	 *
	 * @since v0.1.0
	 * @var string
	 */
	const API_URL = 'https://openrouter.ai/api/v1/models';

	/**
	 * Register the WP-Cron callback.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function init() {
		add_action( 'vitrus_sync_models_event', array( __CLASS__, 'sync_models' ) );
	}

	/**
	 * Fetch the model list from OpenRouter and cache it locally.
	 *
	 * Clears the cached list and exits early when the API key is
	 * empty. Respects a 15-minute lockout transient to avoid
	 * hammering the API after a failure.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function sync_models() {
		$api_key = self::get_api_key();

		// No key configured — wipe stale data and bail.
		if ( empty( $api_key ) ) {
			delete_option( 'vitrus_model_list' );
			return;
		}

		// Respect the lockout window after a previous failure.
		if ( get_transient( 'vitrus_model_sync_failed' ) ) {
			return;
		}

		$start_time = microtime( true );

		$response = wp_remote_get(
			self::API_URL,
			array(
				'headers' => array(
					'Authorization' => 'Bearer ' . $api_key,
				),
				'timeout' => 30,
			)
		);

		$duration    = microtime( true ) - $start_time;
		$request_log = array(
			'url'    => self::API_URL,
			'method' => 'GET',
		);

		if ( is_wp_error( $response ) ) {
			$error_message = $response->get_error_message();
			set_transient( 'vitrus_model_sync_failed', 1, 15 * MINUTE_IN_SECONDS );

			\Vitrus\Chat\DebugLogger::log(
				'model_sync',
				$request_log,
				0,
				'',
				$duration,
				$error_message
			);
			return;
		}

		$status_code = wp_remote_retrieve_response_code( $response );
		$body        = wp_remote_retrieve_body( $response );

		if ( 200 !== $status_code ) {
			set_transient( 'vitrus_model_sync_failed', 1, 15 * MINUTE_IN_SECONDS );

			\Vitrus\Chat\DebugLogger::log(
				'model_sync',
				$request_log,
				$status_code,
				$body,
				$duration,
				'HTTP status code: ' . $status_code
			);
			return;
		}

		$data = json_decode( $body, true );

		if ( ! is_array( $data ) || empty( $data['data'] ) ) {
			set_transient( 'vitrus_model_sync_failed', 1, 15 * MINUTE_IN_SECONDS );

			\Vitrus\Chat\DebugLogger::log(
				'model_sync',
				$request_log,
				$status_code,
				$body,
				$duration,
				'Invalid model data returned or JSON decode failed.'
			);
			return;
		}

		// Store the full model array; do not autoload to save memory.
		update_option( 'vitrus_model_list', $data['data'], false );

		\Vitrus\Chat\DebugLogger::log(
			'model_sync',
			$request_log,
			$status_code,
			sprintf( 'Successfully fetched and cached %d models.', count( $data['data'] ) ),
			$duration
		);
	}

	/**
	 * Retrieve the active OpenRouter API key.
	 *
	 * Prefers the compile-time constant defined in wp-config.php
	 * and falls back to the database option.
	 *
	 * @since v0.1.0
	 * @return string The API key, or an empty string if unset.
	 */
	private static function get_api_key() {
		if ( defined( 'VITRUS_OPENROUTER_API_KEY' ) && VITRUS_OPENROUTER_API_KEY ) {
			return VITRUS_OPENROUTER_API_KEY;
		}

		return get_option( 'vitrus_api_key', '' );
	}
}
