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

/**
 * Main admin Chat page: immersive full-screen shell with the design-system
 * sidebar, bubble-less assistant turns, and the "Message Vitrus" composer.
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

  const composer = (
    <div className="vitrus-cp__composer">
      <div className="vitrus-cp__composer-label">MESSAGE VITRUS</div>
      <div className="vitrus-cp__composer-row">
        <textarea
          ref={textareaRef}
          className="vitrus-cp__textarea"
          placeholder="Ask a follow-up…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onInput={handleTextareaInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isTyping}
        />
        <button className="vitrus-cp__send" onClick={() => handleSend()} disabled={!input.trim() || isTyping} title="Send">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="vitrus-chat-shell" data-vitrus-theme={theme}>
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        currentUser={currentUser}
        onSelect={setActiveConversationId}
        onNewChat={startNew}
        onRename={renameConversation}
        onRequestDelete={setConvIdToDelete}
        onOpenSettings={onOpenSettings}
        onExit={handleExit}
        onToggleWpMenu={toggleWpMenu}
      />

      <main className="vitrus-cp">
        <header className="vitrus-cp__header">
          <div className="vitrus-cp__header-info">
            <span className="vitrus-cp__header-title">{activeConv ? activeConv.title : "New conversation"}</span>
            <span className="vitrus-cp__header-sub">Vitrus · {activeModel}</span>
          </div>
          <div className="vitrus-cp__header-actions">
            <button className="vitrus-cp__icon-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              )}
            </button>
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
              {composer}
              <div className="vitrus-cp__chips">
                {promptSuggestions.map((s, i) => (
                  <button key={i} className="vitrus-cp__chip" onClick={() => handleSend(s)}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="vitrus-cp__feed">
              {messages.map((msg, idx) => msg.role === "assistant" ? (
                <div key={msg.id} className="vitrus-cp__turn vitrus-cp__turn--ai">
                  <div className="vitrus-cp__turn-meta"><span className="vitrus-cp__turn-mark"><Mark size={14} /></span>VITRUS</div>
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
                  <span className="vitrus-cp__turn-you">YOU</span>
                  <div className="vitrus-cp__bubble">{msg.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {messages.length > 0 && <footer className="vitrus-cp__footer">{composer}</footer>}
      </main>

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
