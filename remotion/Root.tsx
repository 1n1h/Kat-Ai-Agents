/**
 * Remotion render root — consumed only by the `@remotion/cli` render pipeline
 * (`npx remotion render`). Never imported by the Next app, so it adds nothing
 * to the deployed bundle.
 */

import { Composition } from "remotion";
import {
  HeroFilm,
  FILM_W,
  FILM_H,
  FILM_FPS,
  FILM_DURATION,
} from "./HeroFilm";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeroFilm"
      component={HeroFilm}
      durationInFrames={FILM_DURATION}
      fps={FILM_FPS}
      width={FILM_W}
      height={FILM_H}
    />
  );
};
