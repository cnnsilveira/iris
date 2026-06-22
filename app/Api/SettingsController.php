<?php
/**
 * Settings REST API controller.
 *
 * Handles fetching and saving settings option configurations.
 *
 * @package Iris
 */

namespace Iris\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles settings REST API routes.
 *
 * @since 0.2.0
 */
class SettingsController {

	/**
	 * REST namespace for all Iris endpoints.
	 *
	 * @since 0.2.0
	 * @var string
	 */
	const ROUTE_NAMESPACE = 'iris/v1';

	/**
	 * Register the rest_api_init hook.
	 *
	 * @since 0.2.0
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register settings REST routes.
	 *
	 * @since 0.2.0
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/settings',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( __CLASS__, 'handle_get_settings' ),
					'permission_callback' => array( __CLASS__, 'check_permissions' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( __CLASS__, 'handle_save_settings' ),
					'permission_callback' => array( __CLASS__, 'check_permissions' ),
					'args'                => self::get_settings_args(),
				),
			)
		);
	}

	/**
	 * Permission callback for Settings endpoints.
	 *
	 * @since 0.2.0
	 * @return bool|WP_Error True when the user has manage_options.
	 */
	public static function check_permissions() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'iris_forbidden',
				__( 'You do not have permission to access this resource.', 'iris' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Return the current plugin settings.
	 *
	 * @since 0.2.0
	 * @return WP_REST_Response The settings payload.
	 */
	public static function handle_get_settings() {
		$settings = get_option( 'iris_settings', array() );

		$defaults = array(
			'model'           => '',
			'temperature'     => 0.7,
			'max_tokens'      => 1024,
			'system_prompt'   => '',
			'context_sharing' => false,
		);

		$settings = wp_parse_args( $settings, $defaults );

		$settings['has_api_key']      = ! empty( self::get_api_key() );
		$settings['has_constant_key'] = defined( 'IRIS_OPENROUTER_API_KEY' ) && IRIS_OPENROUTER_API_KEY;

		return new WP_REST_Response( $settings, 200 );
	}

	/**
	 * Save plugin settings.
	 *
	 * @since 0.2.0
	 *
	 * @param WP_REST_Request $request The incoming request.
	 * @return WP_REST_Response Confirmation payload.
	 */
	public static function handle_save_settings( WP_REST_Request $request ) {
		// Handle the API key separately (own option, own hooks).
		$api_key = $request->get_param( 'api_key' );
		if ( null !== $api_key && ! ( defined( 'IRIS_OPENROUTER_API_KEY' ) && IRIS_OPENROUTER_API_KEY ) ) {
			update_option( 'iris_api_key', sanitize_text_field( $api_key ) );
		}

		$current  = get_option( 'iris_settings', array() );
		$settings = array(
			'model'           => sanitize_text_field( $request->get_param( 'model' ) ?? $current['model'] ?? '' ),
			'temperature'     => self::clamp_float( (float) ( $request->get_param( 'temperature' ) ?? $current['temperature'] ?? 0.7 ), 0.0, 2.0 ),
			'max_tokens'      => absint( $request->get_param( 'max_tokens' ) ?? $current['max_tokens'] ?? 1024 ),
			'system_prompt'   => sanitize_textarea_field( $request->get_param( 'system_prompt' ) ?? $current['system_prompt'] ?? '' ),
			'context_sharing' => (bool) ( $request->get_param( 'context_sharing' ) ?? $current['context_sharing'] ?? false ),
		);

		update_option( 'iris_settings', $settings );

		return new WP_REST_Response(
			array( 'message' => __( 'Settings saved.', 'iris' ) ),
			200
		);
	}

	/**
	 * Argument schema for the settings save endpoint.
	 *
	 * @since 0.2.0
	 * @return array Validated argument definitions.
	 */
	private static function get_settings_args() {
		return array(
			'api_key'         => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'model'           => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'temperature'     => array(
				'type' => 'number',
			),
			'max_tokens'      => array(
				'type' => 'integer',
			),
			'system_prompt'   => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
			),
			'context_sharing' => array(
				'type' => 'boolean',
			),
		);
	}

	/**
	 * Retrieve the active OpenRouter API key.
	 *
	 * @since 0.2.0
	 * @return string The API key, or an empty string.
	 */
	private static function get_api_key() {
		if ( defined( 'IRIS_OPENROUTER_API_KEY' ) && IRIS_OPENROUTER_API_KEY ) {
			return IRIS_OPENROUTER_API_KEY;
		}

		return get_option( 'iris_api_key', '' );
	}

	/**
	 * Clamp a float value between a minimum and maximum.
	 *
	 * @since 0.2.0
	 *
	 * @param float $value The value to clamp.
	 * @param float $min   Minimum allowed value.
	 * @param float $max   Maximum allowed value.
	 * @return float The clamped value.
	 */
	private static function clamp_float( $value, $min, $max ) {
		return max( $min, min( $max, $value ) );
	}
}
