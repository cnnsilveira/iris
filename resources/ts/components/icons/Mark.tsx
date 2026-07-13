import React from "react";

interface MarkProps {
  /** Convenience width; height is derived from the glyph's 500:391 ratio. */
  size?: number;
  /** Explicit width, overriding `size`. */
  width?: number;
  /** Explicit height, overriding the derived ratio. */
  height?: number;
  className?: string;
}

/** Glyph aspect ratio (391 / 500), used to derive height from `size`. */
const RATIO = 0.78;

/**
 * The Vitrus "V" logomark. Both paths use `currentColor`, so the mark takes
 * its colour from the surrounding text colour.
 *
 * @since v0.3.0
 *
 * @param {MarkProps} props Sizing and class name.
 * @return {React.ReactElement} The rendered SVG mark.
 */
export const Mark: React.FC<MarkProps> = ({ size = 15, width, height, className }) => (
  <svg
    width={width ?? size}
    height={height ?? size * RATIO}
    viewBox="0 0 500 391"
    className={className}
    aria-hidden="true"
  >
    <path d="M302.443 389.107H262.959L460.381 0H500L302.443 389.107Z" fill="currentColor" />
    <path d="M198.772 390.659L0 0H82.4784L198.637 231.169H200.459L317.765 0.0674947H400.715L200.121 390.659H198.772Z" fill="currentColor" />
  </svg>
);
