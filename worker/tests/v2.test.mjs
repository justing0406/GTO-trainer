import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVANCED_VERSION,
  advancedOpeningDecision,
  advancedPreflopResponse,
  advancedFacing3BetResponse,
  minimumDefenseFrequency,
  riverBluffFraction,
} from '../src/rules-v2.js';
import {
  generateAdvancedScenario,
  publicAdvancedScenario,
  resolveAdvancedScenario,
  gradeAdvancedScenario,
} from '../src/scenarios-v2.js';
import worker from '../src/index.js';

test('advanced opening uses position-specific sizing and mixes', () => {
  const utgAA = advancedOpeningDecision('UTG', 'AA');
  assert.equal(utgAA.sizeBb, 2);
  assert.equal(utgAA.mix.raise, 1);

  const btnWeakAce = advancedOpeningDecision('BTN', 'A5o');
  assert.ok(btnWeakAce.mix.raise > 0);
  assert.ok(btnWeakAce.mix.fold > 0);

  const sb87 = advancedOpeningDecision('SB', '87s');
  assert.ok(sb87.mix.raise > 0);
  assert.ok(sb87.mix.limp > 0);
});

test('advanced preflop respects positional morphology', () => {
  const sbVsBtn = advancedPreflopResponse('sb-vs-btn', 'A5s');
  assert.ok(sbVsBtn.mix.threeBet > 0);
  assert.equal(sbVsBtn.mix.call || 0, 0);

  const btnVsUtg = advancedPreflopResponse('btn-vs-utg', '99');
  assert.ok(btnVsUtg.mix.call > btnVsUtg.mix.threeBet || !btnVsUtg.mix.threeBet);
});

test('advanced 3-bet defense includes blocker 4-bets', () => {
  const a5s = advancedFacing3BetResponse('btn-vs-sb-3bet', 'A5s');
  assert.ok(a5s.mix.fourBet > 0);
  assert.ok(a5s.mix.fold > 0);
});

test('advanced poker math formulas are correct', () => {
  assert.ok(Math.abs(minimumDefenseFrequency(1) - 0.5) < 1e-12);
  assert.ok(Math.abs(minimumDefenseFrequency(0.5) - 2/3) < 1e-12);
  assert.ok(Math.abs(riverBluffFraction(1) - 1/3) < 1e-12);
});

test('advanced public scenarios hide answers and villain cards', () => {
  const scenario = generateAdvancedScenario({ mode:'drill', focus:'opening', seed:12345 });
  const publicView = publicAdvancedScenario(scenario);
  assert.equal(publicView.strategyVersion, ADVANCED_VERSION);
  assert.equal('villainCards' in publicView, false);
  assert.equal('grading' in publicView.steps[0], false);
});

test('advanced scenario keys reconstruct and mixed grading works', () => {
  const scenario = generateAdvancedScenario({ mode:'drill', focus:'opening', seed:2468 });
  const again = resolveAdvancedScenario(scenario.key);
  assert.deepEqual(again.heroCards, scenario.heroCards);
  const mix = scenario.steps[0].grading.mix;
  const best = Object.entries(mix).sort((a,b) => b[1] - a[1])[0][0];
  const report = gradeAdvancedScenario(again, [{ stepId:scenario.steps[0].id, optionKey:best }]);
  assert.equal(report.strategyVersion, ADVANCED_VERSION);
  assert.equal(report.overallGrade, 'Perfect');
  assert.match(report.reports[0].mixText, /%/);
});

test('Worker serves Advanced v2 meta, rules and scenario when requested', async () => {
  const env = { ASSETS: { fetch: () => new Response('asset') } };
  const metaResponse = await worker.fetch(new Request('https://example.com/api/meta?strategy=v2'), env);
  assert.equal(metaResponse.status, 200);
  const meta = await metaResponse.json();
  assert.equal(meta.rulebookVersion, ADVANCED_VERSION);
  assert.equal(meta.strategy, 'v2');

  const rulesResponse = await worker.fetch(new Request('https://example.com/api/rules?strategy=v2'), env);
  const rules = await rulesResponse.json();
  assert.equal(rules.version, ADVANCED_VERSION);
  assert.ok(rules.glossary.some(item => item.term.includes('Range advantage')));

  const scenarioResponse = await worker.fetch(new Request('https://example.com/api/scenario?strategy=v2&mode=drill&focus=flop&seed=7'), env);
  const scenario = await scenarioResponse.json();
  assert.equal(scenario.strategyVersion, ADVANCED_VERSION);
  assert.equal('grading' in scenario.steps[0], false);
});
