import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** A single entry in an {@link ActionMenu}. */
export interface ActionMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Extra class for the trigger button so each context can size it. */
  triggerClassName?: string;
  title?: string;
}

/**
 * Reusable "three-dots" overflow control that opens a floating action menu.
 *
 * The menu is portaled into the chat shell and fixed-positioned from the
 * trigger, so it is never clipped by a scrolling ancestor (the sidebar list)
 * while still inheriting the theme tokens. Closes on outside-click or Escape.
 *
 * @since v0.2.0
 */
export const ActionMenu: React.FC<ActionMenuProps> = ({ items, triggerClassName, title = "Actions" }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.right });
      setContainer((btnRef.current.closest(".vitrus-chat-shell") as HTMLElement) ?? document.body);
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        className={`vitrus-menu__trigger${triggerClassName ? ` ${triggerClassName}` : ""}`}
        onClick={toggle}
        title={title}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="5" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" />
        </svg>
      </button>
      {open && container && createPortal(
        <div ref={menuRef} className="vitrus-menu" style={{ top: pos.top, left: pos.left }}>
          {items.map((item, i) => (
            <button
              key={i}
              className={`vitrus-menu__item${item.danger ? " vitrus-menu__item--danger" : ""}`}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        container,
      )}
    </>
  );
};
