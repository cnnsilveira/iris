<?php
/**
 * Models REST API controller.
 *
 * Handles fetching, syncing, and caching the available AI model list.
 *
 * @package Iris
 */

namespace Iris\Api;

use WP_REST_Response;
use WP_Error;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles all model REST API routes.
 *
 * @since 0.2.0
 */
class ModelsController {

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
	 * Register model REST routes.
	 *
	 * @since 0.2.0
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/models',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_get_models' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/models/sync',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_sync_models' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
			)
		);

		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/models/mock',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_mock_models' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
			)
		);
	}

	/**
	 * Permission callback for Models endpoints.
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
	 * Return the cached model list.
	 *
	 * @since 0.2.0
	 * @return WP_REST_Response The model catalogue.
	 */
	public static function handle_get_models() {
		$models = get_option( 'iris_model_list', array() );

		return new WP_REST_Response( $models, 200 );
	}

	/**
	 * Trigger a manual model list sync.
	 *
	 * @since 0.2.0
	 * @return WP_REST_Response Confirmation message.
	 */
	public static function handle_sync_models() {
		if ( ! wp_next_scheduled( 'iris_sync_models_event' ) ) {
			wp_schedule_single_event( time() + 5, 'iris_sync_models_event' );
		}

		return new WP_REST_Response(
			array( 'message' => __( 'Model sync scheduled.', 'iris' ) ),
			200
		);
	}

	/**
	 * Return a static model list for frontend development.
	 *
	 * @since 0.2.0
	 * @return WP_REST_Response The mock model catalogue.
	 */
	public static function handle_mock_models() {
		$models = array(
			array(
				'id'             => 'openai/gpt-4o',
				'name'           => 'GPT-4o',
				'context_length' => 128000,
				'pricing'        => array(
					'prompt'     => '0.000005',
					'completion' => '0.000015',
				),
			),
			array(
				'id'             => 'anthropic/claude-sonnet-4',
				'name'           => 'Claude Sonnet 4',
				'context_length' => 200000,
				'pricing'        => array(
					'prompt'     => '0.000003',
					'completion' => '0.000015',
				),
			),
			array(
				'id'             => 'google/gemini-2.5-pro',
				'name'           => 'Gemini 2.5 Pro',
				'context_length' => 1000000,
				'pricing'        => array(
					'prompt'     => '0.0000025',
					'completion' => '0.000015',
				),
			),
			array(
				'id'             => 'meta-llama/llama-4-maverick',
				'name'           => 'Llama 4 Maverick',
				'context_length' => 1000000,
				'pricing'        => array(
					'prompt'     => '0',
					'completion' => '0',
				),
			),
			array(
				'id'             => 'deepseek/deepseek-r1-0528',
				'name'           => 'DeepSeek R1 0528',
				'context_length' => 163840,
				'pricing'        => array(
					'prompt'     => '0',
					'completion' => '0',
				),
			),
		);

		return new WP_REST_Response( $models, 200 );
	}
}
