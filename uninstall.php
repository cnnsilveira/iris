<?php
/**
 * Uninstall handler for the Iris plugin.
 *
 * Removes all plugin options and transients from the database
 * when the plugin is deleted through the WordPress admin.
 *
 * @package Iris
 */

// Exit if not called by WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Plugin options.
delete_option( 'iris_api_key' );
delete_option( 'iris_model_list' );
delete_option( 'iris_settings' );

// Lockout transients.
delete_transient( 'iris_model_sync_failed' );
