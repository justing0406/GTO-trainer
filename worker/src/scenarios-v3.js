import {
  ADVANCED_CATEGORY_META,
  generateAdvancedScenario,
  listAdvancedHands,
  publicAdvancedScenario,
  resolveAdvancedScenario,
} from './scenarios-v2.js';
import {
  EV_VERSION,
  EV_MODEL,
  estimateEvLossBb,
  evGradeLabel,
  evScore,
  evOptimalKeys,
} from './rules-v3.js';
import { mixText } from './rules-v2.js';

export const EV_CATEGORY_META = ADVANCED_CATEGORY_META;

function toV3Scenario(scenario) {
  if (!scenario) return null;
  return {
    ...scenario,
    key: String(scenario.key || '').replace(/^v2\|/, 'v3|'),
    strategyVersion: EV_VERSION,
    evModel: EV_MODEL.id,
  };
}

export function listEvHands() {
  return listAdvancedHands().map(hand => ({ ...hand, strategyVersion: EV_VERSION }));
}

export function generateEvScenario(options = {}) {
  return toV3Scenario(generateAdvancedScenario(options));
}

export function resolveEvScenario(key) {
  const v2Key = String(key || '').replace(/^v3\|/, 'v2|');
  return toV3Scenario(resolveAdvancedScenario(v2Key));
}

export function publicEvScenario(scenario) {
  return publicAdvancedScenario(scenario);
}

export function gradeEvScenario(scenario, decisions = []) {
  if (!scenario) throw new Error('Unknown EV-aware scenario');
  const byStep = new Map(decisions.map(decision => [decision.stepId, decision.optionKey]));
  const reports = [];

  for (const step of scenario.steps) {
    const optionKey = byStep.get(step.id);
    if (!optionKey) continue;
    const chosen = step.options.find(option => option.key === optionKey);
    if (!chosen) continue;

    const ev = estimateEvLossBb(step, scenario, optionKey);
    const optimalKeys = evOptimalKeys(step, scenario);
    const preferred = optimalKeys.map(key => step.options.find(option => option.key === key)?.label || key);
    const grade = evGradeLabel(ev.evLossBb);
    const score = evScore(ev.evLossBb);

    reports.push({
      stepId: step.id,
      street: step.street,
      chosenKey: optionKey,
      chosenLabel: chosen.label || optionKey,
      score,
      grade,
      preferred,
      evLossBb: ev.evLossBb,
      relativeEvBb: ev.relativeEvBb,
      evSource: ev.source,
      evConfidence: ev.confidence,
      evNote: ev.note,
      chosenFrequency: ev.frequency,
      mix: step.grading.mix,
      mixText: mixText(step.grading.mix),
      ruleId: step.grading.ruleId,
      ruleName: step.grading.ruleName,
      explanation: `${step.grading.explanation} v3 estimated EV loss for your action: ${ev.evLossBb.toFixed(2)} BB.`,
      rangeReference: step.grading.rangeReference || null,
    });
  }

  const overallEvLossBb = reports.reduce((sum, report) => sum + report.evLossBb, 0);
  const averageEvLossBb = reports.length ? overallEvLossBb / reports.length : 0;
  const overallScore = reports.length ? reports.reduce((sum, report) => sum + report.score, 0) / reports.length : 0;
  const firstMistake = reports.find(report => report.evLossBb > 0.10) || null;
  const firstMajorMistake = reports.find(report => report.evLossBb > 0.50) || null;

  return {
    scenarioKey: scenario.key,
    strategyVersion: EV_VERSION,
    evModel: EV_MODEL,
    title: scenario.title,
    category: scenario.category,
    overallScore,
    overallGrade: evGradeLabel(averageEvLossBb),
    overallEvLossBb: Number(overallEvLossBb.toFixed(2)),
    averageEvLossBb: Number(averageEvLossBb.toFixed(2)),
    reports,
    firstMistake,
    firstMajorMistake,
    reveal: {
      heroCards: scenario.heroCards,
      villainCards: scenario.villainCards,
      opponentPosition: scenario.opponentPosition,
      note: 'Hidden cards are revealed only after grading and never change the correct strategy. v3 grades by estimated EV loss; frequency is supporting context, not the mistake score.',
    },
  };
}
