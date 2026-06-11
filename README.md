# CounselOS — AI workspace for attorneys

Specialist legal AI agents — litigation analysis, contract review, drafting,
citation check, and practice strategy — orchestrated by the Claude Agent SDK,
behind a professional matter-based workspace.

Built on the agent architecture in [agents/](agents/): an orchestrator that
mediates every hop, read-only analysts, a single writing drafter, and a
validator that audits every draft for citation grounding before it ships.

## Run it

```bash
npm install
copy .env.example .env.local   # then put your ANTHROPIC_API_KEY in .env.local
npm run dev                    # http://localhost:3000
```

Without Firebase keys the app runs in **local mode** (no sign-in; matters and
threads persist in the browser, uploaded files in `uploads/<matter>/` on this
machine). Set the `NEXT_PUBLIC_FIREBASE_*` vars to require Google sign-in.

## How it works

- **Matters** — every conversation and file belongs to a matter. Each matter
  gets an isolated working directory under `uploads/`; agents can only see
  the active matter's files.
- **Auto (orchestrated)** — the default agent. Triages the request and
  delegates to specialists via the SDK's subagent mechanism: analysis always
  precedes drafting, and drafts are routed through citation check.
- **Direct specialists** — pick Litigation, Contracts, Drafting, Cite Check,
  or Strategy in the switcher to talk to one specialist with exactly its
  tools (analysts are read-only; only Drafting can write files).

## Layout

```
agents/            agent system prompts + SDK definitions (registry.ts)
  orchestrator/    routing rules, model-ID map rationale
  sol/ cass/ ...   specialist personas (internal names; UI shows role names)
  _archive/        retired duplicates
app/api/chat/      streaming chat endpoint (Agent SDK)
app/api/files/     per-matter upload + listing
components/        workspace UI (transcript-style thread, composer, auth gate)
lib/               client-safe agent metadata, local store, firebase (optional)
```

## Roadmap (from the project doc)

1. ✅ Core app: chat, agent switching, matters, file upload
2. Document scanning/OCR, file search, draft viewer
3. Voice: ElevenLabs dictation (STT) and TTS
4. Landing page (Remotion animations) + Stripe
5. Integrations: Email, Google Docs, Slack, Calendar, NetDocuments, SharePoint
6. Mobile via Expo / EAS
