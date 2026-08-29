import {
  OPENING_RANGE_SPECS,
  FACING_OPEN_SPECS,
  BIG_BLIND_DEFENSE_SPECS,
  FACING_THREE_BET,
} from './rules.js';

function rangeText(spec = []) {
  return spec.length ? spec.join(', ') : 'none';
}

function facingOpenKey(openerPosition) {
  if (['UTG', 'HJ'].includes(openerPosition)) return 'EARLY';
  if (openerPosition === 'CO') return 'CO';
  return 'BTN';
}

function bigBlindThreeBetRange(openerPosition) {
  if (['UTG', 'HJ'].includes(openerPosition)) return ['QQ+', 'AKs', 'AKo'];
  if (openerPosition === 'CO') return ['JJ+', 'AKs', 'AKo', 'AQs'];
  return ['TT+', 'AQs+', 'AQo+', 'AJs', 'KQs'];
}

function rangeReference(scenario, decisionReport) {
  const ruleId = decisionReport?.ruleId;
  const heroPosition = scenario?.heroPosition;
  const openerPosition = scenario?.opponentPosition;

  if (ruleId === 'opening' && OPENING_RANGE_SPECS[heroPosition]) {
    return `Range reference: ${heroPosition} opening range = ${rangeText(OPENING_RANGE_SPECS[heroPosition])}. Everything else folds.`;
  }

  if (ruleId === 'limpers' && OPENING_RANGE_SPECS[heroPosition]) {
    return `Range reference: against one limper, Version 1.0 uses approximately your normal ${heroPosition} opening range = ${rangeText(OPENING_RANGE_SPECS[heroPosition])}. Hands outside it fold rather than limp behind.`;
  }

  if (ruleId === 'facing-open') {
    const key = facingOpenKey(openerPosition);
    const spec = FACING_OPEN_SPECS[key];
    if (!spec) return null;
    const label = key === 'EARLY' ? 'UTG/HJ' : openerPosition;
    return `Range reference vs ${label} open: 3-bet = ${rangeText(spec.threeBet)}; call = ${rangeText(spec.call)}; everything else folds.`;
  }

  if (ruleId === 'bb-defense') {
    const defend = BIG_BLIND_DEFENSE_SPECS[openerPosition];
    if (!defend) return null;
    const threeBet = bigBlindThreeBetRange(openerPosition);
    return `Range reference, BB vs ${openerPosition}: 3-bet = ${rangeText(threeBet)}; call = ${rangeText(defend)}; everything else folds.`;
  }

  if (ruleId === 'three-bet') {
    return `Range reference when facing a 3-bet: 4-bet = ${rangeText(FACING_THREE_BET.fourBet)}; default calls = ${rangeText(FACING_THREE_BET.callStrong)}; selective calls in favorable spots = ${rangeText(FACING_THREE_BET.callSelective)}; weaker hands fold.`;
  }

  if (ruleId === 'squeeze') {
    return 'Range reference for this late-position raise + call: squeeze = QQ+, AKs, AKo, JJ, AQs. Version 1.0 folds most other hands, with some medium-strength hands allowed as calls.';
  }

  return null;
}

export function enrichGradeReport(report, scenario) {
  if (!report?.reports || !scenario) return report;
  return {
    ...report,
    reports: report.reports.map(decisionReport => {
      const reference = rangeReference(scenario, decisionReport);
      if (!reference) return decisionReport;
      return {
        ...decisionReport,
        explanation: `${decisionReport.explanation} ${reference}`,
        rangeReference: reference,
      };
    }),
  };
}
