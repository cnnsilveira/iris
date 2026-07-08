import React, { useState, useEffect, useRef, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

interface ChatPageProps {
  onOpenSettings: () => void;
}

const Mark: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size * 0.78} viewBox="0 0 500 391" aria-hidden="true">
    <path d="M302.443 389.107H262.959L460.381 0H500L302.443 389.107Z" fill="currentColor" />
    <path d="M198.772 390.659L0 0H82.4784L198.637 231.169H200.459L317.765 0.0674947H400.715L200.121 390.659H198.772Z" fill="currentColor" />
  </svg>
);

/** WordPress "W" mark used by the exit-to-WordPress control. */
const WordPressMark: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 122.5 122.5" fill="currentColor" aria-hidden="true">
    <path d="M8.7 61.3a52.6 52.6 0 0 0 29.6 47.3L13.2 39.9a52.4 52.4 0 0 0-4.5 21.4zm88-2.7c0-6.5-2.3-11-4.3-14.5-2.7-4.3-5.2-8-5.2-12.3 0-4.8 3.7-9.3 8.9-9.3h.7A52.4 52.4 0 0 0 17.5 32.1h3.4c5.5 0 14-.7 14-.7 2.9-.2 3.2 4 .4 4.3 0 0-2.9.4-6 .5l19.1 56.9 11.5-34.4-8.2-22.5c-2.8-.1-5.5-.5-5.5-.5-2.8-.1-2.5-4.5.3-4.3 0 0 8.7.7 13.8.7 5.5 0 14-.7 14-.7 2.9-.2 3.2 4 .4 4.3 0 0-2.9.4-6 .5l19 56.5 5.3-17.6c2.4-7.3 3.4-12.6 3.4-17.2z" />
    <path d="M62.2 66 46.4 111.8a52.6 52.6 0 0 0 32.3-.8l-.4-.7zm45.3-29.9a52.4 52.4 0 0 1-19.7 70.5l16-46.3c3-7.5 4-13.5 4-18.8 0-1.9-.1-3.7-.3-5.4z" />
    <path d="M61.3 0a61.3 61.3 0 1 0 .1 122.7A61.3 61.3 0 0 0 61.3 0zm0 119.8a58.6 58.6 0 1 1 .1-117.2 58.6 58.6 0 0 1-.1 117.2z" />
  </svg>
);

/**
 * Format the time a message was sent. Message ids embed their creation time
 * as `role-<Date.now()>`, so the send time is derived without any stored
 * timestamp field. Returns "" when the id carries no parseable time.
 */
const messageTime = (id: string): string => {
  const ms = Number.parseInt(id.split("-")[1] ?? "", 10);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

/**
 * Main admin Chat page: immersive full-screen shell with a slim top bar
 * (WordPress exit + theme), the design-system sidebar, bubble-less assistant
 * turns, and the "Message Vitrus" composer.
 *
 * @since v0.2.0
 */
export const ChatPage: React.FC<ChatPageProps> = ({ onOpenSettings }) => {
  const {
    conversations, activeConversationId, setActiveConversationId,
    messages, isTyping, loading, sendMessage, startNewChat,
    renameConversation, deleteConversation, regenerateLast,
  } = useChat(false);

  const { theme, toggleTheme } = useTheme();

  const [input, setInput] = useState("");
  const [activeModel, setActiveModel] = useState("Select a model");
  const [convIdToDelete, setConvIdToDelete] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const restUrl = window.vitrusSettings?.restUrl || "/wp-json/vitrus/v1/";
  const nonce = window.vitrusSettings?.nonce || "";
  const currentUser = window.vitrusSettings?.currentUser;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers: Record<string, string> = {};
        if (nonce) headers["X-WP-Nonce"] = nonce;
        const res = await fetch(`${restUrl}settings`, { headers });
        if (res.ok) {
          const s = await res.json();
          if (s.model) setActiveModel(s.model.split("/").pop() || s.model);
        }
      } catch (e) { console.error("Error fetching settings for chat page", e); }
    };
    fetchSettings();
  }, [restUrl, nonce]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  const startNew = useCallback(() => { startNewChat(); }, [startNewChat]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "n" || e.key === "N")) { e.preventDefault(); startNew(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startNew]);

  const handleSend = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || isTyping) return;
    if (!text) setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
  };

  const handleExit = () => { window.location.href = "index.php"; };
  const toggleWpMenu = () => { document.body.classList.toggle("vitrus-show-wpmenu"); };
  const handleCopy = (content: string) => { void navigator.clipboard?.writeText(content); };

  const renderMarkdown = (content: string) => {
    try {
      const raw = marked.parse(content, { async: false }) as string;
      return { __html: DOMPurify.sanitize(raw) };
    } catch { return { __html: DOMPurify.sanitize(content) }; }
  };

  const promptSuggestions = [
    "Write a PHP function to filter the content of a WordPress post",
    "Explain the difference between WP_Query and get_posts",
    "Create a responsive SCSS layout token checklist",
  ];

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const lastMsg = messages[messages.length - 1];
  const canRegenerate = !isTyping && !!lastMsg && lastMsg.role === "assistant" && lastMsg.content !== "";

  const renderComposer = (opts?: { placeholder?: string; showLabel?: boolean }) => (
    <div className="vitrus-cp__composer">
      {opts?.showLabel !== false && <div className="vitrus-cp__composer-label">MESSAGE VITRUS</div>}
      <div className="vitrus-cp__composer-row">
        <textarea
          ref={textareaRef}
          className="vitrus-cp__textarea"
          placeholder={opts?.placeholder ?? "Ask a follow-up…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isTyping}
        />
        <button className="vitrus-cp__send" onClick={() => handleSend()} disabled={!input.trim() || isTyping} title="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="vitrus-chat-shell" data-vitrus-theme={theme}>
      <div className="vitrus-topbar">
        <div className="vitrus-topbar__group">
          <button className="vitrus-topbar__btn" onClick={handleExit} title="Exit to WordPress">
            <WordPressMark />
          </button>
          <button className="vitrus-topbar__btn" onClick={toggleWpMenu} title="Toggle WordPress menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="vitrus-topbar__group">
          <button className="vitrus-topbar__btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </div>

      <div className="vitrus-chat-body">
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          currentUser={currentUser}
          onSelect={setActiveConversationId}
          onNewChat={startNew}
          onRename={renameConversation}
          onRequestDelete={setConvIdToDelete}
          onOpenSettings={onOpenSettings}
        />

        <main className="vitrus-cp">
          <header className="vitrus-cp__header">
            <div className="vitrus-cp__header-info">
              <span className="vitrus-cp__header-title">{activeConv ? activeConv.title : "New conversation"}</span>
              <span className="vitrus-cp__header-sub">Vitrus · {activeModel}</span>
            </div>
          </header>

          <div className="vitrus-cp__body" ref={bodyRef}>
            {loading ? (
              <div className="vitrus-cp__loading"><div className="vitrus-cp__spinner" /></div>
            ) : messages.length === 0 ? (
              <div className="vitrus-cp__welcome">
                <div className="vitrus-cp__welcome-badge"><Mark size={26} /></div>
                <h1 className="vitrus-cp__welcome-title">Hi, I'm Vitrus.</h1>
                <p className="vitrus-cp__welcome-sub">Ask anything. I'll take it from here.</p>
                {renderComposer({ placeholder: "Ask Vitrus anything…", showLabel: false })}
                <div className="vitrus-cp__chips">
                  {promptSuggestions.map((s, i) => (
                    <button key={i} className="vitrus-cp__chip" onClick={() => handleSend(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="vitrus-cp__feed">
                {messages.map((msg, idx) => {
                  const time = messageTime(msg.id);
                  return msg.role === "assistant" ? (
                    <div key={msg.id} className="vitrus-cp__turn vitrus-cp__turn--ai">
                      <div className="vitrus-cp__turn-meta">
                        <span className="vitrus-cp__turn-mark"><Mark size={14} /></span>
                        <span>VITRUS</span>
                        {time && <span className="vitrus-cp__turn-time">{time}</span>}
                      </div>
                      {msg.content === "" && isTyping && idx === messages.length - 1 ? (
                        <div className="vitrus-cp__typing"><span /><span /><span /></div>
                      ) : (
                        <>
                          <div className="vitrus-cp__md" dangerouslySetInnerHTML={renderMarkdown(msg.content)} />
                          <div className="vitrus-cp__turn-actions">
                            <button onClick={() => handleCopy(msg.content)}>Copy</button>
                            {idx === messages.length - 1 && canRegenerate && (
                              <button onClick={() => regenerateLast()}>Regenerate</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div key={msg.id} className="vitrus-cp__turn vitrus-cp__turn--user">
                      <span className="vitrus-cp__turn-you">YOU{time ? ` · ${time}` : ""}</span>
                      <div className="vitrus-cp__bubble">{msg.content}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {messages.length > 0 && <footer className="vitrus-cp__footer">{renderComposer()}</footer>}
        </main>
      </div>

      {convIdToDelete && (
        <div className="vitrus-cp__overlay" onClick={() => setConvIdToDelete(null)}>
          <div className="vitrus-cp__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="vitrus-cp__modal-title">Delete conversation</h3>
            <p className="vitrus-cp__modal-msg">Are you sure? This action cannot be undone.</p>
            <div className="vitrus-cp__modal-actions">
              <button className="vitrus-cp__modal-btn" onClick={() => setConvIdToDelete(null)}>Cancel</button>
              <button className="vitrus-cp__modal-btn vitrus-cp__modal-btn--danger" onClick={() => { deleteConversation(convIdToDelete); setConvIdToDelete(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
