import { defineConfig, loadEnv } from 'vite';
import { handleApi } from './shared/api.js';

// Serves the same /api routes as the Cloudflare Pages Function, so `npm run dev` and
// `npm run preview` behave like production. Secrets are read from .dev.vars or the shell
// environment, never from client code.
function canopyApi(env) {
  const middleware = async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/')) return next();
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const host = req.headers.host || 'localhost';
      const request = new Request(new URL(req.url, `http://${host}`), {
        method: req.method,
        headers: req.headers,
        body: hasBody && chunks.length ? Buffer.concat(chunks) : undefined,
      });
      const response = await handleApi(request, env);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Internal server error.' }));
      console.error(err);
    }
  };
  return {
    name: 'canopy-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  return {
    plugins: [canopyApi(env)],
    esbuild: { jsx: 'automatic' },
    server: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
    preview: { host: '0.0.0.0', allowedHosts: ['.e2b.app'] },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
