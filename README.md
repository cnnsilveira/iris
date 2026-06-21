# Iris - The Premium WordPress AI Assistant

Iris is an enterprise-grade WordPress AI Assistant plugin leveraging the OpenRouter API. It provides a sleek, real-time streaming assistant to help administrators manage their sites, draft content, and troubleshoot issues directly from the WordPress Admin dashboard.

---

## Key Features

1. **Admin settings panel:** Register a dedicated menu page to manage configurations securely.
2. **OpenRouter key masking:** Protects keys on the frontend while routing them server-side, with full support for constant overrides (`IRIS_OPENROUTER_API_KEY`) in `wp-config.php`.
3. **Dynamic model sync & search:** Search through all available OpenRouter models via a dynamic settings interface, featuring a toggle to filter for **Free models only**.
4. **Floating chat drawer:** A beautiful, globally-accessible drawer injected on admin screens for administrators, featuring a violet/slate glassmorphic custom design.
5. **Real-time SSE proxy streaming:** Streams completion chunks character-by-character from OpenRouter using optimized PHP cURL streaming.
6. **Robust style encapsulation:** Uses strict SASS nesting and CSS resets to prevent layout bleeding in or out of the chat drawer.
7. **GDPR compliant context telemetry:** An opt-in settings toggle allowing the assistant to gather site environment metrics (WordPress version, active plugins, active theme, PHP version) to provide smart, context-aware answers.
8. **Browser session persistence:** Unified localStorage chat history namespaced using server-side URL hashing to prevent collisions in staging and local environments.
9. **Database hygiene:** Full cleanup capabilities via `uninstall.php` to purge settings when the plugin is deleted.

---

## Installation & Setup

### Prerequisites
* WordPress 5.8+
* PHP 7.4+ (cURL extension enabled)
* Composer
* Node.js & npm

### Development Installation
1. Clone or copy the plugin into your `wp-content/plugins/` directory.
2. Navigate to the plugin root:
   ```bash
   cd wp-content/plugins/iris
   ```
3. Install PHP dependencies and autoloader:
   ```bash
   composer install
   ```
4. Install frontend dependencies:
   ```bash
   npm install
   ```
5. Compile and bundle frontend assets using Vite:
   * **Development Mode (Hot Reloading / File Watcher):**
     ```bash
     npm run dev
     ```
   * **Production Compilation (Minified static files):**
     ```bash
     npm run build
     ```
6. Activate the **Iris** plugin inside the WordPress Admin "Plugins" screen.

---

## Developer Commands & Code Standards

The plugin maintains strict adherence to WordPress Coding Standards (WPCS) for PHP, and Prettier/ESLint for React.

* **Linting & Formatting PHP:**
  ```bash
  composer run lint
  ```
* **Linting Frontend TSX/SASS:**
  ```bash
  npm run lint
  ```
* **Production Build Verification:**
  ```bash
  npm run build
  ```

---

## Class Directory Layout

```
iris/
├── src/                         # PHP Source Files (PSR-4 Namespaced under Iris\)
│   ├── Plugin.php               # Bootstrapper Orchestrator
│   ├── Admin.php                # Sidebar screens, option settings hooks, asset enqueuing
│   ├── RestController.php       # API route registration, schema validation checks, access gates
│   ├── OpenRouterClient.php     # cURL SSE connection stream controller
│   └── ModelManager.php         # Model caching option hydrators & Cron sync registers
├── admin/                       # React Frontend Project
│   └── src/                     # React + TSX + SASS development source code
├── assets/
│   └── dist/                    # Transpiled and minified build targets (JS/CSS)
├── iris.php                     # Global bootstrap file
├── uninstall.php                # Option database purger
└── composer.json                # Composer settings
```

---

## License

This project is licensed under the MIT License.