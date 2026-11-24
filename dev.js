// Server produksi & lokal. Jalankan: npm start atau npm run dev
try { process.loadEnvFile(require('path').join(__dirname, '.env')); } catch {}
const http = require('http'), fs = require('fs'), path = require('path');
const app = require('./api/qa-app'), proxy = require('./api/qa-proxy');
const PUB = path.join(__dirname, 'public');
const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const m = u.pathname.match(/^\/__qa\/api\/([^/]+)$/);
  if (m) { u.searchParams.set('r', m[1]); req.url = u.pathname + u.search; return app(req, res); }

  if (u.pathname.startsWith('/__qa/')) {
    let f = path.join(PUB, decodeURIComponent(u.pathname));
    if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
    if (!f.startsWith(PUB) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', type[path.extname(f)] || 'application/octet-stream');
    return res.end(fs.readFileSync(f));
  }

  u.searchParams.set('p', u.pathname);
  req.url = '/?' + u.searchParams;
  proxy(req, res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT} -> buka /__qa/`);
  const e = process.env;
  console.log(`env: QA_PASSWORD ${e.QA_PASSWORD ? 'ok' : 'KOSONG'}, SUPABASE_URL ${e.SUPABASE_URL ? 'ok' : 'KOSONG'}, SUPABASE_SERVICE_KEY ${e.SUPABASE_SERVICE_KEY ? 'ok' : 'KOSONG'}`);
});