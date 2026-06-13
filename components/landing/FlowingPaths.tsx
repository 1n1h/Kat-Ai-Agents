/**
 * Flowing background line-paths — a faint brass mesh of curved strokes with a
 * dash drifting along each (CSS stroke-dashoffset on pathLength=1 normalized
 * paths). Decorative, behind a section's content. No framer-motion.
 */
function buildPaths(position: number) {
  return Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));
}

export default function FlowingPaths() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        // fade the lines out at the top and bottom so they dissolve into the
        // neighbouring sections instead of cutting off on a hard edge
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, #000 14%, #000 78%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, #000 14%, #000 78%, transparent 100%)",
      }}
    >
      {[1, -1].map((position) => (
        <svg
          key={position}
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 696 316"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {buildPaths(position).map((p) => (
            <path
              key={p.id}
              d={p.d}
              stroke={p.id % 2 === 0 ? "var(--color-accent)" : "#1e3a5f"}
              strokeWidth={p.width}
              strokeOpacity={0.04 + p.id * 0.009}
              pathLength={1}
              className="flow-path"
              style={{
                strokeDasharray: "0.3 0.7",
                animationDuration: `${18 + (p.id % 10) * 2}s`,
                animationDelay: `${(p.id % 6) * -1.6}s`,
              }}
            />
          ))}
        </svg>
      ))}
    </div>
  );
}
