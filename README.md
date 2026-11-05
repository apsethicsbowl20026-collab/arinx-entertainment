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

## Repository structure

- `web/`: Pages frontend and licensed sample catalog.
- `functions/api/`: Pages Functions API, using D1 and R2 bindings.
- `migrations/`: D1 schema.
- `src/`: previous Next.js/PostgreSQL implementation, retained for reference; it is not part of the Pages build and does not share data with the D1 version.
- `public/arinx.html`: previous standalone catalog, retained for reference.

No existing PostgreSQL accounts or videos are automatically migrated to D1. Plan a separate, verified data and media migration before switching an existing deployment.

## Life on Land (SDG 15) website

`life-on-land/` contains **Canopy**, a separate AI-integrated website about UN SDG 15, Life on Land. It has its own package.json, tests and deployment notes (Pages root directory `life-on-land`). See [life-on-land/README.md](life-on-land/README.md).
