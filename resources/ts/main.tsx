/**
 * Frontend initialization and entry point for the Vitrus admin interfaces.
 *
 * @package Vitrus
 * @since   v0.1.0
 */

import "@/types/vitrus";
import React from "react";
import { createRoot } from "react-dom/client";
import { ChatPage } from "./components/chat/ChatPage";
import { SettingsDashboard } from "./components/settings/SettingsDashboard";
import { ChatWidget } from "./components/chat/ChatWidget";
import "../scss/main.scss";

// Conditionally mount Chat Page
const chatPageContainer = document.getElementById("vitrus-chat-page-root");
if (chatPageContainer) {
  createRoot(chatPageContainer).render(
    <React.StrictMode>
      <ChatPage onOpenSettings={() => {
        window.location.href = "admin.php?page=vitrus-settings";
      }} />
    </React.StrictMode>,
  );
}

// Conditionally mount Settings Dashboard
const settingsPageContainer = document.getElementById("vitrus-settings-page-root");
if (settingsPageContainer) {
  createRoot(settingsPageContainer).render(
    <React.StrictMode>
      <SettingsDashboard onBackToChat={() => {
        window.location.href = "admin.php?page=vitrus";
      }} />
    </React.StrictMode>,
  );
}

// Conditionally mount the floating Copilot widget
const chatContainer = document.getElementById("vitrus-chat-root");
if (chatContainer) {
  createRoot(chatContainer).render(
    <React.StrictMode>
      <ChatWidget />
    </React.StrictMode>,
  );
}
