/**
 * The hero film — a ~12s cinematic motion piece for the landing hero.
 *
 * Authored once, used two ways:
 *   1. Live in the browser via <Player> (components/landing/HeroFilm.tsx).
 *   2. Rendered to MP4 via `npx remotion render` (see remotion/Root.tsx) for
 *      the rollout email and social.
 *
 * Pure Remotion + inline styles so it renders identically in both paths — no
 * Tailwind/global CSS dependency. Brand palette is hard-coded to the navy/brass
 * tokens in app/globals.css (dark theme).
 */

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

export const FILM_W = 1280;
export const FILM_H = 720;
export const FILM_FPS = 30;
export const FILM_DURATION = 372; // ~12.4s

// Brand palette (dark theme tokens)
const NAVY = "#0f1b26";
const PANEL = "#0a141d";
const PANEL_DEEP = "#182a3b";
const BRASS = "#c9a55c";
const BRASS_SOFT = "#dbbc77";
const INK = "#ece6d8";
const INK_SOFT = "#c7c0ae";
const LINE = "#2d4459";

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "'SFMono-Regular', ui-monospace, 'Courier New', monospace";

const ORCH = { x: FILM_W / 2, y: 232 };

const SPECIALISTS = [
  { label: "Litigation", glyph: "§" },
  { label: "Contracts", glyph: "¶" },
  { label: "Drafting", glyph: "✎" },
  { label: "Cite Check", glyph: "✓" },
  { label: "Strategy", glyph: "◆" },
];

// Specialists fan out along an arc near the bottom.
const SPEC_POS = SPECIALISTS.map((_, i) => {
  const n = SPECIALISTS.length;
  const spread = 760;
  const x = FILM_W / 2 - spread / 2 + (spread / (n - 1)) * i;
  const lift = Math.abs(i - (n - 1) / 2) * 26; // gentle arc
  return { x, y: 520 - lift };
});

const clamp = (
  frame: number,
  inFrame: number,
  outFrame: number,
  from: number,
  to: number,
  ease: (n: number) => number = Easing.out(Easing.cubic),
) =>
  interpolate(frame, [inFrame, outFrame], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

function Vignette() {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 70% 60% at 50% 38%, rgba(43,36,20,0.55), transparent 72%)",
      }}
    />
  );
}

function Grain() {
  // Subtle static grain via layered radial dots — cheap and render-safe.
  return (
    <AbsoluteFill
      style={{
        opacity: 0.05,
        backgroundImage:
          "radial-gradient(rgba(236,230,216,0.6) 0.5px, transparent 0.5px)",
        backgroundSize: "3px 3px",
        mixBlendMode: "overlay",
      }}
    />
  );
}

function Node({
  x,
  y,
  r,
  glow,
  fill,
  ring,
  children,
}: {
  x: number;
  y: number;
  r: number;
  glow: number;
  fill: string;
  ring: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: fill,
        border: `1.5px solid ${ring}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 ${glow * 48}px ${glow * 14}px rgba(201,165,92,${
          glow * 0.45
        })`,
      }}
    >
      {children}
    </div>
  );
}

function Connections({ frame }: { frame: number }) {
  return (
    <svg
      width={FILM_W}
      height={FILM_H}
      viewBox={`0 0 ${FILM_W} ${FILM_H}`}
      style={{ position: "absolute", inset: 0 }}
    >
      {SPEC_POS.map((p, i) => {
        const stagger = i * 12;
        // line draws on between 150 and 196 (+stagger)
        const draw = clamp(frame, 150 + stagger, 200 + stagger, 0, 1);
        const len = Math.hypot(p.x - ORCH.x, p.y - ORCH.y);
        // outbound pulse 158..212, return pulse 250..300
        const outP = clamp(frame, 158 + stagger, 214 + stagger, 0, 1);
        const retP = clamp(frame, 250 + stagger, 300 + stagger, 0, 1);
        const ox = ORCH.x + (p.x - ORCH.x) * outP;
        const oy = ORCH.y + (p.y - ORCH.y) * outP;
        const rx = p.x + (ORCH.x - p.x) * retP;
        const ry = p.y + (ORCH.y - p.y) * retP;
        const showOut = frame > 158 + stagger && outP < 1;
        const showRet = frame > 250 + stagger && retP < 1;
        return (
          <g key={i}>
            <line
              x1={ORCH.x}
              y1={ORCH.y}
              x2={p.x}
              y2={p.y}
              stroke={LINE}
              strokeWidth={1.5}
              strokeDasharray={len}
              strokeDashoffset={len * (1 - draw)}
            />
            <line
              x1={ORCH.x}
              y1={ORCH.y}
              x2={p.x}
              y2={p.y}
              stroke={BRASS}
              strokeWidth={1.5}
              opacity={0.35 * draw}
              strokeDasharray={len}
              strokeDashoffset={len * (1 - draw)}
            />
            {showOut && (
              <circle cx={ox} cy={oy} r={4} fill={BRASS_SOFT} opacity={0.95} />
            )}
            {showRet && (
              <circle cx={rx} cy={ry} r={4.5} fill={BRASS} opacity={0.95} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const HeroFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ----- intro brand line (0..70) -----
  const introOpacity = clamp(frame, 6, 28, 0, 1) * (1 - clamp(frame, 78, 96, 0, 1));
  const introY = clamp(frame, 6, 36, 14, 0);

  // ----- prompt bubble (74..150, lingers) -----
  const promptOp =
    clamp(frame, 80, 102, 0, 1) * (1 - clamp(frame, 320, 348, 0, 1));
  const promptY = clamp(frame, 80, 110, 16, 0);

  // ----- orchestrator (108..) -----
  const orchSpring = spring({
    frame: frame - 108,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const orchScale = orchSpring;
  // orchestrator glow swells as results return (250..300)
  const orchGlow =
    0.25 * clamp(frame, 112, 150, 0, 1) + 0.75 * clamp(frame, 252, 304, 0, 1);

  // ----- result seal (300..) -----
  const sealSpring = spring({
    frame: frame - 300,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const sealOp = clamp(frame, 300, 320, 0, 1);

  // ----- closing tagline (322..) -----
  const tagOp = clamp(frame, 326, 350, 0, 1);

  return (
    <AbsoluteFill style={{ background: NAVY, fontFamily: SERIF, overflow: "hidden" }}>
      {/* drifting accent wash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 45% at 50% ${
            32 + Math.sin(frame / 60) * 4
          }%, rgba(43,36,20,0.8), transparent 70%)`,
        }}
      />
      <Vignette />

      {/* intro brand line */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          opacity: introOpacity,
          transform: `translateY(${introY}px)`,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 15,
              letterSpacing: 8,
              color: BRASS,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Sheehe &amp; Associates
          </div>
          <div style={{ fontSize: 52, color: INK, letterSpacing: 0.5 }}>
            Experience. Knowledge. Strategy.
          </div>
        </div>
      </AbsoluteFill>

      {/* prompt bubble */}
      <div
        style={{
          position: "absolute",
          top: 78,
          left: "50%",
          transform: `translate(-50%, ${promptY}px)`,
          opacity: promptOp,
          background: PANEL,
          border: `1px solid ${LINE}`,
          borderRadius: 14,
          padding: "14px 22px",
          color: INK,
          fontFamily: SERIF,
          fontSize: 21,
          boxShadow: "0 18px 40px -20px rgba(0,0,0,0.7)",
          maxWidth: 760,
          textAlign: "center",
        }}
      >
        “Draft the response and verify every citation.”
      </div>

      {/* delegation lines + pulses */}
      <Connections frame={frame} />

      {/* specialist nodes */}
      {SPEC_POS.map((p, i) => {
        const stagger = i * 12;
        const s = spring({
          frame: frame - (150 + stagger),
          fps,
          config: { damping: 15, stiffness: 130 },
        });
        const lit = clamp(frame, 170 + stagger, 200 + stagger, 0, 1);
        return (
          <div key={i}>
            <Node
              x={p.x}
              y={p.y}
              r={34}
              glow={lit * 0.5}
              fill={PANEL_DEEP}
              ring={lit > 0.5 ? BRASS : LINE}
            >
              <span
                style={{
                  fontSize: 26,
                  color: lit > 0.5 ? BRASS_SOFT : INK_SOFT,
                  transform: `scale(${s})`,
                  fontFamily: SERIF,
                }}
              >
                {SPECIALISTS[i].glyph}
              </span>
            </Node>
            <div
              style={{
                position: "absolute",
                left: p.x - 70,
                top: p.y + 42,
                width: 140,
                textAlign: "center",
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: INK_SOFT,
                opacity: lit,
              }}
            >
              {SPECIALISTS[i].label}
            </div>
          </div>
        );
      })}

      {/* orchestrator node */}
      <div style={{ transform: `scale(${orchScale})`, transformOrigin: `${ORCH.x}px ${ORCH.y}px` }}>
        <Node x={ORCH.x} y={ORCH.y} r={48} glow={orchGlow} fill={PANEL} ring={BRASS}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30, color: BRASS, lineHeight: 1 }}>✳</div>
          </div>
        </Node>
        <div
          style={{
            position: "absolute",
            left: ORCH.x - 90,
            top: ORCH.y + 58,
            width: 180,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: BRASS,
            opacity: clamp(frame, 120, 150, 0, 1),
          }}
        >
          Orchestrator
        </div>
      </div>

      {/* result seal */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 372,
          transform: `translate(-50%, 0) scale(${0.6 + sealSpring * 0.4})`,
          opacity: sealOp,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(201,165,92,0.12)",
          border: `1px solid ${BRASS}`,
          borderRadius: 999,
          padding: "12px 26px",
          color: BRASS_SOFT,
          fontFamily: MONO,
          fontSize: 16,
          letterSpacing: 2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 20 }}>✓</span> Every citation verified · 12 / 12
      </div>

      {/* closing tagline */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 60,
          opacity: tagOp,
        }}
      >
        <div style={{ fontSize: 22, color: INK_SOFT, fontFamily: SERIF }}>
          One conversation. A whole firm behind it.
        </div>
      </AbsoluteFill>

      <Grain />
    </AbsoluteFill>
  );
};
