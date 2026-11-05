import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, buildPlan, normalizeProfile, offlineWeeklyPlan, planPrompt, scoreAction } from '../shared/planner.js';

const base = { location: 'suburban', home: 'house', time: 'project', interests: ['gardening', 'wildlife'] };

test('every action has valid fields and an SDG 15 target', () => {
  const ids = new Set();
  for (const a of ACTIONS) {
    assert.ok(!ids.has(a.id), `duplicate ${a.id}`);
    ids.add(a.id);
    assert.ok(a.targets.length > 0 && a.targets.every(t => /^15\.[1-9]$/.test(t)), a.id);
    assert.ok([1, 2, 3].includes(a.effort), a.id);
    assert.ok(a.firstStep.length > 20 && a.description.length > 20, a.id);
  }
});

test('plans return at most five distinct actions, best first', () => {
  const plan = buildPlan(base);
  assert.equal(plan.actions.length, 5);
  assert.equal(new Set(plan.actions.map(a => a.id)).size, 5);
});

test('plans cover several SDG 15 targets rather than repeating one', () => {
  const plan = buildPlan(base);
  const targets = new Set(plan.actions.flatMap(a => a.targets));
  assert.ok(targets.size >= 4, `only ${targets.size} targets`);
});

test('time availability is respected: quick plans exclude weekend projects', () => {
  const plan = buildPlan({ ...base, time: 'quick' }, { limit: 50 });
  assert.ok(plan.actions.every(a => a.effort === 1));
});

test('home without outdoor space excludes garden-only actions', () => {
  const plan = buildPlan({ ...base, home: 'none', time: 'project' }, { limit: 50 });
  assert.ok(!plan.actions.some(a => a.id === 'backyard-native-tree'));
});

test('urban profiles are not offered forest-edge restoration work', () => {
  const plan = buildPlan({ location: 'urban', home: 'apartment', time: 'project', interests: ['community'] }, { limit: 50 });
  assert.ok(!plan.actions.some(a => a.id === 'restore-degraded-land'));
  assert.ok(plan.actions.some(a => a.id === 'biodiversity-in-planning'));
});

test('matching interests raise the score and produce a reason', () => {
  const action = ACTIONS.find(a => a.id === 'citizen-science-logging');
  const withInterest = scoreAction(action, { ...base, interests: ['learning'] });
  const without = scoreAction(action, { ...base, interests: [] });
  assert.ok(withInterest.score > without.score);
  assert.ok(withInterest.reasons.some(r => /interest/.test(r)));
});

test('invalid profile values fall back to safe defaults', () => {
  const p = normalizeProfile({ location: 'mars', home: 42, time: 'never', interests: ['gardening', 'nope', 'gardening'] });
  assert.equal(p.location, 'suburban');
  assert.equal(p.home, 'none');
  assert.equal(p.time, 'moderate');
  assert.deepEqual(p.interests, ['gardening']);
});

test('plans are deterministic for the same profile', () => {
  assert.deepEqual(buildPlan(base), buildPlan(base));
});

test('planPrompt lists every shortlisted action in order', () => {
  const plan = buildPlan(base);
  const prompt = planPrompt(plan);
  plan.actions.forEach((a, i) => assert.ok(prompt.includes(`${i + 1}. ${a.title}`)));
});

test('planPrompt fits within the 1,000-character question limit for every profile', () => {
  const interestSets = [[], ['gardening', 'wildlife', 'water', 'food', 'consumption', 'community', 'learning']];
  for (const interests of interestSets) {
    for (const time of ['quick', 'moderate', 'project']) {
      for (const location of ['urban', 'suburban', 'rural', 'forest-edge']) {
        const plan = buildPlan({ location, home: 'house', time, interests });
        assert.ok(planPrompt(plan).length <= 1000, `too long for ${location}/${time}`);
      }
    }
  }
});

test('offlineWeeklyPlan gives one week per action (up to four weeks)', () => {
  const plan = buildPlan(base);
  const text = offlineWeeklyPlan(plan);
  assert.match(text, /^Week 1: /);
  assert.match(text, /Week 4: /);
  assert.ok(!text.includes('Week 5'));
  assert.ok(text.includes(plan.actions[0].firstStep));
});
