import { isInRange } from './rules.js';

export const ADVANCED_VERSION = '2.0';

export const ADVANCED_ASSUMPTIONS = {
  game: '6-max No-Limit Hold’em cash',
  effectiveStackBb: 100,
  ante: false,
  rakeProfile: 'Rake-aware low/mid-stakes baseline',
  note: 'Solver-inspired training model. Exact equilibrium frequencies change with rake, stack depth, opening size, and allowed bet sizes.',
};

export const ADVANCED_OPEN_SIZES = {
  UTG: 2,
  HJ: 2,
  CO: 2.3,
  BTN: 2.5,
  SB: 3,
};

// Ordered tiers: first matching tier wins. Frequencies are deliberately rounded
// into learnable buckets rather than pretending to be exact solver output.
export const ADVANCED_OPENING_TIERS = {
  UTG: [
    { spec: ['55+', 'ATs+', 'KJs+', 'QJs', 'JTs', 'T9s', 'AQo+', 'KQo'], mix: { raise: 1 } },
    { spec: ['22-44', 'A2s-A5s', 'A9s', 'KTs', 'QTs', '98s', 'AJo'], mix: { raise: 0.75, fold: 0.25 } },
    { spec: ['A8s', 'K9s', 'J9s', '87s', 'ATo'], mix: { raise: 0.25, fold: 0.75 } },
  ],
  HJ: [
    { spec: ['22+', 'A9s+', 'A2s-A5s', 'ATo+', 'KTs+', 'KQo', 'QTs+', 'JTs', 'T9s', '98s'], mix: { raise: 1 } },
    { spec: ['A6s-A8s', 'K9s', 'Q9s', 'J9s', '87s', '76s', 'KJo', 'QJo'], mix: { raise: 0.7, fold: 0.3 } },
    { spec: ['K8s', 'T8s', '65s', 'A9o'], mix: { raise: 0.3, fold: 0.7 } },
  ],
  CO: [
    { spec: ['22+', 'A2s+', 'ATo+', 'K9s+', 'KJo+', 'Q9s+', 'QJo', 'J9s+', 'JTo', 'T9s', '98s', '87s', '76s', '65s'], mix: { raise: 1 } },
    { spec: ['A9o', 'K8s', 'KTo', 'Q8s', 'QTo', 'J8s', 'T8s', '97s', '86s', '54s'], mix: { raise: 0.7, fold: 0.3 } },
    { spec: ['A8o', 'K7s', 'Q7s', 'J7s', 'T7s', '75s', '64s'], mix: { raise: 0.3, fold: 0.7 } },
  ],
  BTN: [
    { spec: ['22+', 'A2s+', 'A7o+', 'K5s+', 'K9o+', 'Q7s+', 'Q9o+', 'J7s+', 'J9o+', 'T7s+', 'T9o', '97s+', '86s+', '75s+', '65s', '54s'], mix: { raise: 1 } },
    { spec: ['A2o-A6o', 'K2s-K4s', 'K8o', 'Q5s-Q6s', 'Q8o', 'J5s-J6s', 'J8o', 'T6s', 'T8o', '96s', '85s', '74s', '64s', '53s', '43s'], mix: { raise: 0.55, fold: 0.45 } },
    { spec: ['K7o', 'Q7o', 'J7o', '95s', '84s', '73s'], mix: { raise: 0.2, fold: 0.8 } },
  ],
  SB: [
    { spec: ['66+', 'A8s+', 'ATo+', 'KTs+', 'KQo', 'QTs+', 'JTs'], mix: { raise: 0.9, limp: 0.1 } },
    { spec: ['22-55', 'A2s-A7s', 'A8o-A9o', 'K7s-K9s', 'KJo', 'Q9s', 'QJo', 'J9s', 'T9s', '98s', '87s'], mix: { raise: 0.55, limp: 0.4, fold: 0.05 } },
    { spec: ['K4s-K6s', 'Q7s-Q8s', 'J7s-J8s', 'T7s-T8s', '97s', '86s', '76s', '65s', '54s', 'A5o-A7o'], mix: { raise: 0.2, limp: 0.6, fold: 0.2 } },
  ],
};

export const ADVANCED_PREFLOP_SPOTS = {
  'btn-vs-utg': {
    label: 'BTN facing UTG 2 BB open', heroPosition: 'BTN', villainPosition: 'UTG', openSizeBb: 2,
    tiers: [
      { spec: ['KK+'], mix: { threeBet: 0.85, call: 0.15 } },
      { spec: ['QQ', 'AKs', 'AKo'], mix: { threeBet: 0.7, call: 0.3 } },
      { spec: ['JJ', 'AQs'], mix: { threeBet: 0.35, call: 0.65 } },
      { spec: ['22-TT', 'AJs-ATs', 'KQs-KJs', 'QJs', 'JTs', 'T9s', '98s'], mix: { call: 0.85, fold: 0.15 } },
      { spec: ['A5s-A4s'], mix: { threeBet: 0.45, call: 0.15, fold: 0.4 } },
      { spec: ['AQo', 'KQo', '87s'], mix: { call: 0.45, fold: 0.55 } },
    ],
    references: [
      'Premium/value 3-bets: KK+ heavy; QQ/AK mostly 3-bet with some calls.',
      'Condensed calls: pairs, suited Broadways, JTs–98s.',
      'A5s–A4s are useful mixed 3-bet bluffs because the Ace blocks AA/AK.',
    ],
  },
  'co-vs-hj': {
    label: 'CO facing HJ 2 BB open', heroPosition: 'CO', villainPosition: 'HJ', openSizeBb: 2,
    tiers: [
      { spec: ['KK+'], mix: { threeBet: 0.9, call: 0.1 } },
      { spec: ['QQ', 'AKs', 'AKo'], mix: { threeBet: 0.75, call: 0.25 } },
      { spec: ['JJ', 'AQs'], mix: { threeBet: 0.45, call: 0.55 } },
      { spec: ['77-TT', 'AJs-ATs', 'KQs-KJs', 'QJs', 'JTs', 'T9s'], mix: { call: 0.7, fold: 0.3 } },
      { spec: ['A5s-A4s', 'AQo'], mix: { threeBet: 0.35, call: 0.2, fold: 0.45 } },
      { spec: ['22-66', '98s', '87s', 'KQo'], mix: { call: 0.35, fold: 0.65 } },
    ],
    references: [
      'CO can cold-call some playable hands in position, but less freely than BTN.',
      'Strong hands mix calls and 3-bets so the calling range is not completely capped.',
    ],
  },
  'sb-vs-btn': {
    label: 'SB facing BTN 2.5 BB open', heroPosition: 'SB', villainPosition: 'BTN', openSizeBb: 2.5,
    tiers: [
      { spec: ['QQ+', 'AKs', 'AKo'], mix: { threeBet: 1 } },
      { spec: ['TT-JJ', 'AQs', 'AQo', 'AJs', 'KQs'], mix: { threeBet: 0.8, fold: 0.2 } },
      { spec: ['77-99', 'ATs-A9s', 'KJs-KTs', 'QJs-QTs', 'JTs', 'A5s-A2s'], mix: { threeBet: 0.55, fold: 0.45 } },
      { spec: ['22-66', 'A8s-A6s', 'K9s-K8s', 'Q9s', 'J9s', 'T9s', '98s'], mix: { threeBet: 0.25, call: 0.05, fold: 0.7 } },
      { spec: ['AJo', 'KQo'], mix: { threeBet: 0.4, fold: 0.6 } },
    ],
    references: [
      'SB is out of position and the BB can squeeze, so the advanced baseline is overwhelmingly 3-bet-or-fold.',
      'Suited wheel Aces (A5s–A2s) are natural bluff 3-bets because they block strong Ace hands and retain equity when called.',
    ],
  },
  'bb-vs-btn': {
    label: 'BB facing BTN 2.5 BB open', heroPosition: 'BB', villainPosition: 'BTN', openSizeBb: 2.5,
    tiers: [
      { spec: ['QQ+', 'AKs', 'AKo'], mix: { threeBet: 0.75, call: 0.25 } },
      { spec: ['TT-JJ', 'AQs-AJs', 'AQo', 'KQs'], mix: { threeBet: 0.45, call: 0.55 } },
      { spec: ['22-99', 'A2s-ATs', 'A2o-AJo', 'K7s-KJs', 'KTo-KQo', 'Q8s-QJs', 'QTo-QJo', 'J8s-JTs', 'JTo', 'T8s-T9s', '98s', '87s', '76s', '65s', '54s'], mix: { call: 0.8, threeBet: 0.1, fold: 0.1 } },
      { spec: ['K4s-K6s', 'Q6s-Q7s', 'J7s', 'T7s', '97s', '86s', '75s', '64s'], mix: { call: 0.55, fold: 0.45 } },
      { spec: ['A5s-A2s'], mix: { threeBet: 0.3, call: 0.65, fold: 0.05 } },
    ],
    references: [
      'BB defends widest against BTN because 1 BB is already invested and BTN opens a wide range.',
      'Some very strong hands still call as traps; a GTO calling range is not automatically weak.',
    ],
  },
  'bb-vs-utg': {
    label: 'BB facing UTG 2 BB open', heroPosition: 'BB', villainPosition: 'UTG', openSizeBb: 2,
    tiers: [
      { spec: ['KK+'], mix: { threeBet: 0.7, call: 0.3 } },
      { spec: ['QQ', 'AKs', 'AKo'], mix: { threeBet: 0.45, call: 0.55 } },
      { spec: ['22-JJ', 'A2s-AQs', 'AJo-AQo', 'KTs-KQs', 'QTs-QJs', 'JTs', 'T9s', '98s'], mix: { call: 0.75, fold: 0.25 } },
      { spec: ['A5s-A4s'], mix: { threeBet: 0.2, call: 0.65, fold: 0.15 } },
      { spec: ['87s', '76s', 'K9s', 'Q9s', 'J9s'], mix: { call: 0.35, fold: 0.65 } },
    ],
    references: [
      'Against a strong UTG range, BB defends much tighter than versus BTN.',
      'QQ/AK can mix calls and 3-bets; trapping protects the BB calling range.',
    ],
  },
};

export const ADVANCED_FACING_3BET_SPOTS = {
  'btn-vs-sb-3bet': {
    label: 'BTN open versus SB 3-bet', heroPosition: 'BTN', villainPosition: 'SB',
    tiers: [
      { spec: ['KK+'], mix: { fourBet: 0.9, call: 0.1 } },
      { spec: ['QQ', 'AKs', 'AKo'], mix: { fourBet: 0.65, call: 0.35 } },
      { spec: ['TT-JJ', 'AQs-AJs', 'KQs'], mix: { call: 0.8, fourBet: 0.05, fold: 0.15 } },
      { spec: ['77-99', 'ATs', 'KJs', 'QJs', 'JTs'], mix: { call: 0.55, fold: 0.45 } },
      { spec: ['A5s-A4s'], mix: { fourBet: 0.35, call: 0.15, fold: 0.5 } },
      { spec: ['AQo'], mix: { fourBet: 0.15, call: 0.5, fold: 0.35 } },
    ],
    references: [
      '4-bet value: KK+ very heavily, QQ/AK at high frequency.',
      '4-bet bluffs: A5s–A4s are useful because of Ace blockers and suited equity.',
      'Medium pairs and suited Broadways often continue by calling in position.',
    ],
  },
  'co-vs-btn-3bet': {
    label: 'CO open versus BTN 3-bet', heroPosition: 'CO', villainPosition: 'BTN',
    tiers: [
      { spec: ['KK+'], mix: { fourBet: 0.9, call: 0.1 } },
      { spec: ['QQ', 'AKs', 'AKo'], mix: { fourBet: 0.7, call: 0.3 } },
      { spec: ['JJ', 'AQs'], mix: { fourBet: 0.2, call: 0.65, fold: 0.15 } },
      { spec: ['88-TT', 'AJs', 'KQs'], mix: { call: 0.5, fold: 0.5 } },
      { spec: ['A5s-A4s'], mix: { fourBet: 0.3, fold: 0.7 } },
      { spec: ['AQo', 'KJs', 'QJs'], mix: { call: 0.25, fold: 0.75 } },
    ],
    references: [
      'Being out of position after calling a BTN 3-bet makes marginal continues less attractive than BTN versus SB.',
      'The 4-bet range is polarized: strong value plus selected blocker bluffs.',
    ],
  },
};

export const ADVANCED_GLOSSARY = [
  ['Range advantage', 'One player’s entire set of plausible hands is stronger on average than the other player’s range on the current board.'],
  ['Nut advantage', 'One player can hold more of the very strongest possible hands (“the nuts”) than the opponent. Nut advantage often supports larger bets.'],
  ['Polarized range', 'A betting range concentrated around very strong hands and bluffs, with fewer medium-strength hands. Large bets are commonly polarized.'],
  ['Condensed range', 'A range concentrated around medium-strength playable hands, often created by calling rather than raising.'],
  ['Capped range', 'A range that contains relatively few of the strongest possible hands because earlier actions would usually have raised those hands.'],
  ['Blocker', 'A card in your hand that makes certain opponent hands less likely because you physically hold one of the needed cards.'],
  ['Unblocker', 'A card characteristic that leaves likely opponent folds available. Good bluffs often block calls/value while not blocking folds.'],
  ['MDF / minimum defense frequency', 'A benchmark for how much of a range must continue against a bet so a zero-equity bluff cannot profit automatically. MDF = 1 / (1 + bet size as a fraction of pot).'],
  ['SPR / stack-to-pot ratio', 'Effective stack remaining divided by the pot. Low SPR means stacks can go in with fewer bets and strong one-pair hands gain relative value.'],
  ['Delayed c-bet', 'The preflop raiser checks the flop and then bets the turn after the opponent checks again.'],
  ['Probe bet', 'A bet into the previous-street aggressor after that player declined to continue betting on the prior street.'],
  ['Check-raise', 'Checking first, then raising after the opponent bets. It can be used with strong value hands and selected bluffs/semi-bluffs.'],
  ['Overbet', 'A bet larger than the current pot. It is usually used with a polarized range when one player has a meaningful nut advantage.'],
  ['Mixed strategy', 'Using more than one action with the same hand. In v2, meaningful mixed actions are graded as valid rather than forcing a fake always/never answer.'],
  ['Frequency', 'How often an action is taken in a mixed strategy. A 70% raise / 30% call mix means both actions are legitimate, but raising is more common.'],
  ['Rake', 'The fee removed from cash-game pots. Rake makes marginal calls and opens less profitable and therefore changes equilibrium ranges.'],
];

export const ADVANCED_RULEBOOK_SECTIONS = [
  {
    id: 'assumptions', title: 'Advanced baseline',
    bullets: [
      '6-max, 100-BB cash game, no ante.',
      'The baseline is rake-aware and solver-inspired rather than a copied solver solution.',
      'Exact equilibrium changes with rake, stack depth, opening size, and available bet sizes.',
      'The trainer now permits mixed strategies: more than one action may be correct at meaningful frequency.',
    ],
  },
  {
    id: 'open-sizing', title: 'Position-specific opening sizes',
    bullets: [
      'UTG: 2 BB.', 'HJ: 2 BB.', 'CO: about 2.3 BB.', 'BTN: 2.5 BB.', 'SB: 3 BB when raising.',
      'Earlier positions open smaller because they face more players who can 3-bet; later positions can use larger opens.',
    ],
  },
  {
    id: 'preflop-mixes', title: 'Preflop range construction',
    bullets: [
      'Premium hands are usually pure or near-pure aggressive actions.',
      'Medium pocket pairs and suited Broadways often prefer calls when position and price make calling attractive.',
      'A5s–A2s frequently appear as 3-bet or 4-bet bluffs because an Ace blocks AA/AK and suitedness preserves equity.',
      'The Small Blind uses far more 3-bet-or-fold strategy versus a Button open than the Button uses versus an early open.',
      'The Big Blind defends widest against the Button and can trap by calling some very strong hands.',
    ],
  },
  {
    id: 'range-advantage', title: 'Range advantage and board texture',
    bullets: [
      'High, dry boards often favor the preflop raiser and support frequent small bets.',
      'Low, connected boards interact strongly with the caller and produce much more checking from the preflop raiser.',
      'Range advantage asks who is stronger on average; nut advantage asks who can hold more of the strongest hands.',
      'A player can have range advantage without enough nut advantage to justify a very large bet.',
    ],
  },
  {
    id: 'bet-sizing', title: 'Bet sizing as part of strategy',
    bullets: [
      '20–33% pot: common when betting a wide range on favorable boards.',
      '50–75% pot: common when betting a more selective range or charging draws.',
      '100%+ pot: used when the betting range is polarized and has sufficient nut advantage.',
      'Do not choose a large size merely because your individual hand is strong; sizing is driven by the range-versus-range situation.',
    ],
  },
  {
    id: 'check-raises', title: 'Check-raises and semi-bluffs',
    bullets: [
      'Check-raise strong value hands that want to build a pot.',
      'Balance value with strong draws and selected backdoor/bluff combinations.',
      'Combo draws can raise aggressively because they retain substantial equity when called.',
      'Medium-strength showdown hands usually prefer calls rather than inflating the pot.',
    ],
  },
  {
    id: 'turns', title: 'Turn strategy',
    bullets: [
      'Barrel cards that improve your equity or shift range/nut advantage toward you.',
      'After a flop check-back, some turns become good delayed-c-bet opportunities.',
      'When a turn strongly polarizes ranges, large bets and overbets become legitimate.',
      'Blank turns that do not improve your hand or range often reduce bluffing frequency.',
    ],
  },
  {
    id: 'river', title: 'River polarization, blockers, and bluff-catching',
    bullets: [
      'Large river bets represent polarized value-plus-bluff ranges.',
      'Choose bluffs that block likely calls/value and avoid blocking likely folds.',
      'Against a half-pot bet, MDF is about 67%; against a pot bet, MDF is 50%. MDF is a benchmark, not a command to call the top X% blindly.',
      'River bluff-catching depends on pot odds and the composition of the opponent’s value/bluff range, not simply on having one pair or two pair.',
    ],
  },
  {
    id: 'multiway', title: 'Multiway adjustment',
    bullets: [
      'Betting frequencies fall sharply because a bluff must get through multiple ranges.',
      'Strong hands can check more often because no single defender is responsible for protecting the entire field.',
      'Squeezing becomes more attractive with the top of your range when a raise has already received calls.',
    ],
  },
  {
    id: 'grading', title: 'Advanced grading',
    bullets: [
      'Perfect: the most frequent or near-pure action.',
      'Correct: a meaningful mixed action.',
      'Minor mistake: an action used only at low frequency.',
      'Major mistake: an action that is essentially absent from the v2 strategy.',
      'Feedback shows the approximate action mix so you learn frequencies rather than false absolutes.',
    ],
  },
];

function normalizedMix(mix = {}) {
  const allowed = Object.fromEntries(Object.entries(mix).filter(([, value]) => Number(value) > 0));
  const total = Object.values(allowed).reduce((sum, value) => sum + value, 0);
  if (!total) return { fold: 1 };
  return Object.fromEntries(Object.entries(allowed).map(([key, value]) => [key, value / total]));
}

function firstTierMix(handClass, tiers = []) {
  for (const tier of tiers) {
    if (isInRange(handClass, tier.spec)) return normalizedMix(tier.mix);
  }
  return { fold: 1 };
}

export function advancedOpeningDecision(position, handClass) {
  const tiers = ADVANCED_OPENING_TIERS[position] || [];
  return {
    mix: firstTierMix(handClass, tiers),
    sizeBb: ADVANCED_OPEN_SIZES[position] || null,
    rangeReference: advancedOpeningReference(position),
  };
}

export function advancedPreflopResponse(spotId, handClass) {
  const spot = ADVANCED_PREFLOP_SPOTS[spotId];
  if (!spot) return { mix: { fold: 1 }, rangeReference: 'Unknown advanced preflop spot.' };
  return {
    mix: firstTierMix(handClass, spot.tiers),
    rangeReference: `${spot.label}: ${spot.references.join(' ')}`,
    spot,
  };
}

export function advancedFacing3BetResponse(spotId, handClass) {
  const spot = ADVANCED_FACING_3BET_SPOTS[spotId];
  if (!spot) return { mix: { fold: 1 }, rangeReference: 'Unknown advanced 3-bet spot.' };
  return {
    mix: firstTierMix(handClass, spot.tiers),
    rangeReference: `${spot.label}: ${spot.references.join(' ')}`,
    spot,
  };
}

export function advancedOpeningReference(position) {
  const tiers = ADVANCED_OPENING_TIERS[position] || [];
  const size = ADVANCED_OPEN_SIZES[position];
  const tierText = tiers.map((tier, index) => {
    const mix = mixText(tier.mix);
    return `Tier ${index + 1}: ${tier.spec.join(', ')} → ${mix}`;
  }).join(' | ');
  return `${position} open ${size} BB. ${tierText}. Unlisted hands fold.`;
}

export function mixText(mix = {}) {
  const labels = {
    raise: 'Raise', limp: 'Limp', fold: 'Fold', call: 'Call', threeBet: '3-bet', fourBet: '4-bet',
    check: 'Check', bet20: 'Bet 20%', bet25: 'Bet 25%', bet33: 'Bet 33%', bet50: 'Bet 50%',
    bet67: 'Bet 67%', bet75: 'Bet 75%', bet100: 'Bet pot', bet125: 'Bet 125%', bet150: 'Bet 150%',
    checkRaise: 'Check-raise', shove: 'All-in',
  };
  return Object.entries(normalizedMix(mix))
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `${labels[key] || key} ${Math.round(value * 100)}%`)
    .join(' / ');
}

export function scoreMixedAction(mix = {}, actionKey) {
  const frequency = normalizedMix(mix)[actionKey] || 0;
  if (frequency >= 0.5) return { score: 1, frequency };
  if (frequency >= 0.2) return { score: 0.82, frequency };
  if (frequency >= 0.05) return { score: 0.5, frequency };
  if (frequency > 0) return { score: 0.3, frequency };
  return { score: 0, frequency: 0 };
}

export function advancedGradeLabel(score) {
  if (score >= 0.95) return 'Perfect';
  if (score >= 0.75) return 'Correct';
  if (score >= 0.4) return 'Minor Mistake';
  return 'Major Mistake';
}

export function minimumDefenseFrequency(betFractionOfPot) {
  const b = Number(betFractionOfPot);
  return 1 / (1 + b);
}

export function riverBluffFraction(betFractionOfPot) {
  const b = Number(betFractionOfPot);
  return b / (1 + 2 * b);
}

export function stackToPotRatio(effectiveStackBb, potBb) {
  return Number(effectiveStackBb) / Number(potBb);
}
