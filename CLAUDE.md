# CounselOS — working notes for Claude

## Deployment & workflow preferences

- **Always edit the actual code.** When something is wrong, change the real
  source files — never mock, stub, or paper over the symptom. The fix should
  land in the code that runs in production.
- **Commit straight to `main` — no pull requests.** Kat's workflow is:
  build → she reviews on localhost → commit to `main` → push → Vercel
  auto-deploys production (`kat-ai-agents.vercel.app`). Do NOT create work
  branches or PRs; they only delayed deploys and confused things.
- **Wait for localhost approval before pushing to `main`.** Pushing `main`
  deploys to production immediately, so make the change, run `npm run build`,
  start/refresh the dev server, and let Kat approve on localhost first. Then
  commit + push. Don't push (deploy) on your own initiative.

## Stack

- Next.js 15 (App Router) + React, TypeScript, Tailwind.
- Deployed on Vercel. UI in `components/`, routes/pages in `app/`,
  agent definitions in `agents/`, shared helpers in `lib/`.
- Before pushing UI changes, validate with `npm run build`.
