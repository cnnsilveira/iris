import { useCallback } from "react";
import type { RefObject } from "react";

/**
 * Grow a textarea to fit its content, up to `maxHeight`, after which it
 * scrolls. Returns the `onInput` handler to attach to the textarea, plus a
 * `reset` to collapse it back to one row after the value is cleared.
 *
 * @since v0.3.0
 *
 * @param {RefObject<HTMLTextAreaElement|null>} ref       Ref to the textarea.
 * @param {number}                              maxHeight Optional. Cap in pixels. Default 160.
 * @return {{resize: () => void, reset: () => void}} Handlers for the consumer.
 */
export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  maxHeight = 160,
) {
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [ref, maxHeight]);

  const reset = useCallback(() => {
    const el = ref.current;
    if (el) el.style.height = "auto";
  }, [ref]);

  return { resize, reset };
}
