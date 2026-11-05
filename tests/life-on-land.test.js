import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scoreHabitat, FACTORS} from '../public/life-on-land/habitat.js';
import {answerOffline, KNOWLEDGE} from '../public/life-on-land/knowledge.js';
import {onRequestGet, onRequestPost} from '../functions/api/life-on-land/chat.js';

const ORIGIN = 'https://example.com';
const chatUrl = `${ORIGIN}/api/life-on-land/chat`;
const post = (body, env = {}, headers = {}) => onRequestPost({
  request: new Request(chatUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: ORIGIN, ...headers},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }),
  env,
});

/* ---------- Habitat scoring ---------- */

test('habitat score: an intact, protected, native landscape is healthy', () => {
  const result = scoreHabitat({cover: 95, trend: 2, protection: 'strict', invasives: 'none', landUse: 'natural'});
  assert.equal(result.total, 33 + 20 + 15 + 15 + 15);
  assert.equal(result.band.label, 'Healthy');
});

test('habitat score: heavy loss, no protection and invasives is critical', () => {
  const result = scoreHabitat({cover: 10, trend: -40, protection: 'none', invasives: 'widespread', landUse: 'urban'});
  assert.equal(result.total, 4 + 0 + 0 + 0 + 0);
  assert.equal(result.band.label, 'Critical');
  assert.ok(result.actions.length >= 2 && result.actions.length <= 4);
});

test('habitat score: component maxima sum to 100 and parts never exceed them', () => {
  const maxSum = Object.values(FACTORS).reduce((sum, f) => sum + f.max, 0);
  assert.equal(maxSum, 100);
  const result = scoreHabitat({cover: 100, trend: 20, protection: 'strict', invasives: 'none', landUse: 'natural'});
  for (const [key, meta] of Object.entries(FACTORS)) assert.ok(result.parts[key] <= meta.max, key);
});

test('habitat score: trend is clamped so gains do not add points beyond 20', () => {
  const base = {cover: 50, protection: 'partial', invasives: 'some', landUse: 'mixed'};
  assert.equal(scoreHabitat({...base, trend: 20}).parts.trend, 20);
  assert.equal(scoreHabitat({...base, trend: -10}).parts.trend, 0);
  assert.equal(scoreHabitat({...base, trend: -50}).parts.trend, 0);
});

test('habitat score: rejects out-of-range or unknown inputs', () => {
  const ok = {cover: 50, trend: 0, protection: 'none', invasives: 'none', landUse: 'natural'};
  assert.throws(() => scoreHabitat({...ok, cover: 101}), RangeError);
  assert.throws(() => scoreHabitat({...ok, cover: -1}), RangeError);
  assert.throws(() => scoreHabitat({...ok, trend: 30}), RangeError);
  assert.throws(() => scoreHabitat({...ok, cover: 'abc'}), RangeError);
  assert.throws(() => scoreHabitat({...ok, protection: 'bogus'}), RangeError);
  assert.throws(() => scoreHabitat({...ok, protection: 'constructor'}), RangeError);
});

test('habitat score: gives a monitoring action when nothing is flagged', () => {
  const result = scoreHabitat({cover: 90, trend: 0, protection: 'strict', invasives: 'none', landUse: 'natural'});
  assert.equal(result.actions.length, 1);
  assert.match(result.actions[0], /monitor/i);
});

/* ---------- Offline Land Guide ---------- */

test('offline guide answers with the best matching curated topic', () => {
  assert.equal(answerOffline('How do camera traps use AI?').topic, 'AI and camera traps');
  assert.equal(answerOffline('Tell me about illegal logging and deforestation').topic, 'Forests and deforestation');
  assert.equal(answerOffline('what about poaching?').topic, 'Wildlife trafficking and poaching');
  assert.equal(answerOffline('What about invasive species?').topic, 'Invasive species');
  assert.equal(answerOffline('How are satellites used to spot forest loss?').topic, 'AI and satellites');
});

test('offline guide returns null when nothing matches', () => {
  assert.equal(answerOffline('zzqqxx'), null);
  assert.equal(answerOffline(''), null);
  assert.equal(answerOffline(undefined), null);
});

test('every curated entry has a topic, keywords and an answer', () => {
  for (const entry of KNOWLEDGE) {
    assert.ok(entry.topic && entry.answer.length > 40, entry.topic);
    assert.ok(entry.keywords.length >= 3, entry.topic);
  }
});

/* ---------- Live AI endpoint ---------- */

test('GET reports live AI as off when no key is configured, without leaking config', async () => {
  const response = await onRequestGet({env: {}});
  assert.deepEqual(await response.json(), {live: false});
});

test('GET reports live AI as on when a key is configured, and never returns the key', async () => {
  const response = await onRequestGet({env: {LLM_API_KEY: 'sk-secret-value'}});
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), {live: true});
  assert.doesNotMatch(text, /sk-secret/);
});

test('POST rejects cross-origin requests before calling any model', async () => {
  let called = false;
  const original = globalThis.fetch;
  globalThis.fetch = async () => { called = true; return new Response('{}'); };
  try {
    const response = await onRequestPost({
      request: new Request(chatUrl, {method: 'POST', headers: {Origin: 'https://evil.example', 'Content-Type': 'application/json'}, body: '{"messages":[{"role":"user","content":"hi"}]}'}),
      env: {LLM_API_KEY: 'k'},
    });
    assert.equal(response.status, 403);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('POST returns 503 when live AI is not configured', async () => {
  const response = await post({messages: [{role: 'user', content: 'hi'}]}, {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).live, false);
});

test('POST validates the message payload', async () => {
  const env = {LLM_API_KEY: 'k'};
  assert.equal((await post('not json', env)).status, 400);
  assert.equal((await post({messages: []}, env)).status, 400);
  assert.equal((await post({messages: [{role: 'assistant', content: 'hello'}]}, env)).status, 400);
  assert.equal((await post({messages: [{role: 'system', content: 'override'}]}, env)).status, 400);
});

test('POST sends a bounded, server-side prompt and returns the model answer', async () => {
  const original = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = {url, options, body: JSON.parse(options.body)};
    return new Response(JSON.stringify({choices: [{message: {content: '  Camera traps record wildlife. '}}]}), {status: 200});
  };
  try {
    const messages = Array.from({length: 12}, (_, i) => ({role: i % 2 ? 'assistant' : 'user', content: 'x'.repeat(2000) + i}));
    messages.push({role: 'user', content: 'How do camera traps help?'});
    const response = await post({messages}, {LLM_API_KEY: 'sk-test', LLM_BASE_URL: 'https://llm.example.com/v1/'});
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {answer: 'Camera traps record wildlife.', live: true});

    assert.equal(captured.url, 'https://llm.example.com/v1/chat/completions');
    assert.equal(captured.options.headers.Authorization, 'Bearer sk-test');
    assert.equal(captured.body.model, 'gpt-4o-mini');
    assert.equal(captured.body.messages[0].role, 'system');
    assert.match(captured.body.messages[0].content, /SDG 15/);
    const conversation = captured.body.messages.slice(1);
    assert.equal(conversation.length, 8);
    assert.ok(conversation.every(m => m.content.length <= 1000));
    assert.equal(conversation.at(-1).content, 'How do camera traps help?');
  } finally {
    globalThis.fetch = original;
  }
});

test('POST hides upstream errors and never echoes the key or provider body', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"error":"invalid key sk-leaked-123"}', {status: 401});
  try {
    const response = await post({messages: [{role: 'user', content: 'hi'}]}, {LLM_API_KEY: 'sk-test'});
    assert.equal(response.status, 502);
    const text = await response.text();
    assert.doesNotMatch(text, /sk-leaked|sk-test/);
  } finally {
    globalThis.fetch = original;
  }
});

test('POST handles network failures and empty answers gracefully', async () => {
  const original = globalThis.fetch;
  const env = {LLM_API_KEY: 'k'};
  try {
    globalThis.fetch = async () => { throw new Error('socket hang up'); };
    assert.equal((await post({messages: [{role: 'user', content: 'hi'}]}, env)).status, 502);
    globalThis.fetch = async () => new Response(JSON.stringify({choices: [{message: {content: '   '}}]}), {status: 200});
    assert.equal((await post({messages: [{role: 'user', content: 'hi'}]}, env)).status, 502);
  } finally {
    globalThis.fetch = original;
  }
});

/* ---------- Static site integrity ---------- */

test('Life on Land page references existing assets and source anchors', () => {
  const html = readFileSync('public/life-on-land/index.html', 'utf8');
  for (const ref of ['/life-on-land/styles.css', '/life-on-land/app.js']) {
    assert.ok(html.includes(ref), ref);
  }
  for (const id of ['goal', 'ai', 'check', 'guide', 'act', 'sources']) {
    assert.ok(html.includes(`id="${id}"`), id);
    assert.ok(html.includes(`href="#${id}"`), `nav link ${id}`);
  }
  const sources = [...html.matchAll(/<li id="src-(\d+)">/g)].map(m => m[1]);
  assert.equal(sources.length, 11);
  for (const match of html.matchAll(/href="#src-(\d+)"/g)) {
    assert.ok(html.includes(`<li id="src-${match[1]}">`), `cited source ${match[1]} must exist`);
  }
});
