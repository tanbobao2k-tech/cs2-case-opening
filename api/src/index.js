// API tài khoản + lưu tiến trình cho Mở Hòm CS2 — Cloudflare Worker + D1
// Endpoints (JSON):
//   POST /register {name,password}      → {token,name}
//   POST /login    {name,password}      → {token,name}
//   GET  /me                            → {name, updated}
//   GET  /state                         → {data, updated}   (data = {inv, stats})
//   PUT  /state    {data}               → {updated}
//   POST /password {old,new}            → {ok}
//   POST /logout                        → {ok}
//   DELETE /account {password}          → {ok}
//   GET  /top                           → {top:[{name,worth,opened}]}

const MAX_STATE_BYTES = 1_500_000;
const PBKDF2_ITER = 100_000;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

function cors(req, env) {
  const origin = req.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));
const randomHex = (n) => toHex(crypto.getRandomValues(new Uint8Array(n)));

async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITER, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}
const safeEqual = (a, b) => a.length === b.length && [...a].every((c, i) => c === b[i]);

const validName = (n) => typeof n === 'string' && /^[\p{L}\p{N} _.-]{1,20}$/u.test(n);
const validPass = (p) => typeof p === 'string' && p.length >= 4 && p.length <= 64;

async function readBody(req) {
  try { return await req.json(); } catch { return {}; }
}

async function auth(req, env) {
  const h = req.headers.get('Authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : new URL(req.url).searchParams.get('token');
  if (!token) return null;
  const row = await env.DB.prepare('SELECT u.id, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').bind(token).first();
  return row ? { ...row, token } : null;
}

async function createSession(env, userId) {
  const token = randomHex(32);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created) VALUES (?, ?, ?)').bind(token, userId, Date.now()).run();
  return token;
}

export default {
  async fetch(req, env) {
    const headers = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const reply = (data, status) => json(data, status, headers);

    try {
      if (path === '/' ) return reply({ ok: true, service: 'cs2-case-opening-api' });

      if (path === '/register' && req.method === 'POST') {
        const { name, password } = await readBody(req);
        if (!validName(name)) return reply({ error: 'Tên 1–20 ký tự: chữ, số, khoảng trắng, . _ -' }, 400);
        if (!validPass(password)) return reply({ error: 'Mật khẩu 4–64 ký tự.' }, 400);
        const exists = await env.DB.prepare('SELECT id FROM users WHERE name = ? COLLATE NOCASE').bind(name).first();
        if (exists) return reply({ error: 'Tên này đã có người dùng. Hãy đăng nhập hoặc chọn tên khác.' }, 409);
        const salt = randomHex(16);
        const hash = await hashPassword(password, salt);
        const res = await env.DB.prepare('INSERT INTO users (name, salt, hash, created) VALUES (?, ?, ?, ?)').bind(name, salt, hash, Date.now()).run();
        const token = await createSession(env, res.meta.last_row_id);
        return reply({ token, name });
      }

      if (path === '/login' && req.method === 'POST') {
        const { name, password } = await readBody(req);
        const user = validName(name) ? await env.DB.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE').bind(name).first() : null;
        if (!user) return reply({ error: 'Không tìm thấy tài khoản này.' }, 404);
        const hash = await hashPassword(String(password || ''), user.salt);
        if (!safeEqual(hash, user.hash)) return reply({ error: 'Sai mật khẩu.' }, 401);
        const token = await createSession(env, user.id);
        return reply({ token, name: user.name });
      }

      if (path === '/top' && req.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT u.name, s.worth, s.opened, s.updated FROM states s JOIN users u ON u.id = s.user_id ORDER BY s.worth DESC LIMIT 20').all();
        return reply({ top: results });
      }

      // ---- cần đăng nhập ----
      const me = await auth(req, env);
      if (!me) return reply({ error: 'Chưa đăng nhập hoặc phiên hết hạn.' }, 401);

      if (path === '/me') return reply({ name: me.name });

      if (path === '/state' && req.method === 'GET') {
        const row = await env.DB.prepare('SELECT data, updated FROM states WHERE user_id = ?').bind(me.id).first();
        return reply(row ? { data: JSON.parse(row.data), updated: row.updated } : { data: null, updated: 0 });
      }

      if (path === '/state' && req.method === 'PUT') {
        const text = await req.text();
        if (text.length > MAX_STATE_BYTES) return reply({ error: 'Dữ liệu quá lớn.' }, 413);
        let body; try { body = JSON.parse(text); } catch { return reply({ error: 'JSON không hợp lệ.' }, 400); }
        const data = body?.data;
        if (!data || typeof data !== 'object' || !Array.isArray(data.inv) || typeof data.stats !== 'object') return reply({ error: 'Thiếu inv/stats.' }, 400);
        const worth = Number(data.stats.balance || 0) + data.inv.reduce((s, i) => s + (Number(i.price) || 0), 0);
        const opened = Number(data.stats.opened || 0);
        const updated = Date.now();
        await env.DB.prepare(
          'INSERT INTO states (user_id, data, worth, opened, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, worth = excluded.worth, opened = excluded.opened, updated = excluded.updated'
        ).bind(me.id, JSON.stringify(data), worth, opened, updated).run();
        return reply({ updated });
      }

      if (path === '/password' && req.method === 'POST') {
        const { old: oldPw, new: newPw } = await readBody(req);
        if (!validPass(newPw)) return reply({ error: 'Mật khẩu mới 4–64 ký tự.' }, 400);
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first();
        if (!safeEqual(await hashPassword(String(oldPw || ''), user.salt), user.hash)) return reply({ error: 'Mật khẩu hiện tại không đúng.' }, 401);
        const salt = randomHex(16);
        await env.DB.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?').bind(salt, await hashPassword(newPw, salt), me.id).run();
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').bind(me.id, me.token).run();
        return reply({ ok: true });
      }

      if (path === '/logout' && req.method === 'POST') {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(me.token).run();
        return reply({ ok: true });
      }

      if (path === '/account' && req.method === 'DELETE') {
        const { password } = await readBody(req);
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(me.id).first();
        if (!safeEqual(await hashPassword(String(password || ''), user.salt), user.hash)) return reply({ error: 'Sai mật khẩu.' }, 401);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(me.id),
          env.DB.prepare('DELETE FROM states WHERE user_id = ?').bind(me.id),
          env.DB.prepare('DELETE FROM users WHERE id = ?').bind(me.id),
        ]);
        return reply({ ok: true });
      }

      return reply({ error: 'Không tìm thấy.' }, 404);
    } catch (e) {
      return reply({ error: 'Lỗi máy chủ: ' + (e.message || e) }, 500);
    }
  },
};
