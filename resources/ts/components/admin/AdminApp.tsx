import React, { useState } from "react";
import { ChatPage } from "../chat/ChatPage";
import { SettingsDashboard } from "../settings/SettingsDashboard";

/**
 * AdminApp Component.
 *
 * Serves as the primary coordinator for the Iris administrator screen,
 * toggling views between the main AI Chat interface and settings dashboard.
 *
 * @since v0.2.0
 *
 * @returns {React.ReactElement} The active admin view screen.
 */
export const AdminApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<"chat" | "settings">("chat");

  if (currentView === "settings") {
    return (
      <SettingsDashboard onBackToChat={() => setCurrentView("chat")} />
    );
  }

  return (
    <ChatPage onOpenSettings={() => setCurrentView("settings")} />
  );
};
