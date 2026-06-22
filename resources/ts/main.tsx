/**
 * Frontend initialization and entry point for the Iris admin interfaces.
 *
 * @package Iris
 * @since   v0.1.0
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { SettingsDashboard } from "./components/SettingsDashboard";
import { ChatDrawer } from "./components/ChatDrawer";
import "../scss/main.scss";

/**
 * Declared settings localized from WordPress backend.
 *
 * @since v0.1.0
 */
interface IrisSettings {
  /** Security nonce for WordPress REST API authentication. */
  nonce: string;
  /** Root URL for Iris REST endpoints. */
  restUrl: string;
  /** MD5 hash of the site URL for storage compartmentalization. */
  siteHash: string;
  /** Flag to check if current page is the settings screen. */
  isSettingsPage: boolean;
}

declare global {
  interface Window {
    irisSettings?: IrisSettings;
  }
}

// Conditionally mount Settings Dashboard
const adminContainer = document.getElementById("iris-admin-root");
if (adminContainer) {
  createRoot(adminContainer).render(
    <React.StrictMode>
      <SettingsDashboard />
    </React.StrictMode>,
  );
}

// Conditionally mount Chat Drawer
const chatContainer = document.getElementById("iris-chat-root");
if (chatContainer) {
  createRoot(chatContainer).render(
    <React.StrictMode>
      <ChatDrawer />
    </React.StrictMode>,
  );
}
