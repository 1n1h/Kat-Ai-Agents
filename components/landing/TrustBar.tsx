"use client";

import Marquee from "./Marquee";

/**
 * Trust strip beneath the header: names from the legal-industry landscape the
 * profession knows. Framed as the ecosystem CounselOS is built for — not a
 * claim of partnership or endorsement.
 */
const NAMES = [
  "LexisNexis",
  "Westlaw",
  "Bloomberg Law",
  "American Bar Association",
  "Aderant",
  "Clio",
  "iManage",
  "NetDocuments",
  "Relativity",
  "Ironclad",
  "Thomson Reuters",
  "Rettsdata",
];

export default function TrustBar() {
  return (
    <section className="border-b border-line bg-panel/40 py-5">
      <p className="mb-3 text-center font-mono text-[10.5px] tracking-[0.28em] text-muted uppercase">
        Built for the world of modern legal practice
      </p>
      <Marquee durationSec={40}>
        {NAMES.map((n) => (
          <span
            key={n}
            className="font-serif text-[19px] whitespace-nowrap text-ink-soft/80"
          >
            {n}
          </span>
        ))}
      </Marquee>
    </section>
  );
}
