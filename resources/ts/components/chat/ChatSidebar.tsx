import React, { useRef, useState, useEffect } from "react";
import type { Conversation } from "@/hooks/useChat";
import type { VitrusUser } from "@/types/vitrus";
import { groupConversationsByDate } from "@/lib/conversationGroups";
import { ActionMenu } from "@/components/chat/ActionMenu";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  currentUser?: VitrusUser;
  /** Conversation currently being renamed (controlled by the parent). */
  editingId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onStartRename: (id: string) => void;
  onStopRename: () => void;
  onRename: (id: string, title: string) => void;
  onRequestDelete: (id: string) => void;
  onOpenSettings: () => void;
}

const Mark: React.FC = () => (
  <svg width="13" height="10" viewBox="0 0 500 391" aria-hidden="true">
    <path d="M302.443 389.107H262.959L460.381 0H500L302.443 389.107Z" fill="currentColor" />
    <path d="M198.772 390.659L0 0H82.4784L198.637 231.169H200.459L317.765 0.0674947H400.715L200.121 390.659H198.772Z" fill="currentColor" />
  </svg>
);

/**
 * Left sidebar: brand, new chat (⌘N), search, date-grouped history with
 * inline rename / delete, and the current-user profile footer. Global
 * controls (WordPress exit, theme) live in the top bar, not here.
 *
 * @since v0.3.0
 */
export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations, activeConversationId, currentUser, editingId,
  onSelect, onNewChat, onStartRename, onStopRename, onRename, onRequestDelete, onOpenSettings,
}) => {
  const [query, setQuery] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  // When a rename begins — from a row menu here or from the chat header —
  // seed the input with the current title and focus it.
  useEffect(() => {
    if (!editingId) return;
    const conv = conversations.find((c) => c.id === editingId);
    setEditingTitle(conv?.title ?? "");
    editRef.current?.focus();
    editRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const q = query.trim().toLowerCase();
  const filtered = q ? conversations.filter((c) => c.title.toLowerCase().includes(q)) : conversations;
  const groups = groupConversationsByDate(filtered);

  const saveRename = (id: string) => {
    if (editingTitle.trim()) onRename(id, editingTitle.trim());
    onStopRename();
  };

  const initials = (currentUser?.name || "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="vitrus-sb">
      <div className="vitrus-sb__head">
        <span className="vitrus-sb__logo"><Mark /></span>
        <div className="vitrus-sb__brand">
          <span className="vitrus-sb__name">Vitrus</span>
          <span className="vitrus-sb__tag">COPILOT</span>
        </div>
      </div>

      <div className="vitrus-sb__actions">
        <button className="vitrus-sb__new" onClick={onNewChat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          New chat
          <span className="vitrus-sb__kbd">⌘N</span>
        </button>
      </div>

      <div className="vitrus-sb__search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <input type="text" placeholder="Search chats" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="vitrus-sb__list">
        {groups.length === 0 ? (
          <div className="vitrus-sb__empty">No conversations yet.</div>
        ) : groups.map((g) => (
          <div key={g.label} className="vitrus-sb__group">
            <div className="vitrus-sb__group-label">{g.label}</div>
            {g.items.map((conv) => (
              <div
                key={conv.id}
                className={`vitrus-sb__row${conv.id === activeConversationId ? " vitrus-sb__row--active" : ""}`}
                onClick={() => onSelect(conv.id)}
              >
                {conv.id === activeConversationId && <span className="vitrus-sb__marker" />}
                {editingId === conv.id ? (
                  <input
                    ref={editRef}
                    className="vitrus-sb__rename"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => saveRename(conv.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(conv.id); else if (e.key === "Escape") onStopRename(); }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="vitrus-sb__row-title">{conv.title}</span>
                    <span className="vitrus-sb__row-actions">
                      <ActionMenu
                        triggerClassName="vitrus-sb__row-menu-btn"
                        items={[
                          { label: "Rename", onClick: () => onStartRename(conv.id) },
                          { label: "Delete", danger: true, onClick: () => onRequestDelete(conv.id) },
                        ]}
                      />
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="vitrus-sb__foot">
        <div className="vitrus-sb__avatar">
          {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" /> : initials}
        </div>
        <div className="vitrus-sb__user">
          <span className="vitrus-sb__user-name">{currentUser?.name || "WordPress user"}</span>
          <span className="vitrus-sb__user-role">{currentUser?.role || ""}</span>
        </div>
        <button className="vitrus-sb__settings" onClick={onOpenSettings} title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.49.49 0 0 0-.48-.41h-3.84a.49.49 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" fill="currentColor"/></svg>
        </button>
      </div>
    </aside>
  );
};
