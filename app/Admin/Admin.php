<?php
/**
 * Admin screens, script enqueuing, and option-save hooks.
 *
 * Registers the Vitrus settings menu page, enqueues the React
 * application globally for administrators, and schedules a
 * model-list sync whenever the API key option changes.
 *
 * @package Vitrus
 */

namespace Vitrus\Admin;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles all WordPress admin integration for Vitrus.
 *
 * @since v0.1.0
 */
class Admin {

	/**
	 * Hook suffix returned by add_menu_page for the Chat page.
	 *
	 * @since 0.2.0
	 * @var string
	 */
	private static $chat_hook = '';

	/**
	 * Hook suffix returned by add_submenu_page for the Settings page.
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
		add_action( 'admin_head', array( __CLASS__, 'print_chat_immersion_css' ) );

		// Schedule a model sync whenever the API key is saved.
		add_action( 'add_option_vitrus_api_key', array( __CLASS__, 'schedule_model_sync' ) );
		add_action( 'update_option_vitrus_api_key', array( __CLASS__, 'schedule_model_sync' ) );
	}

	/**
	 * Register the top-level Vitrus menu page.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function register_menu() {
		self::$chat_hook = add_menu_page(
			__( 'Vitrus', 'vitrus' ),
			__( 'Vitrus', 'vitrus' ),
			'manage_options',
			'vitrus',
			array( __CLASS__, 'render_chat_page' ),
			'dashicons-format-chat',
			30
		);

		add_submenu_page(
			'vitrus',
			__( 'Chat', 'vitrus' ),
			__( 'Chat', 'vitrus' ),
			'manage_options',
			'vitrus',
			array( __CLASS__, 'render_chat_page' )
		);

		self::$settings_hook = add_submenu_page(
			'vitrus',
			__( 'Settings', 'vitrus' ),
			__( 'Settings', 'vitrus' ),
			'manage_options',
			'vitrus-settings',
			array( __CLASS__, 'render_settings_page' )
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
		echo '<div id="vitrus-settings-page-root"></div>';
	}

	/**
	 * Render the chat page mount point.
	 *
	 * Outputs a single container that the React chat
	 * application mounts onto.
	 *
	 * @since 0.2.0
	 * @return void
	 */
	public static function render_chat_page() {
		echo '<div id="vitrus-chat-page-root"></div>';
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

		global $hook_suffix;
		if ( $hook_suffix === self::$chat_hook || $hook_suffix === self::$settings_hook ) {
			return;
		}

		echo '<div id="vitrus-chat-root"></div>';
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

		$dist_dir = VITRUS_PLUGIN_DIR . '/assets/dist';
		$dist_url = plugins_url( 'assets/dist', VITRUS_PLUGIN_FILE );

		$js_path  = $dist_dir . '/vitrus-admin.js';
		$css_path = $dist_dir . '/vitrus-admin.css';

		// Use filemtime for cache-busting during development.
		$js_version  = file_exists( $js_path ) ? (string) filemtime( $js_path ) : VITRUS_VERSION;
		$css_version = file_exists( $css_path ) ? (string) filemtime( $css_path ) : VITRUS_VERSION;

		if ( file_exists( $css_path ) ) {
			wp_enqueue_style(
				'vitrus-admin',
				$dist_url . '/vitrus-admin.css',
				array(),
				$css_version
			);
		}

		if ( file_exists( $js_path ) ) {
			/*
			 * Deferred so the browser fetches the bundle while it parses the
			 * document, rather than waiting for the footer. On WordPress < 6.3
			 * the array is simply truthy, which keeps the old footer behaviour.
			 */
			wp_enqueue_script(
				'vitrus-admin',
				$dist_url . '/vitrus-admin.js',
				array(),
				$js_version,
				array(
					'in_footer' => true,
					'strategy'  => 'defer',
				)
			);

			$current_user = wp_get_current_user();
			$user_roles   = (array) $current_user->roles;

			wp_localize_script(
				'vitrus-admin',
				'vitrusSettings',
				array(
					'nonce'          => wp_create_nonce( 'wp_rest' ),
					'restUrl'        => esc_url_raw( rest_url( 'vitrus/v1/' ) ),
					'siteHash'       => md5( get_site_url() ),
					'isSettingsPage' => ( $hook_suffix === self::$settings_hook ),
					'currentUser'    => array(
						'name'      => $current_user->display_name,
						'avatarUrl' => (string) get_avatar_url( $current_user->ID, array( 'size' => 60 ) ),
						'role'      => ! empty( $user_roles ) ? ucfirst( (string) $user_roles[0] ) : '',
					),
				)
			);
		}
	}

	/**
	 * Print full-screen immersion CSS on the Chat page.
	 *
	 * Hides the WordPress admin bar and menu so the Chat page reads as a
	 * standalone application (Gutenberg fullscreen style). Adding the
	 * `vitrus-show-wpmenu` class to <body> (via the React reveal toggle)
	 * restores the admin menu.
	 *
	 * @since 0.3.0
	 * @return void
	 */
	public static function print_chat_immersion_css() {
		$screen = get_current_screen();
		if ( null === $screen || 'toplevel_page_vitrus' !== $screen->id ) {
			return;
		}
		?>
		<style id="vitrus-immersion">
			#wpadminbar { display: none !important; }
			html.wp-toolbar { padding-top: 0 !important; }
			#adminmenumain, #adminmenuback, #adminmenuwrap { display: none; }
			#wpcontent, #wpfooter { margin-left: 0 !important; padding-left: 0 !important; }
			#wpbody-content { padding: 0 !important; }
			#wpfooter { display: none; }
			#wpbody-content > .wrap, #wpbody-content > #screen-meta,
			#wpbody-content > #screen-meta-links { margin: 0; padding: 0; }
			body.vitrus-show-wpmenu #adminmenumain,
			body.vitrus-show-wpmenu #adminmenuback,
			body.vitrus-show-wpmenu #adminmenuwrap { display: block; }
			body.vitrus-show-wpmenu #wpcontent { margin-left: 160px !important; }
			#vitrus-chat-page-root { min-height: 100vh; }
		</style>
		<?php
	}

	/**
	 * Schedule a one-off WP-Cron event to sync the model list.
	 *
	 * Fired by the add_option and update_option hooks for the
	 * vitrus_api_key option so the model catalogue refreshes
	 * automatically whenever the key changes.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function schedule_model_sync() {
		if ( ! wp_next_scheduled( 'vitrus_sync_models_event' ) ) {
			wp_schedule_single_event( time() + 10, 'vitrus_sync_models_event' );
		}
	}
}
