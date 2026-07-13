import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Parse markdown into sanitized HTML ready for `dangerouslySetInnerHTML`.
 *
 * This is the single sanitization chokepoint for AI output. Every surface
 * that renders assistant content must route through it — never call
 * `marked.parse` directly.
 *
 * @since v0.3.0
 *
 * @param {string} content Raw markdown, typically a streamed assistant reply.
 * @return {{__html: string}} Sanitized HTML wrapped for React.
 */
export const renderMarkdown = (content: string): { __html: string } => {
  try {
    const raw = marked.parse(content, { async: false }) as string;
    return { __html: DOMPurify.sanitize(raw) };
  } catch {
    return { __html: DOMPurify.sanitize(content) };
  }
};
