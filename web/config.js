// One Cloudflare Worker serves the UI and /api/*.
localStorage.removeItem('gto-trainer-api-base');
window.GTO_CONFIG = { apiBaseUrl: window.location.origin };

(() => {
  const STORAGE_KEY = 'gto-trainer-strategy';
  const strategy = localStorage.getItem(STORAGE_KEY) || 'v2';
  window.GTO_STRATEGY = strategy;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = './advanced-mode.css';
  document.head.appendChild(style);

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    let requestInput = input;
    try {
      const raw = typeof input === 'string' ? input : input?.url;
      if (raw) {
        const url = new URL(raw, window.location.origin);
        if (url.origin === window.location.origin && ['/api/meta','/api/rules','/api/scenario'].includes(url.pathname)) {
          if (!url.searchParams.has('strategy')) url.searchParams.set('strategy', window.GTO_STRATEGY || 'v2');
          requestInput = typeof input === 'string' ? url.toString() : new Request(url.toString(), input);
        }
      }
    } catch {}

    const response = await originalFetch(requestInput, init);
    try {
      const raw = typeof requestInput === 'string' ? requestInput : requestInput?.url;
      const url = raw ? new URL(raw, window.location.origin) : null;
      if (url?.pathname === '/api/grade') {
        response.clone().json().then(report => {
          window.__GTO_LAST_REPORT = report;
          scheduleFeedbackEnhancement(report);
        }).catch(() => {});
      }
    } catch {}
    return response;
  };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function insertStrategyControl() {
    const toolbar = document.querySelector('.trainer-toolbar');
    if (!toolbar || document.querySelector('#strategySelect')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'strategy-control';
    wrapper.innerHTML = `
      <label for="strategySelect">Strategy level</label>
      <select id="strategySelect">
        <option value="v2">Advanced / GTO-like v2</option>
        <option value="v1">Foundation v1.0</option>
      </select>`;
    toolbar.insertBefore(wrapper, toolbar.firstChild);
    const select = wrapper.querySelector('select');
    select.value = window.GTO_STRATEGY;
    select.addEventListener('change', () => {
      localStorage.setItem(STORAGE_KEY, select.value);
      location.reload();
    });
  }

  function updateVersionLabels() {
    const advanced = (window.GTO_STRATEGY || strategy) === 'v2';
    const brandSmall = document.querySelector('.brand small');
    if (brandSmall) brandSmall.textContent = advanced ? 'Advanced v2.0' : 'Foundation v1.0';
    document.title = advanced ? 'GTO Trainer · Advanced v2.0' : 'GTO Trainer · Foundation v1.0';

    const pageHeading = document.querySelector('#view-rulebook .page-heading');
    if (pageHeading) {
      const eyebrow = pageHeading.querySelector('.eyebrow');
      const heading = pageHeading.querySelector('h1');
      const copy = pageHeading.querySelector('p');
      if (eyebrow) eyebrow.textContent = advanced ? 'Poker Strategy Rulebook v2.0' : 'Poker Strategy Rulebook v1.0';
      if (heading) heading.textContent = advanced ? 'Advanced solver-inspired rules' : 'The rules the trainer grades';
      if (copy) copy.textContent = advanced
        ? 'Rounded mixed frequencies teach GTO-like reasoning without pretending these are exact solver outputs. Exact equilibrium changes with rake, stack depth and sizing.'
        : 'These are deliberately simple, deterministic rules. Poker jargon is defined in the glossary below.';
    }

    let notice = document.querySelector('.advanced-notice');
    if (advanced && !notice) {
      notice = document.createElement('div');
      notice.className = 'advanced-notice card-panel';
      notice.innerHTML = `<strong>Advanced v2</strong><span>Mixed strategies are normal. A hand may correctly raise 70% and call 30%; feedback shows the approximate mix and explains why.</span>`;
      document.querySelector('.trainer-toolbar')?.insertAdjacentElement('afterend', notice);
    } else if (!advanced && notice) {
      notice.remove();
    }
  }

  function feedbackDomMatches(report) {
    if (!report?.reports?.length || report.strategyVersion !== '2.0') return false;
    const title = document.querySelector('#feedbackTitle')?.textContent?.trim();
    if (title !== String(report.title || '').trim()) return false;
    const cards = [...document.querySelectorAll('#decisionReports .report-card')];
    if (cards.length < report.reports.length) return false;
    return report.reports.every((decision, index) => {
      const text = cards[index]?.textContent || '';
      return text.includes(`You: ${decision.chosenLabel}`);
    });
  }

  function enhanceFeedback(report) {
    if (!feedbackDomMatches(report)) return false;
    const cards = [...document.querySelectorAll('#decisionReports .report-card')];
    report.reports.forEach((decision, index) => {
      const card = cards[index];
      if (!card) return;
      card.querySelector('.advanced-mix-detail')?.remove();
      const body = card.children[1] || card;
      const detail = document.createElement('div');
      detail.className = 'advanced-mix-detail';
      const frequency = Math.round((decision.chosenFrequency ?? 0) * 100);
      detail.innerHTML = `
        <div><b>Approximate v2 mix</b><span>${escapeHtml(decision.mixText || '')}</span></div>
        <div><b>Your action frequency</b><span>${frequency}% in this training model</span></div>
        ${decision.rangeReference ? `<div class="range-reference"><b>Range reference</b><span>${escapeHtml(decision.rangeReference)}</span></div>` : ''}`;
      body.appendChild(detail);
    });
    return true;
  }

  function scheduleFeedbackEnhancement(report, attempt = 0) {
    if (enhanceFeedback(report)) return;
    if (attempt >= 12) return;
    setTimeout(() => scheduleFeedbackEnhancement(report, attempt + 1), 25 + attempt * 10);
  }

  // Run once at startup. There are deliberately no MutationObservers here.
  // Feedback enhancement is tied to the exact grade response, preventing a prior
  // hand's mixed-strategy details from being attached to the next hand's review.
  insertStrategyControl();
  updateVersionLabels();
})();
