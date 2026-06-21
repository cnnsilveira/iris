<?php
/**
 * Plugin bootstrapper.
 *
 * Coordinates all class initializations for the Iris plugin.
 *
 * @package Iris
 */

namespace Iris;

/**
 * Main plugin bootstrapper class.
 *
 * Provides a single static entry point that wires up all plugin
 * subsystems via WordPress hooks.
 */
class Plugin {

	/**
	 * Guard flag to prevent double initialization.
	 *
	 * @var bool
	 */
	private static $initialized = false;

	/**
	 * Initialize the plugin.
	 *
	 * Registers constants and boots all subsystems. Safe to call
	 * multiple times — subsequent calls are silently ignored.
	 *
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
	 * @return void
	 */
	private static function define_constants() {
		if ( ! defined( 'IRIS_VERSION' ) ) {
			define( 'IRIS_VERSION', '1.0.0' );
		}

		if ( ! defined( 'IRIS_PLUGIN_FILE' ) ) {
			define( 'IRIS_PLUGIN_FILE', dirname( __DIR__ ) . '/iris.php' );
		}

		if ( ! defined( 'IRIS_PLUGIN_DIR' ) ) {
			define( 'IRIS_PLUGIN_DIR', dirname( __DIR__ ) );
		}
	}

	/**
	 * Boot all plugin subsystems.
	 *
	 * Each subsystem class registers its own WordPress hooks
	 * internally when initialized.
	 *
	 * @return void
	 */
	private static function boot_subsystems() {
		/*
		 * Subsystem classes are wired here as they are created:
		 *
		 * - Admin::init()          → settings screens, script enqueuing.
		 * - ModelManager::init()   → WP-Cron model sync callbacks.
		 * - RestController::init() → REST API endpoint registration.
		 */
	}
}
