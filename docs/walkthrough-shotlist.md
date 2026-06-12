# 90-Second Walkthrough — Shot List

The teaching video for the landing page (`components/landing/TourSection.tsx`).
Goal: show the associate the real app doing one real matter, start to finish,
so they feel "I can do that" before they ever sign in.

## Before you record
- **Light theme**, window sized ~**1280×800** (clean 16:9-ish), browser chrome hidden if possible.
- Use a **sample matter with fake data** — no real client names, no privileged docs.
- Have a sample PDF ready (e.g. a generic "Settlement_Agreement.pdf").
- Move the cursor **slowly and deliberately**; pause ~1s after each click.
- Record at **30fps**, target **≤ 95 seconds**. Captions can be added in post.
- Output `public/tour.mp4` + a still frame `public/tour-poster.jpg`, then set
  `TOUR_ENABLED = true` in `TourSection.tsx`.

## The shots

| # | Time | On screen | Caption / voiceover |
|---|------|-----------|---------------------|
| 1 | 0:00–0:06 | Landing page → click **Open the workspace** → sign-in → workspace loads | "Sign in with your firm account." |
| 2 | 0:06–0:15 | Click **+** next to Cases → name it *"Sample — Settlement Review"* → open it | "Open a matter. Everything you do stays isolated to it." |
| 3 | 0:15–0:25 | Drag a PDF into the composer → upload completes | "Add the documents you're working from." |
| 4 | 0:25–0:37 | With **Orchestrated** selected, type: *"Review this settlement agreement — flag the risk clauses, draft a response, and verify every citation."* → send | "Ask in plain language — like briefing a colleague." |
| 5 | 0:37–0:53 | Status lines stream: *consulting: litigation analysis → contract review → drafting → citation check* | "One orchestrator plans the work and routes each piece to a specialist." |
| 6 | 0:53–1:08 | Reply lands: ranked risk clauses, draft summary, **✓ every citation verified** badge → scroll to show a citation | "Every finding is cited. Every draft is audited before it reaches you." |
| 7 | 1:08–1:18 | Click the deliverable **download chip** → a .docx / .pdf saves | "Take the draft as a Word or PDF file." |
| 8 | 1:18–1:26 | Tap the **mic** and ask a short follow-up, *or* open **Connectors** to show Outlook / Drive / Gmail | "Talk to it — or pull straight from your inbox, Drive, and calendar." |
| 9 | 1:26–1:30 | Return to a clean thread → firm lockup | "Sheehe & Associates — your AI legal team." |

## Tips
- If the orchestration status lines go by too fast, you can trim/slow shot 5 in
  editing — it's the "wow" moment, give it room.
- Keep shot 6 honest: show a citation the user can actually read, not a blur.
- A soft cut between shots beats hard jumps; no need for fancy transitions.
