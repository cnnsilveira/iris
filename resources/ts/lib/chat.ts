import type { Message } from "@/hooks/useChat";

/**
 * Whether the last assistant reply can be regenerated: nothing is streaming,
 * and the newest message is a completed assistant turn.
 *
 * @since v0.3.0
 *
 * @param {Message[]} messages The current conversation.
 * @param {boolean}   isTyping Whether a reply is streaming.
 * @return {boolean} True when Regenerate should be offered.
 */
export const canRegenerate = (messages: Message[], isTyping: boolean): boolean => {
  const last = messages[messages.length - 1];
  return !isTyping && !!last && last.role === "assistant" && last.content !== "";
};

/**
 * Copy a message's raw markdown to the clipboard. Silently does nothing where
 * the Clipboard API is unavailable (insecure origins).
 *
 * @since v0.3.0
 *
 * @param {string} content The message content.
 */
export const copyMessage = (content: string): void => {
  void navigator.clipboard?.writeText(content);
};
