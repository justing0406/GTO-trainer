const STORAGE = {
  api: 'gto-trainer-api-base',
  progress: 'gto-trainer-progress-v1',
  mode: 'gto-trainer-mode',
  focus: 'gto-trainer-focus',
};

const DEFAULT_PROGRESS = {
  hands: 0,
  decisions: 0,
  scoreSum: 0,
  perfect: 0,
  correct: 0,
  minor: 0,
  major: 0,
  streak: 0,
  bestStreak: 0,
  byCategory: {},
  mistakes: [],
};

const MANTRAS = [
  'Raise or fold when first in. Never limp.',
  'Play tighter early and wider late.',
  'Strong early-position aggression deserves respect.',
  'Defend wider from the Big Blind because money is already invested.',
  'Bet dry boards more freely; respect wet boards.',
  'Know your outs and compare them with your pot odds.',
  'Do not automatically bluff again after being called.',
  'Ask what worse hands call before value betting the river.',
  'One pair plus huge river aggression usually means fold.',
  'More opponents require stronger hands.',
  'If they call too much, stop bluffing them.',
  'If they fold too much, attack them more.',
  'Judge the decision, not whether the hand happened to win.',
];

const fallbackCategoryLabels = {
  opening: 'Opening ranges',
  'facing-open': 'Facing a raise',
  'bb-defense': 'Big Blind defense',
  'three-bet': 'Facing 3-bets',
  limpers: 'Limpers',
  squeeze: 'Squeezes',
  flop: 'Flop play',
  odds: 'Pot odds',
  turn: 'Turn play',
  river: 'River play',
  multiway: 'Multiway pots',
  exploit: 'Opponent adjustments',
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE.progress));
    return { ...structuredClone(DEFAULT_PROGRESS), ...(parsed || {}), byCategory: parsed?.byCategory || {}, mistakes: parsed?.mistakes || [] };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

const state = {
  apiBase: '',
  connected: false,
  meta: null,
  rules: null,
  scenario: null,
  stepIndex: 0,
  decisions: [],
  report: null,
  requestCounter: 0,
  progress: loadProgress(),
};

function saveProgress() {
  localStorage.setItem(STORAGE.progress, JSON.stringify(state.progress));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[ch]));
}

function normalizeApiBase(value = '') {
  return String(value).trim().replace(/\/+$/, '');
}

function configuredApiBase() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('api');
  if (fromQuery) {
    const normalized = normalizeApiBase(fromQuery);
    localStorage.setItem(STORAGE.api, normalized);
    return normalized;
  }
  const stored = localStorage.getItem(STORAGE.api);
  if (stored) return normalizeApiBase(stored);
  const configured = window.GTO_CONFIG?.apiBaseUrl;
  if (configured) return normalizeApiBase(configured);
  if (['localhost','127.0.0.1'].includes(location.hostname)) return 'http://localhost:8787';
  return '';
}

async function api(path, options = {}) {
  if (!state.apiBase) throw new Error('Set the Worker API URL in Settings first.');
  const response = await fetch(`${state.apiBase}${path}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { error: text || 'Invalid JSON response' }; }
  if (!response.ok) throw new Error(body.error || `Worker returned ${response.status}`);
  return body;
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function setConnection(status, message) {
  state.connected = status === 'ok';
  const pill = $('#connectionPill');
  pill.classList.remove('ok','bad');
  if (status) pill.classList.add(status);
  pill.querySelector('em').textContent = message;
}

async function testConnection({ quiet = false } = {}) {
  if (!state.apiBase) {
    setConnection('bad','Not configured');
    $('#apiStatus').textContent = 'Enter the deployed Worker URL first.';
    return false;
  }
  setConnection('', 'Checking…');
  try {
    const data = await api('/api/health');
    setConnection('ok', `v${data.rulebookVersion}`);
    $('#apiStatus').textContent = `Connected to ${data.service}. Rulebook v${data.rulebookVersion}; ${data.scriptedHands} scripted training hands available.`;
    if (!quiet) toast('Worker connected');
    return true;
  } catch (error) {
    setConnection('bad','Offline');
    $('#apiStatus').textContent = error.message;
    if (!quiet) toast(`Connection failed: ${error.message}`);
    return false;
  }
}

async function loadMetaAndRules() {
  const [meta, rules] = await Promise.all([api('/api/meta'), api('/api/rules')]);
  state.meta = meta;
  state.rules = rules;
  renderFocusOptions();
  renderRulebook();
  renderProgress();
}

function navigate(viewName) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${viewName}`));
  $$('.nav-tab').forEach(b => b.classList.toggle('active', b.dataset.nav === viewName));
  if (viewName === 'progress') renderProgress();
  if (viewName === 'rulebook' && state.rules) renderRulebook();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function categoryLabel(id) {
  return state.meta?.categories?.find(c => c.id === id)?.label || fallbackCategoryLabels[id] || id;
}

function renderFocusOptions() {
  const select = $('#focusSelect');
  const current = localStorage.getItem(STORAGE.focus) || select.value || 'all';
  const categories = state.meta?.categories || Object.entries(fallbackCategoryLabels).map(([id,label]) => ({id,label}));
  select.innerHTML = `<option value="all">All areas</option><option value="weakest">Weakest area</option>` + categories.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`).join('');
  select.value = [...select.options].some(o => o.value === current) ? current : 'all';
}

function resolveFocus() {
  const chosen = $('#focusSelect').value;
  if (chosen !== 'weakest') return chosen;
  const entries = Object.entries(state.progress.byCategory).filter(([,d]) => d.attempts >= 2);
  if (!entries.length) return 'all';
  entries.sort((a,b) => (a[1].scoreSum / a[1].attempts) - (b[1].scoreSum / b[1].attempts));
  return entries[0][0];
}

function cardMarkup(card, extraClass = '') {
  if (!card) return `<div class="playing-card placeholder ${extraClass}"></div>`;
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const red = suit === '♥' || suit === '♦';
  return `<div class="playing-card ${red ? 'red' : ''} ${extraClass}"><span>${escapeHtml(rank)}</span><span class="suit">${escapeHtml(suit)}</span></div>`;
}

function renderSeats() {
  const hero = state.scenario?.heroPosition;
  const opponent = state.scenario?.opponentPosition || '';
  const opponentParts = String(opponent).split(/\s*\+\s*/);
  const positions = ['UTG','HJ','CO','BTN','SB','BB'];
  positions.forEach((pos, i) => {
    const seat = $(`.seat-${i}`);
    seat.classList.toggle('hero', hero === pos);
    seat.classList.toggle('opponent', opponentParts.includes(pos));
    const chip = seat.querySelector('.seat-chip');
    chip.textContent = hero === pos ? `${pos} · YOU` : opponentParts.includes(pos) ? `${pos} · VILLAIN` : pos;
  });
}

function renderScenarioStep() {
  const scenario = state.scenario;
  if (!scenario) return;
  const step = scenario.steps[state.stepIndex];
  $('#feedbackPanel').hidden = true;
  $('#scenarioCategory').textContent = `${scenario.mode === 'hand' ? 'Training hand' : 'Decision drill'} · ${categoryLabel(scenario.category)}`;
  $('#scenarioTitle').textContent = scenario.title;
  $('#scenarioConcept').textContent = scenario.concept;
  $('#difficultyBadge').textContent = scenario.difficulty || 'V1.0';
  $('#heroPosition').textContent = `${scenario.heroPosition} · YOU`;
  $('#heroCards').innerHTML = scenario.heroCards.map(c => cardMarkup(c)).join('');
  $('#opponentCards').innerHTML = '<div class="playing-card card-back"></div><div class="playing-card card-back"></div>';
  renderSeats();

  const board = step.board || [];
  $('#boardCards').innerHTML = Array.from({length:5}, (_,i) => cardMarkup(board[i], i >= board.length ? 'placeholder' : '')).join('');
  $('#potChip').textContent = `Pot ${Number(step.potBb).toFixed(step.potBb % 1 ? 1 : 0)} BB`;
  $('#streetBadge').textContent = step.street;
  $('#decisionPrompt').textContent = step.prompt;
  $('#stepCounter').textContent = scenario.branching
    ? `Decision ${state.decisions.length + 1}`
    : `Decision ${state.stepIndex + 1}/${scenario.steps.length}`;
  $('#historyList').innerHTML = (step.history || []).map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No prior voluntary action.</li>';

  const scripted = Boolean(scenario.scriptedContinuation || (scenario.mode === 'hand' && scenario.steps.length > 1));
  $('#scriptNote').hidden = !scripted;
  if (scripted) {
    $('#scriptNote').textContent = scenario.scriptedContinuation
      ? 'After the targeted decision, the opponent follows a scripted continuation so you can practice later streets. Your earlier choice is still graded independently.'
      : 'Training Hands use a scripted continuation so later streets can still test you even if you deviate earlier.';
  }

  const grid = $('#actionGrid');
  grid.innerHTML = '';
  step.options.forEach(option => {
    const button = document.createElement('button');
    button.className = `action-button ${option.action}`;
    button.textContent = option.label;
    button.addEventListener('click', () => chooseAction(option));
    grid.appendChild(button);
  });

  $('#mantraText').textContent = MANTRAS[(state.requestCounter + state.stepIndex) % MANTRAS.length];
}

async function newScenario() {
  if (!state.connected) {
    const ok = await testConnection({ quiet: true });
    if (!ok) { navigate('settings'); return; }
  }
  const button = $('#newScenarioBtn');
  button.disabled = true;
  button.textContent = 'Dealing…';
  try {
    state.requestCounter += 1;
    const mode = $('#modeSelect').value;
    const focus = resolveFocus();
    const seed = Date.now() + state.requestCounter * 997;
    const params = new URLSearchParams({ mode, focus, seed: String(seed) });
    const scenario = await api(`/api/scenario?${params}`);
    state.scenario = scenario;
    state.stepIndex = 0;
    state.decisions = [];
    state.report = null;
    renderScenarioStep();
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'New hand';
  }
}

function chooseAction(option) {
  const step = state.scenario.steps[state.stepIndex];
  state.decisions.push({ stepId: step.id, optionKey: option.key });
  $$('#actionGrid .action-button').forEach(b => b.disabled = true);

  const isFold = option.action === 'fold';
  const isTerminal = Boolean(option.endScenario || step.terminal);
  const isLast = state.stepIndex >= state.scenario.steps.length - 1;
  if (isFold || isTerminal || isLast) {
    setTimeout(finishHand, 120);
    return;
  }

  if (option.nextStepId) {
    const nextIndex = state.scenario.steps.findIndex(candidate => candidate.id === option.nextStepId);
    if (nextIndex < 0) {
      toast('Could not find the next training decision.');
      setTimeout(finishHand, 120);
      return;
    }
    state.stepIndex = nextIndex;
  } else {
    state.stepIndex += 1;
  }
  setTimeout(renderScenarioStep, 140);
}

async function finishHand() {
  try {
    const report = await api('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioKey: state.scenario.key, decisions: state.decisions }),
    });
    state.report = report;
    applyReportToProgress(report);
    renderFeedback(report);
    renderStatsSummary();
  } catch (error) {
    toast(`Could not grade hand: ${error.message}`);
    $$('#actionGrid .action-button').forEach(b => b.disabled = false);
  }
}

function applyReportToProgress(report) {
  const p = state.progress;
  p.hands += 1;
  const successfulHand = report.overallScore >= 0.75;
  p.streak = successfulHand ? p.streak + 1 : 0;
  p.bestStreak = Math.max(p.bestStreak, p.streak);

  for (const r of report.reports) {
    p.decisions += 1;
    p.scoreSum += r.score;
    if (r.grade === 'Perfect') p.perfect += 1;
    else if (r.grade === 'Correct') p.correct += 1;
    else if (r.grade === 'Minor Mistake') p.minor += 1;
    else p.major += 1;

    const category = report.category;
    p.byCategory[category] ||= { attempts: 0, scoreSum: 0 };
    p.byCategory[category].attempts += 1;
    p.byCategory[category].scoreSum += r.score;

    if (r.score < 0.75) {
      p.mistakes.unshift({
        when: new Date().toISOString(),
        category,
        hand: report.title,
        street: r.street,
        ruleName: r.ruleName,
        grade: r.grade,
        chosen: r.chosenLabel,
        preferred: r.preferred.join(' or '),
      });
    }
  }
  p.mistakes = p.mistakes.slice(0, 30);
  saveProgress();
}

function gradeClass(label) {
  if (label === 'Major Mistake') return 'major';
  if (label === 'Minor Mistake') return 'minor';
  return '';
}

function renderFeedback(report) {
  const panel = $('#feedbackPanel');
  panel.hidden = false;
  const orb = $('#overallGrade');
  orb.textContent = report.overallGrade;
  orb.className = `grade-orb ${gradeClass(report.overallGrade)}`;
  $('#feedbackTitle').textContent = report.title;
  $('#feedbackSummary').textContent = `${Math.round(report.overallScore * 100)}% weighted decision score across ${report.reports.length} graded decision${report.reports.length === 1 ? '' : 's'}.`;

  const first = report.firstMajorMistake || report.firstMistake;
  $('#firstMistakeCallout').innerHTML = first ? `
    <div class="mistake-callout">
      <strong>${report.firstMajorMistake ? 'First major mistake' : 'First meaningful mistake'} · ${escapeHtml(first.street)}</strong>
      <div>${escapeHtml(first.ruleName)}: you chose <b>${escapeHtml(first.chosenLabel)}</b>; preferred was <b>${escapeHtml(first.preferred.join(' or '))}</b>.</div>
    </div>` : '';

  $('#decisionReports').innerHTML = report.reports.map(r => `
    <article class="report-card">
      <div class="report-grade ${gradeClass(r.grade)}">${escapeHtml(r.grade)}</div>
      <div>
        <h4>${escapeHtml(r.street)} · ${escapeHtml(r.ruleName)}</h4>
        <p>${escapeHtml(r.explanation)}</p>
        <div class="report-meta"><span>You: ${escapeHtml(r.chosenLabel)}</span><span>Preferred: ${escapeHtml(r.preferred.join(' / '))}</span></div>
      </div>
    </article>`).join('');

  const villain = report.reveal?.villainCards || [];
  $('#revealRow').innerHTML = `<b>Villain reveal</b><div class="reveal-cards">${villain.map(c => cardMarkup(c)).join('')}</div><span>${escapeHtml(report.reveal?.note || '')}</span>`;
  $('#opponentCards').innerHTML = villain.map(c => cardMarkup(c)).join('');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderStatsSummary() {
  $('#streakStat').textContent = state.progress.streak;
  $('#scoreStat').textContent = state.progress.decisions ? `${Math.round((state.progress.scoreSum / state.progress.decisions) * 100)}%` : '—';
}

function renderProgress() {
  const p = state.progress;
  const avg = p.decisions ? p.scoreSum / p.decisions : 0;
  $('#metricGrid').innerHTML = [
    ['Hands trained', p.hands],
    ['Decisions', p.decisions],
    ['Decision score', p.decisions ? `${Math.round(avg*100)}%` : '—'],
    ['Best streak', p.bestStreak],
  ].map(([label,value]) => `<div class="metric-card card-panel"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');

  const categories = state.meta?.categories || Object.entries(fallbackCategoryLabels).map(([id,label]) => ({id,label}));
  $('#categoryProgress').innerHTML = categories.map(c => {
    const d = p.byCategory[c.id];
    const score = d?.attempts ? d.scoreSum / d.attempts : 0;
    return `<div class="category-row"><b>${escapeHtml(c.label)}</b><div class="progress-track"><div class="progress-fill" style="width:${Math.round(score*100)}%"></div></div><em>${d?.attempts ? `${Math.round(score*100)}%` : '—'}</em></div>`;
  }).join('');

  const mistakes = p.mistakes || [];
  $('#mistakesList').innerHTML = mistakes.length ? mistakes.slice(0,12).map(m => `
    <div class="mistake-item">
      <strong>${escapeHtml(m.ruleName)} · ${escapeHtml(m.grade)}</strong>
      <span>${escapeHtml(m.hand)} · ${escapeHtml(m.street)} · You: ${escapeHtml(m.chosen)} · Preferred: ${escapeHtml(m.preferred)}</span>
    </div>`).join('') : '<div class="empty-state">No recorded mistakes yet. Deal a few hands.</div>';
  renderStatsSummary();
}

function renderRulebook() {
  if (!state.rules) return;
  const rules = state.rules;
  $('#ruleIndex').innerHTML = rules.sections.map(s => `<button data-rule-target="${escapeHtml(s.id)}">${escapeHtml(s.title)}</button>`).join('') + `<button data-rule-target="glossarySection">Glossary</button>`;
  $$('[data-rule-target]').forEach(button => button.addEventListener('click', () => {
    document.getElementById(button.dataset.ruleTarget)?.scrollIntoView({ behavior:'smooth', block:'start' });
  }));

  const opening = rules.ranges?.opening || {};
  $('#rangeGrid').innerHTML = Object.entries(opening).map(([position,spec]) => `<div class="range-column"><strong>${escapeHtml(position)}</strong><p>${escapeHtml(spec.join(', '))}</p></div>`).join('');

  $('#ruleSections').innerHTML = rules.sections.map(s => `<section class="rule-section card-panel" id="${escapeHtml(s.id)}"><h2>${escapeHtml(s.title)}</h2><ul>${s.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul></section>`).join('');
  renderGlossary();
}

function renderGlossary() {
  if (!state.rules) return;
  const q = ($('#glossarySearch').value || '').trim().toLowerCase();
  const terms = state.rules.glossary.filter(g => !q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q));
  $('#glossaryGrid').innerHTML = terms.map(g => `<dl class="glossary-item"><dt>${escapeHtml(g.term)}</dt><dd>${escapeHtml(g.definition)}</dd></dl>`).join('') || '<div class="empty-state">No glossary terms match that search.</div>';
}

function bindEvents() {
  $$('[data-nav]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.nav)));
  $('#newScenarioBtn').addEventListener('click', newScenario);
  $('#nextHandBtn').addEventListener('click', newScenario);
  $('#modeSelect').addEventListener('change', () => {
    localStorage.setItem(STORAGE.mode, $('#modeSelect').value);
    if (state.connected) newScenario();
  });
  $('#focusSelect').addEventListener('change', () => {
    localStorage.setItem(STORAGE.focus, $('#focusSelect').value);
  });
  $('#glossarySearch').addEventListener('input', renderGlossary);
  $('#saveApiBtn').addEventListener('click', async () => {
    const value = normalizeApiBase($('#apiUrlInput').value);
    state.apiBase = value;
    localStorage.setItem(STORAGE.api, value);
    const ok = await testConnection();
    if (ok) {
      await loadMetaAndRules();
      navigate('train');
      await newScenario();
    }
  });
  $('#testApiBtn').addEventListener('click', () => testConnection());
  $('#resetProgressBtn').addEventListener('click', () => {
    if (!confirm('Reset all locally stored training progress?')) return;
    state.progress = structuredClone(DEFAULT_PROGRESS);
    saveProgress();
    renderProgress();
    toast('Progress reset');
  });
  $('#clearMistakesBtn').addEventListener('click', () => {
    state.progress.mistakes = [];
    saveProgress();
    renderProgress();
  });
}

async function bootstrap() {
  bindEvents();
  state.apiBase = configuredApiBase();
  $('#apiUrlInput').value = state.apiBase;
  $('#modeSelect').value = localStorage.getItem(STORAGE.mode) || 'hand';
  renderFocusOptions();
  renderProgress();
  renderStatsSummary();

  if (!state.apiBase) {
    setConnection('bad','Configure');
    $('#apiStatus').textContent = 'No Worker URL is configured yet.';
    navigate('settings');
    return;
  }

  const ok = await testConnection({ quiet: true });
  if (!ok) {
    navigate('settings');
    return;
  }

  try {
    await loadMetaAndRules();
    await newScenario();
  } catch (error) {
    toast(error.message);
  }
}

bootstrap();
