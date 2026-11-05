// HTTP API for Canopy. Used by the Cloudflare Pages Function (functions/api/[[path]].js)
// and by the Vite dev/preview server (vite.config.js), so both behave the same way.
//
//   GET  /api/status  -> { ai: { enabled, model }, knowledgeBase, sources }
//   POST /api/chat    -> { messages: [{ role: 'user' | 'assistant', content }] }
//                        -> { reply, sources: [{ id, title, url }], mode: 'ai' | 'local', notice? }
//
// AI is optional. Set the secret AI_API_KEY (and optionally AI_BASE_URL and AI_MODEL) on the server.
// Any OpenAI-compatible chat-completions endpoint works. Without a key, answers come from the local
// knowledge base. The key is never sent to the browser.
import { KNOWLEDGE, SOURCES } from './knowledge.js';
import { answerLocally, retrievePassages } from './retrieval.js';

export const LIMITS = { maxMessages: 12, maxChars: 1000, maxAssistantChars: 2000, timeoutMs: 20000, maxTokens: 600 };
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const fail = (message, status = 400) => json({ error: message }, status);

export function aiConfig(env = {}) {
  const apiKey = String(env.AI_API_KEY || '').trim();
  return {
    enabled: apiKey.length > 0,
    apiKey,
    baseUrl: String(env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: String(env.AI_MODEL || DEFAULT_MODEL),
  };
}

export function systemPrompt(passages) {
  const context = passages.length
    ? passages.map((p, i) => `[${i + 1}] ${p.title}: ${p.body}`).join('\n')
    : '(No passages matched this question.)';
  return [
    'You are Canopy, an AI assistant for UN Sustainable Development Goal 15, Life on Land.',
    'Answer only about forests, land, soil, freshwater ecosystems, wildlife, biodiversity, invasive species, restoration, and the SDG 15 targets, including how they connect to India and Maharashtra. Politely decline other topics and suggest a related SDG 15 question.',
    'Ground factual claims in the numbered passages below and cite them inline as [1], [2]. If the passages do not contain the answer, say so and offer general guidance clearly marked as general knowledge. Never invent statistics.',
    'Be warm, concise and practical. Use at most about 200 words, and use short bullet points when giving steps.',
    '',
    'Passages:',
    context,
  ].join('\n');
}

async function askModel(config, messages, passages, fetchImpl) {
  const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      max_tokens: LIMITS.maxTokens,
      messages: [{ role: 'system', content: systemPrompt(passages) }, ...history],
    }),
    signal: AbortSignal.timeout(LIMITS.timeoutMs),
  });
  if (!response.ok) throw new Error(`The AI service returned HTTP ${response.status}.`);
  const data = await response.json();
  const reply = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!reply) throw new Error('The AI service returned an empty reply.');
  return reply;
}

export function validateMessages(body) {
  if (!body || !Array.isArray(body.messages)) return { error: 'Send a JSON body with a "messages" array.' };
  if (body.messages.length < 1 || body.messages.length > LIMITS.maxMessages) {
    return { error: `Send between 1 and ${LIMITS.maxMessages} messages.` };
  }
  const messages = [];
  for (const m of body.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return { error: 'Each message needs a role ("user" or "assistant") and text content.' };
    }
    let content = m.content.trim();
    if (!content) continue;
    if (m.role === 'user' && content.length > LIMITS.maxChars) {
      return { error: `Questions must be ${LIMITS.maxChars} characters or fewer.` };
    }
    // Earlier answers from the assistant may be long; keep them, but trimmed to a sensible size.
    if (content.length > LIMITS.maxAssistantChars) content = `${content.slice(0, LIMITS.maxAssistantChars)}…`;
    messages.push({ role: m.role, content });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return { error: 'The last message must be a non-empty user question.' };
  }
  return { messages };
}

export async function handleChat(request, env = {}, fetchImpl = fetch) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('Request body must be valid JSON.');
  }
  const checked = validateMessages(body);
  if (checked.error) return fail(checked.error);

  const { messages } = checked;
  const latest = messages[messages.length - 1].content;
  const config = aiConfig(env);

  if (config.enabled) {
    const passages = retrievePassages(messages);
    try {
      const reply = await askModel(config, messages, passages, fetchImpl);
      const sources = passages.map(p => ({ id: p.id, title: p.title, publisher: p.publisher, url: p.url }));
      return json({ reply, sources, mode: 'ai', model: config.model });
    } catch (err) {
      // Never fail the user: fall back to the local knowledge base and say why.
      const local = answerLocally(latest, { history: messages });
      return json({ ...local, mode: 'local', notice: `AI is unavailable right now, so this answer comes from the offline knowledge base. (${err.message})` });
    }
  }

  const local = answerLocally(latest, { history: messages });
  return json({ ...local, mode: 'local' });
}

// Browsers always send Origin on cross-site POSTs. Accept requests with no Origin (non-browser clients)
// and requests whose Origin host matches this server's host.
function sameOriginOnly(request, url) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get('Host') || url.host);
  } catch {
    return false;
  }
}

export async function handleApi(request, env = {}, fetchImpl = fetch) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method.toUpperCase();

  if (path === '/api/status' && (method === 'GET' || method === 'HEAD')) {
    const config = aiConfig(env);
    return json({
      ai: { enabled: config.enabled, model: config.enabled ? config.model : null },
      knowledgeBase: KNOWLEDGE.length,
      sources: Object.keys(SOURCES).length,
    });
  }

  if (path === '/api/chat') {
    if (method !== 'POST') return fail('Use POST for /api/chat.', 405);
    if (!sameOriginOnly(request, url)) return fail('Invalid request origin.', 403);
    return handleChat(request, env, fetchImpl);
  }

  return fail('Not found.', 404);
}
