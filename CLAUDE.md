# CounselOS — working notes for Claude

## Deployment & workflow preferences

- **Always edit the actual code.** When something is wrong, change the real
  source files — never mock, stub, or paper over the symptom. The fix should
  land in the code that runs in production.
- **Always open a PR into `main`.** Production (`kat-ai-agents.vercel.app`)
  deploys from `main`. After committing and pushing the work branch, open a
  pull request targeting `main` so the change can reach the production URL —
  don't leave it sitting on a preview branch. Do this without being asked.

## Stack

- Next.js 15 (App Router) + React, TypeScript, Tailwind.
- Deployed on Vercel. UI in `components/`, routes/pages in `app/`,
  agent definitions in `agents/`, shared helpers in `lib/`.
- Before pushing UI changes, validate with `npm run build`.
