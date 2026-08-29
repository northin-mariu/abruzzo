/* Abruzzo picks — the shared notebook behind the hearts.
 *
 * A Cloudflare Worker with one KV namespace bound as PICKS.
 *   GET    /picks            -> { "Frances": ["id", ...], "Lyndsey": [...] }
 *   PUT    /picks/:name      body { "ids": ["id", ...] }   (replaces that person's hearts)
 *   DELETE /picks/:name
 *   GET    /tips             -> { "Vero": [{ n, t, w, u, ts }, ...] }
 *   PUT    /tips/:name       body { "tips": [...] }        (replaces that person's tips)
 *   DELETE /tips/:name
 *
 * Tips are the places the group adds themselves. They are free text, so they cannot ride in
 * the picks array (those ids are matched against [a-z0-9-]); they get their own `t:` prefix in
 * the same namespace. Same shape, same last-write-wins rule, no new binding.
 *
 * Deploy (once, in the Cloudflare dashboard - no tools needed):
 *   Workers & Pages -> Create -> Start with Hello World -> name it abruzzo-picks -> Deploy
 *   Edit code -> replace everything with this file -> Deploy
 *   Settings -> Bindings -> Add -> KV namespace -> variable name PICKS -> create namespace "abruzzo-picks"
 *   Copy the worker URL (https://abruzzo-picks.<account>.workers.dev) into SYNC in app.js
 *
 * No secrets: the site is public, so anyone could write here. Names are capped at 24 characters,
 * ids at 400 per person, and the whole thing can be wiped by deleting the namespace.
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const json = (o, status = 200) => new Response(JSON.stringify(o), {
      status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });

    const parts = new URL(request.url).pathname.split('/').filter(Boolean);
    const root = parts[0];
    if (root !== 'picks' && root !== 'tips') return json({ error: 'not found' }, 404);
    const prefix = root === 'picks' ? 'p:' : 't:';

    // one tip, trimmed to what a tile can show: name, town, why, link, when
    const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
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

    if (root === 'tips') {
      if (parts.length === 1 && request.method === 'GET') {
        const out = {};
        let cursor;
        do {
          const page = await env.PICKS.list({ prefix, cursor });
          for (const k of page.keys) {
            const v = await env.PICKS.get(k.name, 'json');
            if (v && Array.isArray(v.tips)) out[k.name.slice(2)] = v.tips;
          }
          cursor = page.list_complete ? undefined : page.cursor;
        } while (cursor);
        return json(out);
      }
      if (parts.length === 2) {
        let name;
        try { name = decodeURIComponent(parts[1]).trim().slice(0, 24); } catch { return json({ error: 'name' }, 400); }
        if (!name) return json({ error: 'name' }, 400);
        if (request.method === 'PUT') {
          let body;
          try { body = await request.json(); } catch { return json({ error: 'json' }, 400); }
          const tips = (Array.isArray(body.tips) ? body.tips : [])
            .map(clean).filter(Boolean).slice(0, 40);
          await env.PICKS.put(prefix + name, JSON.stringify({ tips, t: Date.now() }));
          return json({ ok: true, name, n: tips.length });
        }
        if (request.method === 'DELETE') {
          await env.PICKS.delete(prefix + name);
          return json({ ok: true, name });
        }
      }
      return json({ error: 'method' }, 405);
    }

    if (parts.length === 1 && request.method === 'GET') {
      const out = {};
      let cursor;
      do {
        const page = await env.PICKS.list({ prefix: 'p:', cursor });
        for (const k of page.keys) {
          const v = await env.PICKS.get(k.name, 'json');
          if (v && Array.isArray(v.ids)) out[k.name.slice(2)] = v.ids;
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return json(out);
    }

    if (parts.length === 2) {
      let name;
      try { name = decodeURIComponent(parts[1]).trim().slice(0, 24); } catch { return json({ error: 'name' }, 400); }
      if (!name) return json({ error: 'name' }, 400);

      if (request.method === 'PUT') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'json' }, 400); }
        const ids = (Array.isArray(body.ids) ? body.ids : [])
          .filter(s => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s))
          .slice(0, 400);
        await env.PICKS.put('p:' + name, JSON.stringify({ ids, t: Date.now() }));
        return json({ ok: true, name, n: ids.length });
      }
      if (request.method === 'DELETE') {
        await env.PICKS.delete('p:' + name);
        return json({ ok: true, name });
      }
    }
    return json({ error: 'method' }, 405);
  },
};
