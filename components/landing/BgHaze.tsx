/**
 * A soft brass haze — a large radial glow that sits behind a section to give
 * the flat cream field some atmosphere. Purely decorative; pointer-events none.
 */
export default function BgHaze({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(58% 55% at 50% 38%, rgba(201,165,92,0.20), transparent 70%)",
      }}
    />
  );
}
