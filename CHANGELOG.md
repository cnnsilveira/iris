# Iris Changelog

All notable changes to the Iris WordPress plugin will be documented in this file.

## [0.1.0-alpha] - 2026-06-21

### Added
- **Decoupled Backend Architecture:** Follows PSR-4 namespace standards under `Iris\` mapping directly to `src/`.
- **Real-time SSE cURL Stream Proxy:** Dedicated streaming client proxies responses chunk-by-chunk directly from OpenRouter to the client with sub-second latency.
- **Premium React Assistant UI:** A stylish, slate-glass floating drawer globally injected into the WordPress administration screens.
- **Dynamic Model Synchronization:** Full OpenRouter model synchronization powered by WP-Cron background tasks and options triggers.
- **Strict Security Integration:** Built with WPCS compliance, CSRF verification, permission validation, and frontend XSS sanitation using DOMPurify.
- **Automated Zip Release Script:** A Python release script `bin/release.py` and `npm run zip` script wrapper to build stable zip archives.

### Detailed Features
- **Unified Entry (`iris.php`):** Implements a defensive Composer autoloader loader check, multisite installation guardrails (aborts network-wide loads using `wp_die()`), and hooks up plugin activation routines.
- **Plugin Bootstrapper (`src/Plugin.php`):** Serves as the central registry and subsystem bootstrapper, avoiding inline instantiation in the global scope.
- **Clean Deletion Handler (`uninstall.php`):** Completely purges database options (e.g., `iris_api_key`, `iris_model_list`) and transients upon plugin deletion to maintain site hygiene.
- **Streaming Client (`src/OpenRouterClient.php`):** Connects to OpenRouter using native PHP cURL streaming, disabling compression, clearing buffers, and supporting client abort monitoring.
- **REST Endpoints (`src/RestController.php`):** Exposes settings, model caching, and chat completion routes under the `/wp-json/iris/v1/` namespace with native `X-WP-Nonce` header verification.
- **Settings Sync (`src/ModelManager.php` & `src/Admin.php`):** Schedules background model list queries on API key change via WP-Cron.
- **Admin Assistant Frontend (React + TS):** Custom floating drawer UI, scoped style resets, settings dashboard, DOMPurify sanitization, and the custom `useChat` streaming hook.
