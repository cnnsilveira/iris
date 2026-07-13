# AGENTS.md — Vitrus WordPress Plugin

> Canonical agent instruction file. All AI agents (Claude, Gemini, Copilot, etc.) MUST follow these rules when modifying this codebase.

## Identity

- **Name:** Vitrus
- **Type:** WordPress plugin (GPL-2.0-or-later)
- **Namespace:** `Vitrus\`
- **Text Domain:** `vitrus`
- **Min PHP:** 7.4 | **Min WP:** 6.0
- **Version:** Read from `package.json` → `version`. When updating, change **all three** in lockstep: `package.json`, `vitrus.php` header, and `VITRUS_VERSION` in `app/Plugin.php`.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | PHP 7.4+, WordPress APIs, PSR-4 autoloading via Composer |
| Frontend | React 19, TypeScript (strict), Vite 6, SCSS (BEM) |
| API | OpenRouter (SSE streaming via native cURL) |
| Linting | PHPCS (WordPress-Core/Docs/Extra), ESLint + Prettier |
| Build | `npm run build` (tsc + Vite), output → `assets/dist/` |

---

## Directory Structure

```
vitrus/
├── app/                        # PHP classes — PSR-4 root (Vitrus\)
│   ├── Admin/                  # Admin hooks, settings, asset enqueuing
│   ├── Api/                    # REST controllers & route registration
│   ├── Chat/                   # Chat/streaming logic, OpenRouter client, debug logger
│   ├── Models/                 # Model sync, caching, WP-Cron tasks
│   └── Plugin.php              # Bootstrapper (always at root of app/)
├── resources/
│   ├── fonts/                  # WOFF2 font assets
│   ├── ts/                     # React + TypeScript source
│   │   ├── components/
│   │   │   ├── admin/          # Admin layout components
│   │   │   ├── chat/           # Chat feature components
│   │   │   ├── icons/          # Custom SVG icon components
│   │   │   └── settings/       # Settings feature components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Shared utilities and helpers
│   │   ├── types/              # Shared TypeScript type definitions
│   │   └── main.tsx            # Vite entry point
│   └── scss/
│       ├── styles/
│       │   ├── _chat-surface.scss # Shared chat surface styles
│       │   ├── _ds-tokens.scss # Design system token mappings
│       │   ├── _fonts.scss     # Font face definitions
│       │   ├── _markdown.scss  # Markdown rendering styles
│       │   ├── _tokens.scss    # Local design tokens
│       │   ├── _reset.scss     # Scoped CSS reset
│       │   └── components/     # Component-level SCSS partials
│       └── main.scss           # SCSS entry point
├── assets/dist/                # Build output (gitignored)
├── bin/                        # Utility scripts (release.py)
├── vitrus.php                  # Plugin bootstrap file
├── uninstall.php               # Cleanup on delete
├── composer.json
├── package.json
├── phpcs.xml
├── tsconfig.json
└── vite.config.ts
```

### Rules

- **Never** modify files inside `vendor/`, `node_modules/`, or `assets/dist/`.
- New PHP classes go into the appropriate sub-namespace directory under `app/`. Create the subdirectory if it doesn't exist.
- New React components go into feature folders under `resources/ts/components/<feature>/`.
- Co-locate feature-specific SCSS in `resources/scss/styles/components/` mirroring the TS feature folder name.
- The `@/*` path alias resolves to `resources/ts/*`. Always use it for imports.

---

## PHP Rules

### Naming & Autoloading (PSR-4)

- Namespace: `Vitrus\<SubNamespace>` maps to `app/<SubNamespace>/`.
- Class name === filename (PascalCase). Example: `Vitrus\Api\ChatController` → `app/Api/ChatController.php`.
- One class per file. No procedural code in `app/` (except `Plugin.php::init()`).

### Coding Standards

- Follow **WordPress-Core**, **WordPress-Docs**, and **WordPress-Extra** rulesets (see `phpcs.xml`).
- `WordPress.Files.FileName` is excluded for `app/` — PSR-4 PascalCase filenames are correct.
- Indent with **tabs**, not spaces.
- Always use Yoda conditions: `if ( 'value' === $var )`.
- Always use full PHP open tags: `<?php`. Never use short tags.

### PHPDoc (mandatory)

Every class, method, and non-trivial property MUST have a docblock:

```php
/**
 * Short summary (one line, imperative mood).
 *
 * Optional longer description.
 *
 * @since 0.2.0
 *
 * @param string $key The option key.
 * @return mixed|WP_Error The option value or error.
 */
```

- Use the **current target version** literally in `@since` tags (e.g., `@since 0.2.0`). Ask the project owner for the current target version if unknown.
- Include `@package Vitrus` in file-level docblocks.

### Error Handling

- All service/utility methods MUST return `WP_Error` on failure — **never** throw exceptions.
- REST callbacks translate `WP_Error` into appropriate HTTP responses via `rest_ensure_response()`.
- Pattern:

```php
$result = self::do_something();
if ( is_wp_error( $result ) ) {
    return $result; // Propagate up to REST layer.
}
```

### REST API

- Base namespace: `vitrus/v1`.
- Split endpoints into domain controllers: `ChatController`, `SettingsController`, `ModelsController`, etc.
- Each controller class exposes a static `init()` method that hooks into `rest_api_init`.
- All routes MUST enforce:
  - `permission_callback` checking `current_user_can( 'manage_options' )`.
  - Nonce verification via WP's built-in `X-WP-Nonce` header handling.
  - `sanitize_callback` on every `arg`.

### Database / Storage

- Use **`wp_options`** (`get_option` / `update_option` / `delete_option`) for all persistent storage.
- Prefix all option keys with `vitrus_` (e.g., `vitrus_api_key`, `vitrus_model_list`).
- Use **transients** for ephemeral/cached data only.
- On uninstall, every option and transient must be cleaned in `uninstall.php`.

### Hooks

- Prefix all custom hooks with `vitrus_` (e.g., `vitrus_sync_models_event`).
- Prefer `add_action` / `add_filter` inside the class `init()` method.
- Never use anonymous closures as hook callbacks — always use named static methods for traceability.

### Activation / Deactivation

- Activation logic goes in `vitrus_activate()` in `vitrus.php`.
- Deactivation cleanup goes in `vitrus_deactivate()` in `vitrus.php`.
- Deletion cleanup goes in `uninstall.php`.
- Multisite network-wide activation is intentionally blocked with `wp_die()`.

---

## Frontend Rules

### TypeScript

- **Strict mode** is enforced (`tsconfig.json` → `"strict": true`).
- No `any` types. Use `unknown` + type guards when type is genuinely unknown.
- Define shared types in `resources/ts/types/`.
- Use the `@/*` import alias. Never use relative `../../` paths crossing more than one level.

### React Components

- Functional components only. No class components.
- One component per file. Filename matches component name (PascalCase): `ChatDrawer.tsx` exports `ChatDrawer`.
- Use **React Context + custom hooks** for state management. No external state libraries.
- Context providers go in `resources/ts/contexts/`.
- Custom hooks go in `resources/ts/hooks/`, prefixed with `use` (e.g., `useChat.ts`).

### Styling (SCSS / BEM)

- All styles MUST be nested under `#vitrus-admin-root` to prevent collision with WP admin styles.
- Use strict **BEM** naming: `.vitrus-<block>__<element>--<modifier>`.
- Design tokens live in `_tokens.scss`. Never hardcode colors, font sizes, or spacing — use token variables.
- Imports: add new partials to `main.scss` via `@use` / `@forward`.

### Rendering / Security

- All markdown-to-HTML rendering MUST be sanitized via **DOMPurify** before insertion.
- Use `marked` for markdown parsing.
- Never use `dangerouslySetInnerHTML` without DOMPurify.

### Build

- Entry point: `resources/ts/main.tsx`.
- Output: `assets/dist/` (gitignored).
- Output filenames: `vitrus-admin.js`, `vitrus-admin.css`.
- Run `npm run build` to verify before committing.

---

## Security Checklist

Every agent MUST verify these before finalizing code:

| # | Rule | Applies to |
|---|---|---|
| 1 | **Nonce verification** — All form submissions and AJAX/REST calls must verify a nonce. REST endpoints use WP's built-in `X-WP-Nonce` header mechanism. | PHP |
| 2 | **Capability checks** — Every admin action must check `current_user_can()` with the appropriate capability. | PHP |
| 3 | **Input sanitization** — Sanitize ALL user input: `sanitize_text_field()`, `absint()`, `sanitize_email()`, etc. | PHP |
| 4 | **Output escaping** — Escape ALL output: `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`. | PHP |
| 5 | **Prepared statements** — Any direct `$wpdb` query MUST use `$wpdb->prepare()`. | PHP |
| 6 | **No direct file access** — Every PHP file must begin with an `ABSPATH` or `WP_UNINSTALL_PLUGIN` check. | PHP |
| 7 | **XSS prevention** — All rendered HTML from external/AI content must pass through DOMPurify. | TS/React |
| 8 | **No secrets in frontend** — API keys must never be exposed to client-side JS. Proxy all API calls through the REST layer. | TS/React |

---

## Git & Workflow

### Conventional Commits (mandatory)

Format: `<type>(<scope>): <short description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`, `test`.

Examples:
- `feat(chat): add conversation history persistence`
- `fix(api): handle empty model list response`

### Branching

- Create a feature branch from `main`: `feat/<short-name>` or `fix/<short-name>`.
- One logical change per branch. Keep PRs focused.

### Staging Discipline

- **Never** use `git add .` or `git add -A`. Only stage files directly related to the current task.
- Use `git add -p` (patch mode) when a file contains changes from the current task **and** unrelated changes — commit only the relevant hunks.
- Before committing, review `git diff --cached` to confirm every staged line belongs to the current task.

### Changelog

- Update `CHANGELOG.md` under an **`[Unreleased]`** section at the top.
- Group entries under `### Added`, `### Changed`, `### Fixed`, `### Removed`.
- The project owner finalizes version numbers during release.

### Pre-Commit Verification

Run these before committing:

```bash
# PHP
php -l app/Path/To/ModifiedFile.php
composer run lint

# Frontend
npm run build
```

---

## Testing

Testing is **encouraged but not mandatory** during the alpha phase.

- **PHP:** PHPUnit (when configured).
- **Frontend:** Vitest (when configured).
- At minimum, verify: `composer run lint` passes, `npm run build` succeeds, no runtime errors in browser console.

---

## Anti-Patterns (never do these)

- ❌ Add classes to the global namespace — always use `Vitrus\` or a sub-namespace.
- ❌ Use `echo` for JSON responses — use `wp_send_json_success()` / `wp_send_json_error()` or `rest_ensure_response()`.
- ❌ Register scripts/styles outside `wp_enqueue_scripts` / `admin_enqueue_scripts` hooks.
- ❌ Use `$_GET`, `$_POST`, `$_REQUEST` directly — use `WP_REST_Request` params or `sanitize_*` wrappers.
- ❌ Store sensitive data (API keys) unencrypted in client-accessible locations.
- ❌ Create custom database tables — use `wp_options` for all storage.
- ❌ Use anonymous closures as WordPress hook callbacks.
- ❌ Use relative imports crossing more than one directory level in TypeScript.
- ❌ Hardcode colors, sizes, or spacing in SCSS — use `_tokens.scss` variables.
- ❌ Skip DOMPurify when rendering AI/markdown content.

---

## Agent Behavior

These rules govern **how** agents interact with the project owner and approach tasks. They are non-negotiable.

### Core Principle: Ask, Don't Guess

When requirements are ambiguous, redundant, or underspecified, **always ask the owner for clarification** before proceeding. Never infer intent when the cost of being wrong is rework.

### Scope Discipline

- Do **exactly** what was asked — nothing more, nothing less.
- If you notice adjacent improvements (refactors, optimizations, style fixes), **flag them as suggestions** in your response but do NOT implement them unless explicitly asked.
- Never refactor code you weren't asked to touch. If refactoring is warranted, propose it and wait for approval.

### Planning Before Execution

- **Always** confirm the full scope before writing code. Present a brief plan or checklist for the owner to approve.
- For multi-file changes, outline which files will be created/modified and what each change accomplishes.

### Assumptions

- Explicitly surface any assumption that could lead to rework. Ask the owner to confirm before proceeding.
- Examples: "I'm assuming this endpoint should require `manage_options` capability — correct?" or "I'll place this in `app/Chat/` — is that the right domain?"

### Design Decisions

- When multiple valid implementation approaches exist, present **2–3 options** with trade-offs and a clear recommendation. Let the owner decide.
- Never silently pick an approach when alternatives exist.

### Dependencies

- **Never** add new npm or Composer packages without explicit approval.
- Propose the package, explain why it's needed, and wait for the go-ahead.

### Breaking Changes

- **Never** introduce breaking changes (API contracts, hook signatures, option key renames) without explicit approval.
- Document the impact, list affected consumers, and wait for confirmation.

### Code Deletion

- **Never** delete files, functions, or features without explicit approval — even if the code appears unused.
- If you believe something is dead code, flag it as a suggestion.

### Spotting Issues

- If you notice a bug, security issue, or anti-pattern in code **unrelated** to the current task, flag it clearly as a concern/suggestion but **continue with your assigned task**. Do not fix it unless asked.

### Existing Code Preservation

- Always preserve existing comments, docblocks, and documentation that are unrelated to your changes.
- Do not "clean up" or rewrite surrounding code for stylistic reasons.

### Communication Style

- Be **concise**. Focus on *what* changed and *why*.
- No tutorials, generic advice, or restating obvious information.
- When presenting code, show only the relevant diff — not entire files.

### File Output Location

- **Before** creating any non-source file (implementation plans, research notes, task lists, etc.), **ask the user** where to save it. Offer these options:
  - A. Project `docs/` directory
  - B. Agent's default output location
  - C. Both
  - D. Other (let the user specify)
- Never silently dump files outside the project without asking.
- This applies to every file type: `.md`, `.txt`, scratch notes, migration plans, etc.
