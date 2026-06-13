import { Platform, type TextStyle } from "react-native";

/**
 * Lex & Co. design tokens — the "liquid glass" system recolored to the firm's
 * brass + navy + cream brand (matching the web app). Token names are SEMANTIC,
 * not literal colors, so screens never hardcode hex.
 */

const SHARED = {
  // ── BRAND ACCENTS (constant across light/dark) ──
  brand: "#C9A55C", // BRASS — the one accent for anything actionable
  brandDeep: "#B8923F",
  brandDeeper: "#8F6F33",
  blue: "#1E3A5F", // deep navy — secondary accent
  blueDeep: "#16304D",
  sky: "#3A6098", // brighter navy-blue (use rarely)

  // ── SEMANTIC STATE ──
  live: "#C0564A",
  success: "#5A7A52",
  warning: "#C99A3B",
} as const;

export const LightPalette = {
  ...SHARED,

  // Surfaces — warm cream paper with subtle lifts
  bg: "#F7F4EC",
  bgRaised: "#EFEAE0",
  bgSoft: "#FBF8F1",
  card: "#FFFDF8",

  // Text — deep litigation navy
  ink: "#1C2630",
  inkSoft: "#3D4B58",
  inkMuted: "#69757F",
  inkInverse: "#F7F4EC",

  // Brand-soft (icon tiles, chips behind brass glyphs)
  brandSoft: "#F0E7D1",

  divider: "#E1DACA",
  liveBg: "#F3E2DF",

  // Gradients — brass → cream → soft navy
  pastelStart: "#F0E2C4",
  pastelMid: "#F7F4EC",
  pastelEnd: "#DCE4EC",
  paywallGradStart: "#F4ECD8",
  paywallGradEnd: "#F7F4EC",

  // Dark-on-light glass
  glassFill: "rgba(28, 38, 48, 0.04)",
  glassBorder: "rgba(28, 38, 48, 0.08)",
} as const;

export type Palette = { [K in keyof typeof LightPalette]: string };

export const DarkPalette: Palette = {
  ...SHARED,

  // Surfaces — deep litigation navy. Makes brass glow.
  bg: "#0F1B26",
  bgRaised: "#182A3B",
  bgSoft: "#0E1722",
  card: "#142433",

  // Text — warm light
  ink: "#ECE6D8",
  inkSoft: "#C7C0AE",
  inkMuted: "#9B9587",
  inkInverse: "#0F1B26",

  brandSoft: "rgba(201, 165, 92, 0.18)",

  divider: "#1E3144",
  liveBg: "#3A1D1A",

  // Gradients — deep brass → navy → steel
  pastelStart: "#2B2414",
  pastelMid: "#0F1B26",
  pastelEnd: "#11233A",
  paywallGradStart: "#2B2414",
  paywallGradEnd: "#0F1B26",

  glassFill: "rgba(255, 255, 255, 0.08)",
  glassBorder: "rgba(255, 255, 255, 0.16)",
} as const;

export const Palette = LightPalette;

/** Navigation-theme compat (used by the expo-router ThemeProvider + tab bar). */
export const Colors = {
  light: {
    text: LightPalette.ink,
    background: LightPalette.bg,
    tint: LightPalette.brand,
    backgroundElement: LightPalette.bgRaised,
  },
  dark: {
    text: DarkPalette.ink,
    background: DarkPalette.bg,
    tint: DarkPalette.brand,
    backgroundElement: DarkPalette.bgRaised,
  },
} as const;

// ── Typography ──
export const Fonts = {
  serif: Platform.select({ ios: "ui-serif", default: "serif" }) as string,
  system: Platform.select({ ios: "system-ui", default: "System" }) as string,
  mono: Platform.select({ ios: "ui-monospace", default: "monospace" }) as string,
};

export const Typography: Record<
  "display" | "title" | "heading" | "body" | "caption" | "mono" | "eyebrow",
  TextStyle
> = {
  display: { fontFamily: Fonts.serif, fontSize: 40, lineHeight: 44, fontWeight: "700", letterSpacing: -0.5 },
  title: { fontFamily: Fonts.serif, fontSize: 28, lineHeight: 32, fontWeight: "700", letterSpacing: -0.3 },
  heading: { fontFamily: Fonts.system, fontSize: 20, lineHeight: 26, fontWeight: "700" },
  body: { fontFamily: Fonts.system, fontSize: 16, lineHeight: 24, fontWeight: "400" },
  caption: { fontFamily: Fonts.system, fontSize: 13, lineHeight: 18, fontWeight: "500" },
  eyebrow: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 14, fontWeight: "600", letterSpacing: 1.8, textTransform: "uppercase" },
  mono: { fontFamily: Fonts.mono, fontSize: 15, lineHeight: 22, fontWeight: "500" },
};

// ── Spacing / Radius ──
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const Radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

// ── Shadows ──
export const Shadows = {
  card: { shadowColor: "#0A0F1F", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  lift: { shadowColor: "#0A0F1F", shadowOpacity: 0.18, shadowRadius: 36, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
  glow: { shadowColor: SHARED.brand, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
