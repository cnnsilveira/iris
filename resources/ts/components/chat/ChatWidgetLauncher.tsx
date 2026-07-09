import React from "react";
import { Mark } from "@/components/icons/Mark";

interface ChatWidgetLauncherProps {
  open: boolean;
  onClick: () => void;
}

/**
 * Bottom-right pill that opens the Copilot panel. It fades out while the
 * panel is open rather than moving, so the two never animate against each
 * other.
 *
 * @since v0.3.0
 *
 * @param {ChatWidgetLauncherProps} props Open state and click handler.
 * @return {React.ReactElement} The rendered launcher.
 */
export const ChatWidgetLauncher: React.FC<ChatWidgetLauncherProps> = ({ open, onClick }) => (
  <button
    type="button"
    className={`vitrus-launcher${open ? " vitrus-launcher--hidden" : ""}`}
    onClick={onClick}
    aria-label="Open Vitrus Copilot"
    aria-expanded={open}
    tabIndex={open ? -1 : 0}
  >
    <Mark width={17} height={13} className="vitrus-launcher__mark" />
    <span className="vitrus-launcher__label">COPILOT</span>
  </button>
);
