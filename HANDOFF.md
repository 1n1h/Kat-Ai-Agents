# CounselOS — Session Handoff

_Last session: 2026-06-11. Repo: https://github.com/1n1h/Kat-Ai-Agents (main, all pushed). Deploy: kat-ai-agents.vercel.app (auto-deploys on push)._

## Where things stand

**Working today — local install** (`npm run dev`, needs `.env.local`):
- Full agent pipeline via Claude Agent SDK: orchestrator (Atlas) delegating to
  Litigation Analysis (Sol), Contract Review (Cass), Drafting (Lex), Citation
  Check, Strategy (Vera). Personas live in `agents/*/​*.system.md`.
- Matter/case workspace: cases + threads (localStorage), per-case working
  directories under `uploads/`, file upload, agent-written deliverables with
  in-chat download chips + PDF/DOCX/XLSX conversion (`/api/files/download`).
- Voice: Kokoro TTS (free, local, 7 voices), ElevenLabs Scribe STT, hands-free
  voice mode with VAD + barge-in, dictation mic (transcribe-to-input).
- Firebase auth (Google + email), settings dialog, dark/light themes,
  mobile-responsive drawer sidebar.

**Working today — cloud (Vercel)**:
- Chat via direct Anthropic API fallback (haiku triage routes "auto" to a
  specialist; streamed deltas). No file tools in cloud — agents ask for
  pasted text.
- Voice: Scribe STT + ElevenLabs TTS fallback (kokoro is local-only).
- Uploads → Firebase Storage (`matters/{uid}/{caseId}/`); Files list merges
  local + cloud. **Depends on Storage rules being published** (given to Kat
  last session — verify they were saved, plus the Firestore rules).

## Next session — TODO (rough priority)

1. **Verify cloud deploy end-to-end** on phone: chat reply, voice loop,
   upload to Storage. If uploads fail → Storage rules not published.
2. **Thread/case sync via Firestore** — move matters/threads from
   localStorage to `users/{uid}/...` so phone and desktop share state.
   Rules already designed for this shape.
3. **Google connectors (Gmail, Drive, Docs, Calendar)** — Kat creates the
   OAuth client in the existing GCP project (consent screen: Internal if
   Amplo has Workspace, else Testing mode); then build OAuth callback route,
   token storage in `users/{uid}/connectors`, and expose as agent tools.
   Replaces the "Connect" stubs in `components/connectors.tsx`.
4. **Cloud file intelligence** — let cloud chat read Storage files (inline
   small text/PDF into prompts) so document review works deployed.
5. **Landing page** (project doc phase 4): Claude-palette, hero, scrolling
   feature bar, five feature sections, Remotion animations. Then Stripe.
6. **Phase 2 leftovers**: OCR/scanning tier (Together AI key is set),
   file search, in-app draft viewer/editor.
7. **Polish backlog**: voice VAD thresholds untested in noisy rooms;
   PDF letterhead/caption-page templates; monochrome-green brand icons if
   Kat wants stricter palette; rotate suggestion pool contents per Kat's
   practice areas.

## Gotchas for the next agent

- `npm run build` while `npm run dev` is running breaks the dev server
  (.next clobbered) — restart dev after building.
- Heavy deps (agent SDK, kokoro/onnx, transformers) are excluded from Vercel
  bundles via `outputFileTracingExcludes`; chat/tts import them lazily and
  fall back. Don't re-import them top-level in those routes.
- `.env.local` holds all keys (Anthropic, ElevenLabs, Together, Stripe,
  Firebase NEXT_PUBLIC_*). Vercel env mirrors it. `google_services.json`
  is the Android artifact — gitignored, unused by web.
- User-facing copy says **case**, code says **matter** — intentional.
- Persona names (Sol/Cass/Lex/Atlas/Vera) are internal only; UI uses role
  names. Don't surface personas in UI copy.
- Greeting name comes from the live Firebase session — "wrong name" reports
  mean the browser is signed into a different account (Kat vs Travis).
