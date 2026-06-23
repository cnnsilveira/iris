# Iris Changelog

All notable changes to the Iris WordPress plugin will be documented in this file.

## [0.2.0-alpha] - 2026-06-22

### Added
- **System Prompt Tabbed Editor:** Added a "Markdown" and "Preview" toggle to the System Prompt editor on the Settings page. Configured a monospaced font stack for markdown writing, and styled the preview pane with custom theme-accented headings, lists, blockquotes, and inline code elements.
- **Main Chat Page:** Introduced a native WordPress admin Chat page registered under the top-level **Iris** menu (`page=iris`).
- **Collapsible History Sidebar:** Created a two-column ChatGPT/Gemini-style layout featuring a list of recent conversations, a "New Chat" button, model badges, and a settings switcher link.
- **Server-Side Conversation Persistence:** Added new REST endpoints (`GET /conversations`, `POST /conversations`, `DELETE /conversations/<id>`, `DELETE /conversations`) syncing multiple concurrent conversations directly to the WordPress user metadata (`iris_conversations`), ensuring chat history persists per-user.
- **AI Assistant Message Balloons:** Added visual balloons styled with theme design tokens and correct border-radii tail overrides for AI assistant replies.
- **Developer Debug Logging:** Appends structured connection logs directly to `iris-debug.log` in the plugin root for terminal troubleshooting (`tail -f iris-debug.log`), controlled by a toggle switch on the upgraded tabbed dashboard layout.
  - Adds a tab navigation layout dividing the settings screen into **Settings** and **Debug Logs** panels.
  - Introduces a new `debug_logging` settings option (disabled by default) to restrict file writing operations to active troubleshooting windows.
  - Records request method, URL, and full JSON body (including system instructions, site context sharing, and message history).
  - Records response status, elapsed timing, and raw response chunks.
  - Automatically masks Authorization tokens to secure API credentials in the file system.
  - Automatically deletes the log file during plugin uninstall and excludes it from Git tracking via `.gitignore`.

### Changed
- **WordPress Admin Submenus:** Split the layout into native WordPress submenu screens: **Chat** (slug `iris`) and **Settings** (slug `iris-settings`), using standard page routing.
- **Mount Container Separation:** Configured independent mount containers (`#iris-chat-page-root` and `#iris-settings-page-root`) in `main.tsx` and updated SCSS scoping selectors in `_reset.scss`, `_settings.scss`, and `_chat-page.scss`.
- **Drawer Visibility Logic:** Updated `render_chat_root()` in `Admin.php` to hide the floating drawer when browsing either the Chat or Settings submenu screens.
- **WP Body Padding Reset:** Added body overrides to zero out the WordPress `#wpbody-content` bottom padding on the Iris pages, avoiding vertical page scrollbars and locking layout to `calc(100vh - 100px)`.
- **Drawer History Sync:** Configured the quick chat drawer to write to the shared server-side user database, automatically syncing drawer sessions with the main page history list.
- **Folder and Namespace Restructuring:** Reorganized directory layout and namespacing to match the plugin standards specified in `AGENTS.md`.
  - Moved PHP classes into feature-specific namespace directories: `Admin/`, `Api/`, `Chat/`, and `Models/`.
  - Split unified `RestController` into domain-specific controllers (`ChatController`, `ModelsController`, `SettingsController`) under the `Iris\Api` namespace.
  - Reorganized frontend React components into feature folders: `components/chat/` and `components/settings/`.
  - Nested component SCSS stylesheets in subfolders (`components/chat/` and `components/settings/`) and updated Sass imports.
  - Added direct file access check guards (`ABSPATH` checks) to all PHP source files.
- **WP Menu Position:** Repositioned the Iris menu higher up in the WordPress admin sidebar by adjusting the menu priority from 80 to 30.

### Fixed
- **Chatbox HR Styling:** Adjusted horizontal rule (`<hr>`) styling within chatbox messages to apply a border-color, custom margin, and opacity matching the dark theme design tokens.
- **SSE Stream Error Propagation:** Updated the frontend streaming chunk decoder to capture API error payloads (`dataJson.error`) immediately. Throws an error to abort typing state and report issues inside the chat bubble, resolving the bug where invalid keys or quota errors caused the bubble to hang indefinitely and return empty blocks.
- **False 200 Stream Status & Upstream Error Handling:** Deferred sending HTTP stream headers (`200 OK`) until the upstream OpenRouter connection status is verified. On rate limit (HTTP 429) or other immediate connection errors, propagates the actual HTTP status code and raw error body to the client. Updated the frontend parser to extract detailed upstream rate limit metadata (`jsonErr.error.metadata.raw`) and display it cleanly in the chatbox using Markdown formatting.

## [0.1.0-alpha] - 2026-06-21

### Added
- **Decoupled Backend Architecture:** Follows PSR-4 namespace standards under `Iris\` mapping directly to `app/`.
- **Real-time SSE cURL Stream Proxy:** Dedicated streaming client proxies responses chunk-by-chunk directly from OpenRouter to the client with sub-second latency.
- **Premium React Assistant UI:** A stylish, slate-glass floating drawer globally injected into the WordPress administration screens.
- **Dynamic Model Synchronization:** Full OpenRouter model synchronization powered by WP-Cron background tasks and options triggers.
- **Strict Security Integration:** Built with WPCS compliance, CSRF verification, permission validation, and frontend XSS sanitation using DOMPurify.
- **Automated Zip Release Script:** A Python release script `bin/release.py` and `npm run zip` script wrapper to build stable zip archives.

### Detailed Features
- **Unified Entry (`iris.php`):** Implements a defensive Composer autoloader loader check, multisite installation guardrails (aborts network-wide loads using `wp_die()`), and hooks up plugin activation routines.
- **Plugin Bootstrapper (`app/Plugin.php`):** Serves as the central registry and subsystem bootstrapper, avoiding inline instantiation in the global scope.
- **Clean Deletion Handler (`uninstall.php`):** Completely purges database options (e.g., `iris_api_key`, `iris_model_list`) and transients upon plugin deletion to maintain site hygiene.
- **Streaming Client (`app/OpenRouterClient.php`):** Connects to OpenRouter using native PHP cURL streaming, disabling compression, clearing buffers, and supporting client abort monitoring.
- **REST Endpoints (`app/RestController.php`):** Exposes settings, model caching, and chat completion routes under the `/wp-json/iris/v1/` namespace with native `X-WP-Nonce` header verification.
- **Settings Sync (`app/ModelManager.php` & `app/Admin.php`):** Schedules background model list queries on API key change via WP-Cron.
- **Admin Assistant Frontend (React + TS):** Custom floating drawer UI, scoped style resets, settings dashboard, DOMPurify sanitization, and the custom `useChat` streaming hook.
