# ARINX

ARINX is a video-sharing starter built for **Cloudflare Pages**. It includes a responsive discovery feed, search and category filters, a video player, watch history and Watch later (stored in the browser), accounts, uploads, likes, comments and creator subscriptions. The sample catalog consists of freely licensed Wikimedia Commons videos; each watch page links to its source and attribution.

This is **not a 1:1 functional equivalent of YouTube**. In particular it does not provide transcoding/adaptive streaming, live streaming, recommendation algorithms, moderation tooling, email verification/password reset, captions processing, notifications, monetization, or production-grade abuse prevention. Uploaded videos are public and limited to 50 MB. Before opening registration to the public, implement rate limiting, email verification, content moderation/reporting, copyright/takedown processes, and stronger operational controls. Creators must have the rights to their uploads.

## Deploy with Cloudflare Pages

1. In Cloudflare, create a D1 database (for example `arinx-db`) and an R2 bucket (for example `arinx-media`). R2 may need to be enabled on your account.
2. Apply the migrations to the D1 database, in order: `npx wrangler d1 execute arinx-db --remote --file=migrations/0001_initial.sql` and then `--file=migrations/0002_admin_role.sql`. For example: `for f in migrations/*.sql; do npx wrangler d1 execute arinx-db --remote --file="$f"; done`. Apply them to a separate preview database as well if you use one. **Do not use the old PostgreSQL schema in `src/db` for this deployment.**
3. Connect this repository to Cloudflare Pages. Set the framework preset to **None**, build command to `npm run build`, and build output directory to `dist`. Use Node.js 20 or newer (set `NODE_VERSION` to `20` if needed). Pages automatically builds the `functions/` directory as Pages Functions.
4. In the Pages project's **Settings → Bindings**, add the D1 database binding named `DB` and the R2 bucket binding named `MEDIA` for both production and preview environments as appropriate. Redeploy after changing bindings. No secrets or API tokens are needed in the repository.
5. Visit your Pages URL. The sample catalog can be browsed without bindings, but account, uploads, likes, comments and subscriptions require the bindings and initialized database. Wikimedia media is hosted externally and its availability depends on Wikimedia.

R2 files are served by a Pages Function with HTTP Range support for seeking. Uploads go through the Function; Cloudflare request-size limits and Worker resource limits apply. The 50 MB cap is intentional, not a substitute for direct multipart uploads or a transcoding pipeline. Monitor D1/R2 usage and Cloudflare quotas before scaling.

## Troubleshooting: "The platform database is not configured"

This message means the Pages Function is deployed and running, but it cannot see a D1 binding named `DB` in the deployment that served your request. The frontend and the Function are fine — this is a configuration issue, not a code bug. Check these in order:

1. **Redeploy after adding the binding.** Bindings only take effect on new deployments. In the Cloudflare dashboard go to your Pages project → **Deployments** → **Retry deployment** (or push any commit) after adding or changing a binding in **Settings → Bindings**. If you added the `DB` binding just now, the currently live deployment still has no binding until you redeploy.
2. **Production vs Preview environments.** Bindings are configured separately for each environment. `your-project.pages.dev` is the production alias, so it needs the binding under **Production**. Preview deployments (branch previews and `<commit>.your-project.pages.dev`) need their own **Preview** binding. A binding added only to Production does not apply to preview deployments, and vice versa.
3. **Binding name must be exactly `DB`** (D1) and `MEDIA` (R2), case-sensitive. `DATABASE`, `d1`, `ARINX_DB` etc. will not be found by the code.
4. **The binding must be on the project that serves the domain.** If you have more than one Pages project connected to this repo, double-check you bound D1 on the project that actually serves `arinx.pages.dev` (**Workers & Pages → your project → Settings → Bindings**).
5. **Verify remotely with `/api/health`.** Every deployment exposes `https://<your-site>/api/health`, which returns JSON like `{"ok":true,"bindings":{"db":true,"media":true},"database":"ok"}` (or `503` with `database` set to `not-configured` / `error`). This is the fastest way to confirm a redeploy picked up the binding — no dashboard access required.

Note on the D1 dashboard metrics: the queries you see there include the migration you applied (`wrangler d1 execute ... --file=migrations/0001_initial.sql`) and any manual `wrangler d1 execute` calls you ran. The live site cannot query D1 at all until a deployment with the `DB` binding is live, so those metric entries are not proof the site is connected. After a successful redeploy, `/api/health` will report `database: "ok"` and account, upload, like, comment and subscription features will work.

If you prefer bindings in source control instead of the dashboard, run `npx wrangler pages download config <your-project-name>` locally (requires `wrangler login`), review the generated `wrangler.jsonc`, commit it, and redeploy. The Wrangler file becomes the source of truth for the project (the corresponding dashboard fields become read-only). See `wrangler.jsonc.example` for the shape of that file; replace the placeholders with your own values or use the `download config` output.

## Admin console

The live version includes a self-contained admin console at **`https://arinx.pages.dev/admin`**. It lets an administrator see site stats, search members, grant/revoke the `admin` role, delete accounts (along with their uploads, comments, likes and subscriptions), delete uploaded videos, and delete comments. Wikimedia Commons sample videos are external and are not deletable from the console.

Roles are stored on the `users` table (`user` → `admin` → `owner`):

- `user`: default for every new account.
- `admin`: can open the console, view member/video/comment data and moderate content.
- `owner`: like `admin`, plus the only account that can **grant** `admin`. The owner cannot be changed, demoted or deleted.

New accounts are **never** automatically admin — this project has no email verification, so email is not proof of identity. To promote yourself, first register normally on the site with the account you want to use, then run once:

```sh
npx wrangler d1 execute arinx-db --remote --command "UPDATE users SET role='owner' WHERE email='you@example.com'"
```

Your existing session picks up the new role on the next request (no sign-out needed). The console page itself is public HTML, but every `/api/admin/*` endpoint requires an `admin` or `owner` role; everyone else gets `403`.

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
- `functions/api/`: Pages Functions API, using D1 and R2 bindings (includes `admin/*` role-gated moderation endpoints).
- `public/admin.html`: self-contained admin console (served at `/admin`).
- `migrations/`: D1 schema, applied in filename order.
- `wrangler.jsonc.example`: template for moving Pages bindings into source control (optional; see Troubleshooting).
- `src/`: previous Next.js/PostgreSQL implementation, retained for reference; it is not part of the Pages build and does not share data with the D1 version.
- `public/arinx.html`: previous standalone catalog, retained for reference.

No existing PostgreSQL accounts or videos are automatically migrated to D1. Plan a separate, verified data and media migration before switching an existing deployment.
