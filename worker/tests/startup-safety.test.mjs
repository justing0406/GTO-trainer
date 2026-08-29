import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const configUrl = new URL('../../web/config.js', import.meta.url);

test('Advanced v2 startup does not observe and rewrite the Rulebook DOM', async () => {
  const source = await readFile(configUrl, 'utf8');
  assert.equal(/MutationObserver\s*\(\s*updateVersionLabels\s*\)/.test(source), false);
  assert.equal(/observe\s*\(\s*rulebook\b/.test(source), false);
});

test('Advanced v2 installs only one fetch wrapper in the live startup file', async () => {
  const source = await readFile(configUrl, 'utf8');
  const wrappers = source.match(/window\.fetch\s*=\s*async/g) || [];
  assert.equal(wrappers.length, 1);
});
