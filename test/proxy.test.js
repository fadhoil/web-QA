const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
process.env.QA_PASSWORD = 'pw';
const { token, badHost } = require('../api/_lib');
const proxy = require('../api/qa-proxy');

const listen = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(s.address().port)));

test('hook disisipkan sesudah doctype meski didahului <?xml?> (mode render tidak berubah)', async () => {
  const target = http.createServer((q, s) => {
    s.setHeader('content-type', 'text/html');
    s.end('<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n<html><head></head><body>x</body></html>');
  });
  const tp = await listen(target), app = http.createServer(proxy), ap = await listen(app);
  const ck = `qa_auth=${token()}; qa_origin=${encodeURIComponent('http://127.0.0.1:' + tp)}`;
  const html = await (await fetch(`http://127.0.0.1:${ap}/?p=/`, { headers: { cookie: ck } })).text();
  assert.ok(html.indexOf('<!DOCTYPE') < html.indexOf('/__qa/hook.js'), 'hook harus sesudah doctype');
  target.close(); app.close();
});

test('proxy: strip frame headers, rewrite origin, forward body+cookie, auth, ssrf', async () => {
  const seen = {};
  const target = http.createServer(async (q, s) => {
    const c = []; for await (const x of q) c.push(x);
    seen.body = Buffer.concat(c).toString(); seen.cookie = q.headers.cookie;
    s.setHeader('x-frame-options', 'DENY');
    s.setHeader('set-cookie', 'sid=1; Domain=example.com; Path=/');
    s.setHeader('content-type', 'text/html');
    s.end(`<html><head></head><a href="http://127.0.0.1:${tp}/x">x</a>`);
  });
  const tp = await listen(target);
  const app = http.createServer(proxy);
  const ap = await listen(app);
  const ck = `qa_auth=${token()}; qa_origin=${encodeURIComponent('http://127.0.0.1:' + tp)}; sid=0`;

  const r = await fetch(`http://127.0.0.1:${ap}/?p=/login`, { method: 'POST', body: 'a=1', headers: { cookie: ck } });
  const html = await r.text();
  assert.equal(r.headers.get('x-frame-options'), null);
  assert.ok(!/domain=/i.test(r.headers.get('set-cookie')));
  assert.ok(html.includes(`http://127.0.0.1:${ap}/x`));
  assert.ok(html.includes('/__qa/hook.js'));
  assert.equal(seen.body, 'a=1');
  assert.equal(seen.cookie, 'sid=0');

  const bad = await fetch(`http://127.0.0.1:${ap}/?p=/`);
  assert.equal(bad.status, 401);
  assert.ok(badHost('localhost') && badHost('10.0.0.5') && badHost('169.254.169.254') && !badHost('example.com'));
  target.close(); app.close();
});
