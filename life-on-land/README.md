# Canopy: AI for Life on Land (UN SDG 15)

Canopy is a website about **Sustainable Development Goal 15, Life on Land**, with AI built in:

- **Ask Canopy AI**: a chat assistant grounded in a curated, cited SDG 15 knowledge base. It answers offline out of the box. Add an API key on the server and it uses a language model, with the retrieved passages as grounding.
- **AI action planner**: a transparent recommender that ranks 18 actions by location, home, available time and interests, explains each pick, maps it to SDG 15 targets, and can ask the AI to write a 4-week plan.
- **SDG 15 targets 15.1–15.9**, with links from each target into the assistant.
- **Facts**: FAO Global Forest Resources Assessment 2020, IPBES 2019, and India State of Forest Report 2023 (including Maharashtra and the Western Ghats). Every figure lists its source.
- **Impact estimator** for trees planted (an adjustable, illustrative estimate).
- **Personal pledges**, stored only in your browser.

The app is a React + Vite single-page site. The API (`/api/status`, `/api/chat`) runs as a Cloudflare Pages Function in production and as the same code inside the Vite dev/preview server locally.

This folder is self-contained. It does not change the ARINX video platform in the parent repository.

## Run locally

```sh
cd life-on-land
npm ci
npm run dev        # http://localhost:5173
npm test           # 38 unit and API tests (Node 18+)
npm run build      # static site in dist/
```

To enable the AI model locally, put the variables from `.env.example` in `.dev.vars` (never commit it) or export them in your shell, then restart `npm run dev`:

```sh
AI_API_KEY=... AI_MODEL=... npm run dev
```

## Deploy on Cloudflare Pages

1. Create a Pages project from this repository.
2. Set **Root directory** to `life-on-land`. This makes `functions/` the Pages Functions directory.
3. Framework preset: **None**. Build command: `npm run build`. Build output directory: `dist`. Use Node.js 20 or newer.
4. Optional: add encrypted secrets under Settings → Variables and Secrets: `AI_API_KEY` (required for AI answers), and optionally `AI_BASE_URL` and `AI_MODEL`. Redeploy after changing them.

Without a key, the site and the offline assistant still work. The status badge in the chat shows which mode is active.

## Design notes and limits

- **The API key never reaches the browser.** `/api/status` reports only whether AI is enabled and the model name.
- **Origin check on POST.** Browser requests from other sites are refused. The endpoint has no per-user rate limit. Before a public launch, add rate limiting (for example with Cloudflare Rate Limiting rules) and set a spending cap with your AI provider.
- **Failures fall back.** If the model is unavailable, the answer comes from the offline knowledge base and the page shows why.
- **Grounded, not guaranteed.** AI answers can be wrong. The UI links to the original sources. Check important decisions against them.
- **Planner is rule-based.** Its scores are transparent and deterministic. The AI is used only to write the narrative plan.
- **Statistics are dated.** They come from the sources linked on the page, which were current when they were written. Update `shared/knowledge.js` and `src/components/Facts.jsx` when newer reports are published.
- **Impact estimator** uses an illustrative default of 22 kg CO₂ per tree per year. Real values vary widely.
- **No accounts or personal data are collected.** Pledges stay in `localStorage`.

## Structure

- `shared/knowledge.js`: curated, cited knowledge base and source list
- `shared/retrieval.js`: TF-IDF search and offline answers
- `shared/planner.js`: action catalogue, scoring and plan text
- `shared/api.js`: API handler (status and chat, with optional AI)
- `functions/api/[[path]].js`: Cloudflare Pages Function entry point
- `vite.config.js`: dev and preview bridge to the same API
- `src/`: React UI (`components/`, `lib/`, `styles.css`)
- `tests/`: `node --test` suites for retrieval, planner and API
