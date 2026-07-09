import React, { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";
import { useAutosizeTextarea } from "@/hooks/useAutosizeTextarea";
import { canRegenerate, copyMessage } from "@/lib/chat";
import { ChatWidgetLauncher } from "@/components/chat/ChatWidgetLauncher";
import { ChatWidgetPanel } from "@/components/chat/ChatWidgetPanel";

/**
 * The floating Copilot widget: a launcher pill and the docked side panel it
 * opens. Injected into the admin footer of every screen except the Chat and
 * Settings pages.
 *
 * Owns the open state (persisted, since wp-admin navigation is a full page
 * load) and the composer input. Conversation state lives in useChat, and is
 * namespaced away from the Chat page's thread by the `isDrawer` flag.
 *
 * @since v0.3.0
 *
 * @return {React.ReactElement} The rendered widget.
 */
export const ChatWidget: React.FC = () => {
  const siteHash = window.vitrusSettings?.siteHash || "default";
  const openKey = `vitrus_widget_open_${siteHash}`;

  const [isOpen, setIsOpen] = useState(() => localStorage.getItem(openKey) === "1");
  const [input, setInput] = useState("");

  const { messages, isTyping, sendMessage, startNewChat, regenerateLast } = useChat(true);
  const { theme, toggleTheme } = useTheme("vitrus_widget_theme");

  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { resize: resizeTextarea, reset: resetTextarea } = useAutosizeTextarea(textareaRef);

  useEffect(() => {
    localStorage.setItem(openKey, isOpen ? "1" : "0");
  }, [isOpen, openKey]);

  // Keep the feed pinned to the newest message as tokens stream in.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  // Escape closes the panel, unless the user is mid-draft in the composer or
  // the overflow menu is open — that Escape belongs to the menu, which closes
  // itself.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const drafting = document.activeElement === textareaRef.current && input.trim() !== "";
      const menuOpen = !!document.querySelector(".vitrus-menu");
      if (!drafting && !menuOpen) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, input, close]);

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isTyping) return;
    setInput("");
    resetTextarea();
    await sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="vitrus-widget" data-vitrus-theme={theme}>
      <ChatWidgetLauncher open={isOpen} onClick={() => setIsOpen(true)} />
      <ChatWidgetPanel
        open={isOpen}
        theme={theme}
        messages={messages}
        isTyping={isTyping}
        input={input}
        bodyRef={bodyRef}
        textareaRef={textareaRef}
        canRegenerate={canRegenerate(messages, isTyping)}
        onToggleTheme={toggleTheme}
        onNewChat={startNewChat}
        onOpenChatPage={() => { window.location.href = "admin.php?page=vitrus"; }}
        onOpenSettings={() => { window.location.href = "admin.php?page=vitrus-settings"; }}
        onCopy={copyMessage}
        onRegenerate={() => { void regenerateLast(); }}
        onClose={close}
        onInputChange={setInput}
        onTextareaInput={resizeTextarea}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
      />
    </div>
  );
};
