const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS_DESC = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const RANK_VALUE = Object.fromEntries(RANKS_DESC.map((rank, index) => [rank, RANKS_DESC.length - index + 1]));

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

function shuffle(rand, arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cardRank(card) { return String(card || '').slice(0, -1); }
function cardSuit(card) { return String(card || '').slice(-1); }

function makeDeck(excluded, rand) {
  const blocked = new Set(excluded || []);
  const deck = [];
  for (const rank of RANKS_DESC) for (const suit of SUITS) {
    const card = `${rank}${suit}`;
    if (!blocked.has(card)) deck.push(card);
  }
  return shuffle(rand, deck);
}

function take(deck, predicate = () => true) {
  const index = deck.findIndex(predicate);
  if (index < 0) return deck.shift() || null;
  return deck.splice(index, 1)[0];
}

function buildRunout(scenario) {
  const rand = mulberry32(hashString(`v3-opening-runout:${scenario.key}`));
  const deck = makeDeck([...(scenario.heroCards || []), ...(scenario.villainCards || [])], rand);
  const handClass = String(scenario.handClass || '');
  const heroCards = scenario.heroCards || [];
  const pair = handClass.match(/^([2-9TJQKA])\1$/);
  const suited = handClass.endsWith('s') && heroCards.length === 2 && cardSuit(heroCards[0]) === cardSuit(heroCards[1]);

  if (pair) {
    const rank = pair[1];
    const setCard = take(deck, card => cardRank(card) === rank);
    const side1 = take(deck, card => cardRank(card) !== rank);
    const side2 = take(deck, card => cardRank(card) !== rank && cardRank(card) !== cardRank(side1));
    const turn = take(deck, card => cardRank(card) !== rank);
    const river = take(deck, card => cardRank(card) !== rank);
    return {
      style: 'set',
      board: [setCard, side1, side2, turn, river],
      flopPrompt: 'You flopped a set after opening preflop. How do you build the pot?',
      turnPrompt: 'Your set remains a very strong made hand on the turn.',
      riverPrompt: 'The river does not obviously destroy the value of your set. Choose a river line.',
    };
  }

  if (suited) {
    const suit = cardSuit(heroCards[0]);
    const suited1 = take(deck, card => cardSuit(card) === suit);
    const suited2 = take(deck, card => cardSuit(card) === suit && cardRank(card) !== cardRank(suited1));
    const offSuit = take(deck, card => cardSuit(card) !== suit);
    const flushTurn = take(deck, card => cardSuit(card) === suit);
    const river = take(deck, card => cardSuit(card) !== suit);
    return {
      style: 'draw',
      board: [suited1, offSuit, suited2, flushTurn, river],
      flopPrompt: 'You have a strong flush draw after opening preflop. Choose your flop line.',
      turnPrompt: 'The turn completes your flush. How aggressively should you continue?',
      riverPrompt: 'Your flush remains a strong hand on the river. Choose a value line.',
    };
  }

  const firstRank = cardRank(heroCards[0]) || handClass[0];
  const pairCard = take(deck, card => cardRank(card) === firstRank);
  const firstValue = RANK_VALUE[firstRank] || 14;
  const lower1 = take(deck, card => cardRank(card) !== firstRank && (RANK_VALUE[cardRank(card)] || 0) < firstValue);
  const lower2 = take(deck, card => cardRank(card) !== firstRank && cardRank(card) !== cardRank(lower1) && (RANK_VALUE[cardRank(card)] || 0) < firstValue);
  const turn = take(deck, card => cardRank(card) !== firstRank);
  const river = take(deck, card => cardRank(card) !== firstRank);
  return {
    style: pairCard ? 'pair' : 'range',
    board: [pairCard, lower1, lower2, turn, river],
    flopPrompt: pairCard
      ? `You paired your ${firstRank} on the flop after opening preflop. Choose your flop line.`
      : 'You reach a relatively dry flop as the preflop aggressor. Choose your flop line.',
    turnPrompt: pairCard
      ? 'After the flop continues, your one-pair hand reaches the turn. Choose how often to keep betting.'
      : 'Your flop continuation is called and you reach the turn without a made monster. Choose your next line.',
    riverPrompt: pairCard
      ? 'You reach the river with a one-pair value hand. Decide whether to value bet or check.'
      : 'You reach the river after a range-based line. Choose between checking and a selective final bet.',
  };
}

function option(key, label, action, extra = {}) {
  return { key, label, action, ...extra };
}

function grading(style, street) {
  if (style === 'set') {
    if (street === 'flop') return { mix:{bet33:0.55,bet67:0.30,check:0.15}, ruleName:'Set value: build the pot', explanation:'A set is strong enough to bet for value. Small and medium-large sizes both appear; some checking protects the check-back range.' };
    if (street === 'turn') return { mix:{bet75:0.60,bet50:0.25,check:0.15}, ruleName:'Turn value with a set', explanation:'With a very strong made hand, continue building the pot at a medium-large size while retaining a few traps.' };
    return { mix:{bet75:0.65,bet50:0.20,check:0.15}, ruleName:'River value with a set', explanation:'Most runouts still support a substantial value bet with a set; some checking remains in a balanced strategy.' };
  }

  if (style === 'draw') {
    if (street === 'flop') return { mix:{bet33:0.55,check:0.30,bet67:0.15}, ruleName:'Aggressive draw / range mix', explanation:'A strong flush draw can bet as a semi-bluff while retaining substantial checking frequency.' };
    if (street === 'turn') return { mix:{bet75:0.60,bet50:0.25,check:0.15}, ruleName:'Value after completing the flush', explanation:'Once the draw completes, the hand moves into a strong value region and can use larger sizing more often.' };
    return { mix:{bet75:0.55,bet50:0.25,check:0.20}, ruleName:'River flush value', explanation:'A made flush is usually a value bet, with sizing depending on the runout and what worse hands can call.' };
  }

  if (style === 'pair') {
    if (street === 'flop') return { mix:{bet33:0.65,check:0.30,bet67:0.05}, ruleName:'One-pair small c-bet', explanation:'On a relatively dry board, a one-pair hand can join a wide small c-bet range. Checking remains important; a large bet is much less common.' };
    if (street === 'turn') return { mix:{check:0.50,bet50:0.35,bet75:0.15}, ruleName:'Turn pot control / value', explanation:'After the flop continues, one pair no longer wants to barrel automatically. Mix medium value bets with a substantial checking range.' };
    return { mix:{check:0.45,bet50:0.45,bet75:0.10}, ruleName:'River thin value', explanation:'One pair often lands near the thin-value boundary. Medium bets and checks dominate; large bets are uncommon.' };
  }

  if (street === 'flop') return { mix:{bet33:0.70,check:0.30}, ruleName:'Range-advantage c-bet', explanation:'As the preflop aggressor on a dry board, use a small c-bet frequently even when the exact hand is not very strong.' };
  if (street === 'turn') return { mix:{check:0.65,bet50:0.35}, ruleName:'Turn selectivity', explanation:'After a flop continuation gets called, reduce automatic barreling and continue only with a reason.' };
  return { mix:{check:0.70,bet50:0.30}, ruleName:'Selective river betting', explanation:'Weak showdown hands and missed bluffs should not fire automatically. River aggression becomes more selective.' };
}

function postflopSteps({ scenario, branch = '', preflopHistory, flopPotBb, runout }) {
  const suffix = branch ? `-${branch}` : '';
  const inPosition = scenario.heroPosition !== 'SB';
  const [f1, f2, f3, turnCard, riverCard] = runout.board;
  const flopGrade = grading(runout.style, 'flop');
  const turnGrade = grading(runout.style, 'turn');
  const riverGrade = grading(runout.style, 'river');

  const flopAssumedBet = runout.style === 'set' ? 0.33 : 0.33;
  const turnPot = Number((flopPotBb * (1 + 2 * flopAssumedBet)).toFixed(1));
  const turnAssumedBet = runout.style === 'pair' || runout.style === 'range' ? 0.5 : 0.75;
  const riverPot = Number((turnPot * (1 + 2 * turnAssumedBet)).toFixed(1));

  return [
    {
      id:`flop${suffix}`, street:'Flop', board:[f1,f2,f3], potBb:flopPotBb,
      history:[...preflopHistory, inPosition ? 'BB checks the flop.' : 'Flop is dealt; you act first from the Small Blind.'],
      prompt:runout.flopPrompt,
      options:[option('check','Check','check'),option('bet33','Bet ≈33% pot','bet'),option('bet67','Bet ≈67% pot','bet')],
      grading:{mix:flopGrade.mix,ruleId:'opening-playout',ruleName:flopGrade.ruleName,explanation:flopGrade.explanation},
    },
    {
      id:`turn${suffix}`, street:'Turn', board:[f1,f2,f3,turnCard], potBb:turnPot,
      history:[`The scripted opponent continues from the flop.`, inPosition ? 'BB checks the turn.' : 'Turn is dealt; you act first.'],
      prompt:runout.turnPrompt,
      options:[option('check','Check','check'),option('bet50','Bet ≈50% pot','bet'),option('bet75','Bet ≈75% pot','bet')],
      grading:{mix:turnGrade.mix,ruleId:'opening-playout',ruleName:turnGrade.ruleName,explanation:turnGrade.explanation},
    },
    {
      id:`river${suffix}`, street:'River', board:[f1,f2,f3,turnCard,riverCard], potBb:riverPot,
      history:[`The scripted opponent continues from the turn.`, inPosition ? 'BB checks the river.' : 'River is dealt; you act first.'],
      prompt:runout.riverPrompt,
      options:[option('check','Check','check'),option('bet50','Bet ≈50% pot','bet'),option('bet75','Bet ≈75% pot','bet')],
      grading:{mix:riverGrade.mix,ruleId:'opening-playout',ruleName:riverGrade.ruleName,explanation:riverGrade.explanation},
      terminal:true,
    },
  ];
}

export function extendOpeningDrillForPlayOut(scenario) {
  if (!scenario || scenario.mode !== 'drill' || scenario.category !== 'opening' || !scenario.steps?.length) return scenario;

  const runout = buildRunout(scenario);
  const preflop = {
    ...scenario.steps[0],
    options: scenario.steps[0].options.map(item => ({...item})),
  };

  if (scenario.heroPosition === 'SB') {
    preflop.options = preflop.options.map(item => {
      if (item.key === 'raise') return {...item, nextStepId:'flop-raise'};
      if (item.key === 'limp') return {...item, nextStepId:'flop-limp'};
      return item;
    });

    const raiseSteps = postflopSteps({
      scenario,
      branch:'raise',
      preflopHistory:[`You raise SB to ${scenario.steps[0].options.find(item => item.key === 'raise')?.sizeBb || 3} BB.`, 'BB calls.'],
      flopPotBb:6,
      runout,
    });
    const limpSteps = postflopSteps({
      scenario,
      branch:'limp',
      preflopHistory:['You complete the Small Blind to 1 BB.', 'BB checks preflop.'],
      flopPotBb:2,
      runout,
    });

    return {
      ...scenario,
      branching:true,
      scriptedContinuation:true,
      concept:`${scenario.concept} If you continue preflop, the drill now plays through the river on a deliberately dealt runout.`,
      steps:[preflop,...raiseSteps,...limpSteps],
    };
  }

  preflop.options = preflop.options.map(item => item.key === 'raise' ? {...item,nextStepId:'flop'} : item);
  const openSize = Number(preflop.options.find(item => item.key === 'raise')?.sizeBb || 2.5);
  const flopPotBb = Number((0.5 + 2 * openSize).toFixed(1));
  const continuation = postflopSteps({
    scenario,
    preflopHistory:[`You raise ${scenario.heroPosition} to ${openSize} BB.`, 'Action folds to the Big Blind.', 'BB calls.'],
    flopPotBb,
    runout,
  });

  return {
    ...scenario,
    scriptedContinuation:true,
    concept:`${scenario.concept} If you continue preflop, the drill now plays through the river on a deliberately dealt runout.`,
    steps:[preflop,...continuation],
  };
}
