<?php
/**
 * Debug logging utility for Iris.
 *
 * Captures, processes, and appends internal API communication
 * logs directly to a local log file for terminal troubleshooting.
 *
 * @package Iris
 */

namespace Iris\Chat;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Persists API connection logs to a local file.
 *
 * @since 0.1.0-alpha
 */
class DebugLogger {

	/**
	 * Log an API operation to a local file.
	 *
	 * @since 0.1.0-alpha
	 *
	 * @param string $action      The operation name (e.g., 'chat_stream', 'model_sync').
	 * @param array  $request     Data about the request (url, method, body).
	 * @param int    $status_code HTTP response status code or 0 on curl error.
	 * @param string $response    Snippet of the response or error body.
	 * @param float  $duration    Time taken in seconds.
	 * @param string $error_msg   Optional curl or networking error message.
	 * @return void
	 */
	public static function log( $action, array $request, $status_code, $response, $duration, $error_msg = '' ) {
		$settings = get_option( 'iris_settings', array() );
		if ( empty( $settings['debug_logging'] ) ) {
			return;
		}

		// Clean up the legacy DB option on first log write.
		if ( get_option( 'iris_debug_logs' ) ) {
			delete_option( 'iris_debug_logs' );
		}

		$log_file  = defined( 'IRIS_PLUGIN_DIR' ) ? IRIS_PLUGIN_DIR . '/iris-debug.log' : dirname( dirname( __DIR__ ) ) . '/iris-debug.log';
		$timestamp = current_time( 'Y-m-d H:i:s' );

		// Format separators.
		$separator     = str_repeat( '=', 80 ) . "\n";
		$sub_separator = str_repeat( '-', 80 ) . "\n";

		// Build log block.
		$log_entry  = $separator;
		$log_entry .= sprintf( "[%s] ACTION: %s\n", $timestamp, strtoupper( $action ) );
		$log_entry .= $sub_separator;
		$log_entry .= "REQUEST:\n";
		$log_entry .= sprintf( "  URL:    %s\n", $request['url'] ?? '' );
		$log_entry .= sprintf( "  METHOD: %s\n", $request['method'] ?? '' );

		if ( ! empty( $request['body'] ) ) {
			$pretty_body = wp_json_encode( $request['body'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
			$log_entry  .= "  BODY:\n" . $pretty_body . "\n";
		}

		$log_entry .= $sub_separator;
		$log_entry .= "RESPONSE:\n";
		$log_entry .= sprintf( "  HTTP STATUS: %d\n", $status_code );
		$log_entry .= sprintf( "  DURATION:    %ss\n", round( $duration, 4 ) );

		if ( ! empty( $error_msg ) ) {
			$log_entry .= sprintf( "  ERROR:       %s\n", $error_msg );
		}

		if ( ! empty( $response ) ) {
			$log_entry .= "  BODY:\n" . substr( (string) $response, 0, 10000 ) . "\n"; // Limit size to 10k for terminal sanity.
		}

		$log_entry .= $separator . "\n";

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- local development file logging.
		file_put_contents( $log_file, $log_entry, FILE_APPEND | LOCK_EX );
	}
}
