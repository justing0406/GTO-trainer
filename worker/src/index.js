import { RULEBOOK_VERSION, RULEBOOK_SECTIONS, GLOSSARY, OPENING_RANGE_SPECS, BIG_BLIND_DEFENSE_SPECS } from './rules.js';
import { CATEGORY_META, generateScenario, gradeScenario, listScriptedHands, publicScenario, resolveScenario } from './scenarios.js';
import { enrichGradeReport } from './range-feedback.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const allowed = String(env?.ALLOWED_ORIGIN || '*');
  const allowOrigin = allowed === '*' ? '*' : (origin === allowed ? origin : allowed);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status, request, env, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request, env), ...extra },
  });
}

async function parseJson(request) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) throw new Error('Content-Type must be application/json');
  return request.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (!url.pathname.startsWith('/api/')) {
      if (env?.ASSETS?.fetch) {
        return env.ASSETS.fetch(request);
      }

      // Useful fallback for direct unit tests where the Cloudflare ASSETS binding
      // does not exist. Production requests are always served by ASSETS here.
      return json({
        name: 'GTO Trainer',
        version: RULEBOOK_VERSION,
        message: 'Static asset binding is unavailable in this environment.',
      }, 200, request, env);
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return json({
          ok: true,
          service: 'gto-trainer',
          rulebookVersion: RULEBOOK_VERSION,
          scriptedHands: listScriptedHands().length,
          time: new Date().toISOString(),
        }, 200, request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/meta') {
        return json({
          rulebookVersion: RULEBOOK_VERSION,
          modes: [
            { id: 'hand', label: 'Training Hands', description: 'Scripted multi-street hands with feedback after the hand.' },
            { id: 'drill', label: 'Decision Drills', description: 'Rapid single-decision drills generated from the Version 1.0 rules.' },
          ],
          categories: CATEGORY_META,
          scriptedHands: listScriptedHands(),
        }, 200, request, env, { 'Cache-Control': 'public, max-age=300' });
      }

      if (request.method === 'GET' && url.pathname === '/api/rules') {
        return json({
          version: RULEBOOK_VERSION,
          sections: RULEBOOK_SECTIONS,
          glossary: GLOSSARY.map(([term, definition]) => ({ term, definition })),
          ranges: {
            opening: OPENING_RANGE_SPECS,
            bigBlindDefense: BIG_BLIND_DEFENSE_SPECS,
          },
          grading: [
            { label: 'Perfect', meaning: 'Preferred Version 1.0 action and appropriate size.' },
            { label: 'Correct', meaning: 'Strategically acceptable alternative.' },
            { label: 'Minor Mistake', meaning: 'Defensible but clearly inferior or poorly sized.' },
            { label: 'Major Mistake', meaning: 'Violates an important Version 1.0 rule.' },
          ],
        }, 200, request, env, { 'Cache-Control': 'public, max-age=300' });
      }

      if (request.method === 'GET' && url.pathname === '/api/scenario') {
        const mode = url.searchParams.get('mode') || 'drill';
        const focus = url.searchParams.get('focus') || 'all';
        const seed = url.searchParams.get('seed') || Date.now();
        const scenario = generateScenario({ mode, focus, seed });
        return json(publicScenario(scenario), 200, request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/grade') {
        const body = await parseJson(request);
        const scenario = resolveScenario(body.scenarioKey);
        if (!scenario) return json({ error: 'Unknown scenarioKey' }, 404, request, env);
        if (!Array.isArray(body.decisions)) return json({ error: 'decisions must be an array' }, 400, request, env);
        const validStepIds = new Set(scenario.steps.map(step => step.id));
        const decisions = body.decisions
          .filter(d => validStepIds.has(d.stepId) && typeof d.optionKey === 'string')
          .map(d => ({ stepId: d.stepId, optionKey: d.optionKey }));
        const report = gradeScenario(scenario, decisions);
        return json(enrichGradeReport(report, scenario), 200, request, env);
      }

      return json({ error: 'Not found' }, 404, request, env);
    } catch (error) {
      return json({ error: error?.message || 'Unexpected error' }, 400, request, env);
    }
  }
};
