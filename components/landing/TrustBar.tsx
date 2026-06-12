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
    <section className="py-6">
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
