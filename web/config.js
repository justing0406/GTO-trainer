// One Cloudflare Worker serves the UI and /api/*.
localStorage.removeItem('gto-trainer-api-base');
window.GTO_CONFIG = { apiBaseUrl: window.location.origin };

(() => {
  const STORAGE_KEY = 'gto-trainer-strategy';
  const MIGRATION_KEY = 'gto-trainer-v3-defaulted';
  let strategy = localStorage.getItem(STORAGE_KEY);

  if (!strategy) strategy = 'v3';
  if (strategy === 'v2' && !localStorage.getItem(MIGRATION_KEY)) {
    strategy = 'v3';
    localStorage.setItem(STORAGE_KEY, 'v3');
  }
  localStorage.setItem(MIGRATION_KEY, '1');
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
          if (!url.searchParams.has('strategy')) url.searchParams.set('strategy', window.GTO_STRATEGY || 'v3');
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
        <option value="v3">EV-Aware v3</option>
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

  function versionInfo() {
    if (window.GTO_STRATEGY === 'v3') {
      return {
        brand: 'EV-Aware v3.0',
        title: 'GTO Trainer · EV-Aware v3.0',
        eyebrow: 'Poker Strategy Rulebook v3.0',
        heading: 'EV-aware solver-inspired rules',
        copy: 'v3 grades decisions by estimated EV loss in big blinds. Mixed frequencies remain visible, but frequency alone no longer determines mistake severity.',
        noticeTitle: 'EV-Aware v3',
        noticeCopy: 'Mistakes are graded by estimated EV loss. If two actions genuinely mix, both are treated as approximately equal-EV even when their frequencies differ.',
      };
    }
    if (window.GTO_STRATEGY === 'v2') {
      return {
        brand: 'Advanced v2.0',
        title: 'GTO Trainer · Advanced v2.0',
        eyebrow: 'Poker Strategy Rulebook v2.0',
        heading: 'Advanced solver-inspired rules',
        copy: 'Rounded mixed frequencies teach GTO-like reasoning without pretending these are exact solver outputs. Exact equilibrium changes with rake, stack depth and sizing.',
        noticeTitle: 'Advanced v2',
        noticeCopy: 'Mixed strategies are normal. A hand may correctly raise 70% and call 30%; feedback shows the approximate mix and explains why.',
      };
    }
    return {
      brand: 'Foundation v1.0',
      title: 'GTO Trainer · Foundation v1.0',
      eyebrow: 'Poker Strategy Rulebook v1.0',
      heading: 'The rules the trainer grades',
      copy: 'These are deliberately simple, deterministic rules. Poker jargon is defined in the glossary below.',
      noticeTitle: '',
      noticeCopy: '',
    };
  }

  function updateVersionLabels() {
    const info = versionInfo();
    const brandSmall = document.querySelector('.brand small');
    if (brandSmall) brandSmall.textContent = info.brand;
    document.title = info.title;

    const mantraHeading = document.querySelector('.quick-rule .panel-title h3');
    if (mantraHeading) mantraHeading.textContent = window.GTO_STRATEGY === 'v1' ? 'V1.0 mantra' : 'Strategy mantra';

    const pageHeading = document.querySelector('#view-rulebook .page-heading');
    if (pageHeading) {
      const eyebrow = pageHeading.querySelector('.eyebrow');
      const heading = pageHeading.querySelector('h1');
      const copy = pageHeading.querySelector('p');
      if (eyebrow) eyebrow.textContent = info.eyebrow;
      if (heading) heading.textContent = info.heading;
      if (copy) copy.textContent = info.copy;
    }

    let notice = document.querySelector('.advanced-notice');
    if (window.GTO_STRATEGY !== 'v1') {
      if (!notice) {
        notice = document.createElement('div');
        notice.className = 'advanced-notice card-panel';
        document.querySelector('.trainer-toolbar')?.insertAdjacentElement('afterend', notice);
      }
      notice.innerHTML = `<strong>${escapeHtml(info.noticeTitle)}</strong><span>${escapeHtml(info.noticeCopy)}</span>`;
    } else if (notice) {
      notice.remove();
    }
  }

  function feedbackDomMatches(report) {
    if (!report?.reports?.length || !['2.0','3.0'].includes(report.strategyVersion)) return false;
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

    if (report.strategyVersion === '3.0') {
      const total = Number(report.overallEvLossBb || 0);
      const average = Number(report.averageEvLossBb || 0);
      const summary = document.querySelector('#feedbackSummary');
      if (summary) {
        summary.textContent = `${total.toFixed(2)} BB total estimated EV loss across ${report.reports.length} decision${report.reports.length === 1 ? '' : 's'} (${average.toFixed(2)} BB average).`;
      }
    }

    report.reports.forEach((decision, index) => {
      const card = cards[index];
      if (!card) return;
      card.querySelector('.advanced-mix-detail')?.remove();
      const body = card.children[1] || card;
      const detail = document.createElement('div');
      detail.className = 'advanced-mix-detail';
      const frequency = Math.round((decision.chosenFrequency ?? 0) * 100);

      if (report.strategyVersion === '3.0') {
        const loss = Number(decision.evLossBb || 0);
        detail.innerHTML = `
          <div class="ev-loss-row"><b>Estimated EV loss</b><span><strong>${loss.toFixed(2)} BB</strong> versus the best modeled action</span></div>
          <div><b>Relative EV</b><span>${Number(decision.relativeEvBb || 0).toFixed(2)} BB</span></div>
          <div><b>Modeled frequency mix</b><span>${escapeHtml(decision.mixText || '')}</span></div>
          <div><b>Your action frequency</b><span>${frequency}% in the underlying v2 strategy model</span></div>
          <div><b>EV source</b><span>Estimated model EV (${escapeHtml(decision.evConfidence || 'heuristic')}); not a solver-exported node EV.</span></div>
          ${decision.rangeReference ? `<div class="range-reference"><b>Range reference</b><span>${escapeHtml(decision.rangeReference)}</span></div>` : ''}`;
      } else {
        detail.innerHTML = `
          <div><b>Approximate v2 mix</b><span>${escapeHtml(decision.mixText || '')}</span></div>
          <div><b>Your action frequency</b><span>${frequency}% in this training model</span></div>
          ${decision.rangeReference ? `<div class="range-reference"><b>Range reference</b><span>${escapeHtml(decision.rangeReference)}</span></div>` : ''}`;
      }
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
  insertStrategyControl();
  updateVersionLabels();
})();
