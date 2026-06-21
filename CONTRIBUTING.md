# Contributing to Iris

Thank you for contributing to Iris! To maintain a high-quality, secure, and performant codebase, please follow the guidelines and coding standards outlined below.

---

## 1. Directory Structure & Layout

The project enforces a strict separation of concerns between backend PHP business logic and frontend React components:

```
iris/
├── src/                         # Backend PSR-4 PHP source files (Namespace: Iris)
│   ├── Plugin.php               # Bootstrapper Orchestrator
│   ├── Admin.php                # Admin hooks & asset enqueuing
│   ├── RestController.php       # API endpoints & schema checks
│   ├── OpenRouterClient.php     # OpenRouter cURL SSE client
│   └── ModelManager.php         # Model caching & transients
├── admin/                       # React Frontend Project
│   └── src/                     # React + TypeScript + SASS development source code
├── assets/
│   └── dist/                    # Minified static build targets (JS/CSS) enqueued by PHP
├── iris.php                     # Global bootstrap file
├── uninstall.php                # Option database purger
├── composer.json                # PHP dependency management
├── package.json                 # Node dependency management
└── phpcs.xml                    # PHP CodeSniffer settings
```

---

## 2. Naming Conventions & Standards

### 2.1. Backend (PHP)
* **Namespaces:** All PHP classes must belong to the `Iris` namespace or its sub-namespaces (e.g. `namespace Iris;`).
* **Autoloading (PSR-4):** Filenames and casings must map *exactly* to class names and namespaces. For example:
  * Class `Iris\Admin` must reside in `src/Admin.php`.
  * Class `Iris\OpenRouterClient` must reside in `src/OpenRouterClient.php`.
* **Coding Standards (WPCS):** The PHP code conforms to WordPress Coding Standards (WPCS). We utilize PHP_CodeSniffer (`phpcs`) to check formatting, secure escaping/sanitization, and nonce verification.
  * *Exception:* The `WordPress.Files.FileName` rule is excluded for files in the `src/` directory to support standard PSR-4 naming rules.

### 2.2. Frontend (React / TSX / SASS)
* **Component Naming:** React components must be written in TypeScript (`.tsx`) and use PascalCase filenames (e.g. `ChatDrawer.tsx`).
* **Styling Isolation:** All stylesheets must be written in SASS (`.scss`) and nested entirely under the `#iris-admin-root` container wrapper.
* **BEM Scoping:** Use strict Block-Element-Modifier (BEM) naming conventions for all drawer-specific class names (e.g. `.iris-drawer-wrap`, `.iris-drawer__button--active`) to prevent collision with WordPress admin dashboard classes.
* **Sanitization:** All markdown output rendering must be sanitized on the client side using `DOMPurify` to prevent Admin Cross-Site Scripting (XSS) injection.

---

## 3. Git Commit Conventions

We strictly follow the **Conventional Commits** specification for all commit logs. This ensures a clean and readable repository history:

Format: `<type>(<scope>): <short description>`

*   **`feat`:** A new feature (e.g., `feat(chat): implement SSE proxy client`)
*   **`fix`:** A bug fix (e.g., `fix(autoloader): prevent fatal error if vendor is missing`)
*   **`docs`:** Documentation only changes (e.g., `docs(contributing): define naming conventions`)
*   **`style`:** Changes that do not affect the meaning of the code (e.g., white-space, formatting, CSS reset alignments)
*   **`refactor`:** A code change that neither fixes a bug nor adds a feature
*   **`chore`:** Updating build tasks, package manager configs, or auxiliary tools (e.g., `chore(deps): update npm packages`)
*   **`test`:** Adding missing tests or correcting existing tests

---

## 4. Verification Workflow (Before Committing)

Before staging and committing your code, you must execute validation checks locally to ensure no broken states are pushed to the repository:

### 4.1. PHP Code Checks
1. Check file syntax using PHP Lint:
   ```bash
   php -l src/ModifiedFile.php
   ```
2. Check coding standards:
   ```bash
   composer run lint
   ```

### 4.2. Frontend Assets Compilation Checks
1. Run Vite production compilation to verify TypeScript type checks and minification success:
   ```bash
   npm run build
   ```
