/* Abruzzo picks — the shared notebook behind the hearts.
 *
 * A Cloudflare Worker with one KV namespace bound as PICKS.
 *   GET    /picks            -> { "Frances": ["id", ...], "Lyndsey": [...], "_plan": [...] }
 *   GET    /picks/:name      -> { "ids": [...], "t": <ms> }   (one record; 404 if none)
 *   PUT    /picks/:name      body { "ids": ["id", ...] }   (replaces that person's hearts)
 *   DELETE /picks/:name
 *   GET    /picks/_plan/backup/YYYY-MM-DD -> the plan as it stood at that day's first write
 *   GET    /picks/_plan/backup/wiped      -> the plan as it stood just before it was last emptied
 *   GET    /tips             -> { "Vero": [{ n, t, w, u, ts }, ...] }
 *   PUT    /tips/:name       body { "tips": [...] }        (replaces that person's tips)
 *   DELETE /tips/:name
 *
 * Tips are the places the group adds themselves. They are free text, so they cannot ride in
 * the picks array (those ids are matched against [a-z0-9-]); they get their own `t:` prefix in
 * the same namespace. Same shape, same last-write-wins rule, no new binding.
 *
 * The index (2026-08-30). Each prefix keeps one small key, `p:_index` / `t:_index`, holding
 * the list of names. Reading the whole notebook is then one get for the index plus one per
 * person, in parallel - and never a KV `list`, which the free plan caps at 1,000 a day. Before
 * this, every poll from every phone spent a list, so seven phones would have used the day's
 * allowance in about ninety minutes. The index is built from the existing keys the first time
 * it is missing (one list, once), added to on a PUT from a new name, and trimmed on DELETE.
 * Two brand-new names writing in the same second could leave one out; that person's next tap
 * puts them back, because every PUT re-checks. Reads: ~100k a day allowed, so roughly thirty
 * phone-hours of the site open in the foreground per day before that matters.
 *
 * Names: NFC-normalised, invisible characters stripped, 24 characters, no leading underscore
 * except exactly "_plan" (the calendar) on /picks. At most 32 names per prefix - the 33rd gets
 * 507, so a stranger with curl cannot make every poll cost a thousand reads.
 *
 * The plan is one document rewritten in full by every phone, so it is also backed up: the first
 * write of each UTC day keeps the previous value under bak:_plan:<date> (kept 60 days), and any
 * write that empties a non-empty plan keeps the value it replaced under bak:_plan:wiped. To
 * restore: GET the backup, PUT its ids back to /picks/_plan.
 *
 * Deploy (in the Cloudflare dashboard):
 *   Workers & Pages -> abruzzo-picks -> Edit code -> replace everything with this file -> Deploy
 *   Bindings: KV namespace, variable name PICKS, namespace "abruzzo-picks" (already set)
 *   The worker URL (https://abruzzo-picks.<account>.workers.dev) is SYNC in app.js
 *
 * No secrets: the site is public, so anyone could write here. Names are capped at 24 characters,
 * ids at 400 per person, tips at 40, bodies at 64 KB, and the whole thing can be wiped by
 * deleting the namespace. Errors come back as JSON with CORS headers, so a phone can tell
 * "over quota" from "no signal".
 */
const ID_RE = /^[a-z0-9-]{1,80}$/;
const PLAN_RE = /^d\d{1,2}--[a-z]+--[a-z0-9-]+--[a-z0-9-]+--b[01]$/;
const BODY_MAX = 65536;
const NAMES_MAX = 32;
const INVISIBLE = /[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const json = (o, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

function cleanName(raw) {
  let v = String(raw || '');
  try { v = v.normalize('NFC'); } catch {}
  v = v.replace(INVISIBLE, '').replace(/\s+/g, ' ').trim().slice(0, 24).trim();
  return v;
}

async function handle(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const root = parts[0];
  if (root !== 'picks' && root !== 'tips') return json({ error: 'not found' }, 404);
  const prefix = root === 'picks' ? 'p:' : 't:';
  const field = root === 'picks' ? 'ids' : 'tips';
  const INDEX = prefix + '_index';

  async function readIndex() {
    const idx = await env.PICKS.get(INDEX, 'json');
    if (Array.isArray(idx)) return idx.filter((n) => typeof n === 'string' && n);
    // first request since the index was introduced: build it from the keys that exist, once
    const names = [];
    let cursor;
    do {
      const page = await env.PICKS.list({ prefix, cursor });
      for (const k of page.keys) {
        const n = k.name.slice(prefix.length);
        if (n && n !== '_index' && names.length < NAMES_MAX) names.push(n);
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    await env.PICKS.put(INDEX, JSON.stringify(names));
    return names;
  }
  // true if the name is (now) in the index; false if the index is full
  async function indexAdd(name) {
    const idx = await readIndex();
    if (idx.includes(name)) return true;
    if (idx.length >= NAMES_MAX) return false;
    idx.push(name);
    await env.PICKS.put(INDEX, JSON.stringify(idx));
    return true;
  }
  async function indexDrop(name) {
    const idx = await readIndex();
    if (!idx.includes(name)) return;
    await env.PICKS.put(INDEX, JSON.stringify(idx.filter((n) => n !== name)));
  }

  // one tip, trimmed to what a tile can show: name, town, why, link, when
  // trim to length, then repair what the cut may have done: a sliced emoji leaves a lone
  // surrogate half, and a lone half makes encodeURIComponent throw on every phone that renders it
  const str = (v, max) => {
    if (typeof v !== 'string') return '';
    return v.trim().slice(0, max)
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
      .replace(/^[\uDC00-\uDFFF]/, '');
  };
  const clean = (o) => {
    if (!o || typeof o !== 'object') return null;
    const n = str(o.n, 70);
    if (!n) return null;
    const u = str(o.u, 300);
    return {
      n, t: str(o.t, 40), w: str(o.w, 400),
      u: /^https?:\/\//i.test(u) ? u : '',
      ts: Number.isFinite(o.ts) ? o.ts : Date.now(),
    };
  };

  if (parts.length === 1 && request.method === 'GET') {
    const names = await readIndex();
    const vals = await Promise.all(names.map((n) => env.PICKS.get(prefix + n, 'json')));
    const out = {};
    names.forEach((n, i) => {
      const v = vals[i];
      if (v && Array.isArray(v[field])) out[n] = v[field];
    });
    return json(out);
  }

  if (parts.length >= 2) {
    let name;
    try { name = cleanName(decodeURIComponent(parts[1])); } catch { return json({ error: 'name' }, 400); }
    if (!name || !/[a-z0-9]/i.test(name) || name.charAt(0) === '.') return json({ error: 'name' }, 400);
    if (name.charAt(0) === '_' && !(root === 'picks' && name === '_plan')) return json({ error: 'name' }, 400);

    // GET /picks/_plan/backup/<date|wiped>
    if (parts.length === 4 && parts[2] === 'backup' && request.method === 'GET') {
      if (name !== '_plan') return json({ error: 'not found' }, 404);
      const which = /^\d{4}-\d{2}-\d{2}$/.test(parts[3]) || parts[3] === 'wiped' ? parts[3] : '';
      if (!which) return json({ error: 'not found' }, 404);
      const v = await env.PICKS.get('bak:_plan:' + which, 'json');
      return v ? json(v) : json({ error: 'not found' }, 404);
    }
    if (parts.length !== 2) return json({ error: 'not found' }, 404);

    if (request.method === 'GET') {
      const v = await env.PICKS.get(prefix + name, 'json');
      return v ? json(v) : json({ error: 'not found' }, 404);
    }
    if (request.method === 'PUT') {
      const len = Number(request.headers.get('content-length'));
      if (len > BODY_MAX) return json({ error: 'too big' }, 413);
      let body;
      try {
        // the header can lie or be absent (chunked): measure what actually arrived
        const text = await request.text();
        if (text.length > BODY_MAX) return json({ error: 'too big' }, 413);
        body = JSON.parse(text);
      } catch { return json({ error: 'json' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'json' }, 400);
      const value = root === 'picks'
        ? (Array.isArray(body.ids) ? body.ids : [])
            // _plan holds only plan-shaped ids: a person who somehow ends up named "_plan" on an
            // old build then writes an empty list (recoverable from the backup), not their hearts
            .filter((s) => typeof s === 'string' && ID_RE.test(s) && (name !== '_plan' || PLAN_RE.test(s)))
            .slice(0, 400)
        : (Array.isArray(body.tips) ? body.tips : [])
            .map(clean).filter(Boolean).slice(0, 40);
      if (root === 'picks' && name === '_plan') {
        // keep what a wipe or a bad day would otherwise destroy
        const prev = await env.PICKS.get('p:_plan', 'json');
        if (prev && Array.isArray(prev.ids) && prev.ids.length) {
          const day = new Date().toISOString().slice(0, 10);
          const dayKey = 'bak:_plan:' + day;
          if (!(await env.PICKS.get(dayKey))) {
            await env.PICKS.put(dayKey, JSON.stringify(prev), { expirationTtl: 60 * 86400 });
          }
          if (!value.length) await env.PICKS.put('bak:_plan:wiped', JSON.stringify(prev));
        }
      }
      const record = { t: Date.now() };
      record[field] = value;
      await env.PICKS.put(prefix + name, JSON.stringify(record));
      if (!(await indexAdd(name))) {
        await env.PICKS.delete(prefix + name);
        return json({ error: 'full' }, 507);
      }
      return json({ ok: true, name, n: value.length });
    }
    if (request.method === 'DELETE') {
      await env.PICKS.delete(prefix + name);
      await indexDrop(name);
      return json({ ok: true, name });
    }
  }
  return json({ error: 'method' }, 405);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (e) {
      // a KV quota or storage error used to surface as Cloudflare's HTML 1101 page with no CORS
      // headers, which a phone cannot tell apart from having no signal
      return json({ error: 'storage', detail: String(e && e.message || e).slice(0, 200) }, 503);
    }
  },
};
