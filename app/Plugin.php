<?php
/**
 * Plugin bootstrapper.
 *
 * Coordinates all class initializations for the Vitrus plugin.
 *
 * @package Vitrus
 */

namespace Vitrus;

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main plugin bootstrapper class.
 *
 * Provides a single static entry point that wires up all plugin
 * subsystems via WordPress hooks.
 *
 * @since v0.1.0
 */
class Plugin {

	/**
	 * Guard flag to prevent double initialization.
	 *
	 * @since v0.1.0
	 * @var bool
	 */
	private static $initialized = false;

	/**
	 * Initialize the plugin.
	 *
	 * Registers constants and boots all subsystems. Safe to call
	 * multiple times — subsequent calls are silently ignored.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	public static function init() {
		if ( self::$initialized ) {
			return;
		}
		self::$initialized = true;

		self::define_constants();
		self::boot_subsystems();
	}

	/**
	 * Define plugin-wide constants.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	private static function define_constants() {
		if ( ! defined( 'VITRUS_VERSION' ) ) {
			define( 'VITRUS_VERSION', '0.2.0-alpha' );
		}

		if ( ! defined( 'VITRUS_PLUGIN_FILE' ) ) {
			define( 'VITRUS_PLUGIN_FILE', dirname( __DIR__ ) . '/vitrus.php' );
		}

		if ( ! defined( 'VITRUS_PLUGIN_DIR' ) ) {
			define( 'VITRUS_PLUGIN_DIR', dirname( __DIR__ ) );
		}
	}

	/**
	 * Boot all plugin subsystems.
	 *
	 * Each subsystem class registers its own WordPress hooks
	 * internally when initialized.
	 *
	 * @since v0.1.0
	 * @return void
	 */
	private static function boot_subsystems() {
		// Admin screens, settings, and script enqueuing.
		Admin\Admin::init();

		// WP-Cron model sync callbacks.
		Models\ModelManager::init();

		// REST API endpoint registration.
		Api\ChatController::init();
		Api\ModelsController::init();
		Api\SettingsController::init();
	}
}
