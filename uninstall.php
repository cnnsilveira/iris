<?php
/**
 * Uninstall handler for the Iris plugin.
 *
 * Removes all plugin options and transients from the database
 * when the plugin is deleted through the WordPress admin.
 *
 * @package Iris
 * @since   v0.1.0
 */

// Exit if not called by WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Plugin options.
delete_option( 'iris_api_key' );
delete_option( 'iris_model_list' );
delete_option( 'iris_settings' );
delete_option( 'iris_debug_logs' );

// Lockout transients.
delete_transient( 'iris_model_sync_failed' );

// Delete conversation history for all users.
delete_metadata( 'user', 0, 'iris_conversations', '', true );

// Clean up debug log file.
$log_file = __DIR__ . '/iris-debug.log';
if ( file_exists( $log_file ) ) {
	wp_delete_file( $log_file );
}
