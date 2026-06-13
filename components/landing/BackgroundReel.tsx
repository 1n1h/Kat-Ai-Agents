"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient background for the hero — plays a short reel of atmospheric clips one
 * after another, slowed down, crossfading smoothly between them. All clips are
 * stacked; only the active one is opaque, and we advance shortly before the
 * current clip ends so the fade overlaps (no black gap, no hard cut).
 */
const CLIPS = ["/vids/hero-man.mp4", "/vids/0612.mp4"];
const PLAYBACK_RATE = 1; // normal speed
const CROSSFADE_S = 1.4; // start the next clip this long before the current ends

export default function BackgroundReel({
  className = "",
}: {
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  // play (and slow) the active clip whenever it changes
  useEffect(() => {
    const v = refs.current[active];
    if (!v) return;
    v.playbackRate = PLAYBACK_RATE;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [active]);

  const handleTime = (i: number) => () => {
    if (i !== active) return;
    const v = refs.current[i];
    if (!v || !v.duration) return;
    if (v.currentTime >= v.duration - CROSSFADE_S) {
      setActive((prev) => (prev + 1) % CLIPS.length);
    }
  };

  return (
    <div className={`absolute inset-0 ${className}`}>
      {CLIPS.map((src, i) => (
        <video
          key={src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-[1400ms] ease-in-out"
          style={{ opacity: i === active ? 1 : 0 }}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => {
            (e.currentTarget as HTMLVideoElement).playbackRate = PLAYBACK_RATE;
          }}
          onTimeUpdate={handleTime(i)}
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}
    </div>
  );
}
