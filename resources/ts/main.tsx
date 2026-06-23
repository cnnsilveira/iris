/**
 * Frontend initialization and entry point for the Iris admin interfaces.
 *
 * @package Iris
 * @since   v0.1.0
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { ChatPage } from "./components/chat/ChatPage";
import { SettingsDashboard } from "./components/settings/SettingsDashboard";
import { ChatDrawer } from "./components/chat/ChatDrawer";
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

// Conditionally mount Chat Page
const chatPageContainer = document.getElementById("iris-chat-page-root");
if (chatPageContainer) {
  createRoot(chatPageContainer).render(
    <React.StrictMode>
      <ChatPage onOpenSettings={() => {
        window.location.href = "admin.php?page=iris-settings";
      }} />
    </React.StrictMode>,
  );
}

// Conditionally mount Settings Dashboard
const settingsPageContainer = document.getElementById("iris-settings-page-root");
if (settingsPageContainer) {
  createRoot(settingsPageContainer).render(
    <React.StrictMode>
      <SettingsDashboard onBackToChat={() => {
        window.location.href = "admin.php?page=iris";
      }} />
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
