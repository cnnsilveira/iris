# Vitrus Changelog

All notable changes to the Vitrus WordPress plugin will be documented in this file.

## [Unreleased]

### Changed
- **Plugin Rebrand — Iris → Vitrus (BREAKING):** Renamed the plugin from **Iris** to **Vitrus** to avoid a naming collision with an existing "Iris" AI assistant plugin on WordPress.org. This is a clean-break rename with **no automatic data migration** — existing installs must reactivate the plugin and reconfigure their settings after updating.
  - **Identity:** directory `iris/` → `vitrus/`, entry file `iris.php` → `vitrus.php`, text domain `iris` → `vitrus`, PHP namespace `Iris\` → `Vitrus\`, Composer/npm package `cnnsilveira/iris` → `cnnsilveira/vitrus`, constants `IRIS_*` → `VITRUS_*`.
  - **Persisted options renamed** (old values are not carried over): `iris_api_key`, `iris_model_list`, `iris_settings`, `iris_debug_logs`, `iris_conversations`, and the `iris_model_sync_failed` transient → `vitrus_*`.
  - **REST namespace:** `iris/v1` → `vitrus/v1` — all endpoint URLs change.
  - **Cron hook:** `iris_sync_models_event` → `vitrus_sync_models_event`.
  - **Environment variable:** `IRIS_OPENROUTER_API_KEY` → `VITRUS_OPENROUTER_API_KEY`.
  - **Frontend:** mount container IDs (`#iris-*` → `#vitrus-*`), BEM class prefix (`iris-*` → `vitrus-*`), design tokens (`$iris-*` / `--iris-*` → `vitrus`), localized global `window.irisSettings` → `window.vitrusSettings`, build output `iris-admin.js/.css` → `vitrus-admin.js/.css`, and browser `localStorage` keys.
- **Default Token Limit Upgrade:** Upgraded the default `max_tokens` (Max Output Tokens) limit value from `1024` to `4096` in the REST API controllers and settings dashboard UI config to provide reasoning-heavy models with sufficient space to complete both their thinking process and actual response content.
- **Floating Widget Redesign — Docked Copilot Sidebar (BREAKING VISUAL CHANGE):** Replaced the bottom-right chat-box drawer with a docked sidebar panel matching the Vitrus Copilot design system. A 44px "COPILOT" launcher pill sits at the bottom-right; clicking it slides a 380px panel in from the right edge over 320ms. The panel insets below the WordPress admin bar and never covers it, driven by a CSS variable that collapses to `0` when no admin bar is present — so the widget is ready to ship on the front end unchanged. The old drawer's markup and stylesheet were deleted outright; only its behaviour was carried over. The panel header carries two controls — a three-dots overflow menu (New chat, Chat page, light/dark toggle, Settings) and a close chevron. New: Escape closes the panel (unless a draft is in progress or the menu is open), the open state persists across admin page loads, and the widget keeps its own light/dark theme independent of the Chat page. Removed: the header model name, the prompt-suggestion chips, the welcome icon, and the footer note. The empty state now shows the same greeting as the Chat page.
- **Widget Boot Behaviour:** The admin bundle is now enqueued with `strategy => 'defer'`, so the browser fetches it while parsing the document instead of waiting for the footer. The widget also holds itself hidden until its conversation has loaded, then animates in: the panel slides from the right if it was left open, otherwise the launcher scales up over 100ms. This replaces the previous behaviour, where the widget popped into place fully formed after the rest of the page had painted, briefly showing an empty panel.
- **Copy / Regenerate in the Widget:** The floating widget now offers Copy and Regenerate beneath assistant replies, and picks up the Chat page's selection colour and custom scrollbar. The reset neutralizer, `::selection`, scrollbar, and turn-actions styles moved into a shared `_chat-surface.scss`; `canRegenerate()` and `copyMessage()` moved into `lib/chat.ts`. Both surfaces consume them.
- **Shared Action Menu:** The three-dots overflow menu (`ActionMenu`) is now shared by the Chat page and the floating widget. Its styles moved out of `_chat-page.scss` into `_action-menu.scss`, scoped to both roots, and it portals into the nearest `[data-vitrus-theme]` ancestor rather than the Chat page shell specifically — so it escapes the widget panel's clipping and resolves whichever surface's theme opened it.
- **Shared Chat Foundations:** Extracted the pieces the Chat page and the floating widget both need into a single place ahead of the widget redesign: the markdown pipeline (`lib/markdown.ts` — now the only call site for `marked` + DOMPurify, so AI output can never bypass sanitization), the message-time helper (`lib/messageTime.ts`), the shared empty-state copy (`lib/copy.ts`), the Vitrus logomark (`components/icons/Mark.tsx`), the textarea autosize behaviour (`hooks/useAutosizeTextarea.ts`), and the rendered-markdown typography (`scss/styles/_markdown.scss`, a scale-parameterized mixin). `useTheme` now accepts a storage-key prefix so each surface can persist its own theme. The `--vt-*` design tokens, previously scoped to the Chat page alone, now cover the floating widget root as well, so both surfaces draw from one palette and each can run its own light/dark theme. No visual change to the Chat page.
- **Chat Page Redesign — "Vitrus Copilot" Design System:** Rebuilt the admin Chat page around the new visual identity — OKLCH design tokens, Newsreader (serif) headings with a Hanken Grotesk (sans) body, a left navigation sidebar, and bubble-less assistant turns — replacing the previous right-sidebar, violet-gradient layout. The Newsreader and Hanken Grotesk fonts are now **self-hosted** in the plugin (no external Google Fonts requests). The floating drawer and Settings page are unchanged. Styling is hardened against WordPress admin CSS bleed (font size, line-height, font-family, and scrollbar) so the page renders at the intended scale.

### Fixed
- **Duplicate Typing Animation Dots:** Fixed a bug where a new prompt caused historical empty chat bubbles to display animated typing dots by verifying that only the very last message in the feed displays the typing dots.
- **Empty API Response Handlers:** Added a check for empty API responses. Shows a warning recommending that the user increase their token limit if generation stopped due to token limit length (`finish_reason: "length"`), and returns a generic warning for other empty streams.
- **History Action Button Hover:** Fixed a nested SASS nesting bug in `_chat-page.scss` where parent references (`&`) compiled into duplicate `#vitrus-chat-page-root` selectors, which prevented the rename and delete action icons from displaying when hovering over conversation items.
### Added
- **Immersive Full-Screen Chat:** The Chat page now hides the WordPress admin bar and menu (Gutenberg-style) for a distraction-free experience, with a top bar offering a WordPress-exit button, a persisted **light/dark theme toggle**, and a control to reveal the WordPress menu again.
- **Message Timestamps:** Chat turns now display the time each message was sent (derived from the message id, so existing conversations show times too).
- **Conversation Search & Date Grouping:** The sidebar now filters conversations by title and groups them by **Today / Yesterday / Earlier**, and shows the current WordPress user (avatar, name, role) in its footer.
- **Overflow Action Menus:** Rename and Delete are available from a three-dots (⋯) menu in both the chat header (for the active conversation) and each sidebar row.
- **Regenerate Response:** Added a **Regenerate** action to re-run the assistant's last reply in place.
- **Delete Chat Confirmation Modal:** Added a custom, glassmorphic deletion confirmation popup modal that overlays the Chat page when clicking a conversation's trash icon, replacing the unstyled browser-native `window.confirm` popup.

## [0.2.0-alpha] - 2026-06-22

### Added
- **System Prompt Tabbed Editor:** Added a "Markdown" and "Preview" toggle to the System Prompt editor on the Settings page. Configured a monospaced font stack for markdown writing, and styled the preview pane with custom theme-accented headings, lists, blockquotes, and inline code elements.
- **Main Chat Page:** Introduced a native WordPress admin Chat page registered under the top-level **Vitrus** menu (`page=vitrus`).
- **Collapsible History Sidebar:** Created a two-column ChatGPT/Gemini-style layout featuring a list of recent conversations, a "New Chat" button, model badges, and a settings switcher link.
- **Server-Side Conversation Persistence:** Added new REST endpoints (`GET /conversations`, `POST /conversations`, `DELETE /conversations/<id>`, `DELETE /conversations`) syncing multiple concurrent conversations directly to the WordPress user metadata (`vitrus_conversations`), ensuring chat history persists per-user.
- **AI Assistant Message Balloons:** Added visual balloons styled with theme design tokens and correct border-radii tail overrides for AI assistant replies.
- **Developer Debug Logging:** Appends structured connection logs directly to `vitrus-debug.log` in the plugin root for terminal troubleshooting (`tail -f vitrus-debug.log`), controlled by a toggle switch on the upgraded tabbed dashboard layout.
  - Adds a tab navigation layout dividing the settings screen into **Settings** and **Debug Logs** panels.
  - Introduces a new `debug_logging` settings option (disabled by default) to restrict file writing operations to active troubleshooting windows.
  - Records request method, URL, and full JSON body (including system instructions, site context sharing, and message history).
  - Records response status, elapsed timing, and raw response chunks.
  - Automatically masks Authorization tokens to secure API credentials in the file system.
  - Automatically deletes the log file during plugin uninstall and excludes it from Git tracking via `.gitignore`.

### Changed
- **WordPress Admin Submenus:** Split the layout into native WordPress submenu screens: **Chat** (slug `vitrus`) and **Settings** (slug `vitrus-settings`), using standard page routing.
- **Mount Container Separation:** Configured independent mount containers (`#vitrus-chat-page-root` and `#vitrus-settings-page-root`) in `main.tsx` and updated SCSS scoping selectors in `_reset.scss`, `_settings.scss`, and `_chat-page.scss`.
- **Drawer Visibility Logic:** Updated `render_chat_root()` in `Admin.php` to hide the floating drawer when browsing either the Chat or Settings submenu screens.
- **WP Body Padding Reset:** Added body overrides to zero out the WordPress `#wpbody-content` bottom padding on the Vitrus pages, avoiding vertical page scrollbars and locking layout to `calc(100vh - 100px)`.
- **Drawer History Sync:** Configured the quick chat drawer to write to the shared server-side user database, automatically syncing drawer sessions with the main page history list.
- **Folder and Namespace Restructuring:** Reorganized directory layout and namespacing to match the plugin standards specified in `AGENTS.md`.
  - Moved PHP classes into feature-specific namespace directories: `Admin/`, `Api/`, `Chat/`, and `Models/`.
  - Split unified `RestController` into domain-specific controllers (`ChatController`, `ModelsController`, `SettingsController`) under the `Vitrus\Api` namespace.
  - Reorganized frontend React components into feature folders: `components/chat/` and `components/settings/`.
  - Nested component SCSS stylesheets in subfolders (`components/chat/` and `components/settings/`) and updated Sass imports.
  - Added direct file access check guards (`ABSPATH` checks) to all PHP source files.
- **WP Menu Position:** Repositioned the Vitrus menu higher up in the WordPress admin sidebar by adjusting the menu priority from 80 to 30.

### Fixed
- **Chatbox HR Styling:** Adjusted horizontal rule (`<hr>`) styling within chatbox messages to apply a border-color, custom margin, and opacity matching the dark theme design tokens.
- **SSE Stream Error Propagation:** Updated the frontend streaming chunk decoder to capture API error payloads (`dataJson.error`) immediately. Throws an error to abort typing state and report issues inside the chat bubble, resolving the bug where invalid keys or quota errors caused the bubble to hang indefinitely and return empty blocks.
- **False 200 Stream Status & Upstream Error Handling:** Deferred sending HTTP stream headers (`200 OK`) until the upstream OpenRouter connection status is verified. On rate limit (HTTP 429) or other immediate connection errors, propagates the actual HTTP status code and raw error body to the client. Updated the frontend parser to extract detailed upstream rate limit metadata (`jsonErr.error.metadata.raw`) and display it cleanly in the chatbox using Markdown formatting.

## [0.1.0-alpha] - 2026-06-21

### Added
- **Decoupled Backend Architecture:** Follows PSR-4 namespace standards under `Vitrus\` mapping directly to `app/`.
- **Real-time SSE cURL Stream Proxy:** Dedicated streaming client proxies responses chunk-by-chunk directly from OpenRouter to the client with sub-second latency.
- **Premium React Assistant UI:** A stylish, slate-glass floating drawer globally injected into the WordPress administration screens.
- **Dynamic Model Synchronization:** Full OpenRouter model synchronization powered by WP-Cron background tasks and options triggers.
- **Strict Security Integration:** Built with WPCS compliance, CSRF verification, permission validation, and frontend XSS sanitation using DOMPurify.
- **Automated Zip Release Script:** A Python release script `bin/release.py` and `npm run zip` script wrapper to build stable zip archives.

### Detailed Features
- **Unified Entry (`vitrus.php`):** Implements a defensive Composer autoloader loader check, multisite installation guardrails (aborts network-wide loads using `wp_die()`), and hooks up plugin activation routines.
- **Plugin Bootstrapper (`app/Plugin.php`):** Serves as the central registry and subsystem bootstrapper, avoiding inline instantiation in the global scope.
- **Clean Deletion Handler (`uninstall.php`):** Completely purges database options (e.g., `vitrus_api_key`, `vitrus_model_list`) and transients upon plugin deletion to maintain site hygiene.
- **Streaming Client (`app/OpenRouterClient.php`):** Connects to OpenRouter using native PHP cURL streaming, disabling compression, clearing buffers, and supporting client abort monitoring.
- **REST Endpoints (`app/RestController.php`):** Exposes settings, model caching, and chat completion routes under the `/wp-json/vitrus/v1/` namespace with native `X-WP-Nonce` header verification.
- **Settings Sync (`app/ModelManager.php` & `app/Admin.php`):** Schedules background model list queries on API key change via WP-Cron.
- **Admin Assistant Frontend (React + TS):** Custom floating drawer UI, scoped style resets, settings dashboard, DOMPurify sanitization, and the custom `useChat` streaming hook.
