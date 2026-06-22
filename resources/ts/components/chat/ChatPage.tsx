import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useChat } from "@/hooks/useChat";

interface ChatPageProps {
  onOpenSettings: () => void;
}

/**
 * ChatPage Component.
 *
 * Renders the main Gemini/ChatGPT style chat interface inside the admin panel.
 * Features a main message pane and a collapsible right sidebar for conversation history.
 *
 * @since v0.2.0
 *
 * @param {ChatPageProps} props Component props.
 * @returns {React.ReactElement} The rendered React component layout.
 */
export const ChatPage: React.FC<ChatPageProps> = ({ onOpenSettings }) => {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    isTyping,
    loading,
    sendMessage,
    startNewChat,
    renameConversation,
    deleteConversation,
  } = useChat(false); // main page chat instance

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModel, setActiveModel] = useState("Select a model...");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const chatBodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const restUrl = window.irisSettings?.restUrl || "/wp-json/iris/v1/";
  const nonce = window.irisSettings?.nonce || "";

  // Fetch active model from settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers: Record<string, string> = {};
        if (nonce) headers["X-WP-Nonce"] = nonce;
        const response = await fetch(`${restUrl}settings`, { headers });
        if (response.ok) {
          const settings = await response.json();
          if (settings.model) {
            setActiveModel(settings.model.split("/").pop() || settings.model);
          }
        }
      } catch (e) {
        console.error("Error fetching settings for chat page", e);
      }
    };
    fetchSettings();
  }, [restUrl, nonce]);

  // Focus editing input when active
  useEffect(() => {
    if (editingConvId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingConvId]);

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isTyping) return;

    if (!textToSend) {
      setInput("");
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  };

  const handleRenameStart = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(id);
    setEditingTitle(currentTitle);
  };

  const handleRenameSave = async (id: string) => {
    if (editingTitle.trim()) {
      await renameConversation(id, editingTitle.trim());
    }
    setEditingConvId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === "Enter") {
      handleRenameSave(id);
    } else if (e.key === "Escape") {
      setEditingConvId(null);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      deleteConversation(id);
    }
  };

  const renderMarkdown = (content: string) => {
    try {
      const rawHtml = marked.parse(content, { async: false }) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      return { __html: cleanHtml };
    } catch (e) {
      return { __html: DOMPurify.sanitize(content) };
    }
  };

  const promptSuggestions = [
    "Write a PHP function to filter the content of a WordPress post",
    "Explain the difference between WP_Query and get_posts",
    "Create a responsive SCSS layout token checklist",
  ];

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="iris-chat-page">
      {/* Main Chat Area */}
      <div className="iris-chat-page__main">
        {/* Header */}
        <header className="iris-chat-page__header">
          <div className="iris-chat-page__header-title-group">
            <h1 className="iris-chat-page__header-title">
              {activeConv ? activeConv.title : "New Conversation"}
            </h1>
            <span className="iris-chat-page__header-meta">
              Model: {activeModel}
            </span>
          </div>

          <div className="iris-chat-page__header-actions">
            <button
              className={`iris-chat-page__sidebar-toggle ${sidebarOpen ? "iris-chat-page__sidebar-toggle--active" : ""}`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                width="20"
                height="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H14V5H19V19ZM12 19H5V5H12V19Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Message Feed */}
        <div className="iris-chat-page__body" ref={chatBodyRef}>
          {loading ? (
            <div className="iris-chat-page__loading">
              <div className="iris-chat-page__spinner"></div>
              <p>Loading history...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="iris-chat-page__empty-state">
              <div className="iris-chat-page__welcome-logo">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  width="64"
                  height="64"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="iris-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7e22ce" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                    fill="url(#iris-grad)"
                  />
                </svg>
              </div>
              <h2 className="iris-chat-page__welcome-title">How can Iris help you?</h2>
              <p className="iris-chat-page__welcome-subtitle">
                Ask me about theme configuration, custom plugin logic, database
                performance, or standard WordPress core practices.
              </p>
              <div className="iris-chat-page__suggestions">
                {promptSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="iris-chat-page__suggestion-card"
                    onClick={() => handleSend(suggestion)}
                  >
                    <span className="iris-chat-page__suggestion-text">
                      {suggestion}
                    </span>
                    <span className="iris-chat-page__suggestion-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="iris-chat-page__messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`iris-chat-page__message iris-chat-page__message--${msg.role}`}
                >
                  <div className="iris-chat-page__avatar-wrapper">
                    {msg.role === "user" ? (
                      <div className="iris-chat-page__avatar iris-chat-page__avatar--user">
                        U
                      </div>
                    ) : (
                      <div className="iris-chat-page__avatar iris-chat-page__avatar--ai">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          width="18"
                          height="18"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="iris-chat-page__bubble">
                    {msg.content === "" && isTyping ? (
                      <div className="iris-chat-page__typing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    ) : (
                      <div
                        className="iris-chat-page__message-content"
                        dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <footer className="iris-chat-page__footer">
          <div className="iris-chat-page__input-container">
            <textarea
              ref={textareaRef}
              className="iris-chat-page__textarea"
              placeholder="Message Iris..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping}
            />
            <button
              className="iris-chat-page__send-button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              title="Send Message"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                width="18"
                height="18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
          <div className="iris-chat-page__footer-note">
            Iris answers using the active OpenRouter model.
          </div>
        </footer>
      </div>

      {/* Right Sidebar (Collapsible) */}
      <aside
        className={`iris-chat-page__sidebar ${sidebarOpen ? "iris-chat-page__sidebar--open" : ""}`}
      >
        {/* Sidebar Header */}
        <div className="iris-chat-page__sidebar-header">
          <button
            className="iris-chat-page__new-chat-btn"
            onClick={startNewChat}
            title="Start a new conversation thread"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              width="18"
              height="18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                fill="currentColor"
              />
            </svg>
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="iris-chat-page__sidebar-list">
          {conversations.length === 0 ? (
            <div className="iris-chat-page__sidebar-empty">
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`iris-chat-page__history-item ${activeConversationId === conv.id ? "iris-chat-page__history-item--active" : ""}`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                <svg
                  className="iris-chat-page__history-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  width="16"
                  height="16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
                    fill="currentColor"
                  />
                </svg>

                {editingConvId === conv.id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    className="iris-chat-page__rename-input"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => handleRenameSave(conv.id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, conv.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="iris-chat-page__history-title">
                    {conv.title}
                  </span>
                )}

                {editingConvId !== conv.id && (
                  <div className="iris-chat-page__history-actions">
                    <button
                      className="iris-chat-page__history-action-btn"
                      onClick={(e) => handleRenameStart(conv.id, conv.title, e)}
                      title="Rename"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        width="14"
                        height="14"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                    <button
                      className="iris-chat-page__history-action-btn"
                      onClick={(e) => handleDeleteClick(conv.id, e)}
                      title="Delete"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        width="14"
                        height="14"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="iris-chat-page__sidebar-footer">
          <div className="iris-chat-page__sidebar-footer-brand">
            <span className="iris-chat-page__sidebar-logo-text">Iris Copilot</span>
          </div>
          <button
            className="iris-chat-page__settings-btn"
            onClick={onOpenSettings}
            title="Open settings page"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              width="20"
              height="20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </aside>
    </div>
  );
};
