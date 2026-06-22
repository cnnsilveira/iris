<?php
/**
 * WP-Cron model synchronization manager.
 *
 * Handles fetching the available model catalogue from the
 * OpenRouter API and caching it as a WordPress option.
 *
 * @package Iris
 */

namespace Iris\Models;

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
		add_action( 'iris_sync_models_event', array( __CLASS__, 'sync_models' ) );
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
			delete_option( 'iris_model_list' );
			return;
		}

		// Respect the lockout window after a previous failure.
		if ( get_transient( 'iris_model_sync_failed' ) ) {
			return;
		}

		$response = wp_remote_get(
			self::API_URL,
			array(
				'headers' => array(
					'Authorization' => 'Bearer ' . $api_key,
				),
				'timeout' => 30,
			)
		);

		if ( is_wp_error( $response ) ) {
			set_transient( 'iris_model_sync_failed', 1, 15 * MINUTE_IN_SECONDS );
			return;
		}

		$status_code = wp_remote_retrieve_response_code( $response );

		if ( 200 !== $status_code ) {
			set_transient( 'iris_model_sync_failed', 1, 15 * MINUTE_IN_SECONDS );
			return;
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( ! is_array( $data ) || empty( $data['data'] ) ) {
			set_transient( 'iris_model_sync_failed', 1, 15 * MINUTE_IN_SECONDS );
			return;
		}

		// Store the full model array; do not autoload to save memory.
		update_option( 'iris_model_list', $data['data'], false );
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
		if ( defined( 'IRIS_OPENROUTER_API_KEY' ) && IRIS_OPENROUTER_API_KEY ) {
			return IRIS_OPENROUTER_API_KEY;
		}

		return get_option( 'iris_api_key', '' );
	}
}
