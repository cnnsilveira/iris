import type { Conversation } from "@/hooks/useChat";

/** A labeled bucket of conversations for the sidebar. */
export interface ConversationGroup {
  label: string;
  items: Conversation[];
}

/**
 * Bucket conversations into Today / Yesterday / Earlier by `updatedAt`.
 * Empty buckets are omitted. Input order is preserved within a bucket
 * (conversations already arrive newest-first).
 *
 * @since v0.2.0
 */
export function groupConversationsByDate(convs: Conversation[]): ConversationGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;

  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const earlier: Conversation[] = [];

  for (const c of convs) {
    if (c.updatedAt >= startOfToday) today.push(c);
    else if (c.updatedAt >= startOfYesterday) yesterday.push(c);
    else earlier.push(c);
  }

  const groups: ConversationGroup[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length) groups.push({ label: "Earlier", items: earlier });
  return groups;
}
