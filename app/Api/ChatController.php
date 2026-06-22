<?php
/**
 * Chat REST API controller.
 *
 * Handles chat completion and streaming requests.
 *
 * @package Iris
 */

namespace Iris\Api;

use WP_REST_Request;
use WP_Error;
use Iris\Chat\OpenRouterClient;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles all chat REST API routes.
 *
 * @since 0.2.0
 */
class ChatController {

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
	 * Register chat REST routes.
	 *
	 * @since 0.2.0
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
			'/chat/mock',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_mock_chat' ),
				'permission_callback' => array( __CLASS__, 'check_permissions' ),
			)
		);
	}

	/**
	 * Permission callback for Chat endpoints.
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
	 * Handle the streaming chat completion request.
	 *
	 * @since 0.2.0
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
	 * Build a site context string for telemetry injection.
	 *
	 * @since 0.2.0
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
	 * @since 0.2.0
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
	 * Argument schema for the chat endpoint.
	 *
	 * @since 0.2.0
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
	 * Simulate a streaming chat response in SSE format.
	 *
	 * @since 0.2.0
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
}
