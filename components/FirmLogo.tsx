/**
 * Sheehe & Associates lockup, recreated from the firm's logo (S-monogram
 * seal · divider · name) as theme-aware SVG/JSX so it stays crisp on the
 * navy and cream themes alike.
 */

export function FirmMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r="21.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <circle
        cx="24"
        cy="24"
        r="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <text
        x="24"
        y="33"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="27"
        fontStyle="italic"
        fill="currentColor"
      >
        S
      </text>
    </svg>
  );
}

export default function FirmLogo({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const mark =
    size === "lg" ? "h-14 w-14" : size === "md" ? "h-9 w-9" : "h-7 w-7";
  const divider = size === "lg" ? "h-12" : size === "md" ? "h-8" : "h-6";
  const name =
    size === "lg"
      ? "text-[19px] tracking-[0.1em]"
      : size === "md"
        ? "text-[14px] tracking-[0.09em]"
        : "text-[12px] tracking-[0.08em]";

  return (
    <span className="inline-flex items-center gap-2.5">
      <FirmMark className={`${mark} shrink-0 text-accent`} />
      <span className={`w-px self-stretch bg-line-strong ${divider} my-auto`} />
      <span className={`font-serif text-ink uppercase ${name} leading-snug`}>
        Sheehe &amp; Associates, P.A.
      </span>
    </span>
  );
}
