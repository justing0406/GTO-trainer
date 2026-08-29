import {
  ADVANCED_OPENING_TIERS,
  ADVANCED_OPEN_SIZES,
  ADVANCED_PREFLOP_SPOTS,
  ADVANCED_FACING_3BET_SPOTS,
  ADVANCED_RULEBOOK_SECTIONS,
  ADVANCED_GLOSSARY,
  mixText,
} from './rules-v2.js';

export const EV_VERSION = '3.0';

export const EV_THRESHOLDS = {
  perfect: 0.02,
  correct: 0.10,
  minor: 0.50,
};

export const EV_MODEL = {
  id: 'rounded-ev-v1',
  label: 'Estimated EV-loss model',
  note: 'EV losses are model estimates in big blinds, not solver-exported EV. Mixed actions in the v2 strategy are treated as approximately indifferent. Exact EV depends on rake, stack depth, ranges, and sizing tree.',
};

const RANK_VALUE = Object.fromEntries(['2','3','4','5','6','7','8','9','T','J','Q','K','A'].map((rank, index) => [rank, index + 2]));

function normalizedMix(mix = {}) {
  const allowed = Object.fromEntries(Object.entries(mix).filter(([, value]) => Number(value) > 0));
  const total = Object.values(allowed).reduce((sum, value) => sum + Number(value), 0);
  if (!total) return { fold: 1 };
  return Object.fromEntries(Object.entries(allowed).map(([key, value]) => [key, Number(value) / total]));
}

function actionFamily(key = '') {
  if (key === 'fold') return 'fold';
  if (['check'].includes(key)) return 'passive';
  if (['call','limp'].includes(key)) return 'continue';
  if (['raise','threeBet','fourBet','checkRaise','shove'].includes(key) || /^bet\d+/i.test(key)) return 'aggressive';
  if (/^(mdf|bluff|spr)\d+/i.test(key)) return 'quiz';
  return key;
}

function preflopStrength(handClass = '') {
  const value = String(handClass || '');
  const pair = value.match(/^([2-9TJQKA])\1$/);
  if (pair) {
    const rank = RANK_VALUE[pair[1]] || 2;
    if (rank >= 12) return 1.25; // QQ+
    if (rank >= 10) return 0.80; // TT-JJ
    if (rank >= 7) return 0.48;  // 77-99
    return 0.30;
  }

  const match = value.match(/^([2-9TJQKA])([2-9TJQKA])([so])$/);
  if (!match) return 0.30;
  const [, a, b, suited] = match;
  const high = RANK_VALUE[a] || 2;
  const low = RANK_VALUE[b] || 2;
  if (a === 'A' && b === 'K') return suited === 's' ? 1.15 : 1.05;
  if (a === 'A' && ['Q','J'].includes(b)) return suited === 's' ? 0.72 : 0.58;
  if (['KQ','KJ','QJ'].includes(`${a}${b}`)) return suited === 's' ? 0.50 : 0.36;
  if (suited === 's' && high - low <= 2) return 0.30;
  if (a === 'A' && suited === 's') return 0.34;
  return 0.24;
}

function ruleBaseLoss(step, scenario) {
  const ruleId = step?.grading?.ruleId || '';
  const street = String(step?.street || '').toLowerCase();
  const pot = Math.max(1.5, Number(step?.potBb || 1.5));

  if (ruleId === 'opening') return Math.max(0.20, preflopStrength(scenario?.handClass));
  if (ruleId === 'facing-open') return Math.max(0.35, preflopStrength(scenario?.handClass) * 0.9);
  if (ruleId === 'three-bet') return Math.max(0.55, preflopStrength(scenario?.handClass));
  if (ruleId === 'squeeze' || ruleId === 'limpers' || ruleId === 'bb-defense') return Math.max(0.35, preflopStrength(scenario?.handClass) * 0.8);
  if (street === 'flop') return Math.max(0.22, Math.min(1.2, pot * 0.04));
  if (street === 'turn') return Math.max(0.32, Math.min(1.8, pot * 0.05));
  if (street === 'river') return Math.max(0.45, Math.min(2.5, pot * 0.065));
  if (['odds','mdf','river-math','spr'].includes(ruleId)) return 0.22;
  return Math.max(0.25, Math.min(1.5, pot * 0.04));
}

function zeroFrequencyLoss(step, scenario, optionKey) {
  const mix = normalizedMix(step?.grading?.mix || {});
  const allowedKeys = Object.keys(mix).filter(key => mix[key] > 0);
  const allowedFamilies = new Set(allowedKeys.map(actionFamily));
  const chosenFamily = actionFamily(optionKey);
  let base = ruleBaseLoss(step, scenario);

  // Wrong sizing within the same strategic family is usually much cheaper than
  // choosing the wrong strategic action altogether.
  if (allowedFamilies.has(chosenFamily) && chosenFamily === 'aggressive') {
    const pot = Math.max(1.5, Number(step?.potBb || 1.5));
    return Math.max(0.06, Math.min(0.28, pot * 0.015));
  }

  const onlyFold = allowedKeys.length === 1 && allowedKeys[0] === 'fold';
  const noFold = !allowedKeys.includes('fold');

  if (onlyFold && ['aggressive','continue'].includes(chosenFamily)) {
    // Entering a hand the model wants to fold is often a modest leak near a
    // range boundary, but gets costlier with stronger commitments later.
    if (step?.grading?.ruleId === 'opening') return Math.min(0.42, Math.max(0.18, base * 0.45));
    return Math.min(1.4, Math.max(0.35, base * 0.8));
  }

  if (noFold && chosenFamily === 'fold') {
    // Folding premium / high-EV continues can surrender a lot of value.
    return Math.min(2.5, Math.max(0.28, base));
  }

  if (chosenFamily === 'aggressive' && !allowedFamilies.has('aggressive')) return Math.min(2.5, base * 1.2);
  if (chosenFamily === 'continue' && onlyFold) return Math.min(2.0, base);
  if (chosenFamily === 'quiz') return 0.22;
  return Math.min(2.0, base * 0.75);
}

export function estimateEvLossBb(step, scenario, optionKey) {
  const mix = normalizedMix(step?.grading?.mix || {});
  const frequency = mix[optionKey] || 0;

  // In an equilibrium mix, actions that are actually used are approximately
  // indifferent in EV. Frequency is strategy composition, not an EV ranking.
  if (frequency >= 0.01) {
    return {
      evLossBb: 0,
      relativeEvBb: 0,
      frequency,
      source: EV_MODEL.id,
      confidence: 'rounded-mix',
      note: 'This action is part of the modeled mixed strategy, so v3 treats it as approximately EV-indifferent with the other mixed actions.',
    };
  }

  const loss = Number(zeroFrequencyLoss(step, scenario, optionKey).toFixed(2));
  return {
    evLossBb: loss,
    relativeEvBb: -loss,
    frequency: 0,
    source: EV_MODEL.id,
    confidence: 'heuristic',
    note: EV_MODEL.note,
  };
}

export function evGradeLabel(lossBb) {
  const loss = Number(lossBb);
  if (loss <= EV_THRESHOLDS.perfect) return 'Perfect';
  if (loss <= EV_THRESHOLDS.correct) return 'Correct';
  if (loss <= EV_THRESHOLDS.minor) return 'Minor Mistake';
  return 'Major Mistake';
}

export function evScore(lossBb) {
  const loss = Number(lossBb);
  if (loss <= EV_THRESHOLDS.perfect) return 1;
  if (loss <= EV_THRESHOLDS.correct) return 0.85;
  if (loss <= EV_THRESHOLDS.minor) return 0.5;
  return Math.max(0, 0.25 - Math.min(loss, 2.5) * 0.1);
}

export function evOptimalKeys(step, scenario) {
  const options = step?.options || [];
  const evaluated = options.map(option => ({ key: option.key, ...estimateEvLossBb(step, scenario, option.key) }));
  const best = Math.min(...evaluated.map(item => item.evLossBb));
  return evaluated.filter(item => item.evLossBb <= best + EV_THRESHOLDS.perfect).map(item => item.key);
}

export function evRulebookPayload() {
  return {
    version: EV_VERSION,
    label: 'EV-Aware v3.0',
    disclaimer: EV_MODEL.note,
    sections: [
      ...ADVANCED_RULEBOOK_SECTIONS,
      {
        id: 'ev-grading',
        title: 'EV-loss grading',
        bullets: [
          'v3 grades the decision by estimated EV loss in big blinds rather than action frequency alone.',
          'If two actions are genuinely mixed, both are treated as approximately equal-EV even when one is used more often.',
          `Perfect: ≤ ${EV_THRESHOLDS.perfect.toFixed(2)} BB estimated loss.`,
          `Correct: ≤ ${EV_THRESHOLDS.correct.toFixed(2)} BB estimated loss.`,
          `Minor mistake: ≤ ${EV_THRESHOLDS.minor.toFixed(2)} BB estimated loss.`,
          `Major mistake: > ${EV_THRESHOLDS.minor.toFixed(2)} BB estimated loss.`,
          'Current v3 EV numbers are rounded model estimates; importing solver-exported node EVs later can replace the estimator without changing the UI or grading pipeline.',
        ],
      },
    ],
    glossary: [
      ...ADVANCED_GLOSSARY.map(([term, definition]) => ({term, definition})),
      { term: 'EV / expected value', definition: 'The average amount a decision is expected to win or lose over many repetitions. In this trainer EV is shown in big blinds.' },
      { term: 'EV loss', definition: 'How much expected value an action gives up relative to the best available action. Smaller is better.' },
      { term: 'Indifference', definition: 'Two actions have approximately the same EV. GTO can intentionally mix between indifferent actions at different frequencies.' },
    ],
    ranges: {
      opening: Object.fromEntries(Object.entries(ADVANCED_OPENING_TIERS).map(([position, tiers]) => [position, tiers.map(tier => `${tier.spec.join(', ')} → ${mixText(tier.mix)}`)])),
      openingSizes: ADVANCED_OPEN_SIZES,
      preflopSpots: Object.fromEntries(Object.entries(ADVANCED_PREFLOP_SPOTS).map(([id, spot]) => [id, spot.references])),
      facingThreeBet: Object.fromEntries(Object.entries(ADVANCED_FACING_3BET_SPOTS).map(([id, spot]) => [id, spot.references])),
    },
    evModel: EV_MODEL,
    grading: [
      { label:'Perfect', meaning:`Estimated EV loss ≤ ${EV_THRESHOLDS.perfect.toFixed(2)} BB.` },
      { label:'Correct', meaning:`Estimated EV loss ≤ ${EV_THRESHOLDS.correct.toFixed(2)} BB.` },
      { label:'Minor Mistake', meaning:`Estimated EV loss ≤ ${EV_THRESHOLDS.minor.toFixed(2)} BB.` },
      { label:'Major Mistake', meaning:`Estimated EV loss > ${EV_THRESHOLDS.minor.toFixed(2)} BB.` },
    ],
  };
}
