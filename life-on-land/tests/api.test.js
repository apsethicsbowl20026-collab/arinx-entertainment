import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleApi, validateMessages, systemPrompt, LIMITS } from '../shared/api.js';

const BASE = 'https://canopy.example';
const post = (body, headers = {}) => new Request(`${BASE}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE, ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const userMsg = content => ({ role: 'user', content });

test('status reports AI disabled and never exposes the key when no key is set', async () => {
  const res = await handleApi(new Request(`${BASE}/api/status`), {});
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ai.enabled, false);
  assert.equal(data.ai.model, null);
  assert.ok(data.knowledgeBase > 0);
  assert.ok(!JSON.stringify(data).includes('sk-'));
});

test('status reports AI enabled with the model name, but not the secret', async () => {
  const env = { AI_API_KEY: 'sk-secret-123', AI_MODEL: 'test-model' };
  const data = await (await handleApi(new Request(`${BASE}/api/status`), env)).json();
  assert.equal(data.ai.enabled, true);
  assert.equal(data.ai.model, 'test-model');
  assert.ok(!JSON.stringify(data).includes('sk-secret-123'));
});

test('chat without a key answers locally with citations', async () => {
  const res = await handleApi(post({ messages: [userMsg('How much forest is left in the world?')] }), {});
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.mode, 'local');
  assert.ok(data.sources.length > 0);
  assert.equal(data.notice, undefined);
});

test('chat with a key calls the model with grounded context and the key in the header only', async () => {
  let captured;
  const fakeFetch = async (url, init) => {
    captured = { url, init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Forests cover 31% of land [1].' } }] }), { status: 200 });
  };
  const env = { AI_API_KEY: 'sk-test', AI_BASE_URL: 'https://llm.example/v1/', AI_MODEL: 'm1' };
  const res = await handleApi(post({ messages: [userMsg('How much forest is left in the world?')] }), env, fakeFetch);
  const data = await res.json();
  assert.equal(data.mode, 'ai');
  assert.equal(data.reply, 'Forests cover 31% of land [1].');
  assert.equal(captured.url, 'https://llm.example/v1/chat/completions');
  assert.equal(captured.init.headers.Authorization, 'Bearer sk-test');
  assert.equal(captured.body.model, 'm1');
  const system = captured.body.messages[0].content;
  assert.match(system, /Passages:/);
  assert.match(system, /\[1\] /);
  assert.ok(data.sources.length > 0);
});

test('AI failures fall back to the local knowledge base with a notice', async () => {
  const failing = async () => new Response('nope', { status: 500 });
  const env = { AI_API_KEY: 'sk-test' };
  const data = await (await handleApi(post({ messages: [userMsg('What are invasive species?')] }), env, failing)).json();
  assert.equal(data.mode, 'local');
  assert.match(data.notice, /HTTP 500/);
  assert.ok(data.sources.length > 0);
});

test('an empty AI reply is treated as a failure', async () => {
  const empty = async () => new Response(JSON.stringify({ choices: [{ message: { content: '  ' } }] }), { status: 200 });
  const data = await (await handleApi(post({ messages: [userMsg('wildlife')] }), { AI_API_KEY: 'k' }, empty)).json();
  assert.equal(data.mode, 'local');
  assert.match(data.notice, /empty reply/);
});

test('long earlier assistant answers are trimmed, not rejected', () => {
  const long = 'a'.repeat(LIMITS.maxAssistantChars + 500);
  const res = validateMessages({ messages: [{ role: 'assistant', content: long }, userMsg('forest')] });
  assert.ok(!res.error);
  assert.equal(res.messages[0].content.length, LIMITS.maxAssistantChars + 1);
});

test('invalid JSON and invalid message shapes are rejected', async () => {
  const bad = await handleApi(post('{not json'), {});
  assert.equal(bad.status, 400);
  assert.equal((await handleApi(post({}), {})).status, 400);
  assert.equal((await handleApi(post({ messages: [] }), {})).status, 400);
  assert.equal((await handleApi(post({ messages: [{ role: 'system', content: 'hi' }] }), {})).status, 400);
  assert.equal((await handleApi(post({ messages: [{ role: 'assistant', content: 'hi' }] }), {})).status, 400);
});

test('overlong messages and too many messages are rejected', () => {
  assert.ok(validateMessages({ messages: [userMsg('x'.repeat(LIMITS.maxChars + 1))] }).error);
  const many = Array.from({ length: LIMITS.maxMessages + 1 }, (_, i) => userMsg(`q${i}`));
  assert.ok(validateMessages({ messages: many }).error);
});

test('cross-origin POSTs are refused', async () => {
  const res = await handleApi(post({ messages: [userMsg('forest')] }, { Origin: 'https://evil.example' }), {});
  assert.equal(res.status, 403);
});

test('same-host Origin with a different scheme or port is accepted (live preview hosts)', async () => {
  const req = new Request(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://canopy.example', Host: 'canopy.example' },
    body: JSON.stringify({ messages: [userMsg('What are invasive species?')] }),
  });
  assert.equal((await handleApi(req, {})).status, 200);
});

test('GET on /api/chat and unknown routes return errors', async () => {
  assert.equal((await handleApi(new Request(`${BASE}/api/chat`), {})).status, 405);
  assert.equal((await handleApi(new Request(`${BASE}/api/nope`), {})).status, 404);
});

test('system prompt restricts topics and always includes a passages section', () => {
  const prompt = systemPrompt([]);
  assert.match(prompt, /Politely decline other topics/);
  assert.match(prompt, /No passages matched/);
});
