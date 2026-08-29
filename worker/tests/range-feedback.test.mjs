import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichGradeReport } from '../src/range-feedback.js';

function report(ruleId, explanation = 'Decision explanation.') {
  return {
    reports: [{ ruleId, explanation }],
  };
}

test('opening feedback includes the exact position range', () => {
  const enriched = enrichGradeReport(report('opening'), {
    heroPosition: 'HJ',
    handClass: '55',
  });
  const text = enriched.reports[0].explanation;
  assert.match(text, /HJ opening range = 22\+, A9s\+, ATo\+, KJs\+, KQo, QJs/);
  assert.match(text, /Everything else folds/);
});

test('facing-open feedback shows both 3-bet and call ranges', () => {
  const enriched = enrichGradeReport(report('facing-open'), {
    heroPosition: 'BTN',
    opponentPosition: 'CO',
    handClass: 'AQo',
  });
  const text = enriched.reports[0].explanation;
  assert.match(text, /vs CO open/);
  assert.match(text, /3-bet = JJ\+, AKs, AKo, AQs/);
  assert.match(text, /call = 77-TT, AQo, AJs, ATs, KQs, KJs, QJs, JTs/);
});

test('Big Blind feedback shows re-raise and calling ranges', () => {
  const enriched = enrichGradeReport(report('bb-defense'), {
    heroPosition: 'BB',
    opponentPosition: 'BTN',
    handClass: '87s',
  });
  const text = enriched.reports[0].explanation;
  assert.match(text, /BB vs BTN/);
  assert.match(text, /3-bet = TT\+, AQs\+, AQo\+, AJs, KQs/);
  assert.match(text, /call = 22\+, A2s\+, A2o\+/);
});

test('squeeze feedback states the late-position squeeze range', () => {
  const enriched = enrichGradeReport(report('squeeze'), {
    heroPosition: 'SB',
    opponentPosition: 'CO',
    handClass: 'AQo',
  });
  assert.match(enriched.reports[0].explanation, /squeeze = QQ\+, AKs, AKo, JJ, AQs/);
});
