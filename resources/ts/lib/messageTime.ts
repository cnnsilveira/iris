/**
 * Format the time a message was sent. Message ids embed their creation time
 * as `role-<Date.now()>`, so the send time is derived without any stored
 * timestamp field. Returns "" when the id carries no parseable time.
 *
 * @since v0.3.0
 *
 * @param {string} id Message id, e.g. `assistant-1720512000000`.
 * @return {string} Localised `HH:MM`, or "" when the id has no time.
 */
export const messageTime = (id: string): string => {
  const ms = Number.parseInt(id.split("-")[1] ?? "", 10);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};
