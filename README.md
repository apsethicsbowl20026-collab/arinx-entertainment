# ARINX

ARINX is a video-sharing starter built for **Cloudflare Pages**. It includes a responsive discovery feed, search and category filters, a video player, watch history and Watch later (stored in the browser), accounts, uploads, likes, comments and creator subscriptions. The sample catalog consists of freely licensed Wikimedia Commons videos; each watch page links to its source and attribution.

This is **not a 1:1 functional equivalent of YouTube**. In particular it does not provide transcoding/adaptive streaming, live streaming, recommendation algorithms, moderation tooling, email verification/password reset, captions processing, notifications, monetization, or production-grade abuse prevention. Uploaded videos are public and limited to 50 MB. Before opening registration to the public, implement rate limiting, email verification, content moderation/reporting, copyright/takedown processes, and stronger operational controls. Creators must have the rights to their uploads.

## Deploy with Cloudflare Pages

1. In Cloudflare, create a D1 database (for example `arinx-db`) and an R2 bucket (for example `arinx-media`). R2 may need to be enabled on your account.
2. Apply `migrations/0001_initial.sql` to the D1 database. For example, with Wrangler installed and authenticated: `npx wrangler d1 execute arinx-db --remote --file=migrations/0001_initial.sql`. Apply it to a separate preview database as well if you use one. **Do not use the old PostgreSQL schema in `src/db` for this deployment.**
3. Connect this repository to Cloudflare Pages. Set the framework preset to **None**, build command to `npm run build`, and build output directory to `dist`. Use Node.js 20 or newer (set `NODE_VERSION` to `20` if needed). Pages automatically builds the `functions/` directory as Pages Functions.
4. In the Pages project's **Settings → Bindings**, add the D1 database binding named `DB` and the R2 bucket binding named `MEDIA` for both production and preview environments as appropriate. Redeploy after changing bindings. No secrets or API tokens are needed in the repository.
5. Visit your Pages URL. The sample catalog can be browsed without bindings, but account, uploads, likes, comments and subscriptions require the bindings and initialized database. Wikimedia media is hosted externally and its availability depends on Wikimedia.

R2 files are served by a Pages Function with HTTP Range support for seeking. Uploads go through the Function; Cloudflare request-size limits and Worker resource limits apply. The 50 MB cap is intentional, not a substitute for direct multipart uploads or a transcoding pipeline. Monitor D1/R2 usage and Cloudflare quotas before scaling.

## Local development

```sh
npm ci
npm run dev
npm run build
npm test
```

The test suite requires Node.js 22 or newer for its built-in SQLite test database.

Vite alone serves the frontend and the sample catalog; it does **not** run Pages Functions, so account and backend features need the Pages local runtime. For an integrated local test, install Wrangler, create a local configuration with `pages_build_output_dir = "dist"`, a D1 binding named `DB`, and an R2 binding named `MEDIA`, apply the migration to the local D1 database, and run `npx wrangler pages dev dist` after building. Do not commit real credentials or account IDs. The Vite preview and local dev server are not production deployments.

## AI for Life on Land (SDG 15) site

A separate educational website about UN Sustainable Development Goal 15 (Life on Land) and how AI supports it lives at `/life-on-land/` (source: `public/life-on-land/`). It is plain HTML, CSS and JavaScript with no build step, and it is copied into the Vite output as-is, so it deploys with the rest of the Pages project.

It includes:

- **Goal overview** with the key SDG 15 targets and sourced figures.
- **AI in action**: how computer vision, acoustic monitoring, satellite and radar alerts, drones and forest inventories support conservation.
- **Habitat health check**: a transparent, rule-based score with visible weights. It is deliberately not machine learning, and the page says so.
- **Land Guide**: a chat assistant. It uses a live AI model through `functions/api/life-on-land/chat.js` when configured, and otherwise answers from curated notes in `public/life-on-land/knowledge.js`. The page shows which mode is active.
- **Take action** checklist, stored only in the visitor's browser, and a sources list.

To enable live AI on Cloudflare Pages, go to **Settings → Environment variables** and add:

- `LLM_API_KEY` (required, store as a **Secret**): API key for an OpenAI-compatible chat completions service. The key is only read on the server and never sent to the browser.
- `LLM_BASE_URL` (optional): default `https://api.openai.com/v1`.
- `LLM_MODEL` (optional): default `gpt-4o-mini`.

Without `LLM_API_KEY` the site works fully, using the offline notes. Vite (`npm run dev`) does not run Pages Functions, so the Land Guide uses offline answers there. To test the live path locally, use `npx wrangler pages dev dist` with the variables set as bindings. The endpoint has no per-visitor rate limiting, so set spending limits with your AI provider before enabling it on a public site.

## Repository structure

- `web/`: Pages frontend and licensed sample catalog.
- `functions/api/`: Pages Functions API, using D1 and R2 bindings.
- `migrations/`: D1 schema.
- `src/`: previous Next.js/PostgreSQL implementation, retained for reference; it is not part of the Pages build and does not share data with the D1 version.
- `public/arinx.html`: previous standalone catalog, retained for reference.
- `public/life-on-land/`: AI for Life on Land (SDG 15) static site.

No existing PostgreSQL accounts or videos are automatically migrated to D1. Plan a separate, verified data and media migration before switching an existing deployment.
