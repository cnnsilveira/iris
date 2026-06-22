<?php
/**
 * REST API controller for Iris endpoints.
 *
 * Registers all custom REST routes under the iris/v1 namespace,
 * enforcing manage_options capability checks and strict argument
 * schema validation on every endpoint.
 *
 * @package Iris
 */

namespace Iris;

use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Registers and handles all Iris REST API routes.
 *
 * @since v0.1.0
 */
class RestController {

	/**
	 * REST namespace for all Iris endpoints.
	 *
	 * @since v0.1.0
	 * @var string
	 */
	const ROUTE_NAMESPACE = 'iris/v1';

	/**
	 * Register the rest_api_init hook.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register all plugin REST routes.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function register_routes() {
		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/chat',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_chat' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
				'args'                => self::get_chat_args(),
			)
		);

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

		// -- Mock endpoints for frontend testing (remove in production). --

		register_rest_route(
			self::ROUTE_NAMESPACE,
			'/chat/mock',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_mock_chat' ),
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
	 * Shared permission callback for all Iris endpoints.
	 *
	 * @since v0.1.0
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
	 * Handle the streaming chat completion request.
	 *
	 * Builds the OpenRouter payload from the validated request
	 * parameters and saved settings, then delegates to
	 * OpenRouterClient for the SSE stream. Terminates with exit
	 * to prevent the REST server from appending a response wrapper.
	 *
	 * @since v0.1.0
	 *
	 * @param WP_REST_Request $request The incoming request.
	 * @return void
	 */
	public static function handle_chat( WP_REST_Request $request ) {
		$api_key = self::get_api_key();

		if ( empty( $api_key ) ) {
			wp_send_json_error(
				array( 'message' => __( 'No API key configured.', 'iris' ) ),
				400
			);
			return;
		}

		$settings = get_option( 'iris_settings', array() );
		$messages = $request->get_param( 'messages' );

		// Build optional system prompt preamble.
		$system_prompt = $settings['system_prompt'] ?? '';
		if ( ! empty( $system_prompt ) ) {
			array_unshift(
				$messages,
				array(
					'role'    => 'system',
					'content' => $system_prompt,
				)
			);
		}

		// Append site context when the telemetry toggle is on.
		if ( ! empty( $settings['context_sharing'] ) ) {
			$context  = self::build_site_context();
			$messages = self::inject_site_context( $messages, $context );
		}

		$body = array(
			'model'       => sanitize_text_field( $request->get_param( 'model' ) ?? $settings['model'] ?? '' ),
			'messages'    => $messages,
			'temperature' => (float) ( $request->get_param( 'temperature' ) ?? $settings['temperature'] ?? 0.7 ),
			'max_tokens'  => (int) ( $request->get_param( 'max_tokens' ) ?? $settings['max_tokens'] ?? 1024 ),
		);

		OpenRouterClient::stream_chat( $api_key, $body );

		// Prevent the REST server from appending a JSON wrapper.
		exit;
	}

	/**
	 * Return the cached model list.
	 *
	 * @since v0.1.0
	 * @return WP_REST_Response The model catalogue.
	 */
	public static function handle_get_models() {
		$models = get_option( 'iris_model_list', array() );

		return new WP_REST_Response( $models, 200 );
	}

	/**
	 * Trigger a manual model list sync.
	 *
	 * @since v0.1.0
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
	 * Return the current plugin settings.
	 *
	 * Exposes a has_api_key flag instead of the raw key, and
	 * indicates whether the key is locked via a wp-config constant.
	 *
	 * @since v0.1.0
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
	 * Sanitizes every field before persisting. When the API key is
	 * provided and no compile-time constant overrides it, the key
	 * is saved to its own option to trigger the model sync hooks.
	 *
	 * @since v0.1.0
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

	// ------------------------------------------------------------------
	// Schema & helpers
	// ------------------------------------------------------------------

	/**
	 * Argument schema for the chat endpoint.
	 *
	 * @since v0.1.0
	 * @return array Validated argument definitions.
	 */
	private static function get_chat_args() {
		return array(
			'messages'    => array(
				'required'          => true,
				'type'              => 'array',
				'items'             => array(
					'type'       => 'object',
					'properties' => array(
						'role'    => array( 'type' => 'string' ),
						'content' => array( 'type' => 'string' ),
					),
				),
				'validate_callback' => function ( $value ) {
					if ( ! is_array( $value ) || empty( $value ) ) {
						return new WP_Error( 'iris_invalid_messages', __( 'Messages must be a non-empty array.', 'iris' ) );
					}
					return true;
				},
			),
			'model'       => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'temperature' => array(
				'type' => 'number',
			),
			'max_tokens'  => array(
				'type' => 'integer',
			),
		);
	}

	/**
	 * Argument schema for the settings save endpoint.
	 *
	 * @since v0.1.0
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
	 * Checks the compile-time constant first, then falls back to
	 * the database option.
	 *
	 * @since v0.1.0
	 * @return string The API key, or an empty string.
	 */
	private static function get_api_key() {
		if ( defined( 'IRIS_OPENROUTER_API_KEY' ) && IRIS_OPENROUTER_API_KEY ) {
			return IRIS_OPENROUTER_API_KEY;
		}

		return get_option( 'iris_api_key', '' );
	}

	/**
	 * Build a site context string for telemetry injection.
	 *
	 * @since v0.1.0
	 * @return string Human-readable environment summary.
	 */
	private static function build_site_context() {
		$theme   = wp_get_theme();
		$plugins = get_option( 'active_plugins', array() );

		$plugin_names = array_map(
			function ( $plugin_file ) {
				$data = get_plugin_data( WP_PLUGIN_DIR . '/' . $plugin_file, false, false );
				return $data['Name'] ?? $plugin_file;
			},
			$plugins
		);

		return sprintf(
			'Site context: WordPress %s, PHP %s, Theme: %s, Active plugins: %s.',
			get_bloginfo( 'version' ),
			PHP_VERSION,
			$theme->get( 'Name' ),
			implode( ', ', $plugin_names )
		);
	}

	/**
	 * Inject site context into the system message of the conversation.
	 *
	 * Appends the context to an existing system message or prepends
	 * a new one if none exists.
	 *
	 * @since v0.1.0
	 *
	 * @param array  $messages Conversation messages.
	 * @param string $context  The site context string.
	 * @return array Messages with context injected.
	 */
	private static function inject_site_context( array $messages, $context ) {
		if ( isset( $messages[0]['role'] ) && 'system' === $messages[0]['role'] ) {
			$messages[0]['content'] .= "\n\n" . $context;
		} else {
			array_unshift(
				$messages,
				array(
					'role'    => 'system',
					'content' => $context,
				)
			);
		}

		return $messages;
	}

	/**
	 * Clamp a float value between a minimum and maximum.
	 *
	 * @since v0.1.0
	 *
	 * @param float $value The value to clamp.
	 * @param float $min   Minimum allowed value.
	 * @param float $max   Maximum allowed value.
	 * @return float The clamped value.
	 */
	private static function clamp_float( $value, $min, $max ) {
		return max( $min, min( $max, $value ) );
	}

	// ------------------------------------------------------------------
	// Mock endpoints (temporary — remove before production release)
	// ------------------------------------------------------------------

	/**
	 * Simulate a streaming chat response in SSE format.
	 *
	 * Outputs a predefined markdown reply word-by-word with small
	 * delays to mimic real-time AI generation. Allows the frontend
	 * to develop and test the stream parser without an API key.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function handle_mock_chat() {
		header( 'Content-Type: text/event-stream' );
		header( 'Cache-Control: no-cache' );
		header( 'X-Accel-Buffering: no' );

		// phpcs:ignore WordPress.PHP.IniSet.Risky
		ini_set( 'zlib.output_compression', 'Off' );

		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obstart_ob_end_clean
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		ignore_user_abort( false );

		$mock_id = 'mock-' . wp_rand( 1000, 9999 );

		$text = "Hello! I'm **Iris**, your AI assistant for WordPress. "
			. "I'm currently running in _mock mode_ because no real API "
			. "connection is active.\n\n"
			. "Here's what I can help you with:\n\n"
			. "- \xF0\x9F\x93\x9D Content writing and editing\n"
			. "- \xF0\x9F\x94\xA7 Site management guidance\n"
			. "- \xF0\x9F\x9B\xA0 Troubleshooting WordPress issues\n"
			. "- \xF0\x9F\x92\xBB Code snippets and explanations\n\n"
			. "```php\n"
			. "// Example: Get the current theme name\n"
			. "\$theme = wp_get_theme();\n"
			. "echo \$theme->get( 'Name' );\n"
			. "```\n\n"
			. 'Configure your **OpenRouter API key** in the Iris settings '
			. 'to start using real AI responses!';

		// Split into small tokens for realistic streaming.
		$tokens = preg_split( '/(\s+)/', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY );

		foreach ( $tokens as $token ) {
			if ( connection_aborted() ) {
				break;
			}

			$chunk = wp_json_encode(
				array(
					'id'      => $mock_id,
					'object'  => 'chat.completion.chunk',
					'choices' => array(
						array(
							'index'         => 0,
							'delta'         => array( 'content' => $token ),
							'finish_reason' => null,
						),
					),
				)
			);

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- raw SSE proxy data.
			echo 'data: ' . $chunk . "\n\n";

			if ( ob_get_level() > 0 ) {
				ob_flush();
			}
			flush();

			// Small delay to simulate generation speed.
			usleep( 30000 );
		}

		// Final chunk with finish_reason and DONE sentinel.
		$done_chunk = wp_json_encode(
			array(
				'id'      => $mock_id,
				'object'  => 'chat.completion.chunk',
				'choices' => array(
					array(
						'index'         => 0,
						'delta'         => array(),
						'finish_reason' => 'stop',
					),
				),
			)
		);

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo 'data: ' . $done_chunk . "\n\n";
		echo "data: [DONE]\n\n";

		if ( ob_get_level() > 0 ) {
			ob_flush();
		}
		flush();

		exit;
	}

	/**
	 * Return a static model list for frontend development.
	 *
	 * Includes both paid and free models so the "Free models only"
	 * filter can be tested without a live API connection.
	 *
	 * @since v0.1.0
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
