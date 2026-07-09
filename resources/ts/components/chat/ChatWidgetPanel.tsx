import React from "react";
import type { Message } from "@/hooks/useChat";
import type { VitrusTheme } from "@/hooks/useTheme";
import { renderMarkdown } from "@/lib/markdown";
import { messageTime } from "@/lib/messageTime";
import { WELCOME_SUB, WELCOME_TITLE } from "@/lib/copy";
import { Mark } from "@/components/icons/Mark";
import { ActionMenu } from "@/components/chat/ActionMenu";

interface ChatWidgetPanelProps {
  open: boolean;
  theme: VitrusTheme;
  messages: Message[];
  isTyping: boolean;
  input: string;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onToggleTheme: () => void;
  onNewChat: () => void;
  onOpenChatPage: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onTextareaInput: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}

/** Chevron pointing right: collapses the panel back to the right edge. */
const ChevronIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SendIcon: React.FC = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The docked Copilot panel: header, message body, composer. Presentational —
 * every piece of state is owned by ChatWidget.
 *
 * @since v0.3.0
 *
 * @param {ChatWidgetPanelProps} props Panel state and callbacks.
 * @return {React.ReactElement} The rendered panel.
 */
export const ChatWidgetPanel: React.FC<ChatWidgetPanelProps> = ({
  open, theme, messages, isTyping, input, bodyRef, textareaRef,
  onToggleTheme, onNewChat, onOpenChatPage, onOpenSettings, onClose,
  onInputChange, onTextareaInput, onKeyDown, onSend,
}) => (
  <div
    className={`vitrus-panel${open ? " vitrus-panel--open" : ""}`}
    role="complementary"
    aria-label="Vitrus Copilot"
    inert={!open}
  >
    <div className="vitrus-panel__header">
      <div className="vitrus-panel__brand">
        <span className="vitrus-panel__brand-mark">
          <Mark width={13} height={10} />
        </span>
        <span className="vitrus-panel__brand-name">
          <span className="vitrus-panel__name">Vitrus</span>
          <span className="vitrus-panel__kicker">COPILOT</span>
        </span>
      </div>
      <div className="vitrus-panel__actions">
        <ActionMenu
          triggerClassName="vitrus-panel__action"
          items={[
            { label: "New chat", onClick: onNewChat },
            { label: "Chat page", onClick: onOpenChatPage },
            { label: theme === "dark" ? "Light mode" : "Dark mode", onClick: onToggleTheme },
            { label: "Settings", onClick: onOpenSettings },
          ]}
        />
        <button
          type="button"
          className="vitrus-panel__action"
          onClick={onClose}
          title="Close"
          aria-label="Close Vitrus Copilot"
        >
          <ChevronIcon />
        </button>
      </div>
    </div>

    <div className="vitrus-panel__body" ref={bodyRef}>
      {messages.length === 0 ? (
        <div className="vitrus-panel__welcome">
          <h1 className="vitrus-panel__welcome-title">{WELCOME_TITLE}</h1>
          <p className="vitrus-panel__welcome-sub">{WELCOME_SUB}</p>
        </div>
      ) : (
        messages.map((msg, idx) => {
          const time = messageTime(msg.id);
          return msg.role === "assistant" ? (
            <div key={msg.id} className="vitrus-panel__turn">
              <div className="vitrus-panel__meta">
                <span className="vitrus-panel__meta-mark">
                  <Mark width={12} height={10} />
                </span>
                <span className="vitrus-panel__who">VITRUS</span>
                {time && <span className="vitrus-panel__time">{time}</span>}
              </div>
              {msg.content === "" && isTyping && idx === messages.length - 1 ? (
                <div className="vitrus-panel__typing"><span /><span /><span /></div>
              ) : (
                <div className="vitrus-panel__md" dangerouslySetInnerHTML={renderMarkdown(msg.content)} />
              )}
            </div>
          ) : (
            <div key={msg.id} className="vitrus-panel__turn vitrus-panel__turn--user">
              <span className="vitrus-panel__you">YOU{time ? ` · ${time}` : ""}</span>
              <div className="vitrus-panel__bubble">{msg.content}</div>
            </div>
          );
        })
      )}
    </div>

    <div className="vitrus-panel__composer">
      <div className="vitrus-panel__field">
        <textarea
          ref={textareaRef}
          className="vitrus-panel__textarea"
          placeholder="Ask a follow-up…"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onInput={onTextareaInput}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={isTyping}
        />
        <button
          type="button"
          className="vitrus-panel__send"
          onClick={onSend}
          disabled={!input.trim() || isTyping}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  </div>
);
