"use client";

export default function Footer() {
  return (
    <footer className="border-t border-line px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-wash">
            <span className="font-serif text-[13px] text-accent">✳</span>
          </span>
          <span className="font-serif text-[15px] text-ink">
            Counsel<span className="text-accent">OS</span>
          </span>
        </div>
        <p className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
          Privileged &amp; confidential · The AI workspace for attorneys
        </p>
        <p className="text-[12px] text-muted">
          © {new Date().getFullYear()} CounselOS
        </p>
      </div>
    </footer>
  );
}
