<?php
/**
 * Plugin Name: Vitrus
 * Plugin URI:  https://github.com/cnnsilveira/vitrus/
 * Description: The best AI Assistant for WordPress, powered by OpenRouter.
 * Version:     0.2.0-alpha
 * Requires PHP: 7.4
 * Author:      Caio Nunes da Silveira
 * Author URI:  https://caionunes.dev/
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: vitrus
 * Domain Path: /languages
 *
 * @package Vitrus
 */

// Prevent direct file access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Display an admin notice when the Composer autoloader is missing.
 *
 * @since v0.1.0
 *
 * @return void
 */
function vitrus_autoloader_missing_notice() {
	?>
	<div class="notice notice-error">
		<p>
			<?php
			echo wp_kses_post(
				sprintf(
					/* translators: %s: composer install command. */
					__( '<strong>Vitrus:</strong> The Composer autoloader was not found. Please run %s from the plugin directory.', 'vitrus' ),
					'<code>composer install</code>'
				)
			);
			?>
		</p>
	</div>
	<?php
}

// Check for the Composer autoloader.
if ( ! file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	add_action( 'admin_notices', 'vitrus_autoloader_missing_notice' );
	return;
}

require_once __DIR__ . '/vendor/autoload.php';

/**
 * Handle plugin activation.
 *
 * Blocks network-wide activation on Multisite and schedules an
 * initial model list hydration sync via WP-Cron.
 *
 * @since v0.1.0
 *
 * @param bool $network_wide Whether the plugin is being activated network-wide.
 * @return void
 */
function vitrus_activate( $network_wide ) {
	if ( $network_wide ) {
		wp_die(
			esc_html__( 'Vitrus does not support network-wide activation. Please activate it on individual sites.', 'vitrus' ),
			esc_html__( 'Activation Error', 'vitrus' ),
			array( 'back_link' => true )
		);
	}

	// Schedule a one-off cron event to hydrate the model list on activation.
	if ( ! wp_next_scheduled( 'vitrus_sync_models_event' ) ) {
		wp_schedule_single_event( time() + 10, 'vitrus_sync_models_event' );
	}
}
register_activation_hook( __FILE__, 'vitrus_activate' );

/**
 * Handle plugin deactivation.
 *
 * Cleans up all scheduled WP-Cron events registered by the plugin.
 *
 * @since v0.1.0
 *
 * @return void
 */
function vitrus_deactivate() {
	$timestamp = wp_next_scheduled( 'vitrus_sync_models_event' );
	if ( $timestamp ) {
		wp_unschedule_event( $timestamp, 'vitrus_sync_models_event' );
	}
}
register_deactivation_hook( __FILE__, 'vitrus_deactivate' );

// Bootstrap the plugin.
Vitrus\Plugin::init();
