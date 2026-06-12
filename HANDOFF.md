# CounselOS — Session Handoff

_Last updated: 2026-06-12 (after merging the mobile agent's landing-page +
iOS-fix branch). Repo: https://github.com/1n1h/Kat-Ai-Agents (main, all
pushed). Deploy: kat-ai-agents.vercel.app (auto-deploys from main).
Workflow prefs for cloud/mobile agents live in `CLAUDE.md` (work on a
branch, validate with `npm run build`, PR into main)._

## Where things stand

**Working today — local install** (`npm run dev`, needs `.env.local`):
- Full agent pipeline via Claude Agent SDK: orchestrator (Atlas) delegating
  via Task tool to Litigation Analysis (Sol), Contract Review (Cass),
  Drafting (Lex), Citation Check, Strategy (Vera). Personas in
  `agents/*/*.system.md`.
- Case workspace: cases + threads (localStorage), per-case working dirs
  under `uploads/`, uploads, agent-written deliverables with in-chat
  download chips + PDF/DOCX/XLSX conversion (`/api/files/download`).
- Voice: Kokoro TTS (free, local, 7 voices), ElevenLabs Scribe STT,
  hands-free voice mode (VAD + barge-in), dictation mic.
- Firebase auth (Google + email), settings dialog, dark/light, mobile
  drawer sidebar, one-time Driver.js walkthrough tour.

**Working today — cloud (Vercel)**:
- Chat: direct Anthropic API fallback. "Auto" now runs a real cloud
  orchestrator persona — single voice, consults specialists privately
  (`ORCH_CLOUD_PROMPT` in `app/api/chat/route.ts`); picking a specialist
  directly uses that persona. Streamed deltas. No file tools — agents ask
  for pasted text.
- Voice: Scribe STT + ElevenLabs TTS fallback. iOS playback fixed via
  `lib/audioPlayback.ts` (`primeAudioPlayback()` must be called inside the
  user gesture — keep that pattern for any new audio).
- Uploads → Firebase Storage (`matters/{uid}/{caseId}/`); Files list merges
  local + cloud. Storage + Firestore rules were given to Kat — **verify
  they're published** if uploads fail.

**Marketing landing page** (mobile agent, 2026-06-12):
- Signed-out visitors on the deployed site see the landing
  (`components/landing/`): header, hero, scrolling trust bar/marquee,
  cinematic GSAP orchestration showcase, testimonials, waitlist dialog.
  Sign-in lives on the landing. View it while signed in with
  `?preview=landing`. Animation deps: gsap, driver.js.

## PIVOT (2026-06-12): single-firm deployment — Sheehe & Associates, P.A.

This web app now serves one firm: https://sheeheandassociates.com (FL
commercial/insurance litigation boutique; see `firm/company-profile.md`).
Firm context is injected into every chat (company profile for everyone;
matching employee profile by signed-in email — see `lib/firmContext.ts`).
Firm stack: **Microsoft 365 / Outlook, MyCase, Dropbox** (+ Google kept).

Firm-pivot TODO:
- **Employee onboarding flow** (per Kat): a Settings option to grant
  admin access by email; when that user signs up, walk them through
  selecting their role + email and generate an employee profile
  (currently profiles are hand-written .md in firm/employees/).
- **Pending roster data**: Phil's email (psheehe@ unverified), Johanna's
  preferred email (jsheehe@ published; Kat confirming), Brooksly's email
  and last name. Katherine Rodriguez = legalassistant@sheeheandassociates.com.
- **Rebrand to Sheehe & Associates** (Kat approved): wordmark, palette,
  landing copy. Their site: navy/professional; tagline "Experience.
  Knowledge. Strategy."
- **Desktop application** (Kat): plan a packaged desktop build —
  evaluate Tauri vs Electron wrapping the Next app; the local-install
  agent runtime fits a desktop bundle naturally.
- **Connectors to build**: Outlook/M365 (Entra app registration → Graph
  API), Dropbox (App Console app), MyCase (needs MyCase developer/API
  credentials — request from MyCase; firm admin authorizes via OAuth at
  connect time), then Google.

## Next session — TODO (rough priority)

1. **Wire the waitlist dialog** — it's UI-only today (submits nowhere).
   Easiest: write entries to Firestore `waitlist/` (needs a small rules
   addition) or a mailto/Formspree stopgap.
2. **Verify cloud e2e on phone** — chat reply, voice loop, upload to
   Storage (rules!), landing → sign-in → workspace flow.
3. **Thread/case sync via Firestore** — move matters/threads from
   localStorage to `users/{uid}/...` so phone and desktop share state.
   Published rules already allow this shape.
4. **Google connectors (Gmail, Drive, Docs, Calendar)** — Kat creates the
   OAuth client in the existing GCP project (consent screen: Internal if
   Amplo has Workspace, else Testing mode); then OAuth callback route,
   tokens in `users/{uid}/connectors`, expose as agent tools. Replaces the
   "Connect" stubs in `components/connectors.tsx`.
5. **Cloud file intelligence** — let cloud chat read Storage files (inline
   small text/PDF into prompts) so document review works deployed.
6. **Stripe** (project doc phase 4) — landing exists now; add pricing +
   checkout when Kat decides tiers.
7. **Phase 2 leftovers**: OCR/scanning tier (Together key set), file
   search, in-app draft viewer/editor.
8. **Polish backlog**: voice VAD thresholds in noisy rooms; PDF
   letterhead/caption templates; landing copy pass with Kat (testimonials
   are placeholders); rotate suggestion pool per Kat's practice areas.

## Gotchas for the next agent

- `npm run build` while `npm run dev` is running breaks the dev server
  (.next clobbered) — restart dev after building.
- Heavy deps (agent SDK, kokoro/onnx, transformers) are excluded from
  Vercel bundles via `outputFileTracingExcludes`; chat/tts import them
  lazily and fall back. Don't re-import them top-level in those routes.
- All audio playback goes through `lib/audioPlayback.ts`; call
  `primeAudioPlayback()` inside the triggering tap/click or iOS will
  silently block playback.
- `AgentSelect` renders its menu through a portal (mobile clipping) —
  follow that pattern for new dropdowns near the composer.
- `.env.local` holds all keys (Anthropic, ElevenLabs, Together, Stripe,
  Firebase NEXT_PUBLIC_*); Vercel env mirrors it. `google_services.json`
  is the Android artifact — gitignored, unused by web.
- User-facing copy says **case**, code says **matter** — intentional.
- Persona names (Sol/Cass/Lex/Atlas/Vera) are internal only; the cloud
  orchestrator prompt explicitly forbids self-naming. Don't surface
  personas in UI copy. House style: no em dashes in drafted legal content.
- Greeting name comes from the live Firebase session — "wrong name"
  reports mean the browser is signed into a different Google account.
