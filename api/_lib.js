const crypto = require('crypto');

const token = () => crypto.createHash('sha256').update('qa:' + process.env.QA_PASSWORD).digest('hex');

const parse = (h = '') =>
  Object.fromEntries(h.split(';').map(c => c.trim()).filter(Boolean).map(c => {
    const i = c.indexOf('=');
    return [c.slice(0, i), c.slice(i + 1)];
  }));

const authed = req => !!process.env.QA_PASSWORD && parse(req.headers.cookie).qa_auth === token();

// shortcut: literal-host check only, no DNS resolve; upgrade if DNS rebinding matters
const badHost = h =>
  /^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1?\]?$)/.test(h) ||
  h.endsWith('.internal') || h.endsWith('.local');

const readBody = async req => {
  const c = [];
  for await (const x of req) c.push(x);
  return Buffer.concat(c);
};

module.exports = { token, parse, authed, badHost, readBody };
