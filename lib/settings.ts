/** Local app settings (localStorage; per machine). */

export interface AppSettings {
  /** Kokoro voice id used for read-aloud and voice mode */
  voice: string;
  /** keep voice-mode replies to a few spoken sentences (cost control) */
  voiceConcise: boolean;
}

export const KOKORO_VOICES: { id: string; label: string }[] = [
  { id: "af_heart", label: "Heart — American, female" },
  { id: "af_bella", label: "Bella — American, female" },
  { id: "af_nicole", label: "Nicole — American, female (soft)" },
  { id: "am_michael", label: "Michael — American, male" },
  { id: "am_fenrir", label: "Fenrir — American, male (deep)" },
  { id: "bf_emma", label: "Emma — British, female" },
  { id: "bm_george", label: "George — British, male" },
];

const KEY = "counselos.settings.v1";

const DEFAULTS: AppSettings = { voice: "af_heart", voiceConcise: true };

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as AppSettings) };
  } catch {
    /* fall through to defaults */
  }
  return DEFAULTS;
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
  return next;
}

export function setTheme(light: boolean) {
  document.documentElement.classList.toggle("light", light);
  try {
    localStorage.setItem("counselos.theme", light ? "light" : "dark");
  } catch {
    /* private mode */
  }
}

export function isLightTheme(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("light")
  );
}
