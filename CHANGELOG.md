# Vitrus Changelog

All notable changes to the Vitrus WordPress plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-07-13

### Added
- **Self-Hosted Red Hat Mono:** Downloaded and self-hosted the "Red Hat Mono" font (weights 400, 500, 600, and 700) within the plugin, replacing external resource dependencies to preserve GDPR compliance.
- **Immersive Full-Screen Chat:** Added a distraction-free full-screen mode that hides the WordPress admin bar and menu, featuring a top bar with a WordPress-exit button, theme toggle, and menu toggle.
- **Message Timestamps:** Display the time each message was sent under chat turns.
- **Conversation Search & Date Grouping:** Added conversation filtering by title, date grouping (Today / Yesterday / Earlier), and user profile details in the sidebar footer.
- **Overflow Action Menus:** Introduced a three-dots menu in both the chat header and sidebar rows for renaming and deleting conversations.
- **Regenerate Response:** Added a button to re-run the assistant's last reply.
- **Delete Chat Confirmation Modal:** Added a glassmorphic deletion confirmation modal, replacing the browser-native popup.

### Changed
- **Plugin Rebrand — Iris → Vitrus (BREAKING):** Renamed the plugin from **Iris** to **Vitrus** to avoid naming collisions. This clean-break rename does not automatically migrate data, requiring settings re-configuration. Updates include renaming directory structure, entry files, text domains, PHP namespaces, database options, REST routes, and asset/BEM class prefixes.
- **Default Token Limit Upgrade:** Upgraded the default `max_tokens` from `1024` to `4096` to support reasoning-heavy models.
- **Floating Widget Redesign — Docked Copilot Sidebar (BREAKING VISUAL CHANGE):** Replaced the bottom-right chat-box drawer with a docked sidebar panel aligned with the Vitrus Copilot design system. Added Escape key controls, state persistence across page loads, and independent theme configuration. Removed suggestion chips, welcome icon, and header model name.
- **Widget Boot Behaviour:** Optimized loading behavior by enqueuing the admin bundle with a `defer` strategy and delaying widget rendering until conversation details load.
- **Copy / Regenerate in the Widget:** Added Copy and Regenerate actions beneath assistant replies in the widget and shared selection styles across surfaces.
- **Shared Action Menu:** Refactored the Action Menu to be shared between surfaces, resolving rendering and clipping issues in the widget.
- **Shared Chat Foundations:** Consolidated shared markdown parsing (with DOMPurify sanitization), timestamps, SVG icons, and typography tokens into unified helper modules to support independent theme toggling.
- **Chat Page Redesign — "Vitrus Copilot" Design System:** Rebuilt the admin Chat page with a new visual identity using OKLCH design tokens, self-hosted fonts, and bubble-less turns, with styling hardened against WordPress admin CSS bleed.

### Fixed
- **Duplicate Typing Animation Dots:** Fixed a bug where historical empty chat bubbles displayed typing animation dots.
- **Empty API Response Handlers:** Added checks for empty API responses, warning users when token limits are reached or streams end unexpectedly.
- **History Action Button Hover:** Fixed a Sass nesting bug that compiled duplicate selectors and prevented rename/delete buttons from appearing on hover.

## [0.2.0-alpha] - 2026-06-22

### Added
- **System Prompt Tabbed Editor:** Added a "Markdown" and "Preview" toggle with styled preview pane elements and monospaced font options.
- **Main Chat Page:** Introduced a native WordPress admin Chat page registered under the top-level **Vitrus** menu.
- **Collapsible History Sidebar:** Created a two-column ChatGPT/Gemini-style layout for recent conversations, badging, and a settings switcher.
- **Server-Side Conversation Persistence:** Added endpoints to sync multi-session chat histories directly to WordPress user metadata.
- **AI Assistant Message Balloons:** Added chat bubble styling using theme design tokens.
- **Developer Debug Logging:** Implemented structured connection log files (`vitrus-debug.log`) with authorization token masking, toggle switches, and cleanup during plugin uninstall.

### Changed
- **WordPress Admin Submenus:** Split plugin screens into submenus with standard page routing.
- **Mount Container Separation:** Split Chat and Settings into independent mount containers with scoped SCSS resets.
- **Drawer Visibility Logic:** Configured the floating drawer to hide when browsing Chat or Settings submenus.
- **WP Body Padding Reset:** Zeroed out WordPress body padding on plugin pages to prevent double scrollbars.
- **Drawer History Sync:** Linked the quick chat drawer to the shared server-side user database.
- **Folder and Namespace Restructuring:** Reorganized directory layout and namespacing to match standard PHP and React conventions.
- **WP Menu Position:** Positioned the main plugin menu higher up in the WordPress admin sidebar.

### Fixed
- **Chatbox HR Styling:** Adjusted horizontal rule styling within chat messages to align with theme design tokens.
- **SSE Stream Error Propagation:** Resolved hanging state issues by displaying OpenRouter stream error payloads directly in chat bubbles.
- **False 200 Stream Status & Upstream Error Handling:** Deferred sending HTTP 200 stream headers until upstream connection validation completes, allowing rate limit status codes (e.g., 429) to propagate to the frontend.

## [0.1.0-alpha] - 2026-06-21

### Added
- **Decoupled Backend Architecture:** Structured app code using PSR-4 standards under the `Vitrus\` namespace mapping directly to the `app/` directory.
  - Added centralized bootstrapper ([Plugin.php](file:///home/caionunes/projects/wp/iris/web/app/plugins/vitrus/app/Plugin.php)) and autoloader validation checks.
  - Added [uninstall.php](file:///home/caionunes/projects/wp/iris/web/app/plugins/vitrus/uninstall.php) routines to completely purge options and transients upon deletion.
- **Real-time SSE cURL Stream Proxy:** Added a dedicated streaming client ([OpenRouterClient.php](file:///home/caionunes/projects/wp/iris/web/app/plugins/vitrus/app/Chat/OpenRouterClient.php)) to proxy responses directly from OpenRouter with sub-second latency.
- **Premium React Assistant UI:** Built a stylish, slate-glass floating drawer globally injected into the WordPress administration screens.
- **Dynamic Model Synchronization:** Schedules background model list queries on API key change via WP-Cron.
- **Strict Security Integration:** Integrated CSRF verification, capability checks, and frontend XSS sanitation using DOMPurify.
- **Automated Release Script:** Created a release packaging script (`bin/release.py`) to build stable zip archives.

[Unreleased]: https://github.com/cnnsilveira/iris/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/cnnsilveira/iris/compare/v0.2.0-alpha...v0.3.0
[0.2.0-alpha]: https://github.com/cnnsilveira/iris/compare/v0.1.0-alpha...v0.2.0-alpha
[0.1.0-alpha]: https://github.com/cnnsilveira/iris/releases/tag/v0.1.0-alpha
