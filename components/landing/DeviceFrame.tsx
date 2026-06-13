import type { ReactNode } from "react";

/**
 * Static device bezel — thin brass body rim, uniform black bezel, then the
 * screen. The same look as the scroll-tilting centerpiece, sized down for
 * inline use (e.g. the agent clips).
 */
export default function DeviceFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[26px] p-1 ${className}`}
      style={{
        background: "var(--color-accent)",
        boxShadow:
          "0 26px 55px -18px rgba(30,58,95,0.6), 0 8px 20px -8px rgba(30,58,95,0.45)",
      }}
    >
      <div className="rounded-[22px] bg-black p-2">
        <div className="overflow-hidden rounded-[15px]">{children}</div>
      </div>
    </div>
  );
}
