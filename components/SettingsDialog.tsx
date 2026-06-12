"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, X } from "lucide-react";
import {
  getSettings,
  isLightTheme,
  KOKORO_VOICES,
  setSettings,
  setTheme,
  type AppSettings,
} from "@/lib/settings";
import { firebaseEnabled, signOut } from "@/lib/firebase";

const sectionTitle =
  "font-sans text-[11px] font-semibold tracking-[0.2em] text-muted uppercase";

export default function SettingsDialog({
  open,
  onClose,
  userEmail,
}: {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
}) {
  const [settings, setLocal] = useState<AppSettings>(getSettings);
  const [light, setLight] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (open) {
      setLocal(getSettings());
      setLight(isLightTheme());
      setConfirmClear(false);
    }
  }, [open]);

  if (!open) return null;

  function update(patch: Partial<AppSettings>) {
    setLocal(setSettings(patch));
  }

  function pickTheme(toLight: boolean) {
    setTheme(toLight);
    setLight(toLight);
  }

  function clearData() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    try {
      localStorage.removeItem("counselos.v1");
    } catch {
      /* private mode */
    }
    location.reload();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pop flex max-h-[85vh] w-full max-w-md flex-col gap-6 overflow-y-auto rounded-2xl border border-line-strong bg-panel p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl text-ink">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-panel-deep hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* appearance */}
        <section>
          <p className={sectionTitle}>Appearance</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              onClick={() => pickTheme(false)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[14px] transition-colors ${
                !light
                  ? "border-accent text-ink"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => pickTheme(true)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[14px] transition-colors ${
                light
                  ? "border-accent text-ink"
                  : "border-line text-muted hover:text-ink"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
          </div>
        </section>

        {/* voice */}
        <section>
          <p className={sectionTitle}>Voice</p>
          <label className="mt-2.5 block text-[13px] text-muted">
            Read-aloud voice (Kokoro, runs locally — free)
          </label>
          <select
            value={settings.voice}
            onChange={(e) => update({ voice: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-line bg-input px-3.5 py-2.5 text-[14.5px] text-ink outline-none focus:border-accent"
          >
            {KOKORO_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.voiceConcise}
              onChange={(e) => update({ voiceConcise: e.target.checked })}
              className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-[14.5px] text-ink">
                Keep voice replies brief
              </span>
              <span className="block text-[12.5px] text-muted">
                Voice-mode answers stay under a few sentences — recommended
                for cost control.
              </span>
            </span>
          </label>
        </section>

        {/* data */}
        <section>
          <p className={sectionTitle}>Data</p>
          <p className="mt-2 text-[12.5px] text-muted">
            Cases and threads are stored in this browser; uploaded files stay
            in this machine&apos;s working directories.
          </p>
          <button
            onClick={clearData}
            className={`mt-2.5 rounded-xl border px-4 py-2.5 text-[13.5px] transition-colors ${
              confirmClear
                ? "border-accent bg-accent-wash text-accent"
                : "border-line text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {confirmClear
              ? "Click again to erase all cases & threads"
              : "Clear all conversations"}
          </button>
        </section>

        {/* account */}
        <section>
          <p className={sectionTitle}>Account</p>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="truncate text-[14px] text-ink-soft">
              {userEmail ?? "Local mode — no account"}
            </span>
            {firebaseEnabled && (
              <button
                onClick={() => signOut()}
                className="shrink-0 rounded-xl border border-line px-4 py-2 text-[13.5px] text-muted transition-colors hover:border-accent hover:text-accent"
              >
                Log out
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
