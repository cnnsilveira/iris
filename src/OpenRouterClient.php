<?php
/**
 * OpenRouter API client with SSE streaming support.
 *
 * Proxies chat completion requests to the OpenRouter API using
 * native cURL for character-by-character streaming. Includes
 * compression deactivation, safe buffer flushing, and a
 * wp_remote_post fallback when cURL is unavailable.
 *
 * @package Iris
 */

namespace Iris;

/**
 * Handles all HTTP communication with the OpenRouter API.
 *
 * @since v0.1.0
 */
class OpenRouterClient {

	/**
	 * OpenRouter chat completions endpoint.
	 *
	 * @since v0.1.0
	 * @var string
	 */
	const CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

	/**
	 * Stream a chat completion response to the client.
	 *
	 * Sets up SSE headers, disables output compression, cleans
	 * buffers, and proxies chunks from OpenRouter in real time.
	 * Falls back to a blocking wp_remote_post request when the
	 * cURL extension is not loaded.
	 *
	 * @since v0.1.0
	 *
	 * @param string $api_key The OpenRouter API key.
	 * @param array  $body    Request body (model, messages, temperature, max_tokens).
	 * @return void
	 */
	public static function stream_chat( $api_key, array $body ) {
		self::prepare_stream_headers();
		self::clean_output_buffers();

		// Let PHP exit if the browser disconnects mid-stream.
		ignore_user_abort( false );

		$body['stream'] = true;

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_init -- native cURL required for SSE streaming.
		if ( ! function_exists( 'curl_init' ) ) {
			self::fallback_stream( $api_key, $body );
			return;
		}

		self::curl_stream( $api_key, $body );
	}

	/**
	 * Execute the streaming request via native cURL.
	 *
	 * @since v0.1.0
	 *
	 * @param string $api_key The OpenRouter API key.
	 * @param array  $body    Prepared request body with stream flag.
	 * @return void
	 */
	private static function curl_stream( $api_key, array $body ) {
		$payload = wp_json_encode( $body );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_init
		$ch = curl_init();

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt( $ch, CURLOPT_URL, self::CHAT_URL );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt( $ch, CURLOPT_POST, true );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt( $ch, CURLOPT_POSTFIELDS, $payload );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt(
			$ch,
			CURLOPT_HTTPHEADER,
			array(
				'Authorization: Bearer ' . $api_key,
				'Content-Type: application/json',
				'HTTP-Referer: ' . get_site_url(),
				'X-Title: Iris',
			)
		);
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, false );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt( $ch, CURLOPT_TIMEOUT, 120 );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt(
			$ch,
			CURLOPT_WRITEFUNCTION,
			function ( $ch, $data ) {
				if ( connection_aborted() ) {
					return 0;
				}

				// Forward the raw SSE chunk to the client.
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- raw SSE proxy data.
				echo $data;

				if ( ob_get_level() > 0 ) {
					ob_flush();
				}
				flush();

				return strlen( $data );
			}
		);

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_exec
		$result = curl_exec( $ch );

		if ( false === $result ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_error
			$error   = curl_error( $ch );
			$payload = wp_json_encode( array( 'error' => array( 'message' => $error ) ) );

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo 'data: ' . $payload . "\n\n";

			if ( ob_get_level() > 0 ) {
				ob_flush();
			}
			flush();
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_close
		curl_close( $ch );
	}

	/**
	 * Blocking fallback when the cURL extension is unavailable.
	 *
	 * Sends a non-streaming request via wp_remote_post and wraps
	 * the complete response in SSE format so the frontend stream
	 * parser remains compatible.
	 *
	 * @since v0.1.0
	 *
	 * @param string $api_key The OpenRouter API key.
	 * @param array  $body    Request body (stream flag is stripped).
	 * @return void
	 */
	private static function fallback_stream( $api_key, array $body ) {
		// Remove the stream flag for a standard blocking request.
		$body['stream'] = false;

		$response = wp_remote_post(
			self::CHAT_URL,
			array(
				'headers' => array(
					'Authorization' => 'Bearer ' . $api_key,
					'Content-Type'  => 'application/json',
					'HTTP-Referer'  => get_site_url(),
					'X-Title'       => 'Iris',
				),
				'body'    => wp_json_encode( $body ),
				'timeout' => 120,
			)
		);

		if ( is_wp_error( $response ) ) {
			$payload = wp_json_encode(
				array( 'error' => array( 'message' => $response->get_error_message() ) )
			);

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo 'data: ' . $payload . "\n\n";
		} else {
			$result = wp_remote_retrieve_body( $response );

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo 'data: ' . $result . "\n\n";
		}

		if ( ob_get_level() > 0 ) {
			ob_flush();
		}
		flush();
	}

	/**
	 * Send HTTP headers required for SSE streaming.
	 *
	 * Disables PHP zlib compression, Apache mod_deflate gzip, and
	 * Nginx proxy buffering so chunks reach the browser immediately.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	private static function prepare_stream_headers() {
		header( 'Content-Type: text/event-stream' );
		header( 'Cache-Control: no-cache' );
		header( 'X-Accel-Buffering: no' );

		// phpcs:ignore WordPress.PHP.IniSet.Risky -- required to disable output compression for SSE.
		ini_set( 'zlib.output_compression', 'Off' );

		if ( function_exists( 'apache_setenv' ) ) {
			// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.runtime_configuration_apache_setenv
			apache_setenv( 'no-gzip', '1' );
		}
	}

	/**
	 * Discard all active output buffers.
	 *
	 * Prevents WordPress, plugins, or server-level buffers from
	 * capturing SSE chunks instead of flushing them immediately.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	private static function clean_output_buffers() {
		// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obstart_ob_end_clean
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}
	}
}
