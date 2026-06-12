# Sheehe & Associates AI Workspace — Handoff

_Last updated: 2026-06-12 (end of a full build day). Repo:
https://github.com/1n1h/Kat-Ai-Agents (main, all pushed). Production:
kat-ai-agents.vercel.app (auto-deploys from main). A separate
mobile/cloud agent also commits via branches + PRs (its workflow rules
are in CLAUDE.md) — always `git pull` + `npm install` before starting._

## What is DONE and working

**Both environments (local + deployed):**
- Agent pipeline: orchestrator + 5 specialists (personas in
  `agents/*/*.system.md`); local runs the Claude Agent SDK (user's
  subscription), deployed runs the direct Anthropic API with a cloud
  orchestrator that consults specialists privately. Prompt caching on;
  cloud specialists downshift opus→sonnet (CLOUD_FULL_MODELS=1 to
  disable).
- Firm context: company profile + employee profile (matched by login
  email, `lib/firmContext.ts`) + self-onboarded profiles
  (`users/{uid}/profile/self`) injected into every chat.
- Connectors LIVE with agent tools (`lib/connectorTools.ts`): Dropbox
  (search/list/read), Outlook (mail search/read, calendar, drafts-only
  email), Gmail (search/read), Google Drive (search/read incl. Docs
  export), Google Calendar. One Google grant covers Gmail+Drive+Cal.
- Web search: hosted Anthropic search primary, Tavily backup
  (tavily_search), hard never-fabricate rule in every prompt.
- Firestore sync: cases/threads under `users/{uid}/...`, realtime
  across devices, localStorage migration on first sign-in.
- Team access + onboarding: admins (lib/team.ts ADMIN_EMAILS = Kat +
  Travis, mirrored in Firestore rules) grant by email in Settings;
  granted users get the role wizard on first sign-in.
- Sheehe rebrand: navy/brass palette, SVG S-seal lockup (FirmLogo),
  hero logo fade-in/out, landing/metadata/tour renamed; "Powered by
  CounselOS" credit in landing footer.
- Voice: Kokoro TTS local (free) / ElevenLabs fallback deployed (voice
  EXAVITQu4vr4xnSDxMaL, env ELEVENLABS_VOICE_ID overrides), Scribe
  STT, voice mode w/ VAD + barge-in, dictation mic, concise-voice
  cost rule, iOS audio unlock (lib/audioPlayback).
- Files: per-case uploads (local disk locally, Firebase Storage
  deployed), agent-written deliverables with download chips +
  PDF/DOCX/XLSX conversion (local only), star/rename/delete menus on
  cases and threads (portal-rendered).

## REMAINING TASKS (priority order Kat set)

1. **MyCase connector** — BLOCKED on credentials. Kat registers at
   developers.mycase.com using the firm's MyCase login → put
   MYCASE_CLIENT_ID/SECRET in env (local + Vercel) → copy the dropbox
   route pattern (`app/api/connectors/dropbox/`) → add matter/contact/
   deadline/billing tools to lib/connectorTools.ts → add "mycase" to
   CONNECTABLE in components/connectors.tsx. Redirect URI:
   /api/connectors/mycase/callback (both hosts).
2. **Cloud file intelligence** — deployed agents can't read files
   uploaded into the app (Firebase Storage). Options: inline small
   text/PDF into prompts via Storage download; AND wire Anthropic
   Skills (docx/pdf/xlsx via code-execution container, beta) so cloud
   Drafting produces real formatted documents. PDF reading works
   locally (runtime Read) but not in cloud chat.
3. **Microsoft 365 connector row** (currently "Soon") — same CounselOS
   Entra app, add Files.Read.All / Sites.Read.All delegated scopes +
   OneDrive/Word tools. Small job now that Outlook works.
4. **Desktop application** (Kat: "way later") — evaluate Tauri vs
   Electron wrapping the app; local agent runtime fits a desktop
   bundle naturally.

## SMALLER OPEN ITEMS

- **Waitlist rules**: the landing waitlist IS wired (submitWaitlist →
  Firestore `waitlist` collection) but the published rules BLOCK it.
  Kat must add: `match /waitlist/{id} { allow create: if true; allow
  read, update, delete: if false; }` — or hide the waitlist for a
  firm-internal deployment.
- **Roster data pending**: Phil's real email (psheehe@ is an
  unverified guess in firm/employees/phillip-sheehe.md), Johanna's
  preferred login email, Brooksly's email + last name. Update
  frontmatter + grant access in Settings.
- **Vanity auth domain retry** (parked): rewrites for /__/auth are in
  next.config.ts and verified; Google rejected redirect_uri_mismatch —
  almost certainly the URI was added to the wrong OAuth client. Recipe:
  Firebase console → Authentication → Sign-in method → Google → Web
  SDK configuration → copy THAT client id → add
  https://kat-ai-agents.vercel.app/__/auth/handler to that client →
  wait 10 min → set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
  kat-ai-agents.vercel.app in both envs.
- **Google project split** (when the firm onboards for real): the
  consent screen is in Testing to allow Gmail/Drive restricted scopes,
  which limits Google *sign-in* to the 6 test users and expires Google
  connector tokens every 7 days. Clean fix: second GCP project for
  connector OAuth only; Firebase project's screen goes back to
  production.
- **Landing polish**: real firm logo assets exist in My docs/Logos
  (award badges: AV Preeminent, Top Rated Lawyers, Bar Register) —
  good for the trust bar; testimonials are placeholders; consider
  firm-specific hero copy.
- **Verify Vercel env hygiene**: ANTHROPIC_MODEL should be
  claude-sonnet-4-6 (cost); NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN reverted
  to ai-paralegal-b0b9d.firebaseapp.com; MS_CLIENT_ID is the CounselOS
  app (81528174-e042-43a1-a613-8f024e04a0b7); all 7 connector vars
  present.
- **Vercel "TypeCheck" deployment check** fails flakily ("unexpectedly
  — try redeploying") — an integration artifact, not our code (tsc is
  clean). Remove the integration if it annoys.
- **Phase-2 leftovers**: OCR tier (TOGETHER_API_KEY is set), in-app
  file search, draft viewer/editor.
- **Stripe** — deferred; single-firm pivot changes the billing story.
- **Future design**: firms/{firmId} shared matters (multi-attorney
  shared cases) needs its own rules + data model decision.
- **Kat's ideas list** (My docs/ideas.txt — marked "don't implement
  yet"): admin analytics dashboard, invoicing via Stripe, message
  archive/tagging, screen/call recording, in-app team chat, workflows.

## GOTCHAS

- `npm run build` while `npm run dev` runs clobbers .next — restart dev.
- Heavy deps (agent SDK, kokoro/onnx, transformers) are excluded from
  Vercel via outputFileTracingExcludes; chat/tts import them lazily.
  Don't import them top-level in routes. agents/ + firm/ .md files are
  traced into /api/chat via outputFileTracingIncludes.
- Internal names stay: localStorage keys "counselos.*", cookie names,
  matter-vs-case (code vs UI), persona folder names. Don't rename —
  they'd orphan user data.
- Azure: GUID-shaped strings are IDs, never secrets. Two Entra app
  registrations exist; CounselOS (81528174-...) is the live one.
- All audio playback must call primeAudioPlayback() inside the user
  gesture (iOS). Dropdowns near the sidebar must portal
  (stacking-context trap from the load animations).
- Admin lists live in TWO places: lib/team.ts ADMIN_EMAILS and the
  Firestore rules access/ block — keep in sync.
- Greeting shows whoever Firebase says is signed in; "wrong name"
  reports = wrong Google account in that browser.
