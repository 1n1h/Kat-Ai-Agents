"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  HeroFilm as HeroFilmComposition,
  FILM_W,
  FILM_H,
  FILM_FPS,
  FILM_DURATION,
} from "@/remotion/HeroFilm";

/**
 * Live, in-browser playback of the Remotion hero film. The Player bundle is
 * heavy, so it's dynamically imported (no SSR) and only mounts on the client.
 * Under prefers-reduced-motion we show a single static frame instead of the
 * looping animation.
 */

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false },
);
const Thumbnail = dynamic(
  () => import("@remotion/player").then((m) => m.Thumbnail),
  { ssr: false },
);

export default function HeroFilm() {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);

  const shared = {
    component: HeroFilmComposition,
    compositionWidth: FILM_W,
    compositionHeight: FILM_H,
    durationInFrames: FILM_DURATION,
    fps: FILM_FPS,
    style: { width: "100%", height: "100%" } as const,
  };

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-2xl"
      style={{ aspectRatio: `${FILM_W} / ${FILM_H}` }}
      aria-label="Sheehe & Associates AI workspace — orchestration overview"
    >
      {reduced === null ? (
        // pre-hydration / measuring: brand-colored placeholder, no layout shift
        <div className="absolute inset-0 bg-panel" />
      ) : reduced ? (
        <Thumbnail {...shared} frameToDisplay={FILM_DURATION - 40} />
      ) : (
        <Player
          {...shared}
          autoPlay
          loop
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          initiallyMuted
          numberOfSharedAudioTags={0}
        />
      )}
    </div>
  );
}
