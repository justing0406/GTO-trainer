import test from 'node:test';
import assert from 'node:assert/strict';
import { advancedOpeningDecision } from '../src/rules-v2.js';
import {
  EV_VERSION,
  estimateEvLossBb,
  evGradeLabel,
} from '../src/rules-v3.js';
import {
  generateEvScenario,
  resolveEvScenario,
  gradeEvScenario,
  publicEvScenario,
} from '../src/scenarios-v3.js';
import worker from '../src/index.js';

function openingStep(mix) {
  return {
    street: 'Preflop',
    potBb: 1.5,
    options: [
      { key: 'fold', label: 'Fold', action: 'fold' },
      { key: 'raise', label: 'Raise', action: 'raise' },
    ],
    grading: { mix, ruleId: 'opening', ruleName: 'EV opening test' },
  };
}

test('v3 treats genuine mixed actions as approximately EV-indifferent', () => {
  const decision = advancedOpeningDecision('HJ', 'KJo');
  assert.equal(decision.mix.raise, 0.7);
  assert.equal(decision.mix.fold, 0.3);
  const step = openingStep(decision.mix);
  const scenario = { handClass: 'KJo' };
  const raise = estimateEvLossBb(step, scenario, 'raise');
  const fold = estimateEvLossBb(step, scenario, 'fold');
  assert.equal(raise.evLossBb, 0);
  assert.equal(fold.evLossBb, 0);
  assert.equal(evGradeLabel(raise.evLossBb), 'Perfect');
  assert.equal(evGradeLabel(fold.evLossBb), 'Perfect');
});

test('v3 grades marginal zero-frequency UTG KJo raise as a minor EV leak, not a major blunder', () => {
  const decision = advancedOpeningDecision('UTG', 'KJo');
  assert.equal(decision.mix.fold, 1);
  const step = openingStep(decision.mix);
  const ev = estimateEvLossBb(step, { handClass: 'KJo' }, 'raise');
  assert.ok(ev.evLossBb > 0.10);
  assert.ok(ev.evLossBb <= 0.50);
  assert.equal(evGradeLabel(ev.evLossBb), 'Minor Mistake');
});

test('v3 grades folding a premium pure open as a major EV mistake', () => {
  const decision = advancedOpeningDecision('UTG', 'AA');
  assert.equal(decision.mix.raise, 1);
  const step = openingStep(decision.mix);
  const ev = estimateEvLossBb(step, { handClass: 'AA' }, 'fold');
  assert.ok(ev.evLossBb > 0.50);
  assert.equal(evGradeLabel(ev.evLossBb), 'Major Mistake');
});

test('v3 opening decision drills continue to flop, turn, and river after a non-fold action', () => {
  const scenario = generateEvScenario({ mode: 'drill', focus: 'opening', seed: 4242 });
  assert.equal(scenario.scriptedContinuation, true);
  assert.ok(scenario.steps.some(step => step.street === 'Flop'));
  assert.ok(scenario.steps.some(step => step.street === 'Turn'));
  assert.ok(scenario.steps.some(step => step.street === 'River'));

  const preflop = scenario.steps[0];
  const raise = preflop.options.find(option => option.key === 'raise');
  assert.ok(raise);
  assert.ok(raise.nextStepId);
  assert.ok(scenario.steps.some(step => step.id === raise.nextStepId));

  const publicView = publicEvScenario(scenario);
  const publicRaise = publicView.steps[0].options.find(option => option.key === 'raise');
  assert.equal(publicRaise.nextStepId, raise.nextStepId);
  assert.equal(publicView.scriptedContinuation, true);
});

test('v3 Small Blind opening drills branch correctly between limp and raise pots', () => {
  let scenario = null;
  for (let seed = 1; seed < 2000; seed++) {
    const candidate = generateEvScenario({ mode: 'drill', focus: 'opening', seed });
    if (candidate.heroPosition === 'SB') {
      scenario = candidate;
      break;
    }
  }
  assert.ok(scenario, 'expected to find an SB opening scenario');
  assert.equal(scenario.branching, true);
  const preflop = scenario.steps[0];
  const raise = preflop.options.find(option => option.key === 'raise');
  const limp = preflop.options.find(option => option.key === 'limp');
  assert.equal(raise.nextStepId, 'flop-raise');
  assert.equal(limp.nextStepId, 'flop-limp');
  assert.equal(scenario.steps.find(step => step.id === 'flop-raise').potBb, 6);
  assert.equal(scenario.steps.find(step => step.id === 'flop-limp').potBb, 2);
  assert.equal(scenario.steps.find(step => step.id === 'river-raise').terminal, true);
  assert.equal(scenario.steps.find(step => step.id === 'river-limp').terminal, true);
});

test('v3 scenario keys reconstruct and reports include EV loss', () => {
  const scenario = generateEvScenario({ mode: 'drill', focus: 'opening', seed: 4242 });
  assert.ok(scenario.key.startsWith('v3|'));
  assert.equal(scenario.strategyVersion, EV_VERSION);
  const again = resolveEvScenario(scenario.key);
  assert.deepEqual(again.heroCards, scenario.heroCards);
  assert.deepEqual(again.steps.map(step => step.id), scenario.steps.map(step => step.id));

  const mix = scenario.steps[0].grading.mix;
  const chosenKey = Object.keys(mix).find(key => mix[key] > 0);
  const report = gradeEvScenario(again, [{ stepId: scenario.steps[0].id, optionKey: chosenKey }]);
  assert.equal(report.strategyVersion, EV_VERSION);
  assert.equal(report.reports[0].evLossBb, 0);
  assert.equal(report.reports[0].grade, 'Perfect');
});

test('v3 public scenarios hide grading and villain cards', () => {
  const scenario = generateEvScenario({ mode: 'hand', seed: 1212 });
  const publicView = publicEvScenario(scenario);
  assert.equal(publicView.strategyVersion, EV_VERSION);
  assert.equal('villainCards' in publicView, false);
  assert.equal('grading' in publicView.steps[0], false);
});

test('Worker serves v3 meta, rules, scenario, and grading', async () => {
  const env = { ASSETS: { fetch: () => new Response('asset') } };

  const metaResponse = await worker.fetch(new Request('https://example.com/api/meta?strategy=v3'), env);
  assert.equal(metaResponse.status, 200);
  const meta = await metaResponse.json();
  assert.equal(meta.rulebookVersion, EV_VERSION);
  assert.equal(meta.strategy, 'v3');

  const rulesResponse = await worker.fetch(new Request('https://example.com/api/rules?strategy=v3'), env);
  const rules = await rulesResponse.json();
  assert.equal(rules.version, EV_VERSION);
  assert.ok(rules.sections.some(section => section.id === 'ev-grading'));

  const scenarioResponse = await worker.fetch(new Request('https://example.com/api/scenario?strategy=v3&mode=drill&focus=opening&seed=88'), env);
  const scenario = await scenarioResponse.json();
  assert.ok(scenario.key.startsWith('v3|'));
  assert.equal(scenario.strategyVersion, EV_VERSION);
  assert.ok(scenario.steps.length >= 4);

  const resolved = resolveEvScenario(scenario.key);
  const mix = resolved.steps[0].grading.mix;
  const chosenKey = Object.keys(mix).find(key => mix[key] > 0);
  const gradeResponse = await worker.fetch(new Request('https://example.com/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioKey: scenario.key, decisions: [{ stepId: resolved.steps[0].id, optionKey: chosenKey }] }),
  }), env);
  assert.equal(gradeResponse.status, 200);
  const grade = await gradeResponse.json();
  assert.equal(grade.strategyVersion, EV_VERSION);
  assert.equal(grade.reports[0].evLossBb, 0);
});
