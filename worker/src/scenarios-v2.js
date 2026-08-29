import {
  ADVANCED_VERSION,
  ADVANCED_OPEN_SIZES,
  ADVANCED_PREFLOP_SPOTS,
  ADVANCED_FACING_3BET_SPOTS,
  ADVANCED_RULEBOOK_SECTIONS,
  ADVANCED_GLOSSARY,
  ADVANCED_OPENING_TIERS,
  advancedOpeningDecision,
  advancedPreflopResponse,
  advancedFacing3BetResponse,
  mixText,
  scoreMixedAction,
  advancedGradeLabel,
  minimumDefenseFrequency,
  riverBluffFraction,
  stackToPotRatio,
} from './rules-v2.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS_DESC = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

function hashString(input) {
  let h = 2166136261;
  for (const ch of String(input)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choose(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle(rand, arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function allHandClasses() {
  const out = [];
  for (let i = 0; i < RANKS_DESC.length; i++) {
    out.push(RANKS_DESC[i] + RANKS_DESC[i]);
    for (let j = i + 1; j < RANKS_DESC.length; j++) {
      out.push(`${RANKS_DESC[i]}${RANKS_DESC[j]}s`);
      out.push(`${RANKS_DESC[i]}${RANKS_DESC[j]}o`);
    }
  }
  return out;
}

const ALL_HAND_CLASSES = allHandClasses();

function cardsForHandClass(handClass, rand) {
  const pair = handClass.match(/^([2-9TJQKA])\1$/);
  if (pair) {
    const suits = shuffle(rand, SUITS).slice(0, 2);
    return [`${pair[1]}${suits[0]}`, `${pair[1]}${suits[1]}`];
  }
  const match = handClass.match(/^([2-9TJQKA])([2-9TJQKA])([so])$/);
  if (!match) return ['A♠', 'K♦'];
  const [, a, b, suited] = match;
  const suits = shuffle(rand, SUITS);
  return suited === 's' ? [`${a}${suits[0]}`, `${b}${suits[0]}`] : [`${a}${suits[0]}`, `${b}${suits[1]}`];
}

function randomVillainCards(rand, excluded = []) {
  const deck = [];
  for (const rank of RANKS_DESC) for (const suit of SUITS) deck.push(`${rank}${suit}`);
  return shuffle(rand, deck.filter(card => !excluded.includes(card))).slice(0, 2);
}

function option(key, label, action, extra = {}) {
  return { key, label, action, ...extra };
}

function advancedGrade({ mix, ruleId, ruleName, explanation, rangeReference = null }) {
  return { mix, ruleId, ruleName, explanation, rangeReference };
}

function preferredKeys(mix) {
  const entries = Object.entries(mix || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];
  const top = entries[0][1];
  return entries.filter(([, frequency]) => frequency >= Math.max(0.2, top - 0.12)).map(([key]) => key);
}

const actionLabels = {
  raise: 'Raise', limp: 'Limp', fold: 'Fold', call: 'Call', threeBet: '3-bet', fourBet: '4-bet',
  check: 'Check', bet20: 'Bet 20% pot', bet25: 'Bet 25% pot', bet33: 'Bet 33% pot', bet50: 'Bet 50% pot',
  bet67: 'Bet 67% pot', bet75: 'Bet 75% pot', bet100: 'Bet pot', bet125: 'Bet 125% pot', bet150: 'Bet 150% pot',
  checkRaise: 'Check-raise', mdf50: '50%', mdf67: '67%', mdf75: '75%', bluff25: '25%', bluff33: '33%', bluff40: '40%', spr4: 'SPR ≈ 4', spr8: 'SPR ≈ 8', spr2: 'SPR ≈ 2',
};

function labelForAction(key) {
  return actionLabels[key] || key;
}

function openingDrill(seed) {
  const rand = mulberry32(hashString(`v2-opening:${seed}`));
  const position = choose(rand, ['UTG','HJ','CO','BTN','SB']);
  const handClass = choose(rand, ALL_HAND_CLASSES);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const decision = advancedOpeningDecision(position, handClass);
  const size = ADVANCED_OPEN_SIZES[position];
  const options = [option('fold', 'Fold', 'fold')];
  if (position === 'SB') options.push(option('limp', 'Complete to 1 BB (limp)', 'call', { sizeBb: 1 }));
  options.push(option('raise', `Raise to ${size} BB`, 'raise', { sizeBb: size }));

  return {
    key: `v2|drill|opening|${seed}`,
    id: `v2-opening-${seed}`,
    strategyVersion: ADVANCED_VERSION,
    mode: 'drill', category: 'opening', difficulty: 'Advanced',
    title: `${position} mixed opening decision`,
    concept: 'Use position-specific sizing and learn when a boundary hand mixes rather than forcing an always/never rule.',
    heroPosition: position,
    opponentPosition: position === 'SB' ? 'BB' : 'BB',
    heroCards, villainCards, handClass, opponentType: 'Unknown',
    steps: [{
      id: 'preflop', street: 'Preflop', board: [], potBb: 1.5,
      history: ['Everyone before you folds.'],
      prompt: `You are ${position} with ${handClass}. Advanced baseline: what do you do?`,
      options,
      grading: advancedGrade({
        mix: decision.mix,
        ruleId: 'opening', ruleName: 'Advanced opening mix',
        explanation: `${position} uses a ${size} BB open in v2. ${handClass} has this approximate solver-inspired mix: ${mixText(decision.mix)}.`,
        rangeReference: decision.rangeReference,
      }),
    }],
  };
}

function preflopResponseDrill(seed) {
  const rand = mulberry32(hashString(`v2-response:${seed}`));
  const spotId = choose(rand, Object.keys(ADVANCED_PREFLOP_SPOTS));
  const spot = ADVANCED_PREFLOP_SPOTS[spotId];
  const handClass = choose(rand, ALL_HAND_CLASSES);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const result = advancedPreflopResponse(spotId, handClass);
  const threeBetSize = spot.heroPosition === 'SB' ? 10.5 : spot.heroPosition === 'BB' ? (spot.openSizeBb === 2 ? 8 : 11) : 6.5;
  const callAmount = Math.max(0, spot.openSizeBb - (spot.heroPosition === 'BB' ? 1 : spot.heroPosition === 'SB' ? 0.5 : 0));

  return {
    key: `v2|drill|response|${seed}`,
    id: `v2-response-${seed}`,
    strategyVersion: ADVANCED_VERSION,
    mode: 'drill', category: 'facing-open', difficulty: 'Advanced',
    title: spot.label,
    concept: 'Realistic preflop ranges contain calls, aggressive reraises, folds, and mixed boundary hands.',
    heroPosition: spot.heroPosition, opponentPosition: spot.villainPosition,
    heroCards, villainCards, handClass, opponentType: 'Unknown',
    steps: [{
      id: 'preflop', street: 'Preflop', board: [], potBb: 1.5 + spot.openSizeBb,
      history: [`${spot.villainPosition} raises to ${spot.openSizeBb} BB.`, 'Action reaches you.'],
      prompt: `You are ${spot.heroPosition} with ${handClass} facing the ${spot.villainPosition} open.`,
      options: [
        option('fold', 'Fold', 'fold'),
        option('call', `Call${callAmount ? ` ${callAmount} BB more` : ''}`, 'call'),
        option('threeBet', `3-bet to ${threeBetSize} BB`, 'raise', { sizeBb: threeBetSize }),
      ],
      grading: advancedGrade({
        mix: result.mix, ruleId: 'facing-open', ruleName: 'Advanced response versus open',
        explanation: `${handClass} in this exact positional matchup mixes approximately: ${mixText(result.mix)}. Position, rake, and the opener’s range determine whether calling or 3-betting is attractive.`,
        rangeReference: result.rangeReference,
      }),
    }],
  };
}

function facingThreeBetDrill(seed) {
  const rand = mulberry32(hashString(`v2-facing3:${seed}`));
  const spotId = choose(rand, Object.keys(ADVANCED_FACING_3BET_SPOTS));
  const spot = ADVANCED_FACING_3BET_SPOTS[spotId];
  const handClass = choose(rand, ['AA','KK','QQ','JJ','TT','99','88','77','AKs','AKo','AQs','AQo','AJs','ATs','A5s','A4s','KQs','KJs','QJs','JTs']);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const result = advancedFacing3BetResponse(spotId, handClass);
  return {
    key: `v2|drill|threebet|${seed}`,
    id: `v2-facing3-${seed}`,
    strategyVersion: ADVANCED_VERSION,
    mode: 'drill', category: 'three-bet', difficulty: 'Advanced',
    title: spot.label,
    concept: 'Continue against 3-bets with a mixture of calls, value 4-bets, blocker bluffs, and disciplined folds.',
    heroPosition: spot.heroPosition, opponentPosition: spot.villainPosition,
    heroCards, villainCards, handClass, opponentType: 'Unknown',
    steps: [{
      id: 'preflop', street: 'Preflop', board: [], potBb: 14,
      history: [`You open from ${spot.heroPosition}.`, `${spot.villainPosition} 3-bets.`, 'Action returns to you.'],
      prompt: `You hold ${handClass}. How do you respond to the 3-bet?`,
      options: [
        option('fold', 'Fold', 'fold'),
        option('call', 'Call', 'call'),
        option('fourBet', '4-bet to about 22–24 BB', 'raise', { sizeBb: 23 }),
      ],
      grading: advancedGrade({
        mix: result.mix, ruleId: 'three-bet', ruleName: 'Advanced 3-bet defense',
        explanation: `${handClass} mixes approximately: ${mixText(result.mix)}. Advanced strategy protects calling ranges with strong hands while using selected suited-Ace blockers as 4-bet bluffs.`,
        rangeReference: result.rangeReference,
      }),
    }],
  };
}

const STATIC_DRILLS = [
  {
    id: 'range-advantage-small-cbet', category: 'flop', difficulty: 'Advanced',
    title: 'Range advantage: small c-bet', concept: 'A favorable high-card board supports a wide, small betting strategy.',
    heroPosition: 'BTN', opponentPosition: 'BB', heroCards: ['K♣','Q♦'], villainCards: ['9♥','8♥'], handClass: 'KQo', opponentType: 'Unknown',
    steps: [{
      id: 'flop', street: 'Flop', board: ['A♣','7♦','2♠'], potBb: 6,
      history: ['You open BTN to 2.5 BB.', 'BB calls.', 'BB checks the flop.'],
      prompt: 'You missed, but A-7-2 rainbow strongly favors the preflop raiser’s range.',
      options: [option('check','Check','check'), option('bet25','Bet 1.5 BB (25%)','bet'), option('bet75','Bet 4.5 BB (75%)','bet')],
      grading: advancedGrade({ mix: { bet25: 0.8, check: 0.2 }, ruleId:'range-advantage', ruleName:'Range advantage / small c-bet', explanation:'The Button retains many strong Ax hands while BB has many misses and medium hands. Bet small at high frequency; the large size is unnecessary with such a wide betting range.' }),
    }],
  },
  {
    id: 'connected-board-check', category: 'flop', difficulty: 'Advanced',
    title: 'Caller-friendly connected flop', concept: 'Low connected boards reduce the raiser’s range advantage and increase checking.',
    heroPosition: 'BTN', opponentPosition: 'BB', heroCards: ['A♣','Q♦'], villainCards: ['T♠','9♣'], handClass:'AQo', opponentType:'Unknown',
    steps: [{
      id:'flop', street:'Flop', board:['8♠','7♠','6♦'], potBb:6,
      history:['You open BTN to 2.5 BB.','BB calls and checks.'],
      prompt:'You have Ace-high with no meaningful draw on 8-7-6 two-tone.',
      options:[option('check','Check','check'),option('bet33','Bet 2 BB (33%)','bet'),option('bet75','Bet 4.5 BB (75%)','bet')],
      grading:advancedGrade({mix:{check:0.85,bet33:0.15},ruleId:'range-advantage',ruleName:'Caller-friendly board',explanation:'BB has many two-pair, straight, pair-plus-draw, and strong-draw combinations. The preflop raiser checks most of the range here.'}),
    }],
  },
  {
    id:'checkraise-combo-draw', category:'check-raise', difficulty:'Advanced',
    title:'Balanced check-raise with a combo draw', concept:'Strong draws can join value hands in a check-raising range.',
    heroPosition:'BB', opponentPosition:'BTN', heroCards:['9♠','8♠'], villainCards:['K♦','Q♣'], handClass:'98s', opponentType:'Unknown',
    steps:[{
      id:'flop',street:'Flop',board:['K♠','7♠','6♦'],potBb:8,
      history:['BTN opens 2.5 BB.','You call in BB.','You check.','BTN bets 2 BB (≈33%).'],
      prompt:'You have an open-ended straight draw plus a flush draw.',
      options:[option('fold','Fold','fold'),option('call','Call','call'),option('checkRaise','Check-raise to 8 BB','raise')],
      grading:advancedGrade({mix:{checkRaise:0.55,call:0.45},ruleId:'check-raises',ruleName:'Combo-draw check-raise',explanation:'This hand has enough equity to continue and enough future strength to support aggression. Raising builds a balanced semi-bluff range; calling remains a meaningful mix.'}),
    }],
  },
  {
    id:'delayed-cbet-scare-card', category:'turn', difficulty:'Advanced',
    title:'Delayed c-bet on a range-favoring turn', concept:'After checking back the flop, some turn cards improve the aggressor’s range more than the caller’s.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['K♣','J♣'], villainCards:['9♦','8♦'], handClass:'KJs', opponentType:'Unknown',
    steps:[{
      id:'turn',street:'Turn',board:['Q♣','7♦','2♠','A♥'],potBb:6,
      history:['You open BTN; BB calls.','Flop Q-7-2 rainbow checks through.','BB checks the A♥ turn.'],
      prompt:'The Ace is a strong card for the Button’s opening range. You still have only King-high.',
      options:[option('check','Check','check'),option('bet33','Bet 2 BB (33%)','bet'),option('bet75','Bet 4.5 BB (75%)','bet')],
      grading:advancedGrade({mix:{bet75:0.6,check:0.4},ruleId:'turns',ruleName:'Delayed c-bet / scare card',explanation:'The Ace shifts nut and range advantage toward the Button. A larger delayed c-bet can represent strong Ax while pressuring BB’s Qx and middle pairs; checking remains a meaningful mix.'}),
    }],
  },
  {
    id:'river-mdf-pot', category:'math', difficulty:'Advanced',
    title:'Minimum defense frequency versus pot', concept:'Use MDF as a benchmark for range defense, not as an automatic hand-by-hand calling command.',
    heroPosition:'BB', opponentPosition:'BTN', heroCards:['Q♣','J♦'], villainCards:['A♠','5♠'], handClass:'QJo', opponentType:'Unknown',
    steps:[{
      id:'river',street:'River',board:['Q♠','9♥','4♣','2♦','2♣'],potBb:20,
      history:['BTN bets 20 BB into a 20 BB river pot.'],
      prompt:'What is the theoretical minimum defense frequency against a pot-sized bet?',
      options:[option('mdf75','75%','check'),option('mdf67','67%','check'),option('mdf50','50%','check')],
      grading:advancedGrade({mix:{mdf50:1},ruleId:'river',ruleName:'MDF benchmark',explanation:`MDF = 1 / (1 + bet fraction). Against a pot-sized bet: 1 / (1 + 1) = ${Math.round(minimumDefenseFrequency(1)*100)}%. This does not mean this exact QJ must call; blockers and range composition still matter.`}),
    }],
  },
  {
    id:'river-bluff-ratio-pot', category:'math', difficulty:'Advanced',
    title:'Balanced river bluff ratio', concept:'Bet size determines the theoretically balanced fraction of bluffs among river bets.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♠','5♠'], villainCards:['Q♦','J♣'], handClass:'A5s', opponentType:'Unknown',
    steps:[{
      id:'river',street:'River',board:['K♣','9♦','4♠','2♥','2♣'],potBb:20,
      history:['Action reaches the river.','You are considering a pot-sized polarized bet.'],
      prompt:'Approximately what fraction of a balanced pot-sized river betting range can be bluffs?',
      options:[option('bluff25','25%','check'),option('bluff33','33%','check'),option('bluff40','40%','check')],
      grading:advancedGrade({mix:{bluff33:1},ruleId:'river',ruleName:'River value-to-bluff ratio',explanation:`A pot-sized bet gives the caller 33% pot odds, so a balanced river betting range contains about ${Math.round(riverBluffFraction(1)*100)}% bluffs and 67% value.`}),
    }],
  },
  {
    id:'river-blocker-bluff', category:'river', difficulty:'Advanced',
    title:'Choose a bluff with useful blockers', concept:'Good river bluffs often remove strong calls from the opponent’s range while having little showdown value.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♠','5♠'], villainCards:['K♥','T♥'], handClass:'A5s', opponentType:'Unknown',
    steps:[{
      id:'river',street:'River',board:['K♣','Q♦','8♠','4♣','2♥'],potBb:24,
      history:['You bet flop and turn with a draw-heavy hand.','BB calls twice and checks river.','Your draw misses.'],
      prompt:'A♠5♠ has almost no showdown value, but the Ace blocks some of BB’s strongest Kx/Ax continues.',
      options:[option('check','Check','check'),option('bet75','Bet 18 BB (75%)','bet'),option('bet125','Bet 30 BB (125%)','bet')],
      grading:advancedGrade({mix:{bet125:0.6,check:0.4},ruleId:'river',ruleName:'Polarized blocker bluff',explanation:'When choosing a large river bluff, prefer hands with little showdown value that block strong calls. The overbet is polarized: strong value plus carefully selected bluffs. Checking remains a legitimate mix.'}),
    }],
  },
  {
    id:'multiway-cbet-reduction', category:'multiway', difficulty:'Advanced',
    title:'Multiway: reduce c-bet frequency', concept:'Even favorable boards are bet less often when a bluff must get through multiple players.',
    heroPosition:'UTG', opponentPosition:'BTN + BB', heroCards:['A♣','K♦'], villainCards:['A♥','J♥'], handClass:'AKo', opponentType:'Unknown',
    steps:[{
      id:'flop',street:'Flop',board:['A♠','7♦','2♣'],potBb:7,
      history:['You open UTG to 2 BB.','BTN calls.','BB calls.','BB checks.'],
      prompt:'You have top pair/top kicker three ways on a dry Ace-high flop.',
      options:[option('check','Check','check'),option('bet33','Bet ≈33% pot','bet'),option('bet75','Bet ≈75% pot','bet')],
      grading:advancedGrade({mix:{bet33:0.55,check:0.45},ruleId:'multiway',ruleName:'Multiway c-bet reduction',explanation:'Your hand is strong, but betting frequency falls multiway because two ranges can continue. A small value/protection bet and a check are both common; a large range bet is less attractive.'}),
    }],
  },
  {
    id:'spr-quiz', category:'spr', difficulty:'Advanced',
    title:'Stack-to-pot ratio', concept:'SPR helps measure how many pot-sized bets remain and how committed strong one-pair hands can become.',
    heroPosition:'SB', opponentPosition:'BTN', heroCards:['A♣','A♦'], villainCards:['K♠','K♥'], handClass:'AA', opponentType:'Unknown',
    steps:[{
      id:'flop',street:'Flop',board:['J♣','7♦','3♠'],potBb:22,
      history:['You 3-bet preflop.','BTN calls.','About 88 BB remains effective.'],
      prompt:'Effective stack is about 88 BB and the pot is 22 BB. What is the SPR?',
      options:[option('spr2','SPR ≈ 2','check'),option('spr4','SPR ≈ 4','check'),option('spr8','SPR ≈ 8','check')],
      grading:advancedGrade({mix:{spr4:1},ruleId:'bet-sizing',ruleName:'SPR',explanation:`SPR = effective stack / pot = 88 / 22 = ${stackToPotRatio(88,22).toFixed(1)}. At SPR ≈ 4, overpairs are substantially more willing to play a large pot than in a single-raised pot with a much higher SPR.`}),
    }],
  },
];

const ADVANCED_HANDS = [
  {
    id:'btn-bb-range-advantage-line', category:'flop', difficulty:'Advanced', title:'BTN vs BB: range advantage into polarization',
    concept:'Start with a high-frequency small flop bet, then become more selective and larger on later streets.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♣','Q♣'], villainCards:['A♥','9♥'], handClass:'AQs', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['A♦','7♣','2♠'],potBb:6,history:['You open BTN to 2.5 BB.','BB calls and checks.'],prompt:'Top pair/good kicker on a dry Ace-high flop.',options:[option('check','Check','check'),option('bet25','Bet 1.5 BB (25%)','bet'),option('bet75','Bet 4.5 BB (75%)','bet')],grading:advancedGrade({mix:{bet25:0.75,check:0.25},ruleId:'range-advantage',ruleName:'Wide small c-bet',explanation:'BTN has a strong range advantage and can bet many hands small. AQ is happy to participate in that wide betting range.'})},
      {id:'turn',street:'Turn',board:['A♦','7♣','2♠','9♦'],potBb:9,history:['BB calls the small flop bet.','Turn is 9♦.','BB checks.'],prompt:'The caller’s range strengthened somewhat; you still have strong top pair.',options:[option('check','Check','check'),option('bet50','Bet 50% pot','bet'),option('bet75','Bet 75% pot','bet')],grading:advancedGrade({mix:{bet75:0.55,check:0.25,bet50:0.2},ruleId:'turns',ruleName:'Selective turn barrel',explanation:'After BB calls flop, your betting range narrows. Strong Ax can keep betting for value at a larger size, but checking some top pair protects the check-back range.'})},
      {id:'river',street:'River',board:['A♦','7♣','2♠','9♦','3♣'],potBb:22.5,history:['BB calls turn and checks river.'],prompt:'Blank river. AQ can still be called by worse Ax.',options:[option('check','Check','check'),option('bet50','Bet 50% pot','bet'),option('bet100','Bet pot','bet')],grading:advancedGrade({mix:{bet50:0.65,check:0.35},ruleId:'river',ruleName:'Thin/medium river value',explanation:'AQ is strong enough for value, but not a natural pot-sized polarized hand. Medium sizing targets worse Ax; checking some frequency avoids over-value-betting.'})},
    ],
  },
  {
    id:'wet-board-delayed-line', category:'turn', difficulty:'Advanced', title:'Check wet flop, attack favorable turn',
    concept:'A flop check does not end aggression; later cards can change range advantage.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♣','J♦'], villainCards:['9♠','8♣'], handClass:'AJo', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['8♠','7♠','6♦'],potBb:6,history:['You open BTN to 2.5 BB.','BB calls and checks.'],prompt:'Ace-high, no strong draw, on a caller-friendly connected flop.',options:[option('check','Check','check'),option('bet33','Bet 33%','bet'),option('bet75','Bet 75%','bet')],grading:advancedGrade({mix:{check:0.9,bet33:0.1},ruleId:'range-advantage',ruleName:'Connected-board check',explanation:'The board smashes BB’s defending range. Preserve equity and avoid forcing a bluff into a range with many strong continues.'})},
      {id:'turn',street:'Turn',board:['8♠','7♠','6♦','K♣'],potBb:6,history:['Flop checks through.','BB checks the K♣ turn.'],prompt:'The King is better for your uncapped Button range than for many BB flop checks.',options:[option('check','Check','check'),option('bet33','Bet 33%','bet'),option('bet75','Bet 75%','bet')],grading:advancedGrade({mix:{bet75:0.6,check:0.4},ruleId:'turns',ruleName:'Delayed c-bet',explanation:'The King is a credible range-improving card for BTN. A more polarized delayed bet pressures one-pair and draw-heavy BB hands.'})},
    ],
  },
  {
    id:'bb-checkraise-runout', category:'check-raise', difficulty:'Advanced', title:'BB check-raise semi-bluff into value',
    concept:'Use a powerful draw aggressively, then transition naturally to value when it improves.',
    heroPosition:'BB', opponentPosition:'BTN', heroCards:['9♠','8♠'], villainCards:['K♦','Q♣'], handClass:'98s', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['K♠','7♠','6♦'],potBb:8,history:['BTN opens 2.5 BB.','You call BB.','You check.','BTN bets 2 BB.'],prompt:'Open-ended straight draw plus flush draw.',options:[option('call','Call','call'),option('checkRaise','Check-raise','raise'),option('fold','Fold','fold')],grading:advancedGrade({mix:{checkRaise:0.55,call:0.45},ruleId:'check-raises',ruleName:'Balanced semi-bluff check-raise',explanation:'Both call and raise retain high EV. Raising uses your strongest draws to balance value check-raises.'})},
      {id:'turn',street:'Turn',board:['K♠','7♠','6♦','T♥'],potBb:22,history:['BTN calls the check-raise.','Turn T♥ completes your straight.'],prompt:'You now have a strong made hand after taking an aggressive flop line.',options:[option('check','Check','check'),option('bet67','Bet 67% pot','bet'),option('bet125','Bet 125% pot','bet')],grading:advancedGrade({mix:{bet67:0.65,bet125:0.2,check:0.15},ruleId:'turns',ruleName:'Value after semi-bluff improves',explanation:'You have a high-value hand and can keep building the pot. Medium-large betting dominates; some overbets and traps can mix depending on range composition.'})},
    ],
  },
  {
    id:'sb-3bet-pot-small-cbet', category:'flop', difficulty:'Advanced', title:'3-bet pot: low SPR, tiny c-bet',
    concept:'3-bet pots often use very small flop bets because ranges are stronger and the SPR is already low.',
    heroPosition:'SB', opponentPosition:'BTN', heroCards:['A♠','K♦'], villainCards:['Q♠','Q♥'], handClass:'AKo', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['A♣','8♦','3♠'],potBb:22,history:['BTN opens 2.5 BB.','You 3-bet SB to 10.5 BB.','BTN calls.'],prompt:'Top pair/top kicker in a 3-bet pot.',options:[option('check','Check','check'),option('bet20','Bet 4.5 BB (≈20%)','bet'),option('bet75','Bet ≈75%','bet')],grading:advancedGrade({mix:{bet20:0.75,check:0.25},ruleId:'bet-sizing',ruleName:'3-bet-pot small c-bet',explanation:'The pot is already large relative to stacks and SB retains a strong range. A tiny bet can pressure BTN’s broad range without bloating the pot immediately.'})},
      {id:'turn',street:'Turn',board:['A♣','8♦','3♠','5♣'],potBb:31,history:['BTN calls the small flop bet.'],prompt:'A low turn adds some draws but your hand remains strong.',options:[option('check','Check','check'),option('bet50','Bet 50%','bet'),option('bet100','Bet pot','bet')],grading:advancedGrade({mix:{bet50:0.6,check:0.4},ruleId:'turns',ruleName:'Low-SPR turn value',explanation:'At lower SPR, top pair/top kicker is comfortable building the pot, but checking some frequency protects your checking range.'})},
    ],
  },
  {
    id:'river-polarized-bluffcatch', category:'river', difficulty:'Advanced', title:'River bluff-catcher versus polarization',
    concept:'Use pot odds, blockers, and the opponent’s value/bluff construction rather than a blanket “one pair = fold” rule.',
    heroPosition:'BB', opponentPosition:'BTN', heroCards:['K♣','Q♣'], villainCards:['A♠','5♠'], handClass:'KQs', opponentType:'Unknown',
    steps:[
      {id:'river',street:'River',board:['K♦','9♠','4♠','2♣','2♥'],potBb:24,history:['You check-call flop and turn.','River bricks.','You check.','BTN bets 24 BB (pot).'],prompt:'You have top pair with a good kicker. BTN’s pot bet is polarized.',options:[option('fold','Fold','fold'),option('call','Call','call')],grading:advancedGrade({mix:{call:0.55,fold:0.45},ruleId:'river',ruleName:'Bluff-catching with pot odds',explanation:'A pot-sized bet requires 33% equity to call. KQ is high in your bluff-catching region and does not block the missed spade bluffs, so calling can be frequent. This is a mixed decision, not an automatic one-pair fold.'})},
    ],
  },
  {
    id:'multiway-value-protection', category:'multiway', difficulty:'Advanced', title:'Multiway top pair: bet less, stay strong',
    concept:'Multiway strategy lowers bluff frequency and also checks strong hands often enough to protect checks.',
    heroPosition:'UTG', opponentPosition:'BTN + BB', heroCards:['A♣','K♣'], villainCards:['A♥','Q♥'], handClass:'AKs', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['A♦','7♠','2♣'],potBb:7,history:['You open UTG to 2 BB.','BTN calls.','BB calls.','BB checks.'],prompt:'Top pair/top kicker in a three-way pot.',options:[option('check','Check','check'),option('bet33','Bet 33%','bet'),option('bet75','Bet 75%','bet')],grading:advancedGrade({mix:{bet33:0.55,check:0.45},ruleId:'multiway',ruleName:'Multiway value/check mix',explanation:'AK is strong enough to value bet, but multiway equilibrium checks more because multiple defenders share the burden of continuing. Small bet and check both make sense.'})},
      {id:'turn',street:'Turn',board:['A♦','7♠','2♣','Q♦'],potBb:11.5,history:['BTN calls the small flop bet.','BB folds.','Turn Q♦.'],prompt:'Heads-up now; the Queen improves some calling hands and creates more two-pair combinations.',options:[option('check','Check','check'),option('bet50','Bet 50%','bet'),option('bet100','Bet pot','bet')],grading:advancedGrade({mix:{check:0.55,bet50:0.45},ruleId:'turns',ruleName:'Turn range interaction',explanation:'The Queen is not a pure barrel card. Checking controls the pot and protects checks; a medium value bet remains legitimate against weaker Ax and draws.'})},
    ],
  },
];

export const ADVANCED_CATEGORY_META = [
  { id:'opening', label:'Advanced opening ranges', description:'Position-specific sizes and mixed boundary hands.' },
  { id:'facing-open', label:'Facing opens', description:'Cold-calls, 3-bets, traps, and blocker bluffs by exact position.' },
  { id:'three-bet', label:'Facing 3-bets', description:'Calls, value 4-bets, blocker 4-bets, and folds.' },
  { id:'flop', label:'Flop range strategy', description:'Range advantage, nut advantage, board texture, and sizing.' },
  { id:'check-raise', label:'Check-raises', description:'Balanced value and semi-bluff check-raising.' },
  { id:'turn', label:'Turn strategy', description:'Delayed c-bets, scare cards, barrels, and overbets.' },
  { id:'river', label:'River strategy', description:'Polarization, blockers, bluff-catching, and value.' },
  { id:'math', label:'Advanced poker math', description:'MDF and balanced river bluff ratios.' },
  { id:'spr', label:'Stack-to-pot ratio', description:'How SPR changes commitment and sizing.' },
  { id:'multiway', label:'Multiway strategy', description:'Lower betting frequencies and shared defense.' },
];

function staticDrill(id) {
  const base = STATIC_DRILLS.find(drill => drill.id === id);
  if (!base) return null;
  return { key:`v2|drill|static|${base.id}`, strategyVersion:ADVANCED_VERSION, mode:'drill', ...base };
}

function advancedHand(id) {
  const base = ADVANCED_HANDS.find(hand => hand.id === id);
  if (!base) return null;
  return { key:`v2|hand|${base.id}`, strategyVersion:ADVANCED_VERSION, mode:'hand', ...base };
}

function generatedDrill(kind, seed) {
  if (kind === 'opening') return openingDrill(seed);
  if (kind === 'response') return preflopResponseDrill(seed);
  if (kind === 'threebet') return facingThreeBetDrill(seed);
  return null;
}

export function listAdvancedHands() {
  return ADVANCED_HANDS.map(({id,title,category,difficulty,concept}) => ({id,title,category,difficulty,concept}));
}

export function advancedRulebookPayload() {
  return {
    version: ADVANCED_VERSION,
    label: 'Advanced / GTO-like v2',
    disclaimer: 'Solver-inspired rounded frequencies for learning. Exact GTO varies with rake, stack depth, sizing tree, and opponent ranges.',
    sections: ADVANCED_RULEBOOK_SECTIONS,
    glossary: ADVANCED_GLOSSARY.map(([term, definition]) => ({term, definition})),
    ranges: {
      opening: Object.fromEntries(Object.entries(ADVANCED_OPENING_TIERS).map(([position, tiers]) => [position, tiers.map(tier => `${tier.spec.join(', ')} → ${mixText(tier.mix)}`)])),
      openingSizes: ADVANCED_OPEN_SIZES,
      preflopSpots: Object.fromEntries(Object.entries(ADVANCED_PREFLOP_SPOTS).map(([id, spot]) => [id, spot.references])),
    },
    grading: [
      { label:'Perfect', meaning:'The most frequent or near-pure v2 action.' },
      { label:'Correct', meaning:'A meaningful mixed action used at substantial frequency.' },
      { label:'Minor Mistake', meaning:'An action used only at low frequency.' },
      { label:'Major Mistake', meaning:'An action essentially absent from the v2 strategy.' },
    ],
  };
}

export function generateAdvancedScenario({ mode='drill', focus='all', seed=Date.now() } = {}) {
  const numericSeed = Number.isFinite(Number(seed)) ? Number(seed) : hashString(seed);
  const rand = mulberry32(hashString(`v2-select:${numericSeed}:${mode}:${focus}`));

  if (mode === 'hand') {
    const eligible = focus && focus !== 'all' ? ADVANCED_HANDS.filter(hand => hand.category === focus) : ADVANCED_HANDS;
    const pool = eligible.length ? eligible : ADVANCED_HANDS;
    return advancedHand(choose(rand, pool).id);
  }

  if (focus === 'opening') return openingDrill(numericSeed);
  if (focus === 'facing-open') return preflopResponseDrill(numericSeed);
  if (focus === 'three-bet') return facingThreeBetDrill(numericSeed);

  const staticPool = focus && focus !== 'all' ? STATIC_DRILLS.filter(drill => drill.category === focus) : STATIC_DRILLS;
  if (staticPool.length && focus !== 'all') return staticDrill(choose(rand, staticPool).id);

  const choices = ['opening','response','threebet','static','static','static'];
  const kind = choose(rand, choices);
  if (kind === 'opening') return openingDrill(numericSeed);
  if (kind === 'response') return preflopResponseDrill(numericSeed);
  if (kind === 'threebet') return facingThreeBetDrill(numericSeed);
  return staticDrill(choose(rand, STATIC_DRILLS).id);
}

export function resolveAdvancedScenario(key) {
  const value = String(key || '');
  if (value.startsWith('v2|hand|')) return advancedHand(value.split('|')[2]);
  const parts = value.split('|');
  if (parts[0] !== 'v2' || parts[1] !== 'drill') return null;
  if (parts[2] === 'static') return staticDrill(parts[3]);
  if (parts[2] === 'opening') return generatedDrill('opening', Number(parts[3]));
  if (parts[2] === 'response') return generatedDrill('response', Number(parts[3]));
  if (parts[2] === 'threebet') return generatedDrill('threebet', Number(parts[3]));
  return null;
}

export function publicAdvancedScenario(scenario) {
  if (!scenario) return null;
  const { villainCards, steps, ...safe } = scenario;
  return {
    ...safe,
    steps: steps.map(({grading, ...step}) => step),
    stepCount: steps.length,
  };
}

export function gradeAdvancedScenario(scenario, decisions = []) {
  if (!scenario) throw new Error('Unknown advanced scenario');
  const byStep = new Map(decisions.map(decision => [decision.stepId, decision.optionKey]));
  const reports = [];

  for (const step of scenario.steps) {
    const optionKey = byStep.get(step.id);
    if (!optionKey) continue;
    const chosen = step.options.find(item => item.key === optionKey);
    const scored = scoreMixedAction(step.grading.mix, optionKey);
    const preferred = preferredKeys(step.grading.mix).map(key => step.options.find(item => item.key === key)?.label || labelForAction(key));
    reports.push({
      stepId: step.id,
      street: step.street,
      chosenKey: optionKey,
      chosenLabel: chosen?.label || labelForAction(optionKey),
      score: scored.score,
      grade: advancedGradeLabel(scored.score),
      preferred,
      chosenFrequency: scored.frequency,
      mix: step.grading.mix,
      mixText: mixText(step.grading.mix),
      ruleId: step.grading.ruleId,
      ruleName: step.grading.ruleName,
      explanation: `${step.grading.explanation} Approximate v2 mix: ${mixText(step.grading.mix)}.`,
      rangeReference: step.grading.rangeReference || null,
    });
  }

  const average = reports.length ? reports.reduce((sum, report) => sum + report.score, 0) / reports.length : 0;
  const firstMistake = reports.find(report => report.score < 0.75) || null;
  const firstMajorMistake = reports.find(report => report.score < 0.4) || null;
  return {
    scenarioKey: scenario.key,
    strategyVersion: ADVANCED_VERSION,
    title: scenario.title,
    category: scenario.category,
    overallScore: average,
    overallGrade: advancedGradeLabel(average),
    reports,
    firstMistake,
    firstMajorMistake,
    reveal: {
      heroCards: scenario.heroCards,
      villainCards: scenario.villainCards,
      opponentPosition: scenario.opponentPosition,
      note: 'Hidden cards are revealed only after grading and never change the correct strategy. v2 grades against rounded mixed frequencies, not the result of the hand.',
    },
  };
}
