import type { ReactNode } from "react";

/**
 * Lightweight CSS hover tooltip — wraps a trigger and shows a styled label on
 * hover/focus. No dependency; positioned right (default, for icon rails), top,
 * or bottom.
 */
export default function Tooltip({
  label,
  side = "right",
  className = "",
  children,
}: {
  label: string;
  side?: "right" | "top" | "bottom";
  className?: string;
  children: ReactNode;
}) {
  const pos =
    side === "right"
      ? "left-full top-1/2 ml-2 -translate-y-1/2"
      : side === "top"
        ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
        : "top-full left-1/2 mt-2 -translate-x-1/2";
  return (
    <span className={`group/tip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 ${pos} whitespace-nowrap rounded-md border border-line-strong bg-panel-deep px-2 py-1 text-[12px] font-medium text-ink opacity-0 shadow-xl transition-opacity duration-150 group-hover/tip:opacity-100`}
      >
        {label}
      </span>
    </span>
  );
}
