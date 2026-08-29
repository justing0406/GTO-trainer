(() => {
  const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const ACTION_WORDS = [
    { pattern: /4-bets?/i, label: '4-BET', kind: 'acted' },
    { pattern: /3-bets?/i, label: '3-BET', kind: 'acted' },
    { pattern: /check-raises?/i, label: 'CHECK-RAISED', kind: 'acted' },
    { pattern: /raises?/i, label: 'RAISED', kind: 'acted' },
    { pattern: /calls?/i, label: 'CALLED', kind: 'acted' },
    { pattern: /limps?/i, label: 'LIMPED', kind: 'acted' },
    { pattern: /checks?/i, label: 'CHECKED', kind: 'acted' },
    { pattern: /bets?/i, label: 'BET', kind: 'acted' },
    { pattern: /defends?/i, label: 'DEFENDED', kind: 'acted' },
    { pattern: /folds?/i, label: 'FOLD', kind: 'folded' },
  ];

  const $ = selector => document.querySelector(selector);

  function amountFrom(text) {
    const matches = [...String(text).matchAll(/(?:to\s+)?(\d+(?:\.\d+)?)\s*BB/gi)];
    return matches.length ? `${matches[matches.length - 1][1]} BB` : '';
  }

  function lastActionIn(text) {
    const source = String(text);
    let winner = null;
    for (const action of ACTION_WORDS) {
      const match = source.match(action.pattern);
      if (!match) continue;
      const index = source.toLowerCase().lastIndexOf(match[0].toLowerCase());
      if (!winner || index > winner.index) winner = { ...action, index };
    }
    if (!winner) return null;
    const amount = amountFrom(source);
    return {
      kind: winner.kind,
      label: `${winner.label}${amount ? ` ${amount}` : ''}`,
    };
  }

  function positionsIn(text) {
    const source = String(text).toUpperCase();

    // "BB" has two meanings in poker UI text: the Big Blind seat and the
    // unit "big blinds" used for bet sizes. Strip numeric BB amounts before
    // looking for position abbreviations so a line such as
    // "UTG calls 1 BB (limps)" cannot accidentally mark the BB player as a
    // limper. A genuine seat reference such as "BB calls 2 BB" remains.
    const positionText = source.replace(/\b\d+(?:\.\d+)?\s*BB\b/g, '');

    return POSITIONS.filter(position => new RegExp(`\\b${position}\\b`).test(positionText));
  }

  function currentHero() {
    const text = $('#heroPosition')?.textContent || '';
    return POSITIONS.find(position => text.includes(position)) || null;
  }

  function previousOpponentPositions() {
    return POSITIONS.filter((_, index) => document.querySelector(`.seat-${index}`)?.classList.contains('opponent'));
  }

  function defaultState(kind = 'waiting', label = 'TO ACT') {
    return { kind, label, opponent: false };
  }

  function buildStates() {
    const hero = currentHero();
    if (!hero) return null;

    const street = ($('#streetBadge')?.textContent || '').trim().toLowerCase();
    const preflop = street === 'preflop';
    const history = [...document.querySelectorAll('#historyList li')].map(li => li.textContent.trim()).filter(Boolean);
    const oldOpponents = previousOpponentPositions();
    const states = Object.fromEntries(POSITIONS.map(position => [position, defaultState()]));
    const explicitActive = new Set();

    // On later streets, only Hero and players known to still be involved should look live.
    if (!preflop) {
      for (const position of POSITIONS) states[position] = defaultState('folded', 'FOLD');
      for (const position of oldOpponents) {
        states[position] = defaultState('active', 'ACTIVE');
        states[position].opponent = true;
        explicitActive.add(position);
      }
    }

    // Process the written action history in order. Later actions replace earlier ones.
    for (const line of history) {
      const linePositions = positionsIn(line);
      const action = lastActionIn(line);

      if (linePositions.length && action) {
        for (const position of linePositions) {
          if (position === hero && /\byou\b/i.test(line)) continue;
          states[position] = { ...action, opponent: position !== hero && action.kind !== 'folded' };
          if (action.kind !== 'folded') explicitActive.add(position);
        }
      }

      // Some postflop scripts say "Opponent" rather than repeating the seat name.
      if (/\bopponent\b/i.test(line) && action && !/read:/i.test(line)) {
        for (const position of oldOpponents) {
          states[position] = { ...action, opponent: action.kind !== 'folded' };
          if (action.kind !== 'folded') explicitActive.add(position);
        }
      }
    }

    if (preflop) {
      const heroIndex = POSITIONS.indexOf(hero);
      const text = history.join(' | ').toLowerCase();

      if (text.includes('everyone else folds') || text.includes('action returns to you')) {
        for (const position of POSITIONS) {
          if (position !== hero && !explicitActive.has(position)) states[position] = defaultState('folded', 'FOLD');
        }
      } else {
        // Before Hero's first preflop decision, any unmentioned earlier seat has folded.
        // Any unmentioned later seat is still waiting to act.
        POSITIONS.forEach((position, index) => {
          if (position === hero || explicitActive.has(position) || states[position].kind === 'folded') return;
          states[position] = index < heroIndex ? defaultState('folded', 'FOLD') : defaultState('waiting', 'TO ACT');
        });
      }

      if (text.includes('everyone before you folds')) {
        POSITIONS.forEach((position, index) => {
          if (index < heroIndex && !explicitActive.has(position)) states[position] = defaultState('folded', 'FOLD');
        });
      }

      // Forced blinds are useful context when those players have not acted yet.
      if (states.SB.kind === 'waiting') states.SB.label = '0.5 BB · TO ACT';
      if (states.BB.kind === 'waiting') states.BB.label = '1 BB · TO ACT';
    }

    // Hero is the decision-maker shown on screen, even if Hero acted earlier in the betting round.
    const posted = preflop && hero === 'SB' ? ' · 0.5 BB POSTED' : preflop && hero === 'BB' ? ' · 1 BB POSTED' : '';
    states[hero] = { kind: 'hero', label: `YOUR TURN${posted}`, opponent: false };

    // Explicitly active players are opponents. This catches multiway spots like CO raise + BTN call.
    for (const position of explicitActive) {
      if (position !== hero && states[position].kind !== 'folded') states[position].opponent = true;
    }

    return { hero, states };
  }

  function seatHtml(position, state) {
    return `<span class="seat-position">${position}${state.kind === 'hero' ? ' · YOU' : ''}</span><span class="seat-status">${state.label}</span>`;
  }

  function ensureLegend() {
    const wrap = document.querySelector('.table-wrap');
    if (!wrap || wrap.querySelector('.seat-legend')) return;
    const legend = document.createElement('div');
    legend.className = 'seat-legend';
    legend.setAttribute('aria-label', 'Player status legend');
    legend.innerHTML = `
      <span><i class="legend-dot hero-dot"></i>You / your turn</span>
      <span><i class="legend-dot action-dot"></i>Acted / still in hand</span>
      <span><i class="legend-dot waiting-dot"></i>Still waiting to act</span>
      <span><i class="legend-dot folded-dot"></i>Folded / out of hand</span>`;
    wrap.prepend(legend);
  }

  function renderSeatStates() {
    const built = buildStates();
    if (!built) return;
    ensureLegend();

    POSITIONS.forEach((position, index) => {
      const seat = document.querySelector(`.seat-${index}`);
      if (!seat) return;
      const state = built.states[position];
      seat.classList.remove('hero', 'opponent', 'folded', 'waiting', 'acted', 'active');
      seat.classList.add(state.kind === 'hero' ? 'hero' : state.kind);
      if (state.opponent) seat.classList.add('opponent');
      seat.dataset.playerState = state.kind;
      seat.setAttribute('aria-label', `${position}: ${state.label}`);
      const chip = seat.querySelector('.seat-chip');
      if (chip) chip.innerHTML = seatHtml(position, state);
    });
  }

  function scheduleRender() {
    cancelAnimationFrame(scheduleRender.frame);
    scheduleRender.frame = requestAnimationFrame(renderSeatStates);
  }

  const history = $('#historyList');
  const hero = $('#heroPosition');
  const street = $('#streetBadge');
  if (history) new MutationObserver(scheduleRender).observe(history, { childList: true, subtree: true, characterData: true });
  if (hero) new MutationObserver(scheduleRender).observe(hero, { childList: true, subtree: true, characterData: true });
  if (street) new MutationObserver(scheduleRender).observe(street, { childList: true, subtree: true, characterData: true });

  scheduleRender();
})();