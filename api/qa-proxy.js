// Reverse proxy: every path not owned by the QA app goes to the target origin (cookie qa_origin).
// Same-origin with the QA UI, so the UI can read/drive the iframe DOM.
const { authed, parse, readBody } = require('./_lib');

const DROP = ['content-encoding', 'content-length', 'transfer-encoding', 'connection',
  'x-frame-options', 'content-security-policy', 'content-security-policy-report-only',
  'strict-transport-security', 'set-cookie'];

module.exports = async (req, res) => {
  if (!authed(req)) { res.statusCode = 401; return res.end('login dulu di /__qa/'); }
  const ck = parse(req.headers.cookie);
  if (!ck.qa_origin) { res.statusCode = 302; res.setHeader('location', '/__qa/'); return res.end(); }
  const origin = decodeURIComponent(ck.qa_origin);

  const u = new URL(req.url, 'http://x');
  const p = u.searchParams.get('p') || '/';
  u.searchParams.delete('p');
  const target = origin + p + u.search;

  const h = {};
  for (const k of ['accept', 'accept-language', 'content-type', 'user-agent', 'x-requested-with', 'authorization'])
    if (req.headers[k]) h[k] = req.headers[k];
  const cookie = Object.entries(ck).filter(([k]) => k !== 'qa_auth' && k !== 'qa_origin')
    .map(([k, v]) => k + '=' + v).join('; ');
  if (cookie) h.cookie = cookie;
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  if (hasBody) { h.origin = origin; h.referer = origin + '/'; }

  let r;
  try {
    r = await fetch(target, { method: req.method, headers: h, body: hasBody ? await readBody(req) : undefined, redirect: 'manual' });
  } catch (e) { res.statusCode = 502; return res.end('proxy gagal: ' + e.message); }

  const self = (req.headers['x-forwarded-proto'] || 'http') + '://' + req.headers.host;
  res.statusCode = r.status;
  r.headers.forEach((v, k) => {
    if (DROP.includes(k)) return;
    res.setHeader(k, k === 'location' ? v.split(origin).join(self) : v);
  });
  const sc = r.headers.getSetCookie().map(c => c.replace(/;\s*domain=[^;]*/i, ''));
  if (sc.length) res.setHeader('set-cookie', sc);

  let body = Buffer.from(await r.arrayBuffer());
  if (/html|javascript|css/.test(r.headers.get('content-type') || '')) {
    const host = new URL(origin).host;
    // shortcut: plain string swap of the target origin; URLs built at runtime in JS are not caught
    let text = body.toString().split(origin).join(self).split('//' + host).join('//' + req.headers.host);
    const dest = req.headers['sec-fetch-dest']; // fragmen AJAX tidak diberi hook
    if (/html/.test(r.headers.get('content-type') || '') && (!dest || /^(document|iframe|frame)$/.test(dest))) {
      // hook.js harus jalan SEBELUM script halaman: window.open/close/opener dan penangkap klik tab baru.
      // Disisipkan paling awal (setelah doctype bila ada); script Response.Write sebelum <html> pun terhook.
      const hook = '<script src="/__qa/hook.js"></script>';
      // Selalu SESUDAH doctype (meski didahului <?xml ...?> atau komentar), agar mode standar/quirks halaman tidak berubah.
      const dt = /<!doctype[^>]*>/i.exec(text.slice(0, 4096));
      text = dt ? text.slice(0, dt.index + dt[0].length) + hook + text.slice(dt.index + dt[0].length) : hook + text;
    }
    body = Buffer.from(text);
  }
  res.end(body);
};
