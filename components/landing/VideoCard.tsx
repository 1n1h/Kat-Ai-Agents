"use client";

/**
 * A framed, auto-playing video card for the landing — styled as a small
 * "exhibit frame" to match the privileged-document / brass-on-ink aesthetic:
 * a gilded inner edge, a cinematic vignette + top sheen for depth, and a
 * brass-tinted shadow that echoes the page's card-hover glow.
 *
 * Muted + playsInline so it autoplays on every browser (incl. iOS); loops
 * silently. Pass `label` to print a small monospace source tag in the corner
 * (used to differentiate the per-agent clips).
 */
export default function VideoCard({
  src,
  label,
  className = "",
  rounded = "rounded-2xl",
  fill = false,
}: {
  src: string;
  /** Small uppercase source tag rendered in the top-left over the footage. */
  label?: string;
  className?: string;
  rounded?: string;
  /** Fill the parent's box (parent controls size) instead of using 16:9. */
  fill?: boolean;
}) {
  return (
    <div
      className={`group/video relative overflow-hidden ${rounded} border-[3px] border-[#1e3a5f] bg-panel ${
        fill ? "relative h-full w-full" : ""
      } ${className}`}
      style={{
        boxShadow:
          "0 28px 60px -24px color-mix(in srgb, var(--color-accent) 35%, transparent), 0 12px 28px -18px rgba(0,0,0,0.5)",
      }}
    >
      <video
        className={
          fill
            ? "absolute inset-0 h-full w-full object-cover"
            : "aspect-video w-full object-cover"
        }
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* gilded inner edge — a hair of brass riding the frame */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${rounded}`}
        style={{
          boxShadow:
            "inset 0 0 0 1px color-mix(in srgb, var(--color-accent) 28%, transparent)",
        }}
      />

      {/* top sheen — a thin highlight so the frame reads like glass over film */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent-soft) 70%, transparent) 50%, transparent)",
        }}
      />

      {/* cinematic vignette — darkens the edges so the loop reads as footage */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 38%, transparent 58%, rgba(0,0,0,0.28) 100%)",
        }}
      />

      {/* source tag — small monospace label, like an exhibit/footage stamp */}
      {label && (
        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-line-strong/70 bg-paper/70 px-2.5 py-1 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent)]" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">
            {label}
          </span>
        </span>
      )}
    </div>
  );
}
