"use client";

import { FirmMark } from "@/components/FirmLogo";

export default function Footer() {
  return (
    <footer className="px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <FirmMark className="h-6 w-6 text-accent" />
          <span className="font-serif text-[15px] text-ink">
            Lex <span className="text-[#16304d]">&amp;</span> Co.
          </span>
        </div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          Privileged &amp; confidential · Cited. Verified. On the record.
        </p>
        <p className="text-[12px] text-muted">
          © {new Date().getFullYear()} Lex
        </p>
      </div>
    </footer>
  );
}
