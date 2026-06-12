/**
 * Shared, gesture-unlocked audio playback for TTS.
 *
 * iOS Safari blocks `audio.play()` unless it happens inside (or shortly after)
 * a user gesture. Our TTS audio only arrives after an `await fetch(...)`, by
 * which point the gesture's activation has expired — so playback is silently
 * rejected. The fix: keep a single <audio> element and "unlock" it by playing
 * a tiny silent clip synchronously while the tap is still active, then reuse
 * that same element for the real audio. Once an element has played during a
 * gesture, iOS lets us drive it programmatically afterwards.
 *
 * One shared element also means only one turn ever speaks at a time.
 */

// ~80ms of 8kHz mono silence — long enough to satisfy iOS's "it played"
// bookkeeping, short and muted so the user never hears it.
const SILENCE =
  "data:audio/wav;base64,UklGRiQFAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

let el: HTMLAudioElement | null = null;

function element(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!el) el = new Audio();
  return el;
}

/**
 * Call synchronously inside a user gesture (the click/tap handler) so the
 * shared element is allowed to play audio that arrives later, after a fetch.
 * Safe and cheap to call on every relevant tap.
 *
 * The clip is played UNMUTED on purpose: iOS only grants *audible* playback
 * permission when the unlocking play() was itself audible. A muted unlock
 * does not count — which is why muting here would leave real audio blocked.
 * The clip is digital silence, so the user hears nothing regardless.
 */
export function primeAudioPlayback(): void {
  const a = element();
  if (!a) return;
  try {
    a.muted = false;
    a.volume = 1;
    a.src = SILENCE;
    void a.play().catch(() => undefined);
  } catch {
    /* nothing we can do; real playback will simply be blocked */
  }
}

export interface Playback {
  stop: () => void;
}

/**
 * Play an audio URL on the shared element. Resolves once playback has started;
 * rejects if the browser blocked it. `onended` fires when the clip finishes
 * naturally (a good place to revoke the object URL).
 */
export async function playAudioUrl(
  url: string,
  onended?: () => void,
): Promise<Playback> {
  const a = element();
  if (!a) throw new Error("No audio support.");
  a.pause();
  a.onended = () => onended?.();
  a.muted = false;
  a.src = url;
  try {
    a.currentTime = 0;
  } catch {
    /* not always settable before metadata loads */
  }
  await a.play();
  return {
    stop: () => {
      a.pause();
      a.onended = null;
    },
  };
}

/** Stop whatever is currently playing on the shared element. */
export function stopAudio(): void {
  if (el) {
    el.pause();
    el.onended = null;
  }
}
