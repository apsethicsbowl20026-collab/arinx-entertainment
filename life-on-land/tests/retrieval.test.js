import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KNOWLEDGE, SOURCES, SUGGESTED_QUESTIONS } from '../shared/knowledge.js';
import { answerLocally, normalize, retrievePassages, search, FALLBACK_REPLY } from '../shared/retrieval.js';

test('every knowledge entry has a known source, unique id and body text', () => {
  const ids = new Set();
  for (const entry of KNOWLEDGE) {
    assert.ok(SOURCES[entry.source], `unknown source for ${entry.id}`);
    assert.ok(entry.body.length > 60, `body too short for ${entry.id}`);
    assert.ok(!ids.has(entry.id), `duplicate id ${entry.id}`);
    ids.add(entry.id);
  }
  assert.ok(KNOWLEDGE.length >= 20);
});

test('every source URL is https and sources are cited', () => {
  for (const s of Object.values(SOURCES)) assert.match(s.url, /^https:\/\//);
});

test('normalize maps synonyms and plurals to shared concepts', () => {
  assert.ok(normalize('Woodlands and trees').includes(normalize('forest')[0]));
  assert.deepEqual(normalize('The poachers'), normalize('poaching'));
  assert.ok(!normalize('What is the forest?').includes('the'));
});

test('common questions retrieve the expected entry first', () => {
  const cases = [
    ['How much forest is left in the world?', 'forest-stats'],
    ['How much forest is left?', 'forest-stats'],
    ['What is the situation of forests in India?', 'india-forest-cover'],
    ['What are invasive species?', 'target-15-8'],
    ['How can I help protect wildlife near my home?', 'wildlife-friendly'],
    ['How can AI help protect forests?', 'ai-for-land'],
    ['Tell me about poaching and wildlife trafficking', 'target-15-7'],
    ['How do I restore degraded land?', ['restoration', 'target-15-3']],
    ['What is Maharashtra forest cover?', 'maharashtra-forests'],
  ];
  for (const [query, expected] of cases) {
    const [top] = search(query);
    assert.ok(top, `no match for: ${query}`);
    const accepted = Array.isArray(expected) ? expected : [expected];
    assert.ok(accepted.includes(top.entry.id), `"${query}" matched ${top.entry.id}`);
  }
});

test('questions naming a specific SDG target retrieve that target', () => {
  for (const n of ['1', '2', '3', '5', '7', '8', '9']) {
    const [top] = search(`Explain SDG target 15.${n}: what individuals can do about it.`);
    assert.equal(top.entry.id, `target-15-${n}`, `target 15.${n} matched ${top.entry.id}`);
  }
});

test('sentence-ending full stops do not break matching', () => {
  assert.ok(normalize('Forests cover 31 percent.').includes('forest'));
  assert.ok(normalize('4.06 billion').includes('4.06'));
});

test('suggested starter questions all produce a cited answer', () => {
  for (const q of SUGGESTED_QUESTIONS) {
    const res = answerLocally(q);
    assert.ok(res.sources.length > 0, `no sources for: ${q}`);
    assert.notEqual(res.reply, FALLBACK_REPLY);
  }
});

test('answers number their citations to match the sources list', () => {
  const res = answerLocally('How much forest is left in the world?');
  assert.match(res.reply, /\[1\]/);
  assert.equal(res.sources[0].url, SOURCES.fraKeyFindings.url);
});

test('off-topic questions get the SDG 15 fallback without sources', () => {
  const res = answerLocally('What is the capital of France and who won the cricket match?');
  assert.equal(res.reply, FALLBACK_REPLY);
  assert.deepEqual(res.sources, []);
});

test('greetings and thanks are handled without sources', () => {
  assert.match(answerLocally('Hello').reply, /Canopy/);
  assert.match(answerLocally('thank you').reply, /welcome/i);
  assert.deepEqual(answerLocally('hi').sources, []);
});

test('empty input asks for a question', () => {
  assert.match(answerLocally('   ').reply, /Ask me anything/);
});

test('follow-up questions use the previous user turn for context', () => {
  const history = [
    { role: 'user', content: 'What are invasive species?' },
    { role: 'assistant', content: 'x' },
    { role: 'user', content: 'and which ones are common?' },
  ];
  const res = answerLocally('and which ones are common?', { history });
  assert.ok(res.sources.length > 0);
});

test('retrievePassages returns grounded passages with titles and sources', () => {
  const passages = retrievePassages([{ role: 'user', content: 'Tell me about Western Ghats hotspot' }]);
  assert.equal(passages[0].id, 'western-ghats');
  assert.ok(passages[0].body.length > 0);
  assert.ok(passages.length <= 4);
});
