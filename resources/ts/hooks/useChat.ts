import { useState, useEffect } from "react";

/**
 * Chat conversation message interface.
 *
 * @since v0.1.0
 */
export interface Message {
  /** Message sender role. */
  role: "user" | "assistant";
  /** Text message content. */
  content: string;
  /** Unique message ID. */
  id: string;
}

/**
 * Chat conversation session interface.
 *
 * @since v0.2.0
 */
export interface Conversation {
  /** Unique conversation identifier. */
  id: string;
  /** Display title. */
  title: string;
  /** List of messages. */
  messages: Message[];
  /** Timestamp of last message update. */
  updatedAt: number;
}

/**
 * Custom hook to manage chat conversation states, history sync, and API streaming.
 * Supports multiple threads synced with the WordPress database (per-user).
 *
 * @since v0.2.0
 *
 * @param {boolean} [isDrawer=false] If true, manages storage/active ID for the floating drawer instead of the main page.
 * @returns State variables, list of conversations, active conversation context, and management handlers.
 */
export function useChat(isDrawer = false) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const restUrl = window.irisSettings?.restUrl || "/wp-json/iris/v1/";
  const nonce = window.irisSettings?.nonce || "";
  const siteHash = window.irisSettings?.siteHash || "default";

  const activeIdStorageKey = isDrawer
    ? `iris_drawer_active_conv_id_${siteHash}`
    : `iris_active_conv_id_${siteHash}`;

  // Fetch all conversations from server on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (nonce) {
      headers["X-WP-Nonce"] = nonce;
    }
    return headers;
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${restUrl}conversations`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);

        // Resolve active conversation ID
        const storedActiveId = localStorage.getItem(activeIdStorageKey);
        if (storedActiveId && data.some((c: Conversation) => c.id === storedActiveId)) {
          setActiveConversationIdState(storedActiveId);
        } else if (!isDrawer && data.length > 0) {
          // Default main chat page to newest conversation
          setActiveConversationIdState(data[0].id);
          localStorage.setItem(activeIdStorageKey, data[0].id);
        } else {
          setActiveConversationIdState(null);
        }
      }
    } catch (e) {
      console.error("Error fetching conversations from WP database", e);
    } finally {
      setLoading(false);
    }
  };

  const setActiveConversationId = (id: string | null) => {
    setActiveConversationIdState(id);
    if (id) {
      localStorage.setItem(activeIdStorageKey, id);
    } else {
      localStorage.removeItem(activeIdStorageKey);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setError(null);
  };

  const saveConversationToServer = async (conv: Conversation) => {
    try {
      await fetch(`${restUrl}conversations`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(conv),
      });
    } catch (e) {
      console.error("Failed to save conversation to WP server", e);
    }
  };

  const renameConversation = async (id: string, newTitle: string) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmedTitle } : c)),
    );

    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      await saveConversationToServer({
        ...conv,
        title: trimmedTitle,
      });
    }
  };

  const deleteConversation = async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));

    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        setActiveConversationId(null);
      }
    }

    try {
      await fetch(`${restUrl}conversations/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    } catch (e) {
      console.error("Failed to delete conversation from server", e);
    }
  };

  const clearHistory = async () => {
    setConversations([]);
    setActiveConversationId(null);
    setError(null);

    try {
      await fetch(`${restUrl}conversations`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    } catch (e) {
      console.error("Failed to clear conversations from server", e);
    }
  };

  const generateTitle = (text: string): string => {
    const clean = text.replace(/[#*`_]/g, "").trim();
    const words = clean.split(/\s+/);
    if (words.length <= 4) {
      return clean;
    }
    return words.slice(0, 4).join(" ") + "...";
  };

  const sendMessage = async (content: string) => {
    const cleanContent = content.trim();
    if (!cleanContent || isTyping) return;

    setError(null);
    setIsTyping(true);

    const userMsg: Message = {
      role: "user",
      content: cleanContent,
      id: `user-${Date.now()}`,
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantPlaceholder: Message = {
      role: "assistant",
      content: "",
      id: assistantMsgId,
    };

    let currentConvId = activeConversationId;
    let currentConv: Conversation;

    if (!currentConvId) {
      // Create new conversation
      currentConvId = `conv-${Date.now()}`;
      const newTitle = generateTitle(cleanContent);
      currentConv = {
        id: currentConvId,
        title: newTitle,
        messages: [userMsg, assistantPlaceholder],
        updatedAt: Date.now(),
      };

      setConversations((prev) => [currentConv, ...prev]);
      setActiveConversationId(currentConvId);
    } else {
      // Find existing
      const existing = conversations.find((c) => c.id === currentConvId);
      if (!existing) {
        setIsTyping(false);
        return;
      }

      currentConv = {
        ...existing,
        messages: [...existing.messages, userMsg, assistantPlaceholder],
        updatedAt: Date.now(),
      };

      setConversations((prev) =>
        [currentConv, ...prev.filter((c) => c.id !== currentConvId)].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        ),
      );
    }

    // Save immediate state to server (user message + placeholder)
    await saveConversationToServer(currentConv);

    try {
      // Get all messages up to the user's latest query (role + content format for API)
      const apiMessages = currentConv.messages
        .slice(0, -1) // Exclude the assistant placeholder
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await fetch(`${restUrl}chat`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}`;
        try {
          const jsonErr = await response.json();
          if (jsonErr?.message) {
            errorMessage = jsonErr.message;
          }
        } catch (e) {
          // Ignore
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable.");
      }

      const decoder = new TextDecoder();
      let responseText = "";
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const cleanedLine = line.trim();
            if (cleanedLine === "data: [DONE]") {
              done = true;
              break;
            }
            if (cleanedLine.startsWith("data: ")) {
              let dataJson;
              try {
                dataJson = JSON.parse(cleanedLine.substring(6));
              } catch (e) {
                continue;
              }

              if (dataJson?.error) {
                throw new Error(dataJson.error.message || "API Error");
              }

              const token = dataJson.choices?.[0]?.delta?.content;
              if (token) {
                responseText += token;

                // Update UI state
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === currentConvId
                      ? {
                          ...c,
                          messages: c.messages.map((m) =>
                            m.id === assistantMsgId
                              ? { ...m, content: responseText }
                              : m,
                          ),
                        }
                      : c,
                  ),
                );
              }
            }
          }
        }
      }

      // Stream succeeded, save completed conversation to server
      const finalConv = {
        ...currentConv,
        messages: currentConv.messages.map((m) =>
          m.id === assistantMsgId ? { ...m, content: responseText } : m,
        ),
      };
      await saveConversationToServer(finalConv);
    } catch (err: any) {
      const displayError = err.message || "An unknown networking error occurred.";
      setError(displayError);

      const errorConv = {
        ...currentConv,
        messages: currentConv.messages.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `⚠️ **Error connecting to AI assistant:** ${displayError}`,
              }
            : m,
        ),
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === currentConvId ? errorConv : c)),
      );

      await saveConversationToServer(errorConv);
    } finally {
      setIsTyping(false);
    }
  };

  // Extract messages of the active conversation for consumption
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation ? activeConversation.messages : [];

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    isTyping,
    loading,
    error,
    sendMessage,
    startNewChat,
    renameConversation,
    deleteConversation,
    clearHistory,
  };
}
