import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInRange,
  openingDecision,
  bigBlindDefenseDecision,
  potOddsRequired,
} from '../src/rules.js';
import {
  generateScenario,
  publicScenario,
  gradeScenario,
  resolveScenario,
} from '../src/scenarios.js';
import worker from '../src/index.js';

test('opening range examples match v1.0', () => {
  assert.equal(openingDecision('UTG', '77').action, 'raise');
  assert.equal(openingDecision('UTG', '66').action, 'fold');
  assert.equal(openingDecision('BTN', 'A7s').action, 'raise');
  assert.equal(openingDecision('BTN', 'A7o').action, 'fold');
  assert.equal(openingDecision('CO', '65s').action, 'raise');
});

test('range parser handles plus and dash notation', () => {
  assert.equal(isInRange('QQ', ['88-JJ']), false);
  assert.equal(isInRange('TT', ['88-JJ']), true);
  assert.equal(isInRange('AKo', ['AQo+']), true);
  assert.equal(isInRange('KQo', ['KTo+']), true);
  assert.equal(isInRange('K9o', ['KTo+']), false);
});

test('big blind defends wider versus button', () => {
  assert.equal(bigBlindDefenseDecision('UTG', 'Q8s').action, 'fold');
  assert.equal(bigBlindDefenseDecision('BTN', 'Q8s').action, 'call');
});

test('pot odds shortcut math is correct', () => {
  assert.ok(Math.abs(potOddsRequired(0.5) - 0.25) < 1e-9);
  assert.ok(Math.abs(potOddsRequired(1) - 1 / 3) < 1e-9);
});

test('public scenarios never expose grading or villain cards', () => {
  const scenario = generateScenario({ mode: 'hand', seed: 123 });
  const publicView = publicScenario(scenario);
  assert.equal('villainCards' in publicView, false);
  assert.equal('grading' in publicView.steps[0], false);
});

test('scenario keys reconstruct deterministically for grading', () => {
  const scenario = generateScenario({ mode: 'drill', focus: 'opening', seed: 99 });
  const again = resolveScenario(scenario.key);
  assert.equal(again.handClass, scenario.handClass);
  assert.deepEqual(again.heroCards, scenario.heroCards);
  const preferred = scenario.steps[0].grading.preferred[0];
  const report = gradeScenario(again, [{ stepId: scenario.steps[0].id, optionKey: preferred }]);
  assert.equal(report.overallGrade, 'Perfect');
});

test('worker health and scenario endpoints respond', async () => {
  const health = await worker.fetch(new Request('https://example.com/api/health'), { ALLOWED_ORIGIN: '*' });
  assert.equal(health.status, 200);
  const healthJson = await health.json();
  assert.equal(healthJson.ok, true);

  const scenarioResponse = await worker.fetch(new Request('https://example.com/api/scenario?mode=drill&focus=opening&seed=7'), { ALLOWED_ORIGIN: '*' });
  assert.equal(scenarioResponse.status, 200);
  const scenario = await scenarioResponse.json();
  assert.ok(scenario.scenarioKey === undefined);
  assert.ok(scenario.key.startsWith('drill|opening|'));
  assert.equal('grading' in scenario.steps[0], false);
});
