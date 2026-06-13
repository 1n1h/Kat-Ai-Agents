Disregard for now. 


# UI Design Spec — "Liquid Glass" Look & Feel (Orange / Blue / White)

> **Purpose of this document.** This is a build brief for an AI coding agent. It describes a polished, iOS-26-style "liquid glass" mobile UI — the exact visual system, components, and screen flow — so you can recreate it for a **different app**. Follow it precisely.
>
> **What to copy vs. change.**
> - **Copy exactly:** the design tokens, typography, spacing, radii, shadows, glass treatment, component anatomy, screen layouts, animations, and navigation flow.
> - **Change only:** the brand colors (this app is **orange + blue + white**, not violet), the app name (`{{APP_NAME}}`), the tagline, the logo asset, and the feature copy.
>
> **Scope:** UI only. Do **not** build backend, auth wiring, data fetching, or business logic. Where a screen needs data, stub it with placeholder/empty states (those empty states are part of the design — build them).

---

## 0. TL;DR for the agent

You are building a **React Native + Expo (SDK 55)** app whose entire personality is:

1. **Liquid glass** — the bottom tab bar is the real iOS 26 native liquid-glass tab bar (`expo-router` NativeTabs). Buttons can use a true `GlassView` blur variant. Translucent dark pills float over media.
2. **Soft, premium, high-contrast** — white (or deep navy in dark mode) surfaces, near-black ink text, generous rounding, soft shadows, and a single **orange** brand accent for anything actionable, with **blue** as the secondary accent.
3. **Gradient halos** — login/paywall screens have a faint orange→white→blue gradient wash behind the content.
4. **Pill everything** — every button is a full pill (`borderRadius: 999`). Chips, badges, toggles are pills too.
5. **SF Symbols + haptics** — all icons are SF Symbols (`expo-symbols`); every tap fires a selection haptic.
6. **Light & dark mode** — fully themed via a palette that swaps on the active scheme.

The single most important file is the **theme** (Section 2). Build that first, exactly as written.

---

## 1. Tech stack & prerequisites

The look depends on these packages. Install/configure them or the aesthetic won't match.

| Package | Role in the UI |
|---|---|
| `expo` (~55) + `expo-router` (~55) | App framework + file-based routing |
| `expo-router/unstable-native-tabs` | **The liquid-glass bottom tab bar** (iOS 26 native) |
| `expo-glass-effect` | `GlassView` — the true frosted-glass blur for the glass button variant |
| `expo-symbols` | `SymbolView` — all icons are SF Symbols |
| `expo-linear-gradient` | Halo gradients on welcome/paywall |
| `expo-haptics` | Selection/notification haptics on every interaction |
| `react-native-safe-area-context` | `SafeAreaView` insets |
| `expo-blur` | Fallback blur if needed |
| `@react-native-async-storage/async-storage` | Persisting theme preference |

**Platform target:** iOS first. True liquid glass (NativeTabs + `GlassView`) renders best on **iOS 26+**; on older iOS / Android it degrades gracefully to translucent surfaces — that's fine, keep the same code.

**App config requirements** (`app.json` / `app.config.ts`):
- `"userInterfaceStyle": "automatic"` — so the OS drives light/dark.
- `expo-splash-screen` plugin with the native splash image on a **white** background:
  ```json
  ["expo-splash-screen", { "image": "./assets/splash.png", "backgroundColor": "#FFFFFF", "imageWidth": 280 }]
  ```
- `expo-router`, `expo-font` plugins enabled.
- `"orientation": "portrait"`, `"supportsTablet": false`.

> ⚠️ **Two "splash" surfaces — don't confuse them.** (a) The **native splash screen** = the OS-drawn static image shown for ~1s at cold launch, configured in `app.json` above. (b) The **Welcome screen** = the first React screen the user actually interacts with (logo + tagline + sign-in buttons). When the user says "the splash page," they mean **the Welcome screen** in Section 4. Build both; they share the logo and the white/halo background so the handoff is seamless.

---

## 2. The theme (build this first — it is the foundation)

Create `src/constants/theme.ts`. This is the original system **recolored to orange/blue/white**. Token names are **semantic** (not literal colors) so screens never hardcode hex.

```ts
import { Platform, type TextStyle } from 'react-native';

// Palette tokens are SEMANTIC, not literal colors.
//   bg          — primary screen background
//   bgRaised    — slightly lifted surface (cards, sticky areas, chips)
//   bgSoft      — barely-lifted surface
//   card        — card surface
//   ink         — primary text (dark in light mode, light in dark mode)
//   inkSoft     — secondary text
//   inkMuted    — tertiary text / captions
//   inkInverse  — text/icon color that sits ON an `ink`-filled surface
//   brand       — PRIMARY brand accent = ORANGE. CTAs, active states, icon tiles.
//   blue        — SECONDARY accent. Use sparingly for variety / secondary emphasis.
//   brandSoft   — tinted fill behind brand-colored icons (soft peach in light)
//   divider     — hairline borders
//   live/success/warning — semantic state
//   pastel*     — gradient stops for the welcome halo (orange → white → blue)
//   paywallGrad* — gradient stops for the paywall background
//   glassFill/glassBorder — translucent fill+border for overlay glass in this mode

const SHARED = {
  // ── BRAND ACCENTS (constant across light/dark) ──────────────────────────
  brand: '#F97316',       // ORANGE — the one accent for anything actionable
  brandDeep: '#EA580C',
  brandDeeper: '#C2410C',
  blue: '#2563EB',        // BLUE — secondary accent
  blueDeep: '#1D4ED8',
  sky: '#38BDF8',         // optional bright accent (use rarely)

  // ── SEMANTIC STATE (constant) ───────────────────────────────────────────
  live: '#EF4444',        // live indicator red
  success: '#10B981',     // positive / savings green
  warning: '#F59E0B',     // warning amber
} as const;

export const LightPalette = {
  ...SHARED,

  // Surfaces — clean white with subtle cool lifts
  bg: '#FFFFFF',
  bgRaised: '#F6F8FC',
  bgSoft: '#FAFBFD',
  card: '#FFFFFF',

  // Text — near-black navy
  ink: '#0A0F1F',
  inkSoft: '#3A4256',
  inkMuted: '#6B7280',
  inkInverse: '#FFFFFF',

  // Brand-soft accent (icon tiles, chips behind orange glyphs)
  brandSoft: '#FFF1E6',   // soft peach

  // Dividers
  divider: '#E6E8EF',

  // Status bg
  liveBg: '#FEF2F2',

  // Gradients — welcome halo + paywall glow (ORANGE → WHITE → BLUE)
  pastelStart: '#FFE8D6', // peach
  pastelMid: '#FFFFFF',
  pastelEnd: '#DBEAFE',   // soft blue
  paywallGradStart: '#FFF7ED',
  paywallGradEnd: '#FFFFFF',

  // Dark-on-light glass
  glassFill: 'rgba(10, 15, 31, 0.04)',
  glassBorder: 'rgba(10, 15, 31, 0.08)',
} as const;

// Map every key to `string` so the dark palette can hold any color.
export type Palette = { [K in keyof typeof LightPalette]: string };

export const DarkPalette: Palette = {
  ...SHARED,

  // Surfaces — DEEP NAVY-BLACK. Pairs with blue and makes orange pop.
  bg: '#0A0F1F',
  bgRaised: '#131A2E',
  bgSoft: '#0E1424',
  card: '#131A2E',

  // Text — light
  ink: '#F8FAFC',
  inkSoft: '#C7CCD8',
  inkMuted: '#8A90A0',
  inkInverse: '#0A0F1F',

  // Brand-soft on dark = translucent orange
  brandSoft: 'rgba(249, 115, 22, 0.18)',

  // Dividers
  divider: '#202842',

  // Status bg
  liveBg: '#7F1D1D',

  // Gradients — deep amber → navy-black → deep blue
  pastelStart: '#2A1606',
  pastelMid: '#0A0F1F',
  pastelEnd: '#0B1E47',
  paywallGradStart: '#2A1606',
  paywallGradEnd: '#0A0F1F',

  // Light-on-dark glass
  glassFill: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.16)',
} as const;

// Static export = LIGHT palette (historical default). New code should read
// from useTheme().palette so dark mode flips automatically.
export const Palette = LightPalette;

// ── Typography ──────────────────────────────────────────────────────────────
export const Fonts = {
  serif: Platform.select({ ios: 'ui-serif', default: 'serif' }) as string,
  system: Platform.select({ ios: 'system-ui', default: 'System' }) as string,
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }) as string,
};

export const Typography: Record<
  'display' | 'title' | 'heading' | 'body' | 'caption' | 'mono' | 'eyebrow',
  TextStyle
> = {
  display: { fontFamily: Fonts.system, fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1 },
  title:   { fontFamily: Fonts.system, fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontFamily: Fonts.system, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body:    { fontFamily: Fonts.system, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  caption: { fontFamily: Fonts.system, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  eyebrow: { fontFamily: Fonts.mono, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 1.8, textTransform: 'uppercase' },
  mono:    { fontFamily: Fonts.mono, fontSize: 15, lineHeight: 22, fontWeight: '500' },
};

// ── Spacing / Radius ─────────────────────────────────────────────────────────
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const Radius  = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 } as const;

// ── Shadows (soft, premium) ──────────────────────────────────────────────────
export const Shadows = {
  // Soft card shadow on white
  card: { shadowColor: '#0A0F1F', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  // Pronounced lift for hero / paywall containers
  lift: { shadowColor: '#0A0F1F', shadowOpacity: 0.18, shadowRadius: 36, shadowOffset: { width: 0, height: 18 }, elevation: 10 },
  // ORANGE halo for primary CTAs and brand icon tiles
  glow: { shadowColor: Palette.brand, shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
```

### Color usage rules (do not violate)
- **Orange (`brand`) is the only "do this" color.** Primary buttons, active tab/chip/toggle fill, step-indicator active dot, icon tiles, the progress accent, refresh spinner tint, CTA glow. Never use orange for body text or large fills of content.
- **Blue (`blue`) is secondary.** Use sparingly — e.g., a secondary accent dot, a link, an alternate icon tile — to add variety without competing with orange. Most screens can ship with orange + ink alone.
- **Ink-fill = "selected/strong".** The selected pricing card, selected segmented control, selected chip use an **ink** background with `inkInverse` text — a near-black fill, NOT orange. Orange is reserved for the single primary CTA so it stays the loudest thing on screen.
- **White stays neutral.** Backgrounds are pure white (light) / deep navy (dark). Never tint large backgrounds orange.
- **Overlay pills over media** use `rgba(10,15,31,0.78)` (light-on-this = white text). These are the dark translucent badges (LIVE, counts) that float over images/video.

---

## 3. The theme provider & primitives

### 3.1 `useTheme` hook (`src/hooks/useTheme.tsx`)
A context that resolves the active scheme and exposes the live palette. Build it exactly like this:

- State: `mode: 'light' | 'dark' | 'system'`, default `'system'`. Persist to AsyncStorage under a key like `@{{app}}/theme-mode`; hydrate on mount.
- `scheme: 'light' | 'dark'` = if mode is `'system'`, follow `useColorScheme()`; else the explicit choice.
- `palette` = `scheme === 'dark' ? DarkPalette : LightPalette`.
- Expose `{ mode, scheme, palette, setMode }`. Throw if used outside the provider.

```tsx
export function useTheme() { /* returns { mode, scheme, palette, setMode } */ }
```

Wrap the app root in `<ThemeProvider>`. Every screen/component reads `const { palette } = useTheme()` and styles from `palette.*`. **No screen ever imports raw hex.**

### 3.2 `ThemedText` (`src/components/ThemedText.tsx`)
The single text component. Applies a `Typography` variant + a tone color from the palette.

```tsx
type Variant = keyof typeof Typography;      // 'display' | 'title' | ...
type Tone = 'default' | 'muted' | 'accent' | 'soft';

export function ThemedText({ variant = 'body', tone = 'default', style, ...props }) {
  const { palette } = useTheme();
  const color =
    tone === 'muted' ? palette.inkMuted
    : tone === 'soft' ? palette.inkSoft
    : tone === 'accent' ? palette.brand   // ← orange
    : palette.ink;
  return <Text style={[{ ...Typography[variant], color }, style]} {...props} />;
}
```

### 3.3 `PillButton` (`src/components/PillButton.tsx`) — the button system
**Every button in the app is this component.** All are full pills. The `glass` variant is where true liquid glass lives.

Variants (enforce contrast against the surface they sit on):
| Variant | Fill | Text | Border | Use on |
|---|---|---|---|---|
| `primary` | `brand` (orange) | `#FFF` | none | white surfaces — the main CTA |
| `ink` | `ink` | `inkInverse` | none | white surfaces — e.g. "Continue with Apple" |
| `outline` | `bg` | `ink` | `1.5px ink` | white surfaces — secondary |
| `ghost` | transparent | `inkSoft` | none | tertiary / "Skip", "Maybe later" |
| `onDark` | `#FFF` | `#0A0F1F` | none | dark or orange surfaces |
| `glass` | `rgba(255,255,255,0.18)` over a `GlassView` | `#FFF` | `rgba(255,255,255,0.30)` | over media / dark imagery |

Sizes: `sm` (minHeight 38, font 14), `md` (minHeight 50, font 16), `lg` (minHeight 58, font 17). Horizontal padding `Spacing.lg`, gap `Spacing.sm` between icon + label.

Behavior:
- `borderRadius: Radius.pill`. Label is `ThemedText variant="body"` `fontWeight: '700'`.
- On press: scale to `0.97` (`transform`), fire `Haptics.selectionAsync()`.
- `loading` → show `ActivityIndicator` (tinted to the label color) instead of label; `disabled`/`loading` → `opacity: 0.5`.
- Optional `leadingIcon` / `trailingIcon` (React nodes), `fullWidth` → `alignSelf: 'stretch'`.
- **Glass variant only:** wrap the inner content in `<GlassView glassEffectStyle="regular" tintColor="rgba(255,255,255,0.08)">` from `expo-glass-effect`, and set `overflow: 'hidden'` on the Pressable.

```tsx
import { GlassView } from 'expo-glass-effect';
// ...
{variant === 'glass'
  ? <GlassView glassEffectStyle="regular" tintColor="rgba(255,255,255,0.08)" style={{ width: '100%' }}>{Inner}</GlassView>
  : Inner}
```

---

## 4. ⭐ The Welcome / "Splash" screen (the anchor — build this to pixel spec)

Route: `src/app/(auth)/welcome.tsx`. This is the first interactive screen and the heart of the brand. **Recreate it exactly; only swap the logo, name, and tagline.**

### Layout (top → bottom)
```
┌─────────────────────────────────────┐
│  (faint orange→white→blue halo over  │  ← LinearGradient, absolute, full-bleed
│   the entire screen, behind content) │
│                                       │
│                                       │
│              [ LOGO ]                 │  ← 140×140 image, centered
│             {{APP_NAME}}              │  ← display type, ink, letterSpacing -1.5
│        Short two-line tagline.        │  ← body 17/24, inkSoft, centered, maxWidth 320
│                                       │
│                                       │
│   ┌─────────────────────────────┐    │
│   │  [] Continue with Apple     │    │  ← PillButton variant="ink", size="lg", fullWidth
│   └─────────────────────────────┘    │
│   ┌─────────────────────────────┐    │
│   │  (G) Continue with Google   │    │  ← PillButton variant="outline", size="lg", fullWidth
│   └─────────────────────────────┘    │
│                                       │
│   By continuing, you agree to our     │  ← caption, inkMuted, with underlined
│        Terms and Privacy.             │     ink links (Terms / Privacy)
└─────────────────────────────────────┘
```

### Exact build
- **Root:** `<View style={{ flex: 1, backgroundColor: palette.bg }}>`.
- **Halo:** a full-bleed `<LinearGradient>` with `colors={[palette.pastelStart, palette.pastelMid, palette.pastelEnd]}`, `locations={[0, 0.55, 1]}`, `style={{ position:'absolute', inset:0, opacity: scheme==='dark' ? 0.85 : 0.6 }}`, `pointerEvents="none"`. → This is the orange-peach → white → soft-blue wash.
- **`SafeAreaView`** `edges={['top','bottom']}`, then a `flex:1` column with `paddingHorizontal: Spacing.xl` and `justifyContent: 'space-between'`.
- **Top block** (`flex:1`, centered, `gap: Spacing.lg`):
  - Logo `<Image>` 140×140, `resizeMode="contain"`.
  - `<ThemedText variant="display">` = `{{APP_NAME}}`, `color: palette.ink`, `letterSpacing: -1.5`, centered.
  - `<ThemedText variant="body">` tagline, `color: palette.inkSoft`, `fontSize: 17`, `lineHeight: 24`, `maxWidth: 320`, centered. (Two short lines, e.g. `"Headline benefit.{\n}One outcome."`)
- **Bottom block** (`paddingBottom: Spacing.lg`, `gap: Spacing.md`):
  - **Apple button** — `PillButton variant="ink" size="lg" fullWidth`, leading icon = `<SymbolView name="apple.logo" size={18} tintColor="#FFFFFF" />`. Shows spinner when busy.
  - **Google button** — `PillButton variant="outline" size="lg" fullWidth`, leading icon = a 18×18 white circle containing a bold blue `G` (`#4285F4`).
  - **Error line** (conditional) — caption, `color: '#DC2626'`, centered, `fontSize: 12`.
  - **Legal row** — a horizontal wrap of captions: `inkMuted` text with two `Pressable` links ("Terms", "Privacy") styled `color: palette.ink`, `fontWeight: '600'`, `textDecorationLine: 'underline'`.
- **Interactions:** tapping a provider fires `Haptics.selectionAsync()`, sets a `busy` state (`'apple' | 'google' | null`) that drives the button spinner and disables both, then `Haptics.notificationAsync(Success/Error)` on resolve. (Auth itself is out of scope — stub the handlers.)

> **Why it feels premium:** the gradient halo + lots of negative space + a single ink CTA stack + the recolored wash. Keep the spacing generous; do not crowd it.

---

## 5. Onboarding flow (2 feature screens → paywall)

A shared component renders both feature screens; only copy + icon change.

### 5.1 `OnboardingFeature` component
Route screens `(onboarding)/feature1.tsx` and `feature2.tsx` both render `<OnboardingFeature .../>`. Layout top→bottom, `paddingHorizontal: Spacing.xl`, `justifyContent: 'space-between'`:

1. **Top row:** a centered **step indicator** + optional right-aligned `Skip` (`PillButton variant="ghost" size="sm"`).
   - Step indicator = two horizontal bars, `height: 6`, `borderRadius: 3`, gap `6`. Active bar `width: 24` filled `palette.brand` (orange); inactive `width: 6` filled `palette.divider`.
2. **Middle (centered, `gap: Spacing.xl`):**
   - **Hero illustration card** — `width:'100%'`, `aspectRatio: 4/3`, `maxHeight: 380`, `borderRadius: Radius.xl + 6` (=30), `backgroundColor: palette.brandSoft` (soft peach), `borderWidth:1`, `borderColor: 'rgba(249,115,22,0.15)'`, `Shadows.card`. Centered inside it:
     - A **96×96 orange icon tile** — `borderRadius: Radius.xl`, `backgroundColor: palette.brand`, `Shadows.glow`, containing `<SymbolView size={48} tintColor="#FFFFFF" />`.
   - **Copy block (centered, `gap: Spacing.sm`):** eyebrow (`variant="eyebrow"`, `color: palette.brand`), title (`variant="title"`, `fontSize:30`, `lineHeight:36`, `color: palette.ink`, centered), body (`variant="body"`, `fontSize:16`, `lineHeight:24`, `color: palette.inkSoft`, `maxWidth: 340`, centered).
3. **Bottom:** `PillButton variant="primary" size="lg" fullWidth` (the orange CTA, e.g. "Next" / "Get started").

Props: `{ step: 1|2, eyebrow, title, body, icon (SF Symbol name), ctaLabel, onContinue, onSkip? }`.

### 5.2 Paywall (`(onboarding)/paywall.tsx`)
A "soft" paywall — both the close (X) and the CTA enter the app.

- **Background:** `LinearGradient` `colors={[palette.paywallGradStart, palette.paywallGradEnd]}`, `locations={[0,0.5]}`, absolute full-bleed.
- **Top-right close button:** 36×36 circle, `backgroundColor: palette.bgRaised`, `borderWidth:1` `borderColor: palette.divider`, `SymbolView name="xmark" size={14}`.
- **Scrollable body:**
  - **Hero:** logo (88×88) + `title` ("Watch without limits." style headline, `fontSize:32`, `letterSpacing:-1`) + sub (`body`, `inkSoft`, `fontSize:15`, `maxWidth:340`).
  - **Two side-by-side plan cards** (`flexDirection:'row'`, gap 12) — see below.
  - **Disclosure line** (caption, `inkSoft`, centered): "7-day free trial, then $X".
  - **Feature list:** rows of `SymbolView name="checkmark" size={14} tintColor={palette.ink}` + `body` `fontSize:15` `fontWeight:'500'`.
- **Sticky bottom CTA block:** `borderTopWidth:1` `borderTopColor: palette.divider`, `backgroundColor: palette.bg`. Contains the orange `PillButton variant="primary" size="lg" fullWidth` ("Start Free Trial"), a caption ("Cancel anytime…"), and a footer link row: `Restore Purchases · Terms · Privacy` (caption links separated by `·` dots).

**PlanCard anatomy (the key interaction):**
- Pressable, `flex:1`, `minHeight:132`, `borderRadius: Radius.lg`, padding `Spacing.md`.
- **Unselected:** `backgroundColor: palette.bg`, `borderWidth:2` `borderColor: palette.divider`, `Shadows.card`.
- **Selected:** `backgroundColor: palette.ink`, `borderColor: palette.ink`, `Shadows.lift` — i.e. it **inverts to near-black** with `inkInverse` text. (Selected ≠ orange. Orange stays on the CTA only.)
- Translucent sub-labels must flip color with the card: on a dark (selected) card use `rgba(255,255,255,0.60)`; in dark mode the inverted card is light, so use `rgba(8,8,26,0.60)`.
- **"BEST VALUE" badge** floats at `top:-10, right:10`, an **orange** (`palette.brand`) pill with white 10px 800-weight text. On mount it does a one-time pulse: `scale 1 → 1.08 → 1` over 400ms each (delay 250ms, `Easing.out/in(cubic)`, `useNativeDriver`).
- Price = `variant="display"` `fontSize:28`. Footnote ("Save 38%") = caption `color: palette.success` (green), `fontWeight:'700'`.

---

## 6. The main app: liquid-glass tab bar + tabs

### 6.1 Tab bar (`(client)/_layout.tsx`) — **the real liquid glass**
Use Expo Router's **native tabs** so iOS 26 renders its native liquid-glass tab bar. Do not build a custom tab bar.

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function ClientTabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="house.fill" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* …one Trigger per tab. Icons are SF Symbol names via `sf`. */}
    </NativeTabs>
  );
}
```
- Pick 3–5 tabs appropriate to `{{APP_NAME}}`. Each `Trigger` has an `sf` SF-Symbol icon + a `Label`.
- The glass blur, active tint, and safe-area handling are provided by the OS — you get liquid glass for free here.

### 6.2 `TabScaffold` — standard layout for every content tab
`src/components/TabScaffold.tsx`. Every non-feed tab uses this.

- Root `View` `backgroundColor: palette.bg`, `SafeAreaView edges={['top']}`.
- A `ScrollView` with `paddingHorizontal: Spacing.lg`, `paddingTop: Spacing.lg`, `paddingBottom: Spacing.xxl + 32` (clears the floating glass tab bar), `showsVerticalScrollIndicator={false}`.
- **Large title header:** `ThemedText variant="display"` `fontSize:34` `lineHeight:38` `letterSpacing:-1` `color: palette.ink`, optional `subtitle` (`body`, `fontSize:15`, `inkSoft`). `marginBottom: Spacing.xl`.
- Renders `children`, OR a **placeholder empty-state card** if `placeholder` prop is given.

**Empty-state card pattern (reused everywhere):**
```
rounded card (Radius.xl), bg: palette.bgRaised, border 1px palette.divider, Shadows.card, padding Spacing.xl, centered, gap Spacing.md:
  • 72×72 tile, Radius.lg, bg: palette.brandSoft, with a centered SF Symbol (size 36, tintColor: palette.brand)
  • heading (fontSize 18, ink, centered)
  • body (fontSize 14, inkSoft, centered, maxWidth 280)
  • optional full-width primary PillButton
```
Build loading / error / empty variants off this same card (loading = `ActivityIndicator color={palette.brand}` + caption; error = swap the tile to a red `#FEE2E2` circle with `exclamationmark.triangle.fill` in `#DC2626`, + an `outline` retry button).

### 6.3 Settings tab — list patterns
`(client)/settings.tsx` via `TabScaffold title="Settings"`. Demonstrates the reusable list primitives:

- **Section** — an `eyebrow` heading in **orange** (`color: palette.brand`) + optional `caption` subtitle in `inkMuted`, then the rows.
- **Segmented control** (the theme switcher is the template) — a pill-shaped track: `flexDirection:'row'`, `padding:4`, `borderRadius: Radius.pill`, `bg: palette.bgRaised`, `border 1px divider`, `Shadows.card`. Each segment is a Pressable `flex:1`, `borderRadius: Radius.pill`; the **selected** segment fills `palette.ink` with `inkInverse` icon+text; unselected is transparent with `inkMuted`/`inkSoft`. Include the actual **Light / Dark / System** theme selector here (icons: `sun.max.fill`, `moon.fill`, `iphone`) wired to `setMode`.
- **Row with leading icon tile** — `paddingVertical: Spacing.md`, `borderRadius: Radius.lg`, pressed bg `palette.bgRaised`. Leading = 32×32 circle `bg: palette.brandSoft` with a 15px SF Symbol `tintColor: palette.brand`. Label = `body` `fontWeight:'500'` `flex:1`. Optional trailing caption (`inkMuted`) + a `chevron.right` (11px, `inkMuted`).
- **Card row with selectable accent** (the "connect" rows are the template) — a `card`-filled rounded row, `borderWidth:1.5`, border `palette.divider` normally but flips to a per-item **accent color** when "active". 40×40 leading icon circle, two-line title/subtitle, and a trailing pill button (`bg: palette.ink` "Connect" / `bg: palette.brandSoft` + orange text "Manage").
- **Footer:** centered caption `{{APP_NAME}} · v0.1.0`.

### 6.4 Profile tab (example content tab)
`TabScaffold title="Profile"`. Shows:
- **Account card** — `card` bg, `Radius.xl`, border + `Shadows.card`, row layout: a **56×56 orange avatar circle** (`bg: palette.brand`, `Shadows.glow`) with a white `person.fill` symbol, beside an eyebrow ("Signed in as") + heading (name) + caption (email).
- **Stat tiles row** — three `flex:1` tiles, `bg: palette.bgRaised`, `Radius.lg`, border. Each: an SF Symbol (`tintColor: palette.brand`), a big number (`heading`, `fontSize:22`, `fontWeight:'800'`), a caption label.
- A full-width `outline` "Sign out" button.

---

## 7. Media / content cards (if your app shows media)

If `{{APP_NAME}}` displays media tiles/feeds, follow this card anatomy (the original is a stream card; generalize to any media thumbnail). Skip this section if not applicable.

- **Preview:** a `16/9` `View`, `backgroundColor: '#000'`, `overflow:'hidden'`, holding an `Image` (`resizeMode:'cover'`) or video.
- **Floating overlay pills** (top-left, top-right, bottom-right) over the media: `paddingHorizontal:9`, `paddingVertical:5`, `borderRadius: Radius.pill`, `backgroundColor: 'rgba(10,15,31,0.78)'`, white text. A "LIVE"/status pill pairs a small pulsing dot (`width:7,height:7,borderRadius:4`, `backgroundColor: '#EF4444'`, opacity animated `1↔0.35` over 800ms loop) with an 800-weight 10px white label.
- **Meta row below:** a 36×36 colored avatar circle (initial letter, white 800-weight) + a column: a 13px 700-weight `inkSoft` name with a tiny accent dot, a 16px 700-weight `ink` title (`numberOfLines={2}`), and an optional **pill tag** (`bg: palette.bgRaised`, border `divider`, 11px 700-weight `inkSoft` text).

**Full-screen media/player view** (`(player)/...`): black background, light status bar, a floating 36×36 translucent close button (`rgba(10,15,31,0.55)`, border `rgba(255,255,255,0.18)`, white `xmark`) over the top-left, the 16:9 media pinned to the top, and a themed (`palette.bg`) info area below with title/meta.

---

## 8. Navigation flow (the "flow" to recreate)

```
Native splash (OS, white bg, logo)
        │
        ▼
(auth)/welcome  ──sign in──▶  (onboarding)/feature1 ──▶ feature2 ──▶ paywall
        ▲                                                               │
        │                                              X or CTA enters ─┘
        │                                                               ▼
        └──────────────── signed out ◀── sign out ──────────  (client) tabs
                                                              [Home · … · Settings · Profile]
                                                                   │ tap a card
                                                                   ▼
                                                              (player) full-screen view
```

- An **AuthGate** in the root layout decides the group: signed-out → `(auth)/welcome`; signed-in-but-not-onboarded → `(onboarding)/feature1`; signed-in + onboarded → `(client)`. (Stub the auth/onboarded booleans — the *routing structure* and *transitions* are what matter for UI.)
- Root `<Stack>` uses `screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: palette.bg } }}`.
- While auth resolves, render a blank `View` filled with `palette.bg` (prevents a white→dark strobe on cold launch in dark mode).
- Status bar: `<StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />` at the root; force `light` on the black player screen.

---

## 9. Motion & interaction language

- **Every tappable thing** fires `Haptics.selectionAsync()` on press; success/error flows fire `Haptics.notificationAsync(Success|Error)`.
- **Buttons** scale to `0.97` while pressed. **Cards/rows** scale to `0.98`. **Pressable rows** show a `palette.bgRaised` pressed background.
- **Pulse** (badges, live dots): `Animated` scale or opacity loop with `Easing` cubic/quad, `useNativeDriver: true`.
- **Screen transitions:** `animation: 'fade'`.
- **Pull-to-refresh** spinners + loading indicators tint to `palette.brand` (orange).

---

## 10. Build order (do it in this sequence)

1. `theme.ts` (Section 2) — palette, typography, spacing, radius, shadows.
2. `useTheme` provider + `ThemedText` + `PillButton` (Section 3). Wrap root in providers (`GestureHandlerRootView` → `SafeAreaProvider` → `ThemeProvider`).
3. Root `_layout.tsx` with the Stack + AuthGate + StatusBar (Section 8).
4. **Welcome/splash screen** (Section 4) — the anchor. Get it pixel-perfect.
5. Onboarding `OnboardingFeature` + feature1/feature2 + paywall (Section 5).
6. `(client)/_layout.tsx` NativeTabs glass bar + `TabScaffold` + Settings + Profile (Section 6).
7. Media cards + player, only if applicable (Section 7).
8. Pass over everything for haptics, press-scale, and dark-mode correctness (Section 9).

---

## 11. Acceptance checklist

- [ ] Bottom tab bar is the **native liquid-glass** bar (NativeTabs), not a custom view.
- [ ] No screen hardcodes a hex value — all colors come from `useTheme().palette`.
- [ ] **Orange** is used only for actionable/active elements; **selected** states invert to **ink**, not orange.
- [ ] Welcome screen has the orange→white→blue gradient halo and the ink/outline sign-in button stack.
- [ ] Every button is a full pill; every tap has a haptic + press-scale.
- [ ] Light **and** dark mode both look correct (toggle via Settings segmented control).
- [ ] Icons are SF Symbols throughout (`expo-symbols`).
- [ ] Empty/loading/error states use the shared rounded card pattern.
- [ ] Generous spacing & soft shadows — it should feel premium, not dense.

---

### Appendix — quick color reference (orange / blue / white)

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `brand` | `#F97316` | `#F97316` | Orange — primary accent / CTA |
| `brandDeep` | `#EA580C` | `#EA580C` | Darker orange |
| `blue` | `#2563EB` | `#2563EB` | Secondary accent |
| `bg` | `#FFFFFF` | `#0A0F1F` | Screen background |
| `bgRaised` | `#F6F8FC` | `#131A2E` | Lifted surface |
| `card` | `#FFFFFF` | `#131A2E` | Card surface |
| `ink` | `#0A0F1F` | `#F8FAFC` | Primary text |
| `inkSoft` | `#3A4256` | `#C7CCD8` | Secondary text |
| `inkMuted` | `#6B7280` | `#8A90A0` | Tertiary text |
| `brandSoft` | `#FFF1E6` | `rgba(249,115,22,0.18)` | Soft fill behind orange icons |
| `divider` | `#E6E8EF` | `#202842` | Hairline borders |
| halo | `#FFE8D6 → #FFFFFF → #DBEAFE` | `#2A1606 → #0A0F1F → #0B1E47` | Welcome/paywall gradient |
| overlay pill | `rgba(10,15,31,0.78)` | (same) | Dark translucent badge over media |

*End of spec.*
