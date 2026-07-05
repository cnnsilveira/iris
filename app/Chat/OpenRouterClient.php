<?php
/**
 * OpenRouter API client with SSE streaming support.
 *
 * Proxies chat completion requests to the OpenRouter API using
 * native cURL for character-by-character streaming. Includes
 * compression deactivation, safe buffer flushing, and a
 * wp_remote_post fallback when cURL is unavailable.
 *
 * @package Vitrus
 */

namespace Vitrus\Chat;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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
				'X-Title: Vitrus',
			)
		);
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, false );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt( $ch, CURLOPT_TIMEOUT, 120 );

		$streamed_response = '';
		$headers_sent      = false;

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_setopt
		curl_setopt(
			$ch,
			CURLOPT_WRITEFUNCTION,
			function ( $ch, $data ) use ( &$streamed_response, &$headers_sent ) {
				if ( connection_aborted() ) {
					return 0;
				}

				if ( ! $headers_sent ) {
					// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_getinfo
					$http_code = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
					if ( 200 === $http_code ) {
						self::prepare_stream_headers();
						self::clean_output_buffers();
						$headers_sent = true;
					} else {
						status_header( $http_code );
						header( 'Content-Type: application/json' );
						// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- raw error data.
						echo $data;
						if ( ob_get_level() > 0 ) {
							ob_flush();
						}
						flush();
						return strlen( $data );
					}
				}

				// Forward the raw SSE chunk to the client.
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- raw SSE proxy data.
				echo $data;

				if ( strlen( $streamed_response ) < 2000 ) {
					$streamed_response .= $data;
				}

				if ( ob_get_level() > 0 ) {
					ob_flush();
				}
				flush();

				return strlen( $data );
			}
		);

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_exec
		$result = curl_exec( $ch );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_getinfo
		$http_code = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_getinfo
		$total_time = curl_getinfo( $ch, CURLINFO_TOTAL_TIME );

		$error_msg = '';
		if ( false === $result ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_error
			$error_msg = curl_error( $ch );
			$payload   = wp_json_encode( array( 'error' => array( 'message' => $error_msg ) ) );

			if ( ! $headers_sent ) {
				status_header( 500 );
				header( 'Content-Type: application/json' );
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo $payload;
			} else {
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo 'data: ' . $payload . "\n\n";
			}

			if ( ob_get_level() > 0 ) {
				ob_flush();
			}
			flush();
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.curl_curl_close
		curl_close( $ch );

		$request_log = array(
			'url'    => self::CHAT_URL,
			'method' => 'POST',
			'body'   => $body,
		);

		DebugLogger::log(
			'chat_stream',
			$request_log,
			$http_code,
			$streamed_response,
			$total_time,
			$error_msg
		);
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
		$start_time     = microtime( true );

		$response = wp_remote_post(
			self::CHAT_URL,
			array(
				'headers' => array(
					'Authorization' => 'Bearer ' . $api_key,
					'Content-Type'  => 'application/json',
					'HTTP-Referer'  => get_site_url(),
					'X-Title'       => 'Vitrus',
				),
				'body'    => wp_json_encode( $body ),
				'timeout' => 120,
			)
		);

		$duration    = microtime( true ) - $start_time;
		$request_log = array(
			'url'    => self::CHAT_URL,
			'method' => 'POST',
			'body'   => $body,
		);

		if ( is_wp_error( $response ) ) {
			$error_message = $response->get_error_message();
			$payload       = wp_json_encode(
				array( 'error' => array( 'message' => $error_message ) )
			);

			status_header( 500 );
			header( 'Content-Type: application/json' );
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo $payload;

			DebugLogger::log(
				'fallback_stream',
				$request_log,
				0,
				$payload,
				$duration,
				$error_message
			);
		} else {
			$result      = wp_remote_retrieve_body( $response );
			$status_code = wp_remote_retrieve_response_code( $response );

			if ( 200 === $status_code ) {
				self::prepare_stream_headers();
				self::clean_output_buffers();
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo 'data: ' . $result . "\n\n";
			} else {
				status_header( $status_code );
				header( 'Content-Type: application/json' );
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo $result;
			}

			DebugLogger::log(
				'fallback_stream',
				$request_log,
				$status_code,
				$result,
				$duration
			);
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
