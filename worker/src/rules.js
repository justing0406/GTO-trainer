export const RULEBOOK_VERSION = '1.0';

export const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];

export const OPENING_RANGE_SPECS = {
  UTG: ['77+', 'AJs+', 'AQo+', 'KQs'],
  HJ: ['22+', 'A9s+', 'ATo+', 'KJs+', 'KQo', 'QJs'],
  CO: ['22+', 'A2s+', 'ATo+', 'KTs+', 'KJo+', 'QTs+', 'QJo', 'JTs', 'T9s', '98s', '87s', '76s', '65s'],
  BTN: ['22+', 'A2s+', 'A8o+', 'K8s+', 'KTo+', 'Q9s+', 'QTo+', 'J9s+', 'JTo', 'T8s+', '98s', '87s', '76s', '65s', '54s'],
  SB: ['22+', 'A2s+', 'A8o+', 'K9s+', 'KTo+', 'Q9s+', 'QTo+', 'J9s+', 'JTo', 'T9s', '98s', '87s', '76s', '65s'],
};

export const FACING_OPEN_SPECS = {
  EARLY: {
    threeBet: ['QQ+', 'AKs', 'AKo'],
    call: ['88-JJ', 'AQs', 'AQo', 'AJs', 'KQs'],
  },
  CO: {
    threeBet: ['JJ+', 'AKs', 'AKo', 'AQs'],
    call: ['77-TT', 'AQo', 'AJs', 'ATs', 'KQs', 'KJs', 'QJs', 'JTs'],
  },
  BTN: {
    threeBet: ['TT+', 'AQs+', 'AQo+', 'AJs', 'KQs'],
    call: [],
  },
};

export const BIG_BLIND_DEFENSE_SPECS = {
  UTG: ['22-JJ', 'A2s+', 'AJo+', 'KTs+', 'QTs+', 'JTs', 'T9s', '98s'],
  HJ: ['22-JJ', 'A2s+', 'AJo+', 'K9s+', 'Q9s+', 'J9s+', 'T9s', '98s', '87s'],
  CO: ['22-JJ', 'A2s+', 'A9o+', 'K8s+', 'KTo+', 'Q8s+', 'QTo+', 'J8s+', 'JTo', 'T8s+', '97s+', '87s', '76s', '65s'],
  BTN: ['22+', 'A2s+', 'A2o+', 'K4s+', 'KTo+', 'Q6s+', 'QTo+', 'J7s+', 'JTo', 'T7s+', '97s+', '86s+', '75s+', '65s', '54s'],
};

export const FACING_THREE_BET = {
  fourBet: ['QQ+', 'AKs', 'AKo'],
  callStrong: ['JJ', 'AQs', 'AQo'],
  callSelective: ['TT', '99', 'AJs', 'KQs'],
};

export const FACING_FOUR_BET = {
  continue: ['AA', 'KK'],
  continueLate: ['QQ', 'AKs', 'AKo'],
};

export const GLOSSARY = [
  ['BB / big blind', 'The larger forced bet posted before the cards are dealt. Stack sizes and pot sizes are expressed in big blinds.'],
  ['Position', 'Where you sit relative to the dealer button. Acting later is valuable because you see what opponents do first.'],
  ['UTG', 'Under the Gun. The first player to act before the flop in a 6-player game.'],
  ['HJ', 'Hijack. The seat after UTG and before the Cutoff.'],
  ['CO', 'Cutoff. The seat immediately before the Button.'],
  ['BTN / Button', 'The dealer-button seat. It is usually the best position after the flop because it acts last.'],
  ['SB / small blind', 'The smaller forced blind. The Small Blind is usually out of position after the flop.'],
  ['Suited', 'Both private cards have the same suit. AJs means Ace-Jack suited.'],
  ['Offsuit', 'The two private cards have different suits. AJo means Ace-Jack offsuit.'],
  ['Limp', 'Entering the pot before the flop by only matching the big blind instead of raising. Version 1.0 never open-limps.'],
  ['3-bet', 'A re-raise before the flop. If one player raises and you raise again, your raise is the 3-bet.'],
  ['4-bet', 'A re-raise of a 3-bet.'],
  ['In position', 'You will generally act after the opponent on later streets.'],
  ['Out of position', 'You will generally act before the opponent on later streets.'],
  ['Isolation raise', 'A raise after one or more players limp, intended to play a larger pot against the limper and ideally isolate them.'],
  ['Suited connector', 'Two consecutive cards of the same suit, such as 8♠7♠.'],
  ['One-gap hand', 'Two cards with one rank missing between them, such as 9♠7♠.'],
  ['Made hand', 'A hand that already has meaningful value, such as a pair, straight, or flush, rather than only a draw.'],
  ['Overpair', 'A pocket pair higher than every card on the board. QQ on J-7-2 is an overpair.'],
  ['Kicker', 'An unpaired side card used to break ties between otherwise similar hands.'],
  ['Draw', 'An incomplete hand that can become much stronger on a future card.'],
  ['Out', 'A remaining card that is likely to improve you to the winning hand.'],
  ['Gutshot', 'A straight draw needing one specific rank in the middle. It normally has four outs.'],
  ['Open-ended straight draw', 'A straight draw that can be completed on either end. It normally has eight outs.'],
  ['Combo draw', 'A hand with multiple strong draws at once, such as both a flush draw and straight draw.'],
  ['Dry board', 'A board with few likely straight or flush draws, such as K♣7♦2♠.'],
  ['Wet board', 'A highly connected board with many straight or flush possibilities, such as 9♠8♠7♦.'],
  ['Paired board', 'A board containing two cards of the same rank, such as K-8-8.'],
  ['Monotone board', 'A flop with all three community cards in the same suit.'],
  ['C-bet / continuation bet', 'A flop bet made by the player who raised before the flop.'],
  ['Semi-bluff', 'A bet or raise with a hand that may be behind now but has a strong draw and can improve if called.'],
  ['Equity', 'Your estimated percentage chance of ultimately winning the pot.'],
  ['Pot odds', 'The price the pot is offering you on a call. Compare the required equity with your chance of winning.'],
  ['Second barrel', 'Betting the turn after also betting the flop.'],
  ['Value bet', 'A bet made because you expect worse hands to call.'],
  ['Thin value', 'A value bet with a good but not extremely strong hand because slightly worse hands may still call.'],
  ['Bluff', 'A bet made mainly to make a better hand fold.'],
  ['Bluff-catcher', 'A hand that usually loses to an opponent’s genuine value bets but beats their bluffs.'],
  ['Multiway pot', 'A pot involving three or more players.'],
  ['Squeeze', 'A large re-raise after one player raises and at least one other player calls.'],
  ['Exploit', 'A deliberate strategy adjustment made to take advantage of an opponent’s predictable mistake.'],
  ['Blind steal', 'A late-position raise intended partly to win the Small Blind and Big Blind immediately.'],
  ['Mixed strategy', 'Using more than one action with the same hand at deliberate frequencies. Version 1.0 converts these into preferred and acceptable actions.'],
];

export const RULEBOOK_SECTIONS = [
  {
    id: 'game', title: 'Game assumptions',
    bullets: ['6-max No-Limit Texas Hold’em cash game', '100 BB effective stacks', 'No antes', 'Ignore rake in Version 1.0', 'Opening raise size: 3 BB'],
  },
  {
    id: 'opening', title: 'Opening an unopened pot',
    bullets: ['Raise or fold; never open-limp.', 'Play tighter from UTG and wider toward the Button.', 'Use the exact opening ranges shown in the opening-range chart.', 'Small Blind uses raise-or-fold in Version 1.0.'],
  },
  {
    id: 'limpers', title: 'When someone limps',
    bullets: ['Do not limp behind by default.', 'Raise or fold.', 'With one limper, isolate to about 4 BB in position or 5 BB out of position.', 'Add about 1 BB for each additional limper.', 'Against multiple limpers, tighten your range.'],
  },
  {
    id: 'facing-open', title: 'Facing a raise',
    bullets: ['Respect early-position raises.', 'Against UTG/HJ, 3-bet QQ+ and AK; call 88-JJ, AQ, AJs, KQs when appropriate.', 'Against a CO raise, continue wider.', 'Against a Button raise, blinds defend widest.'],
  },
  {
    id: 'three-bet', title: '3-bets and 4-bets',
    bullets: ['3-bet to roughly 3× the open in position and 4× out of position.', 'After you are 3-bet: AA-KK usually 4-bet; QQ/AK continue; JJ usually calls reasonable sizes; TT-99/AQ/AJs/KQs continue selectively.', 'Facing a 4-bet: AA-KK continue; QQ/AK continue more readily versus late-position aggression; JJ and weaker fold by default.'],
  },
  {
    id: 'bb-defense', title: 'Big Blind defense',
    bullets: ['The BB can defend wider because 1 BB is already invested.', 'Defend tightest against UTG and widest against Button.', 'Suited hands and connected hands gain value because they can make strong draws.'],
  },
  {
    id: 'flop', title: 'Flop strategy',
    bullets: ['On dry flops, c-bet about 1/3 pot frequently.', 'On medium boards, bet good made hands and good draws; check more weak hands.', 'On wet boards, bet strong hands and strong draws, usually 1/2 to 2/3 pot; check weak hands more.', 'Facing bets, continue tighter as the bet gets larger.', 'Raise two pair+ for value more often; strong combo draws can raise as semi-bluffs.'],
  },
  {
    id: 'odds', title: 'Draws and pot odds',
    bullets: ['Flush draw: about 9 outs.', 'Open-ended straight draw: about 8 outs.', 'Gutshot: about 4 outs.', 'On the flop, outs × 4 ≈ chance to improve by the river.', 'On the turn, outs × 2 ≈ chance to improve on the river.', 'Required equity = amount to call ÷ final pot after calling.'],
  },
  {
    id: 'turn', title: 'Turn strategy',
    bullets: ['Do not automatically fire a second barrel after a flop bluff is called.', 'Bet again with strong made hands, when you improve, when you gain strong additional equity, or when the turn strongly favors your range.', 'Default turn sizing: roughly 1/2 to 2/3 pot.'],
  },
  {
    id: 'river', title: 'River strategy',
    bullets: ['Before value betting, identify worse hands that can realistically call.', 'Value bet very strong hands; value bet top pair strong kicker selectively.', 'Bluff selectively and avoid bluffing opponents who call too much.', 'Fold ordinary one-pair hands to very large river aggression by default.'],
  },
  {
    id: 'multiway', title: 'Multiway pots',
    bullets: ['Three or more players means you need stronger hands.', 'Bluff less.', 'C-bet complete misses much less.', 'Be more cautious with one pair.'],
  },
  {
    id: 'exploit', title: 'Opponent adjustments',
    bullets: ['Calls too much: bluff much less, value bet more often, value bet thinner, and size value bets larger.', 'Folds too much: raise more, bluff more, steal blinds more, and c-bet favorable boards more.', 'Unknown opponent: use Baseline Mode.'],
  },
  {
    id: 'discipline', title: 'Fold discipline',
    bullets: ['Never open-limp.', 'Do not casually continue KQo/AJo versus strong early-position raises.', 'Do not chase draws without sufficient pot odds.', 'Do not keep bluffing after a failed flop bluff without a reason.', 'Do not pay off huge river aggression with ordinary one-pair hands.', 'Judge the decision, not whether the hand happened to win.'],
  },
];

const rankIndex = Object.fromEntries(RANKS.map((r, i) => [r, i]));

function normalizeHandClass(handClass) {
  const value = String(handClass || '').trim().toUpperCase();
  if (/^([2-9TJQKA])\1$/.test(value)) return value;
  const match = value.match(/^([2-9TJQKA])([2-9TJQKA])([SO])$/);
  if (!match) return value;
  let [, a, b, suffix] = match;
  if (rankIndex[a] < rankIndex[b]) [a, b] = [b, a];
  return `${a}${b}${suffix.toLowerCase()}`;
}

function expandDash(token) {
  const pairDash = token.match(/^([2-9TJQKA])\1-([2-9TJQKA])\2$/i);
  if (pairDash) {
    const lo = rankIndex[pairDash[1].toUpperCase()];
    const hi = rankIndex[pairDash[2].toUpperCase()];
    const out = [];
    for (let i = Math.min(lo, hi); i <= Math.max(lo, hi); i++) out.push(RANKS[i] + RANKS[i]);
    return out;
  }

  const handDash = token.match(/^([2-9TJQKA])([2-9TJQKA])([so])-([2-9TJQKA])([2-9TJQKA])\3$/i);
  if (handDash && handDash[1].toUpperCase() === handDash[4].toUpperCase()) {
    const first = handDash[1].toUpperCase();
    const suffix = handDash[3].toLowerCase();
    const lo = rankIndex[handDash[2].toUpperCase()];
    const hi = rankIndex[handDash[5].toUpperCase()];
    const out = [];
    for (let i = Math.min(lo, hi); i <= Math.max(lo, hi); i++) {
      if (RANKS[i] !== first) out.push(`${first}${RANKS[i]}${suffix}`);
    }
    return out;
  }
  return [normalizeHandClass(token)];
}

export function expandRangeToken(rawToken) {
  const token = rawToken.trim();
  if (token.includes('-')) return expandDash(token);

  const pairPlus = token.match(/^([2-9TJQKA])\1\+$/i);
  if (pairPlus) {
    const start = rankIndex[pairPlus[1].toUpperCase()];
    return RANKS.slice(start).map(r => r + r);
  }

  const handPlus = token.match(/^([2-9TJQKA])([2-9TJQKA])([so])\+$/i);
  if (handPlus) {
    const first = handPlus[1].toUpperCase();
    const second = handPlus[2].toUpperCase();
    const suffix = handPlus[3].toLowerCase();
    const firstIndex = rankIndex[first];
    const secondIndex = rankIndex[second];
    const out = [];
    for (let i = secondIndex; i < firstIndex; i++) out.push(`${first}${RANKS[i]}${suffix}`);
    return out;
  }

  return [normalizeHandClass(token)];
}

export function expandRange(spec = []) {
  const set = new Set();
  for (const token of spec) for (const hand of expandRangeToken(token)) set.add(normalizeHandClass(hand));
  return set;
}

export function isInRange(handClass, spec) {
  return expandRange(spec).has(normalizeHandClass(handClass));
}

export function openingDecision(position, handClass) {
  if (position === 'BB') return { action: 'check', reason: 'The Big Blind is not an unopened-pot opening position.' };
  const inRange = isInRange(handClass, OPENING_RANGE_SPECS[position] || []);
  return {
    action: inRange ? 'raise' : 'fold',
    sizeBb: inRange ? 3 : null,
    ruleId: 'opening',
    reason: inRange
      ? `${handClass} is inside the Version 1.0 ${position} opening range. Raise to 3 BB.`
      : `${handClass} is outside the Version 1.0 ${position} opening range. Fold rather than limp or force a marginal hand.`
  };
}

export function facingOpenDecision(openerPosition, heroPosition, handClass) {
  if (heroPosition === 'BB') return bigBlindDefenseDecision(openerPosition, handClass);
  const key = ['UTG', 'HJ'].includes(openerPosition) ? 'EARLY' : openerPosition === 'CO' ? 'CO' : 'BTN';
  const rules = FACING_OPEN_SPECS[key];
  if (isInRange(handClass, rules.threeBet)) return { action: 'raise', ruleId: 'facing-open', tier: 'preferred' };
  if (isInRange(handClass, rules.call)) return { action: 'call', ruleId: 'facing-open', tier: 'preferred' };
  return { action: 'fold', ruleId: 'facing-open', tier: 'preferred' };
}

export function bigBlindDefenseDecision(openerPosition, handClass) {
  const opener = ['UTG', 'HJ', 'CO', 'BTN'].includes(openerPosition) ? openerPosition : 'BTN';
  const threeBetGroup = opener === 'UTG' || opener === 'HJ'
    ? ['QQ+', 'AKs', 'AKo']
    : opener === 'CO'
      ? ['JJ+', 'AKs', 'AKo', 'AQs']
      : ['TT+', 'AQs+', 'AQo+', 'AJs', 'KQs'];
  if (isInRange(handClass, threeBetGroup)) return { action: 'raise', ruleId: 'bb-defense', tier: 'preferred' };
  if (isInRange(handClass, BIG_BLIND_DEFENSE_SPECS[opener])) return { action: 'call', ruleId: 'bb-defense', tier: 'preferred' };
  return { action: 'fold', ruleId: 'bb-defense', tier: 'preferred' };
}

export function facingThreeBetDecision(handClass, context = {}) {
  if (isInRange(handClass, FACING_THREE_BET.fourBet)) return { action: 'raise', ruleId: 'three-bet' };
  if (isInRange(handClass, FACING_THREE_BET.callStrong)) return { action: 'call', ruleId: 'three-bet' };
  if (isInRange(handClass, FACING_THREE_BET.callSelective)) {
    const favorable = context.inPosition || context.villainLatePosition;
    return { action: favorable ? 'call' : 'fold', ruleId: 'three-bet' };
  }
  return { action: 'fold', ruleId: 'three-bet' };
}

export function potOddsRequired(betFractionOfPot) {
  const f = Number(betFractionOfPot);
  return f / (1 + 2 * f);
}

export function gradeLabel(score) {
  if (score >= 1) return 'Perfect';
  if (score >= 0.75) return 'Correct';
  if (score >= 0.4) return 'Minor Mistake';
  return 'Major Mistake';
}
