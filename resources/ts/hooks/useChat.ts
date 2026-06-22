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
 * Custom hook to manage chat conversation state, history sync, and API streaming.
 *
 * @since v0.1.0
 *
 * @returns State variables, loading flags, and message handlers.
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restUrl = window.irisSettings?.restUrl || "/wp-json/iris/v1/";
  const nonce = window.irisSettings?.nonce || "";
  const siteHash = window.irisSettings?.siteHash || "default";
  const storageKey = `iris_chat_history_${siteHash}`;

  // Load conversation history on initial mount
  useEffect(() => {
    const storedHistory = localStorage.getItem(storageKey);
    if (storedHistory) {
      try {
        setMessages(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse chat history from localStorage", e);
      }
    }
  }, [storageKey]);

  // Keep localStorage synchronized with the messages state
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [messages, storageKey]);

  const clearHistory = () => {
    setMessages([]);
    setError(null);
  };

  const sendMessage = async (content: string) => {
    const cleanContent = content.trim();
    if (!cleanContent || isTyping) return;

    setError(null);

    const userMsg: Message = {
      role: "user",
      content: cleanContent,
      id: `user-${Date.now()}`,
    };

    // 1. Append User Message
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsTyping(true);

    // 2. Set up Assistant Placeholder Message
    const assistantMsgId = `assistant-${Date.now()}`;
    const assistantPlaceholder: Message = {
      role: "assistant",
      content: "",
      id: assistantMsgId,
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (nonce) {
        headers["X-WP-Nonce"] = nonce;
      }

      // Format payload messages for the REST API (role + content only)
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Fetch the SSE response using POST request
      const response = await fetch(`${restUrl}chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: apiMessages,
        }),
      });

      // Strict Error Bound Handling
      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}`;
        try {
          const jsonErr = await response.json();
          if (jsonErr && jsonErr.message) {
            errorMessage = jsonErr.message;
          } else if (jsonErr && jsonErr.error && jsonErr.error.message) {
            errorMessage = jsonErr.error.message;

            if (jsonErr.error.metadata && jsonErr.error.metadata.raw) {
              errorMessage += "\n\n---\n**Error details:**\n" + jsonErr.error.metadata.raw;
            }
          }
        } catch (e) {
          // Fall back to HTTP status message if JSON parsing fails
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
                // Safe skip for partial JSON packets
                continue;
              }

              if (dataJson && dataJson.error) {
                throw new Error(dataJson.error.message || "API Error");
              }

              const token = dataJson.choices?.[0]?.delta?.content;
              if (token) {
                responseText += token;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: responseText }
                      : msg,
                  ),
                );
              }
            }
          }
        }
      }
    } catch (err: any) {
      const displayError =
        err.message || "An unknown networking error occurred.";
      setError(displayError);

      // Append error notice within the chat bubble directly so context is clear in the UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `⚠️ **Error connecting to AI assistant:** ${displayError}`,
              }
            : msg,
        ),
      );
    } finally {
      setIsTyping(false);
    }
  };

  return {
    messages,
    isTyping,
    error,
    sendMessage,
    clearHistory,
  };
}
