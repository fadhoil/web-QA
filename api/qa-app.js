const { token, authed, badHost, readBody } = require('./_lib');

const send = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const handle = async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const r = u.searchParams.get('r');

  if (r === 'login') {
    if (!process.env.QA_PASSWORD) return send(res, 500, { error: 'QA_PASSWORD belum diset' });
    let pw;
    try { pw = JSON.parse(await readBody(req)).password; } catch {}
    if (pw !== process.env.QA_PASSWORD) return send(res, 401, { error: 'password salah' });
    res.setHeader('set-cookie', `qa_auth=${token()}; Path=/; HttpOnly; SameSite=Lax; Secure`);
    return send(res, 200, { ok: 1 });
  }

  if (!authed(req)) return send(res, 401, { error: 'login dulu' });
  if (r === 'ping') return send(res, 200, { ok: 1 });

  if (r === 'open') {
    let t;
    try { t = new URL(u.searchParams.get('u')); } catch { return send(res, 400, { error: 'url salah' }); }
    if (!/^https?:$/.test(t.protocol) || (badHost(t.hostname) && !process.env.ALLOW_PRIVATE_HOSTS)) return send(res, 400, { error: 'url ditolak' });
    res.setHeader('set-cookie', `qa_origin=${encodeURIComponent(t.origin)}; Path=/; HttpOnly; SameSite=Lax; Secure`);
    res.statusCode = 302;
    res.setHeader('location', '/' + (t.pathname + t.search).replace(/^\/+/, ''));
    return res.end();
  }

  if (r === 'fetch') { // aset (gambar/font) domain lain untuk screenshot; browser tidak boleh membacanya langsung (CORS)
    let t;
    try { t = new URL(u.searchParams.get('u')); } catch { return send(res, 400, { error: 'url salah' }); }
    if (!/^https?:$/.test(t.protocol) || (badHost(t.hostname) && !process.env.ALLOW_PRIVATE_HOSTS)) return send(res, 400, { error: 'url ditolak' });
    const x = await fetch(t, { redirect: 'manual' });
    const ct = x.headers.get('content-type') || '';
    if (!x.ok || !/^(image\/|font\/|application\/(font|x-font|vnd\.ms-fontobject|octet-stream))/i.test(ct)) return send(res, 415, { error: 'bukan gambar/font' });
    const buf = Buffer.from(await x.arrayBuffer());
    if (buf.length > 5e6) return send(res, 413, { error: 'terlalu besar' });
    res.statusCode = 200; res.setHeader('content-type', ct); return res.end(buf);
  }

  if (r === 'scenarios') {
    const K = (process.env.SUPABASE_SERVICE_KEY || '').trim(), B0 = (process.env.SUPABASE_URL || '').trim();
    if (!K || !B0) return send(res, 501, { error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY tidak terbaca dari env' });
    let role = '';
    try { role = K.startsWith('eyJ') ? JSON.parse(Buffer.from(K.split('.')[1], 'base64url')).role : K.startsWith('sb_publishable_') ? 'anon' : ''; } catch {}
    if (role === 'anon') return send(res, 400, { error: 'SUPABASE_SERVICE_KEY berisi key anon/publishable. Pakai secret key (sb_secret_...) atau service_role.' });
    const B = B0.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    // key baru (sb_secret_...) bukan JWT: hanya boleh dikirim lewat header apikey, bukan Authorization
    const sb = (p, o = {}) => fetch(`${B}/rest/v1/${p}`, {
      ...o, headers: { apikey: K, ...(K.startsWith('eyJ') ? { authorization: 'Bearer ' + K } : {}),
        'content-type': 'application/json', prefer: 'return=representation' },
    });
    const id = u.searchParams.get('id');
    if (id && !/^[0-9a-f-]{36}$/.test(id)) return send(res, 400, { error: 'id salah' });
    if (req.method === 'POST' || req.method === 'PATCH') {
      let b;
      try { b = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'json salah' }); }
      if (!b.name || !Array.isArray(b.data?.steps)) return send(res, 400, { error: 'name + data.steps wajib' });
      const row = JSON.stringify({ name: String(b.name).slice(0, 100), data: b.data });
      if (req.method === 'PATCH' && !id) return send(res, 400, { error: 'id wajib' });
      const x = req.method === 'PATCH'
        ? await sb(`scenarios?id=eq.${id}`, { method: 'PATCH', body: row })
        : await sb('scenarios', { method: 'POST', body: row });
      return send(res, x.status, await x.text());
    }
    const x = await sb(id ? `scenarios?id=eq.${id}&select=*` : 'scenarios?select=id,name,created_at&order=created_at.desc&limit=100');
    return send(res, x.status, await x.text());
  }

  send(res, 404, { error: 'not found' });
};

module.exports = async (req, res) => {
  try { await handle(req, res); }
  catch (e) { send(res, 502, { error: e.message + (e.cause ? ' (' + (e.cause.code || e.cause.message) + ')' : '') }); }
};
