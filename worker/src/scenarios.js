import {
  POSITIONS,
  OPENING_RANGE_SPECS,
  openingDecision,
  facingOpenDecision,
  bigBlindDefenseDecision,
  facingThreeBetDecision,
  isInRange,
  potOddsRequired,
  gradeLabel,
} from './rules.js';

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
  for (const r of RANKS_DESC) for (const s of SUITS) deck.push(`${r}${s}`);
  const available = shuffle(rand, deck.filter(c => !excluded.includes(c)));
  return available.slice(0, 2);
}

function actionOption(key, label, action, extra = {}) {
  return { key, label, action, ...extra };
}

function gradeSpec({ preferred, acceptable = [], minor = [], ruleId, ruleName, explanation, whyOthers = {} }) {
  return { preferred, acceptable, minor, ruleId, ruleName, explanation, whyOthers };
}

function decisionScore(step, optionKey) {
  const spec = step.grading;
  if (spec.preferred.includes(optionKey)) return 1;
  if (spec.acceptable.includes(optionKey)) return 0.8;
  if (spec.minor.includes(optionKey)) return 0.45;
  return 0;
}

function openingDrill(seed) {
  const rand = mulberry32(hashString(`opening:${seed}`));
  const position = choose(rand, ['UTG','HJ','CO','BTN','SB']);
  const handClass = choose(rand, ALL_HAND_CLASSES);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const decision = openingDecision(position, handClass);
  const raisePreferred = decision.action === 'raise';
  const preferred = raisePreferred ? ['raise3'] : ['fold'];
  const minor = raisePreferred ? ['raise2','raise4'] : [];

  return {
    key: `drill|opening|${seed}`,
    id: `opening-${seed}`,
    mode: 'drill',
    category: 'opening',
    difficulty: position === 'BTN' || position === 'CO' ? 'Beginner' : 'Beginner',
    title: `${position} unopened-pot decision`,
    concept: 'Raise or fold using the exact Version 1.0 opening range.',
    heroPosition: position,
    opponentPosition: 'BB',
    heroCards,
    villainCards,
    handClass,
    opponentType: 'Unknown',
    steps: [{
      id: 'preflop', street: 'Preflop', board: [], potBb: 1.5,
      history: ['Everyone before you folds.'],
      prompt: `You are ${position} with ${handClass}. What do you do?`,
      options: [
        actionOption('fold', 'Fold', 'fold'),
        actionOption('limp', 'Call 1 BB (limp)', 'call'),
        actionOption('raise2', 'Raise to 2 BB', 'raise', { sizeBb: 2 }),
        actionOption('raise3', 'Raise to 3 BB', 'raise', { sizeBb: 3 }),
        actionOption('raise4', 'Raise to 4 BB', 'raise', { sizeBb: 4 }),
      ],
      grading: gradeSpec({
        preferred,
        minor,
        ruleId: 'opening',
        ruleName: 'Opening range / never limp',
        explanation: decision.reason,
        whyOthers: { limp: 'Version 1.0 never open-limps. When first into the pot, raise or fold.' },
      }),
    }],
  };
}

function facingOpenDrill(seed) {
  const rand = mulberry32(hashString(`facing-open:${seed}`));
  const openerPosition = choose(rand, ['UTG','HJ','CO','BTN']);
  const possibleHero = openerPosition === 'UTG' ? ['HJ','CO','BTN','SB','BB']
    : openerPosition === 'HJ' ? ['CO','BTN','SB','BB']
      : openerPosition === 'CO' ? ['BTN','SB','BB'] : ['SB','BB'];
  const heroPosition = choose(rand, possibleHero);
  const handClass = choose(rand, ALL_HAND_CLASSES);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const decision = facingOpenDecision(openerPosition, heroPosition, handClass);
  const inPosition = ['HJ','CO','BTN'].includes(heroPosition);
  const raiseKey = inPosition ? 'raise9' : 'raise12';
  const otherRaise = inPosition ? 'raise12' : 'raise9';
  const preferred = decision.action === 'raise' ? [raiseKey] : decision.action === 'call' ? ['call'] : ['fold'];
  const acceptable = decision.action === 'raise' ? [] : [];
  const minor = decision.action === 'raise' ? [otherRaise] : [];

  return {
    key: `drill|facing-open|${seed}`,
    id: `facing-open-${seed}`,
    mode: 'drill', category: heroPosition === 'BB' ? 'bb-defense' : 'facing-open', difficulty: 'Intermediate',
    title: `${heroPosition} facing a ${openerPosition} open`,
    concept: 'Respond to a raise based on the opener’s position and your position.',
    heroPosition, opponentPosition: openerPosition, heroCards, villainCards, handClass, opponentType: 'Unknown',
    steps: [{
      id: 'preflop', street: 'Preflop', board: [], potBb: 4.5,
      history: [`${openerPosition} raises to 3 BB.`, 'Action folds to you.'],
      prompt: `${openerPosition} opened to 3 BB. You are ${heroPosition} with ${handClass}.`,
      options: [
        actionOption('fold', 'Fold', 'fold'),
        actionOption('call', heroPosition === 'BB' ? 'Call 2 BB more' : 'Call 3 BB', 'call'),
        actionOption('raise9', '3-bet to 9 BB', 'raise', { sizeBb: 9 }),
        actionOption('raise12', '3-bet to 12 BB', 'raise', { sizeBb: 12 }),
      ],
      grading: gradeSpec({
        preferred, acceptable, minor,
        ruleId: heroPosition === 'BB' ? 'bb-defense' : 'facing-open',
        ruleName: heroPosition === 'BB' ? 'Big Blind defense' : 'Facing an open raise',
        explanation: decision.action === 'raise'
          ? `${handClass} belongs in the Version 1.0 re-raise range here. ${inPosition ? 'In position, use about 3× the open (9 BB).' : 'Out of position, use about 4× the open (12 BB).'}`
          : decision.action === 'call'
            ? `${handClass} is strong enough to continue but is not in the default value 3-bet range for this situation. Call.`
            : `${handClass} is outside the Version 1.0 continuing range against this ${openerPosition} raise. Fold.`,
      }),
    }],
  };
}

function bbDefenseDrill(seed) {
  const rand = mulberry32(hashString(`bb:${seed}`));
  const openerPosition = choose(rand, ['UTG','HJ','CO','BTN']);
  const handClass = choose(rand, ALL_HAND_CLASSES);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const decision = bigBlindDefenseDecision(openerPosition, handClass);
  const preferred = decision.action === 'raise' ? ['raise12'] : decision.action === 'call' ? ['call'] : ['fold'];
  return {
    key: `drill|bb-defense|${seed}`,
    id: `bb-defense-${seed}`,
    mode: 'drill', category: 'bb-defense', difficulty: 'Intermediate',
    title: `Big Blind versus ${openerPosition}`,
    concept: 'Defend wider from the Big Blind because you already have 1 BB invested.',
    heroPosition: 'BB', opponentPosition: openerPosition, heroCards, villainCards, handClass, opponentType: 'Unknown',
    steps: [{
      id: 'preflop', street: 'Preflop', board: [], potBb: 4.5,
      history: [`${openerPosition} raises to 3 BB.`, 'Everyone else folds.', 'You already have 1 BB posted.'],
      prompt: `Defend the Big Blind with ${handClass}.`,
      options: [
        actionOption('fold','Fold','fold'),
        actionOption('call','Call 2 BB more','call'),
        actionOption('raise12','3-bet to 12 BB','raise',{ sizeBb: 12 }),
      ],
      grading: gradeSpec({
        preferred,
        ruleId: 'bb-defense', ruleName: 'Big Blind defense',
        explanation: decision.action === 'call'
          ? `${handClass} is in the Version 1.0 Big Blind continuing range versus ${openerPosition}. The blind already invested improves your pot odds, so call.`
          : decision.action === 'raise'
            ? `${handClass} is strong enough to 3-bet for value against this opening position. Because you are out of position, use about 4× the open.`
            : `${handClass} is still too weak to defend against this ${openerPosition} opening range. Fold despite having 1 BB invested.`,
      }),
    }],
  };
}

function facingThreeBetDrill(seed) {
  const rand = mulberry32(hashString(`3bet:${seed}`));
  const candidates = ['AA','KK','QQ','JJ','TT','99','88','AKs','AKo','AQs','AQo','AJs','KQs','KJs','QJs','ATs','AJo'];
  const handClass = choose(rand, candidates);
  const heroPosition = choose(rand, ['HJ','CO','BTN']);
  const villainPosition = choose(rand, heroPosition === 'BTN' ? ['SB','BB'] : ['BTN','SB','BB']);
  const inPosition = villainPosition === 'BB' || villainPosition === 'SB' ? heroPosition === 'BTN' : false;
  const villainLatePosition = ['BTN','SB','BB'].includes(villainPosition);
  const decision = facingThreeBetDecision(handClass, { inPosition, villainLatePosition });
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const preferred = decision.action === 'raise' ? ['fourbet'] : decision.action === 'call' ? ['call'] : ['fold'];
  return {
    key: `drill|three-bet|${seed}`,
    id: `three-bet-${seed}`,
    mode: 'drill', category: 'three-bet', difficulty: 'Intermediate',
    title: `Facing a 3-bet with ${handClass}`,
    concept: 'Know which strong hands continue after your open is re-raised.',
    heroPosition, opponentPosition: villainPosition, heroCards, villainCards, handClass, opponentType: 'Unknown',
    steps: [{
      id: 'preflop', street: 'Preflop', board: [], potBb: 14.5,
      history: [`You raise from ${heroPosition} to 3 BB.`, `${villainPosition} 3-bets to 10 BB.`, 'Action returns to you.'],
      prompt: `You opened ${handClass} and now face a 3-bet to 10 BB.`,
      options: [
        actionOption('fold','Fold','fold'),
        actionOption('call','Call 7 BB','call'),
        actionOption('fourbet','4-bet to 24 BB','raise',{ sizeBb: 24 }),
      ],
      grading: gradeSpec({
        preferred,
        acceptable: ['QQ','AKs','AKo'].includes(handClass) && decision.action === 'raise' ? ['call'] : [],
        ruleId: 'three-bet', ruleName: 'Facing a 3-bet',
        explanation: decision.action === 'raise'
          ? `${handClass} is in the value-heavy Version 1.0 4-bet group. Continue aggressively.`
          : decision.action === 'call'
            ? `${handClass} is strong enough to continue against a normal-sized 3-bet in this context, but does not need to turn into a 4-bet.`
            : `${handClass} is not strong enough to continue comfortably against this 3-bet under the conservative Version 1.0 rules. Fold.`,
      }),
    }],
  };
}

function isolationDrill(seed) {
  const rand = mulberry32(hashString(`limper:${seed}`));
  const heroPosition = choose(rand, ['HJ','CO','BTN','SB']);
  const handClass = choose(rand, ALL_HAND_CLASSES);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const normalOpen = isInRange(handClass, OPENING_RANGE_SPECS[heroPosition]);
  const inPosition = heroPosition !== 'SB';
  const preferredRaise = inPosition ? 'raise4' : 'raise5';
  return {
    key: `drill|limpers|${seed}`,
    id: `limpers-${seed}`,
    mode: 'drill', category: 'limpers', difficulty: 'Beginner',
    title: `${heroPosition} versus one limper`,
    concept: 'Version 1.0 raises or folds over limpers; it does not limp behind by default.',
    heroPosition, opponentPosition: 'UTG', heroCards, villainCards, handClass, opponentType: 'Calls too much',
    steps: [{
      id:'preflop', street:'Preflop', board:[], potBb:2.5,
      history:['UTG calls 1 BB (limps).','Action folds to you.'],
      prompt:`One player limps. You have ${handClass} in ${heroPosition}.`,
      options:[
        actionOption('fold','Fold','fold'),
        actionOption('limp','Call 1 BB','call'),
        actionOption('raise4','Raise to 4 BB','raise',{sizeBb:4}),
        actionOption('raise5','Raise to 5 BB','raise',{sizeBb:5}),
      ],
      grading: gradeSpec({
        preferred: normalOpen ? [preferredRaise] : ['fold'],
        minor: normalOpen ? [inPosition ? 'raise5' : 'raise4'] : [],
        ruleId:'limpers', ruleName:'Isolation raise',
        explanation: normalOpen
          ? `${handClass} is inside your normal ${heroPosition} opening range, so isolate the limper. ${inPosition ? 'You are in position: use about 4 BB.' : 'You are out of position: use about 5 BB.'}`
          : `${handClass} is outside the normal ${heroPosition} opening range. Version 1.0 does not limp behind with it; fold.`,
        whyOthers:{limp:'Version 1.0 uses raise-or-fold over a single limper rather than limping behind.'},
      }),
    }],
  };
}

function squeezeDrill(seed) {
  const rand = mulberry32(hashString(`squeeze:${seed}`));
  const candidates = ['AA','KK','QQ','JJ','TT','99','AKs','AKo','AQs','AQo','AJs','KQs','QJs'];
  const handClass = choose(rand, candidates);
  const heroCards = cardsForHandClass(handClass, rand);
  const villainCards = randomVillainCards(rand, heroCards);
  const value = isInRange(handClass, ['QQ+','AKs','AKo']);
  const lateAdd = isInRange(handClass, ['JJ','AQs']);
  const preferred = value || lateAdd ? ['squeeze'] : ['fold'];
  return {
    key:`drill|squeeze|${seed}`, id:`squeeze-${seed}`, mode:'drill', category:'squeeze', difficulty:'Intermediate',
    title:'Raise + call before you', concept:'A value-heavy squeeze after a raise and a caller.',
    heroPosition:'SB', opponentPosition:'CO', heroCards, villainCards, handClass, opponentType:'Unknown',
    steps:[{
      id:'preflop', street:'Preflop', board:[], potBb:7.5,
      history:['CO raises to 3 BB.','BTN calls 3 BB.','You are in the Small Blind.'],
      prompt:`CO raised and BTN called. You have ${handClass} in the Small Blind.`,
      options:[
        actionOption('fold','Fold','fold'),
        actionOption('call','Call','call'),
        actionOption('squeeze','Squeeze to 15 BB','raise',{sizeBb:15}),
      ],
      grading:gradeSpec({
        preferred,
        acceptable: value || lateAdd ? [] : ['call'].filter(() => ['TT','99','AQo','AJs','KQs','QJs'].includes(handClass)),
        ruleId:'squeeze', ruleName:'Squeeze',
        explanation: value || lateAdd
          ? `${handClass} is in the Version 1.0 value-heavy squeeze range for late-position action. Re-raise rather than inviting a multiway pot.`
          : `${handClass} is outside the default Version 1.0 squeeze range. Avoid forcing a large out-of-position pot.`,
      }),
    }],
  };
}

function oddsDrill(seed) {
  const rand = mulberry32(hashString(`odds:${seed}`));
  const betFraction = choose(rand, [1/3, 1/2, 2/3, 3/4, 1]);
  const draw = choose(rand, [
    { name:'flush draw', equity:0.19, cards:['A♠','6♠'], board:['K♠','8♦','3♠','2♣'] },
    { name:'open-ended straight draw', equity:0.17, cards:['8♣','7♦'], board:['K♠','6♥','5♣','2♦'] },
    { name:'gutshot', equity:0.09, cards:['8♣','7♦'], board:['K♠','9♥','5♣','2♦'] },
  ]);
  const required = potOddsRequired(betFraction);
  const correctCall = draw.equity >= required;
  const betLabel = betFraction === 1 ? 'pot' : `${Math.round(betFraction*100)}% pot`;
  return {
    key:`drill|odds|${seed}`, id:`odds-${seed}`, mode:'drill', category:'odds', difficulty:'Intermediate',
    title:`Turn pot odds: ${draw.name}`, concept:'Compare your approximate draw equity with the equity required by the price.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:draw.cards, villainCards:randomVillainCards(rand,[...draw.cards,...draw.board]), handClass:null, opponentType:'Unknown',
    steps:[{
      id:'turn', street:'Turn', board:draw.board, potBb:12,
      history:[`You reach the turn with a ${draw.name}.`,`Opponent bets ${betLabel}.`],
      prompt:`Your draw is about ${Math.round(draw.equity*100)}% to hit on the river. The call requires about ${Math.round(required*100)}% equity.`,
      options:[actionOption('fold','Fold','fold'),actionOption('call','Call','call')],
      grading:gradeSpec({
        preferred:[correctCall?'call':'fold'],
        ruleId:'odds', ruleName:'Pot odds',
        explanation:`A ${betLabel} bet requires about ${Math.round(required*100)}% equity to call. Your ${draw.name} has about ${Math.round(draw.equity*100)}% chance to hit with one card to come, so the Version 1.0 decision is ${correctCall?'call':'fold'}.`,
      }),
    }],
  };
}

const SCRIPTED_HANDS = [
  {
    id:'dry-value-line', category:'flop', difficulty:'Beginner', title:'Dry flop, top pair value',
    concept:'Small c-bet on a dry flop, then keep value betting when safe cards arrive.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♠','K♦'], villainCards:['A♥','J♣'], handClass:'AKo', opponentType:'Unknown',
    steps:[
      {
        id:'flop', street:'Flop', board:['A♣','7♦','2♠'], potBb:6.5,
        history:['You raise BTN to 3 BB with A♠K♦.','BB calls.','BB checks the flop.'],
        prompt:'You have top pair with the best kicker on a dry Ace-high flop.',
        options:[actionOption('check','Check','check'),actionOption('bet-third','Bet 2.2 BB (≈1/3 pot)','bet'),actionOption('bet-two-thirds','Bet 4.3 BB (≈2/3 pot)','bet')],
        grading:gradeSpec({preferred:['bet-third'],acceptable:['bet-two-thirds'],ruleId:'flop',ruleName:'Dry-board c-bet',explanation:'On a dry A-7-2 rainbow flop, the preflop raiser can bet frequently. With top pair/top kicker, use the Version 1.0 dry-board size of about 1/3 pot.'}),
      },
      {
        id:'turn', street:'Turn', board:['A♣','7♦','2♠','3♥'], potBb:10.9,
        history:['BB calls the flop bet.','Turn is 3♥.','BB checks.'],
        prompt:'The turn is a safe low card and you still have top pair/top kicker.',
        options:[actionOption('check','Check','check'),actionOption('bet-half','Bet 5.5 BB (≈1/2 pot)','bet'),actionOption('bet-pot','Bet 10.9 BB (pot)','bet')],
        grading:gradeSpec({preferred:['bet-half'],minor:['bet-pot'],ruleId:'turn',ruleName:'Turn value barrel',explanation:'You still have a strong made hand and the turn did not create major danger. Continue for value around 1/2 to 2/3 pot.'}),
      },
      {
        id:'river', street:'River', board:['A♣','7♦','2♠','3♥','9♣'], potBb:21.9,
        history:['BB calls the turn.','River is 9♣.','BB checks.'],
        prompt:'Safe river. What worse hands can call?',
        options:[actionOption('check','Check','check'),actionOption('bet-half','Bet 11 BB (≈1/2 pot)','bet'),actionOption('bet-pot','Bet 22 BB (pot)','bet')],
        grading:gradeSpec({preferred:['bet-half'],acceptable:['check'],minor:['bet-pot'],ruleId:'river',ruleName:'River value',explanation:'Top pair with an excellent kicker can still be called by worse Ax hands on this safe runout. Version 1.0 prefers a roughly half-pot value bet.'}),
      },
    ],
  },
  {
    id:'dry-air-shutdown', category:'turn', difficulty:'Beginner', title:'C-bet once, then stop',
    concept:'A dry flop can support a small c-bet even when you miss, but a blank turn after a call is usually a shutdown.',
    heroPosition:'CO', opponentPosition:'BB', heroCards:['K♣','Q♦'], villainCards:['A♥','8♥'], handClass:'KQo', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['A♣','7♦','2♠'],potBb:6.5,history:['You raise CO to 3 BB.','BB calls.','BB checks.'],prompt:'You missed, but this is a dry Ace-high board that favors the preflop raiser.',options:[actionOption('check','Check','check'),actionOption('bet-third','Bet ≈1/3 pot','bet'),actionOption('bet-two-thirds','Bet ≈2/3 pot','bet')],grading:gradeSpec({preferred:['bet-third'],acceptable:['check'],minor:['bet-two-thirds'],ruleId:'flop',ruleName:'Dry-board c-bet',explanation:'A small c-bet is a good Version 1.0 bluff on a dry Ace-high flop. Checking is also acceptable; a large bet is unnecessary.'})},
      {id:'turn',street:'Turn',board:['A♣','7♦','2♠','6♥'],potBb:10.9,history:['BB calls the flop bet.','Turn is 6♥.','BB checks.'],prompt:'Your flop bluff was called and the turn did not improve you.',options:[actionOption('check','Check','check'),actionOption('bet-half','Bet ≈1/2 pot','bet'),actionOption('bet-two-thirds','Bet ≈2/3 pot','bet')],grading:gradeSpec({preferred:['check'],ruleId:'turn',ruleName:'Turn shutdown',explanation:'The flop bluff was called and you gained no meaningful equity. Version 1.0 says to stop firing without a new reason.'})},
    ],
  },
  {
    id:'wet-miss-check', category:'flop', difficulty:'Beginner', title:'Respect a wet flop',
    concept:'Do not automatically continuation-bet when a coordinated flop connects strongly with the caller.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♣','Q♦'], villainCards:['T♠','9♣'], handClass:'AQo', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['9♠','8♠','7♦'],potBb:6.5,history:['You raise BTN to 3 BB.','BB calls.','BB checks.'],prompt:'You have Ace-high with no strong draw on a very connected flop.',options:[actionOption('check','Check','check'),actionOption('bet-third','Bet ≈1/3 pot','bet'),actionOption('bet-two-thirds','Bet ≈2/3 pot','bet')],grading:gradeSpec({preferred:['check'],minor:['bet-third'],ruleId:'flop',ruleName:'Wet-board discipline',explanation:'9-8-7 with two spades is a wet board: many BB calling hands connect strongly. With no pair and no strong draw, check.'})},
    ],
  },
  {
    id:'combo-draw-pressure', category:'flop', difficulty:'Intermediate', title:'Strong combo draw',
    concept:'Strong combo draws can be played aggressively because they have many ways to improve.',
    heroPosition:'BB', opponentPosition:'BTN', heroCards:['9♠','8♠'], villainCards:['K♦','Q♣'], handClass:'98s', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['7♠','6♦','K♠'],potBb:6.5,history:['BTN raises preflop.','You defend BB.','You check.','BTN bets 2.2 BB.'],prompt:'You have both an open-ended straight draw and a flush draw.',options:[actionOption('fold','Fold','fold'),actionOption('call','Call','call'),actionOption('raise','Raise to 8 BB','raise')],grading:gradeSpec({preferred:['raise'],acceptable:['call'],ruleId:'flop',ruleName:'Combo-draw semi-bluff',explanation:'This is a powerful combo draw with many outs. Version 1.0 allows an aggressive semi-bluff raise; calling is also strategically sound.'})},
      {id:'turn',street:'Turn',board:['7♠','6♦','K♠','T♥'],potBb:22.5,history:['Opponent calls your flop raise.','Turn is T♥.','You complete a straight.'],prompt:'Your draw improved to a made straight.',options:[actionOption('check','Check','check'),actionOption('bet-half','Bet ≈1/2 pot','bet'),actionOption('bet-two-thirds','Bet ≈2/3 pot','bet')],grading:gradeSpec({preferred:['bet-two-thirds'],acceptable:['bet-half'],ruleId:'turn',ruleName:'Value after improving',explanation:'You improved from a draw to a strong made hand. Continue betting for value; 1/2 to 2/3 pot fits Version 1.0.'})},
    ],
  },
  {
    id:'turn-draw-pot-odds', category:'odds', difficulty:'Intermediate', title:'Turn draw versus a big bet',
    concept:'A draw can be attractive but still be a fold when the price is too high.',
    heroPosition:'BB', opponentPosition:'BTN', heroCards:['8♠','7♠'], villainCards:['Q♦','J♦'], handClass:'87s', opponentType:'Unknown',
    steps:[
      {id:'turn',street:'Turn',board:['Q♠','6♠','2♦','4♣'],potBb:12,history:['You defended BB preflop.','You called a flop bet with a flush draw.','Opponent bets 8 BB on the turn.'],prompt:'You still have a flush draw. One card remains.',options:[actionOption('fold','Fold','fold'),actionOption('call','Call 8 BB','call'),actionOption('raise','Raise','raise')],grading:gradeSpec({preferred:['fold'],ruleId:'odds',ruleName:'Turn pot odds',explanation:'An ordinary flush draw hits about 18–20% of the time with one card to come. Calling 8 into a 20 BB final-pot structure needs substantially more equity, so fold under the Version 1.0 pot-odds rule.'})},
    ],
  },
  {
    id:'river-big-raise-fold', category:'river', difficulty:'Intermediate', title:'One pair versus a huge river raise',
    concept:'Do not become attached to top pair when new river aggression says the opponent is very strong.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♠','K♣'], villainCards:['7♥','7♣'], handClass:'AKo', opponentType:'Unknown',
    steps:[
      {id:'river',street:'River',board:['A♦','9♣','5♠','3♥','7♦'],potBb:28,history:['You bet flop and turn for value.','BB calls both streets.','BB checks river.'],prompt:'You have top pair/top kicker. Choose your river action.',options:[actionOption('check','Check','check'),actionOption('bet-half','Bet 14 BB','bet'),actionOption('bet-two-thirds','Bet 19 BB','bet')],grading:gradeSpec({preferred:['bet-half'],acceptable:['check'],ruleId:'river',ruleName:'River value',explanation:'On a mostly safe runout, worse Ax can still call a medium value bet. Half-pot is the Version 1.0 default.'})},
      {id:'raise-response',street:'River',board:['A♦','9♣','5♠','3♥','7♦'],potBb:42,history:['You bet 14 BB.','BB check-raises to 50 BB total.'],prompt:'You have one pair and now face a very large river raise.',options:[actionOption('fold','Fold','fold'),actionOption('call','Call','call')],grading:gradeSpec({preferred:['fold'],ruleId:'river',ruleName:'Fold discipline: river raise',explanation:'Version 1.0 folds ordinary one-pair hands to large river raises by default. The raise is new information; do not pay it off just because AK was strong earlier.'})},
    ],
  },
  {
    id:'calling-station-value', category:'exploit', difficulty:'Beginner', title:'Opponent calls too much',
    concept:'Against a calling station, bluff less and value bet good hands more aggressively.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♣','J♣'], villainCards:['A♥','8♦'], handClass:'AJs', opponentType:'Calls too much',
    steps:[
      {id:'river',street:'River',board:['A♦','9♠','5♣','3♦','2♥'],potBb:20,history:['Opponent has called flop and turn.','Opponent checks river.','Read: this player calls too much.'],prompt:'You have top pair with a good kicker against a player who pays off too often.',options:[actionOption('check','Check','check'),actionOption('bet-half','Bet 10 BB','bet'),actionOption('bet-two-thirds','Bet 13 BB','bet')],grading:gradeSpec({preferred:['bet-two-thirds'],acceptable:['bet-half'],ruleId:'exploit',ruleName:'Exploit: calls too much',explanation:'This opponent calls too many weak hands. Bluff less, but value bet your decent hands more confidently and somewhat larger.'})},
    ],
  },
  {
    id:'calling-station-no-bluff', category:'exploit', difficulty:'Beginner', title:'Do not bluff the caller',
    concept:'A missed draw is not an automatic bluff when the opponent is known to call too much.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['K♠','Q♠'], villainCards:['9♥','8♥'], handClass:'KQs', opponentType:'Calls too much',
    steps:[
      {id:'river',street:'River',board:['J♠','7♠','2♦','4♣','3♥'],potBb:24,history:['You bet a flush draw on flop and turn.','Opponent called both times.','River misses your draw.','Read: opponent calls too much.'],prompt:'You have King-high and a missed flush draw.',options:[actionOption('check','Check','check'),actionOption('bet-two-thirds','Bluff ≈2/3 pot','bet'),actionOption('bet-pot','Bluff pot','bet')],grading:gradeSpec({preferred:['check'],ruleId:'exploit',ruleName:'Exploit: stop bluffing calling stations',explanation:'Your draw missed, but this opponent is specifically labeled as someone who calls too much. Version 1.0 says not to keep bluffing them.'})},
    ],
  },
  {
    id:'folds-too-much-bluff', category:'exploit', difficulty:'Intermediate', title:'Pressure a player who over-folds',
    concept:'Bluff more when an opponent reliably gives up too many hands.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['K♣','Q♦'], villainCards:['8♣','7♣'], handClass:'KQo', opponentType:'Folds too much',
    steps:[
      {id:'flop',street:'Flop',board:['A♣','7♦','2♠'],potBb:6.5,history:['You raise BTN.','BB calls and checks.','Read: BB folds too much.'],prompt:'You missed but have a favorable dry Ace-high flop against an over-folder.',options:[actionOption('check','Check','check'),actionOption('bet-third','Bet ≈1/3 pot','bet'),actionOption('bet-two-thirds','Bet ≈2/3 pot','bet')],grading:gradeSpec({preferred:['bet-third'],acceptable:['check'],ruleId:'exploit',ruleName:'Exploit: folds too much',explanation:'Dry Ace-high boards already support small c-bets, and this opponent folds too much. Increase bluff pressure using the efficient small size.'})},
    ],
  },
  {
    id:'multiway-air-check', category:'multiway', difficulty:'Beginner', title:'Three-way flop with air',
    concept:'Bluff less when multiple opponents can have connected with the board.',
    heroPosition:'CO', opponentPosition:'BTN + BB', heroCards:['K♣','Q♦'], villainCards:['A♥','9♥'], handClass:'KQo', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['J♠','8♠','5♦'],potBb:10,history:['You raise CO.','BTN calls.','BB calls.','BB checks.'],prompt:'Three players see the flop. You have two overcards but no made hand or strong draw.',options:[actionOption('check','Check','check'),actionOption('bet-third','Bet ≈1/3 pot','bet'),actionOption('bet-two-thirds','Bet ≈2/3 pot','bet')],grading:gradeSpec({preferred:['check'],ruleId:'multiway',ruleName:'Multiway discipline',explanation:'With two opponents, someone is more likely to have connected. Version 1.0 bluffs less and c-bets complete misses much less often in multiway pots.'})},
    ],
  },
  {
    id:'wet-two-pair-raise', category:'flop', difficulty:'Intermediate', title:'Raise strong value on a wet board',
    concept:'Two pair or better can raise for value, especially when many draws can call.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['9♦','8♦'], villainCards:['A♠','9♠'], handClass:'98s', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['9♣','8♠','7♠'],potBb:6.5,history:['You call a BB lead after defending preflop.','BB bets 3.2 BB.'],prompt:'You have top two pair on a very wet flop.',options:[actionOption('fold','Fold','fold'),actionOption('call','Call','call'),actionOption('raise','Raise for value','raise')],grading:gradeSpec({preferred:['raise'],acceptable:['call'],ruleId:'flop',ruleName:'Flop value raise',explanation:'Two pair is a strong made hand, and this wet board contains many draws and weaker made hands that can continue. Raise for value.'})},
    ],
  },
  {
    id:'turn-scare-card-barrel', category:'turn', difficulty:'Intermediate', title:'A favorable turn changes the bluff',
    concept:'A second barrel becomes reasonable when the turn strongly improves the story your preflop range tells.',
    heroPosition:'CO', opponentPosition:'BB', heroCards:['K♠','Q♠'], villainCards:['8♥','8♣'], handClass:'KQs', opponentType:'Unknown',
    steps:[
      {id:'turn',street:'Turn',board:['9♣','5♦','2♠','A♥'],potBb:10.9,history:['You raised preflop and c-bet the flop.','BB called.','Turn is A♥ and BB checks.'],prompt:'You still have no pair, but an Ace is very plausible for your preflop raising range.',options:[actionOption('check','Check','check'),actionOption('bet-half','Bet ≈1/2 pot','bet'),actionOption('bet-pot','Bet pot','bet')],grading:gradeSpec({preferred:['bet-half'],acceptable:['check'],minor:['bet-pot'],ruleId:'turn',ruleName:'Favorable turn barrel',explanation:'The Ace is a strong card for the preflop raiser’s range. Version 1.0 allows another bet when the turn strongly favors your likely holdings. Use a controlled 1/2–2/3-pot size.'})},
    ],
  },
  {
    id:'monotone-caution', category:'flop', difficulty:'Intermediate', title:'Monotone flop caution',
    concept:'Three cards of one suit sharply reduce the comfort of ordinary one-pair hands without the suit.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♦','K♣'], villainCards:['Q♠','T♠'], handClass:'AKo', opponentType:'Unknown',
    steps:[
      {id:'flop',street:'Flop',board:['A♠','9♠','4♠'],potBb:6.5,history:['You raise BTN.','BB calls and checks.'],prompt:'You have top pair/top kicker but no spade on a three-spade flop.',options:[actionOption('check','Check','check'),actionOption('bet-third','Bet ≈1/3 pot','bet'),actionOption('bet-two-thirds','Bet ≈2/3 pot','bet')],grading:gradeSpec({preferred:['check'],acceptable:['bet-third'],ruleId:'flop',ruleName:'Monotone-board caution',explanation:'A monotone flop means any single spade can become very important. Your one-pair hand is still good but vulnerable. Version 1.0 prefers caution; a small bet is acceptable, a large bet is unnecessary.'})},
    ],
  },
  {
    id:'river-thin-value', category:'river', difficulty:'Intermediate', title:'Top pair, safe river',
    concept:'Value betting asks whether worse hands can realistically call, not whether your hand is the nuts.',
    heroPosition:'BTN', opponentPosition:'BB', heroCards:['A♥','Q♥'], villainCards:['A♣','T♦'], handClass:'AQs', opponentType:'Unknown',
    steps:[
      {id:'river',street:'River',board:['A♦','8♣','5♠','3♣','2♥'],potBb:18,history:['Flop and turn were checked through once each.','BB checks river.'],prompt:'You have top pair with a strong kicker on a safe board.',options:[actionOption('check','Check','check'),actionOption('bet-half','Bet 9 BB','bet'),actionOption('bet-pot','Bet 18 BB','bet')],grading:gradeSpec({preferred:['bet-half'],acceptable:['check'],minor:['bet-pot'],ruleId:'river',ruleName:'Thin river value',explanation:'Worse Ax hands can plausibly call a medium bet. Version 1.0 allows a cautious half-pot value bet; checking is acceptable if you prefer lower variance.'})},
    ],
  },
];

function scriptedHand(keyOrId) {
  const id = String(keyOrId).replace(/^hand\|/, '');
  const base = SCRIPTED_HANDS.find(h => h.id === id);
  if (!base) return null;
  return { key:`hand|${base.id}`, mode:'hand', ...base };
}

const DRILL_BUILDERS = {
  opening: openingDrill,
  'facing-open': facingOpenDrill,
  'bb-defense': bbDefenseDrill,
  'three-bet': facingThreeBetDrill,
  limpers: isolationDrill,
  squeeze: squeezeDrill,
  odds: oddsDrill,
};

export const CATEGORY_META = [
  { id:'opening', label:'Opening ranges', description:'Raise-or-fold decisions from UTG through the Small Blind.' },
  { id:'facing-open', label:'Facing a raise', description:'Fold, call, or 3-bet based on opener position.' },
  { id:'bb-defense', label:'Big Blind defense', description:'Use the extra pot odds of the Big Blind intelligently.' },
  { id:'three-bet', label:'Facing 3-bets', description:'Continue only with the strong part of your opening range.' },
  { id:'limpers', label:'Limpers', description:'Isolation raises and raise-or-fold discipline.' },
  { id:'squeeze', label:'Squeezes', description:'Raise + caller before you.' },
  { id:'flop', label:'Flop play', description:'Board texture, c-bets, value raises, and draws.' },
  { id:'odds', label:'Pot odds', description:'Compare draw equity to the price of a call.' },
  { id:'turn', label:'Turn play', description:'Second barrels, improvements, and shutdowns.' },
  { id:'river', label:'River play', description:'Value, bluff-catching, and fold discipline.' },
  { id:'multiway', label:'Multiway pots', description:'Tighter strategy with three or more players.' },
  { id:'exploit', label:'Opponent adjustments', description:'Simple deviations against callers and folders.' },
];

export function listScriptedHands() {
  return SCRIPTED_HANDS.map(({id,title,category,difficulty,concept}) => ({id,title,category,difficulty,concept}));
}

export function generateScenario({ mode='drill', focus='all', seed=Date.now() } = {}) {
  const numericSeed = Number.isFinite(Number(seed)) ? Number(seed) : hashString(seed);
  if (mode === 'hand') {
    const eligible = focus && focus !== 'all' ? SCRIPTED_HANDS.filter(h => h.category === focus) : SCRIPTED_HANDS;
    const pool = eligible.length ? eligible : SCRIPTED_HANDS;
    const rand = mulberry32(hashString(`hand-select:${numericSeed}:${focus}`));
    const pick = choose(rand, pool);
    return scriptedHand(pick.id);
  }

  const drillKeys = Object.keys(DRILL_BUILDERS);
  let type = focus;
  if (!DRILL_BUILDERS[type]) {
    const rand = mulberry32(hashString(`drill-select:${numericSeed}`));
    type = choose(rand, drillKeys);
  }
  return DRILL_BUILDERS[type](numericSeed);
}

export function resolveScenario(key) {
  const value = String(key || '');
  if (value.startsWith('hand|')) return scriptedHand(value);
  const [kind, type, seed] = value.split('|');
  if (kind !== 'drill' || !DRILL_BUILDERS[type]) return null;
  return DRILL_BUILDERS[type](Number(seed));
}

export function publicScenario(scenario) {
  if (!scenario) return null;
  const { villainCards, steps, ...safe } = scenario;
  return {
    ...safe,
    steps: steps.map(({ grading, ...step }) => step),
    stepCount: steps.length,
  };
}

export function gradeScenario(scenario, decisions = []) {
  if (!scenario) throw new Error('Unknown scenario');
  const byStep = new Map(decisions.map(d => [d.stepId, d.optionKey]));
  const reports = [];
  for (const step of scenario.steps) {
    const optionKey = byStep.get(step.id);
    if (!optionKey) continue;
    const score = decisionScore(step, optionKey);
    const chosen = step.options.find(o => o.key === optionKey);
    const preferredLabels = step.grading.preferred.map(k => step.options.find(o => o.key === k)?.label || k);
    reports.push({
      stepId: step.id,
      street: step.street,
      chosenKey: optionKey,
      chosenLabel: chosen?.label || optionKey,
      score,
      grade: gradeLabel(score),
      preferred: preferredLabels,
      ruleId: step.grading.ruleId,
      ruleName: step.grading.ruleName,
      explanation: step.grading.whyOthers?.[optionKey] || step.grading.explanation,
    });
  }

  const average = reports.length ? reports.reduce((sum, r) => sum + r.score, 0) / reports.length : 0;
  const firstMistake = reports.find(r => r.score < 0.75) || null;
  const firstMajorMistake = reports.find(r => r.score < 0.4) || null;
  return {
    scenarioKey: scenario.key,
    title: scenario.title,
    category: scenario.category,
    overallScore: average,
    overallGrade: gradeLabel(average),
    reports,
    firstMistake,
    firstMajorMistake,
    reveal: {
      heroCards: scenario.heroCards,
      villainCards: scenario.villainCards,
      opponentPosition: scenario.opponentPosition,
      note: 'Opponent cards are revealed only after grading and never influence whether your decision was correct.'
    }
  };
}
