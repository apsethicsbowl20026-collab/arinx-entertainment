// Cloudflare Pages Function: serves /api/status and /api/chat.
// Set AI_API_KEY as an encrypted secret in the Pages project (optional; see README).
import { handleApi } from '../../shared/api.js';

export async function onRequest({ request, env }) {
  return handleApi(request, env);
}
