<?php
/**
 * Admin screens, script enqueuing, and option-save hooks.
 *
 * Registers the Iris settings menu page, enqueues the React
 * application globally for administrators, and schedules a
 * model-list sync whenever the API key option changes.
 *
 * @package Iris
 */

namespace Iris\Admin;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles all WordPress admin integration for Iris.
 *
 * @since v0.1.0
 */
class Admin {

	/**
	 * Hook suffix returned by add_menu_page, used to target
	 * page-specific enqueues.
	 *
	 * @since v0.1.0
	 * @var string
	 */
	private static $settings_hook = '';

	/**
	 * Initialize admin hooks.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'register_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_scripts' ) );
		add_action( 'admin_footer', array( __CLASS__, 'render_chat_root' ) );

		// Schedule a model sync whenever the API key is saved.
		add_action( 'add_option_iris_api_key', array( __CLASS__, 'schedule_model_sync' ) );
		add_action( 'update_option_iris_api_key', array( __CLASS__, 'schedule_model_sync' ) );
	}

	/**
	 * Register the top-level Iris menu page.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function register_menu() {
		self::$settings_hook = add_menu_page(
			__( 'Iris', 'iris' ),
			__( 'Iris', 'iris' ),
			'manage_options',
			'iris',
			array( __CLASS__, 'render_settings_page' ),
			'dashicons-format-chat',
			30
		);
	}

	/**
	 * Render the settings page mount point.
	 *
	 * Outputs a single container that the React settings
	 * application mounts onto.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function render_settings_page() {
		echo '<div id="iris-admin-root"></div>';
	}

	/**
	 * Render the floating chat drawer mount point in the admin footer.
	 *
	 * Restricted to users with the manage_options capability.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function render_chat_root() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		echo '<div id="iris-chat-root"></div>';
	}

	/**
	 * Enqueue the compiled React application and localize REST parameters.
	 *
	 * Scripts and styles are loaded globally on every admin page for
	 * users with the manage_options capability so the floating chat
	 * drawer is always available.
	 *
	 * @since v0.1.0
	 *
	 * @param string $hook_suffix The current admin page hook suffix.
	 * @return void
	 */
	public static function enqueue_scripts( $hook_suffix ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$dist_dir = IRIS_PLUGIN_DIR . '/assets/dist';
		$dist_url = plugins_url( 'assets/dist', IRIS_PLUGIN_FILE );

		$js_path  = $dist_dir . '/iris-admin.js';
		$css_path = $dist_dir . '/iris-admin.css';

		// Use filemtime for cache-busting during development.
		$js_version  = file_exists( $js_path ) ? (string) filemtime( $js_path ) : IRIS_VERSION;
		$css_version = file_exists( $css_path ) ? (string) filemtime( $css_path ) : IRIS_VERSION;

		if ( file_exists( $css_path ) ) {
			wp_enqueue_style(
				'iris-admin',
				$dist_url . '/iris-admin.css',
				array(),
				$css_version
			);
		}

		if ( file_exists( $js_path ) ) {
			wp_enqueue_script(
				'iris-admin',
				$dist_url . '/iris-admin.js',
				array(),
				$js_version,
				true
			);

			wp_localize_script(
				'iris-admin',
				'irisSettings',
				array(
					'nonce'          => wp_create_nonce( 'wp_rest' ),
					'restUrl'        => esc_url_raw( rest_url( 'iris/v1/' ) ),
					'siteHash'       => md5( get_site_url() ),
					'isSettingsPage' => ( $hook_suffix === self::$settings_hook ),
				)
			);
		}
	}

	/**
	 * Schedule a one-off WP-Cron event to sync the model list.
	 *
	 * Fired by the add_option and update_option hooks for the
	 * iris_api_key option so the model catalogue refreshes
	 * automatically whenever the key changes.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function schedule_model_sync() {
		if ( ! wp_next_scheduled( 'iris_sync_models_event' ) ) {
			wp_schedule_single_event( time() + 10, 'iris_sync_models_event' );
		}
	}
}
