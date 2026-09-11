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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
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

async function sendAdminNotification(env, { name, approveToken, reqUrl, ip }) {
  const adminEmail = env.ADMIN_EMAIL;
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !adminEmail || adminEmail === 'your_email@gmail.com') {
    console.warn('[Email] Chưa cấu hình RESEND_API_KEY hoặc ADMIN_EMAIL hợp lệ; bỏ qua gửi mail.');
    return false;
  }
  const origin = new URL(reqUrl).origin;
  const approveUrl = `${origin}/approve?token=${approveToken}`;
  const rejectUrl = `${origin}/reject?token=${approveToken}`;
  const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 24px; background-color: #0b0e13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #d1d7df;">
      <div style="max-width: 560px; margin: 0 auto; background: #151a23; border: 1px solid #262f3d; border-radius: 14px; padding: 32px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);">
        <div style="border-bottom: 1px solid #262f3d; padding-bottom: 18px; margin-bottom: 22px;">
          <h2 style="margin: 0; font-size: 22px; color: #ffd700; display: flex; align-items: center; gap: 8px;">
            ▣ Mở Hòm CS2 — Yêu Cầu Duyệt Tài Khoản
          </h2>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #cfd8dc; margin-bottom: 20px;">
          Xin chào Quản trị viên, vừa có một tài khoản mới đăng ký và đang chờ bạn phê duyệt trước khi có thể đăng nhập:
        </p>
        <div style="background: #0d1117; border-radius: 10px; padding: 18px; margin-bottom: 26px; border-left: 4px solid #00f5a0;">
          <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>👤 Tên tài khoản:</strong> <span style="color: #00f5a0; font-size: 17px; font-weight: bold;">${name}</span></p>
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>⏰ Thời gian đăng ký:</strong> ${timeStr}</p>
          ${ip ? `<p style="margin: 0; font-size: 14px;"><strong>🌐 Địa chỉ IP:</strong> ${ip}</p>` : ''}
        </div>
        <p style="font-size: 14px; color: #90a4ae; margin-bottom: 24px;">
          Vui lòng bấm vào nút bên dưới để chấp nhận hoặc từ chối tài khoản này:
        </p>
        <div style="display: flex; gap: 14px; margin: 28px 0; text-align: center;">
          <a href="${approveUrl}" style="display: inline-block; background: #00f5a0; color: #081512; text-decoration: none; padding: 13px 30px; font-weight: 700; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 18px rgba(0, 245, 160, 0.4); margin-right: 12px;">
            ✔ PHÊ DUYỆT TÀI KHOẢN
          </a>
          <a href="${rejectUrl}" style="display: inline-block; background: #261e20; color: #ff5252; text-decoration: none; padding: 13px 22px; font-weight: 600; border-radius: 8px; font-size: 14px; border: 1px solid #5a2626;">
            ✖ Từ chối
          </a>
        </div>
        <div style="border-top: 1px solid #232b38; padding-top: 18px; font-size: 12px; color: #607182; line-height: 1.6;">
          Nếu nút không bấm được, bạn có thể copy link này mở trên trình duyệt:<br>
          <a href="${approveUrl}" style="color: #00f5a0; word-break: break-all;">${approveUrl}</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const fromSender = env.RESEND_FROM || 'Mở Hòm CS2 <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromSender,
        to: [adminEmail],
        subject: `[CS2 Case] Yêu cầu duyệt tài khoản: ${name}`,
        html,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Resend Exception]', err);
    return false;
  }
}

async function sendTopupNotification(env, { name, amount, fee, approveToken, reqUrl, ip }) {
  const adminEmail = env.ADMIN_EMAIL;
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey || !adminEmail || adminEmail === 'your_email@gmail.com') {
    console.warn('[Email] Chưa cấu hình RESEND_API_KEY hoặc ADMIN_EMAIL hợp lệ; bỏ qua gửi mail.');
    return false;
  }
  const origin = new URL(reqUrl).origin;
  const approveUrl = `${origin}/approve-topup?token=${approveToken}`;
  const rejectUrl = `${origin}/reject-topup?token=${approveToken}`;
  const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 24px; background-color: #0b0e13; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #d1d7df;">
      <div style="max-width: 560px; margin: 0 auto; background: #151a23; border: 1px solid #262f3d; border-radius: 14px; padding: 32px; box-shadow: 0 12px 36px rgba(0,0,0,0.6);">
        <div style="border-bottom: 1px solid #262f3d; padding-bottom: 18px; margin-bottom: 22px;">
          <h2 style="margin: 0; font-size: 22px; color: #ffd700; display: flex; align-items: center; gap: 8px;">
            💳 Mở Hòm CS2 — Yêu Cầu Nạp Vượt Hạn Mức
          </h2>
        </div>
        <p style="font-size: 15px; line-height: 1.6; color: #cfd8dc; margin-bottom: 20px;">
          Xin chào Quản trị viên, vừa có một yêu cầu nạp tiền vượt hạn mức ngày cần bạn kiểm tra và phê duyệt:
        </p>
        <div style="background: #0d1117; border-radius: 10px; padding: 18px; margin-bottom: 26px; border-left: 4px solid #ffd700;">
          <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>👤 Tên tài khoản:</strong> <span style="color: #ffd700; font-size: 17px; font-weight: bold;">${name}</span></p>
          <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>💰 Số tiền yêu cầu nạp:</strong> <span style="color: #00f5a0; font-weight: bold; font-size: 16px;">+$${amount.toLocaleString('en-US')} USD</span></p>
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>💵 Phí dịch vụ:</strong> <span style="color: #ffb703; font-weight: bold;">${fee.toLocaleString('vi-VN')} VNĐ</span> (ZaloPay 0982460638)</p>
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>📝 Nội dung chuyển:</strong> <code style="background: #1c2430; color: #00f5a0; padding: 3px 8px; border-radius: 6px;">NAP ${name}</code></p>
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>⏰ Thời gian gửi:</strong> ${timeStr}</p>
          ${ip ? `<p style="margin: 0; font-size: 14px;"><strong>🌐 Địa chỉ IP:</strong> ${ip}</p>` : ''}
        </div>
        <p style="font-size: 14px; color: #90a4ae; margin-bottom: 24px;">
          Hãy kiểm tra ví ZaloPay <b>0982460638</b> xem đã nhận được 10.000đ từ người chơi này chưa. Nếu đã nhận thành công, bấm nút phê duyệt bên dưới:
        </p>
        <div style="display: flex; gap: 14px; margin: 28px 0; text-align: center;">
          <a href="${approveUrl}" style="display: inline-block; background: #ffd700; color: #081512; text-decoration: none; padding: 13px 30px; font-weight: 700; border-radius: 8px; font-size: 15px; box-shadow: 0 4px 18px rgba(255, 215, 0, 0.4); margin-right: 12px;">
            ✔ PHÊ DUYỆT NẠP $${amount.toLocaleString('en-US')}
          </a>
          <a href="${rejectUrl}" style="display: inline-block; background: #261e20; color: #ff5252; text-decoration: none; padding: 13px 22px; font-weight: 600; border-radius: 8px; font-size: 14px; border: 1px solid #5a2626;">
            ✖ Từ chối
          </a>
        </div>
        <div style="border-top: 1px solid #232b38; padding-top: 18px; font-size: 12px; color: #607182; line-height: 1.6;">
          Nếu nút không bấm được, bạn có thể copy link này mở trên trình duyệt:<br>
          <a href="${approveUrl}" style="color: #ffd700; word-break: break-all;">${approveUrl}</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const fromSender = env.RESEND_FROM || 'Mở Hòm CS2 <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromSender,
        to: [adminEmail],
        subject: `[CS2 Case] Yêu cầu nạp $${amount} (10k VNĐ): ${name}`,
        html,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Resend Exception]', err);
    return false;
  }
}

function renderHtmlStatus({ title, isSuccess, message, userName }) {
  const accentColor = isSuccess ? '#00f5a0' : '#ff5252';
  const icon = isSuccess ? '✔' : '✖';
  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title} — Mở Hòm CS2</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #0b0e14;
          color: #e0e6ed;
          font-family: 'Inter', -apple-system, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .card {
          background: #141923;
          border: 1px solid #242e3d;
          border-radius: 16px;
          max-width: 480px;
          width: 100%;
          padding: 40px 32px;
          text-align: center;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        }
        .icon-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: ${isSuccess ? 'rgba(0, 245, 160, 0.15)' : 'rgba(255, 82, 82, 0.15)'};
          color: ${accentColor};
          font-size: 36px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          border: 2px solid ${accentColor};
        }
        h1 {
          font-size: 22px;
          margin-bottom: 12px;
          color: #fff;
        }
        .user-tag {
          display: inline-block;
          background: #1b2331;
          color: #ffd700;
          padding: 4px 14px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 15px;
          margin: 10px 0 18px;
          border: 1px solid rgba(255, 215, 0, 0.3);
        }
        p {
          color: #92a1b3;
          line-height: 1.6;
          font-size: 15px;
          margin-bottom: 30px;
        }
        .btn {
          display: inline-block;
          background: ${accentColor};
          color: ${isSuccess ? '#081411' : '#fff'};
          text-decoration: none;
          padding: 13px 28px;
          font-weight: 700;
          font-size: 15px;
          border-radius: 8px;
          transition: transform 0.15s ease;
        }
        .btn:hover {
          transform: translateY(-2px);
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-circle">${icon}</div>
        <h1>${title}</h1>
        ${userName ? `<div class="user-tag">👤 ${userName}</div>` : ''}
        <p>${message}</p>
        <a href="https://tanbobao2k-tech.github.io/cs2-case-opening/" class="btn">Về Trang Web Mở Hòm CS2</a>
      </div>
    </body>
    </html>
  `;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
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

      // Duyệt tài khoản qua email 1-click
      if (path === '/approve' && req.method === 'GET') {
        const token = url.searchParams.get('token');
        if (!token) return renderHtmlStatus({ title: 'Lỗi', isSuccess: false, message: 'Thiếu mã xác nhận duyệt.' });
        const user = await env.DB.prepare('SELECT id, name, status FROM users WHERE approve_token = ?').bind(token).first();
        if (!user) {
          return renderHtmlStatus({
            title: 'Liên Kết Không Khả Dụng',
            isSuccess: false,
            message: 'Mã xác nhận này không tồn tại, đã hết hạn hoặc tài khoản đã được phê duyệt trước đó.',
          });
        }
        await env.DB.prepare("UPDATE users SET status = 'active', approve_token = NULL WHERE id = ?").bind(user.id).run();
        return renderHtmlStatus({
          title: 'Phê Duyệt Tài Khoản Thành Công',
          isSuccess: true,
          userName: user.name,
          message: 'Tài khoản đã được kích hoạt thành công. Người chơi hiện đã có thể đăng nhập vào web mở hòm CS2.',
        });
      }

      // Từ chối tài khoản qua email 1-click
      if (path === '/reject' && req.method === 'GET') {
        const token = url.searchParams.get('token');
        if (!token) return renderHtmlStatus({ title: 'Lỗi', isSuccess: false, message: 'Thiếu mã xác nhận từ chối.' });
        const user = await env.DB.prepare('SELECT id, name FROM users WHERE approve_token = ?').bind(token).first();
        if (!user) {
          return renderHtmlStatus({
            title: 'Liên Kết Không Khả Dụng',
            isSuccess: false,
            message: 'Mã xác nhận này không tồn tại hoặc tài khoản đã được xử lý trước đó.',
          });
        }
        await env.DB.prepare("UPDATE users SET status = 'rejected', approve_token = NULL WHERE id = ?").bind(user.id).run();
        return renderHtmlStatus({
          title: 'Đã Từ Chối Tài Khoản',
          isSuccess: false,
          userName: user.name,
          message: 'Tài khoản này đã bị từ chối phê duyệt và sẽ không thể đăng nhập vào hệ thống.',
        });
      }

      // Duyệt nạp tiền vượt hạn mức qua email 1-click
      if (path === '/approve-topup' && req.method === 'GET') {
        const token = url.searchParams.get('token');
        if (!token) return renderHtmlStatus({ title: 'Lỗi', isSuccess: false, message: 'Thiếu mã xác nhận duyệt nạp tiền.' });
        const reqRow = await env.DB.prepare("SELECT * FROM topup_requests WHERE approve_token = ? AND status = 'pending'").bind(token).first();
        if (!reqRow) {
          return renderHtmlStatus({
            title: 'Liên Kết Không Khả Dụng',
            isSuccess: false,
            message: 'Yêu cầu nạp tiền này không tồn tại, đã được xử lý hoặc hết hạn.',
          });
        }
        const now = Date.now();
        await env.DB.prepare("UPDATE topup_requests SET status = 'approved', approve_token = NULL, updated = ? WHERE id = ?").bind(now, reqRow.id).run();

        // Tự động cộng số tiền vào states của người chơi trong cơ sở dữ liệu D1
        const stRow = await env.DB.prepare('SELECT data FROM states WHERE user_id = ?').bind(reqRow.user_id).first();
        if (stRow) {
          try {
            const stData = JSON.parse(stRow.data);
            stData.stats ??= {};
            stData.stats.balance = (Number(stData.stats.balance) || 0) + reqRow.amount;
            stData.stats.topup = (Number(stData.stats.topup) || 0) + reqRow.amount;
            const worth = Number(stData.stats.balance || 0) + (stData.inv || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
            await env.DB.prepare('UPDATE states SET data = ?, worth = ?, updated = ? WHERE user_id = ?')
              .bind(JSON.stringify(stData), worth, now, reqRow.user_id).run();
          } catch (e) {
            console.error('[Approve Topup state update error]', e);
          }
        }

        return renderHtmlStatus({
          title: 'Phê Duyệt Nạp Tiền Thành Công',
          isSuccess: true,
          userName: reqRow.user_name,
          message: `Đã cộng thành công +$${reqRow.amount.toLocaleString('en-US')} vào tài khoản của người chơi.`,
        });
      }

      // Từ chối nạp tiền qua email 1-click
      if (path === '/reject-topup' && req.method === 'GET') {
        const token = url.searchParams.get('token');
        if (!token) return renderHtmlStatus({ title: 'Lỗi', isSuccess: false, message: 'Thiếu mã xác nhận từ chối.' });
        const reqRow = await env.DB.prepare("SELECT * FROM topup_requests WHERE approve_token = ? AND status = 'pending'").bind(token).first();
        if (!reqRow) {
          return renderHtmlStatus({
            title: 'Liên Kết Không Khả Dụng',
            isSuccess: false,
            message: 'Yêu cầu này không tồn tại hoặc đã được xử lý trước đó.',
          });
        }
        const now = Date.now();
        await env.DB.prepare("UPDATE topup_requests SET status = 'rejected', approve_token = NULL, updated = ? WHERE id = ?").bind(now, reqRow.id).run();
        return renderHtmlStatus({
          title: 'Đã Từ Chối Yêu Cầu Nạp Tiền',
          isSuccess: false,
          userName: reqRow.user_name,
          message: `Đã từ chối yêu cầu nạp +$${reqRow.amount.toLocaleString('en-US')} của tài khoản này.`,
        });
      }

      if (path === '/register' && req.method === 'POST') {
        const { name, password } = await readBody(req);
        if (!validName(name)) return reply({ error: 'Tên 1–20 ký tự: chữ, số, khoảng trắng, . _ -' }, 400);
        if (!validPass(password)) return reply({ error: 'Mật khẩu 4–64 ký tự.' }, 400);
        const exists = await env.DB.prepare('SELECT id FROM users WHERE name = ? COLLATE NOCASE').bind(name).first();
        if (exists) return reply({ error: 'Tên này đã có người dùng. Hãy đăng nhập hoặc chọn tên khác.' }, 409);
        const salt = randomHex(16);
        const hash = await hashPassword(password, salt);
        const approveToken = randomHex(32);
        await env.DB.prepare('INSERT INTO users (name, salt, hash, created, status, approve_token) VALUES (?, ?, ?, ?, ?, ?)').bind(name, salt, hash, Date.now(), 'pending', approveToken).run();
        
        // Gửi email thông báo cho Admin duyệt
        const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || '';
        await sendAdminNotification(env, { name, approveToken, reqUrl: req.url, ip });

        return reply({
          ok: true,
          pending: true,
          name,
          message: 'Đăng ký thành công! Tài khoản của bạn đang chờ Quản trị viên phê duyệt qua email trước khi kích hoạt.',
        });
      }

      if (path === '/login' && req.method === 'POST') {
        const { name, password } = await readBody(req);
        const user = validName(name) ? await env.DB.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE').bind(name).first() : null;
        if (!user) return reply({ error: 'Không tìm thấy tài khoản này.' }, 404);
        const hash = await hashPassword(String(password || ''), user.salt);
        if (!safeEqual(hash, user.hash)) return reply({ error: 'Sai mật khẩu.' }, 401);

        // Kiểm tra trạng thái phê duyệt (nếu cột status có giá trị)
        if (user.status === 'pending') {
          return reply({ error: 'Tài khoản của bạn đang chờ Quản trị viên phê duyệt qua email. Vui lòng thử lại sau!' }, 403);
        }
        if (user.status === 'rejected') {
          return reply({ error: 'Tài khoản của bạn đã bị từ chối phê duyệt.' }, 403);
        }

        const token = await createSession(env, user.id);
        return reply({ token, name: user.name });
      }

      if (path === '/top' && req.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT u.name, s.worth, s.opened, s.updated FROM states s JOIN users u ON u.id = s.user_id ORDER BY s.worth DESC LIMIT 20').all();
        return reply({ top: results });
      }

      // ==========================================
      // ENDPOINTS QUẢN TRỊ VIÊN (ADMIN DASHBOARD)
      // ==========================================
      function checkAdminReq(r, e) {
        const adminPass = e.ADMIN_SECRET || 'cs2admin2026';
        const hKey = r.headers.get('X-Admin-Key') || '';
        if (hKey && safeEqual(hKey, adminPass)) return true;
        const aH = r.headers.get('Authorization') || '';
        if (aH.startsWith('Admin ') && safeEqual(aH.slice(6), adminPass)) return true;
        if (aH.startsWith('Bearer ') && safeEqual(aH.slice(7), adminPass)) return true;
        const qKey = url.searchParams.get('admin_key') || '';
        if (qKey && safeEqual(qKey, adminPass)) return true;
        return false;
      }

      if (path === '/admin/login' && req.method === 'POST') {
        const { password } = await readBody(req);
        const adminPass = env.ADMIN_SECRET || 'cs2admin2026';
        if (!password || !safeEqual(String(password), adminPass)) {
          return reply({ error: 'Mật khẩu quản trị viên không chính xác.' }, 401);
        }
        return reply({ ok: true, token: adminPass, message: 'Đăng nhập Quản trị viên thành công.' });
      }

      if (path === '/admin/stats' && req.method === 'GET') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const totalUsers = (await env.DB.prepare('SELECT count(*) as c FROM users').first())?.c || 0;
        const activeUsers = (await env.DB.prepare("SELECT count(*) as c FROM users WHERE status = 'active' OR status IS NULL").first())?.c || 0;
        const pendingUsers = (await env.DB.prepare("SELECT count(*) as c FROM users WHERE status = 'pending'").first())?.c || 0;
        const rejectedUsers = (await env.DB.prepare("SELECT count(*) as c FROM users WHERE status = 'rejected'").first())?.c || 0;
        const totalSessions = (await env.DB.prepare('SELECT count(*) as c FROM sessions').first())?.c || 0;
        const economy = await env.DB.prepare('SELECT sum(worth) as total_worth, sum(opened) as total_opened FROM states').first();
        const pendingTopups = (await env.DB.prepare("SELECT count(*) as c FROM topup_requests WHERE status = 'pending'").first())?.c || 0;
        return reply({
          totalUsers,
          activeUsers,
          pendingUsers,
          rejectedUsers,
          totalSessions,
          totalWorth: economy?.total_worth || 0,
          totalOpened: economy?.total_opened || 0,
          pendingTopups,
        });
      }

      if (path === '/admin/users' && req.method === 'GET') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const search = url.searchParams.get('q') || '';
        const status = url.searchParams.get('status') || '';
        let query = `
          SELECT u.id, u.name, u.created, u.status,
                 s.worth, s.opened, s.updated as state_updated, s.data,
                 (SELECT count(*) FROM sessions ss WHERE ss.user_id = u.id) as session_count,
                 (SELECT max(ss.created) FROM sessions ss WHERE ss.user_id = u.id) as last_session
          FROM users u
          LEFT JOIN states s ON s.user_id = u.id
        `;
        const conditions = [];
        const bindings = [];
        if (search) {
          conditions.push('u.name LIKE ?');
          bindings.push(`%${search}%`);
        }
        if (status && status !== 'all') {
          if (status === 'active') conditions.push("(u.status = 'active' OR u.status IS NULL)");
          else {
            conditions.push('u.status = ?');
            bindings.push(status);
          }
        }
        if (conditions.length) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY u.created DESC LIMIT 200';
        const stmt = env.DB.prepare(query);
        const { results } = bindings.length ? await stmt.bind(...bindings).all() : await stmt.all();

        const users = (results || []).map(r => {
          let balance = 0;
          let invCount = 0;
          try {
            if (r.data) {
              const parsed = JSON.parse(r.data);
              balance = Number(parsed?.stats?.balance) || 0;
              invCount = Array.isArray(parsed?.inv) ? parsed.inv.length : 0;
            }
          } catch (e) {}
          return {
            id: r.id,
            name: r.name,
            created: r.created,
            status: r.status || 'active',
            worth: Number(r.worth) || balance,
            opened: Number(r.opened) || 0,
            balance,
            invCount,
            sessionCount: Number(r.session_count) || 0,
            lastSession: r.last_session || null,
            lastActive: r.state_updated || r.last_session || r.created,
          };
        });
        return reply({ users });
      }

      if (path === '/admin/user-status' && req.method === 'POST') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const { userId, status } = await readBody(req);
        if (!userId || !['active', 'rejected', 'pending'].includes(status)) {
          return reply({ error: 'Dữ liệu không hợp lệ.' }, 400);
        }
        await env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(status, userId).run();
        if (status === 'rejected') {
          await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
        }
        return reply({ ok: true });
      }

      if (path === '/admin/user-balance' && req.method === 'POST') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const { userId, delta, setBalance } = await readBody(req);
        if (!userId) return reply({ error: 'Thiếu userId.' }, 400);
        const stRow = await env.DB.prepare('SELECT data FROM states WHERE user_id = ?').bind(userId).first();
        let stData = { inv: [], stats: { balance: 0, opened: 0 } };
        if (stRow?.data) {
          try { stData = JSON.parse(stRow.data); } catch (e) {}
        }
        stData.stats ??= {};
        if (setBalance !== undefined) {
          stData.stats.balance = Math.max(0, Number(setBalance) || 0);
        } else if (delta !== undefined) {
          stData.stats.balance = Math.max(0, (Number(stData.stats.balance) || 0) + Number(delta));
        }
        const worth = Number(stData.stats.balance || 0) + (stData.inv || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
        const now = Date.now();
        await env.DB.prepare(
          'INSERT INTO states (user_id, data, worth, opened, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, worth = excluded.worth, updated = excluded.updated'
        ).bind(userId, JSON.stringify(stData), worth, stData.stats.opened || 0, now).run();
        return reply({ ok: true, balance: stData.stats.balance });
      }

      if (path === '/admin/user-reset-password' && req.method === 'POST') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const { userId, newPassword } = await readBody(req);
        if (!userId || !validPass(newPassword)) return reply({ error: 'Mật khẩu mới từ 4-64 ký tự.' }, 400);
        const salt = randomHex(16);
        const hash = await hashPassword(newPassword, salt);
        await env.DB.prepare('UPDATE users SET salt = ?, hash = ? WHERE id = ?').bind(salt, hash, userId).run();
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').bind(userId, '').run();
        return reply({ ok: true });
      }

      if (path === '/admin/user' && req.method === 'DELETE') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const { userId } = await readBody(req);
        if (!userId) return reply({ error: 'Thiếu userId.' }, 400);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
          env.DB.prepare('DELETE FROM states WHERE user_id = ?').bind(userId),
          env.DB.prepare('DELETE FROM topup_requests WHERE user_id = ?').bind(userId),
          env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
        ]);
        return reply({ ok: true });
      }

      if (path === '/admin/topup-requests' && req.method === 'GET') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const { results } = await env.DB.prepare('SELECT * FROM topup_requests ORDER BY id DESC LIMIT 100').all();
        return reply({ requests: results || [] });
      }

      if (path === '/admin/topup-action' && req.method === 'POST') {
        if (!checkAdminReq(req, env)) return reply({ error: 'Không có quyền quản trị.' }, 401);
        const { requestId, action } = await readBody(req);
        if (!requestId || !['approve', 'reject'].includes(action)) return reply({ error: 'Dữ liệu không hợp lệ.' }, 400);
        const reqRow = await env.DB.prepare('SELECT * FROM topup_requests WHERE id = ?').bind(requestId).first();
        if (!reqRow) return reply({ error: 'Yêu cầu không tồn tại.' }, 404);
        const now = Date.now();
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await env.DB.prepare('UPDATE topup_requests SET status = ?, approve_token = NULL, updated = ? WHERE id = ?').bind(newStatus, now, requestId).run();
        if (action === 'approve') {
          const stRow = await env.DB.prepare('SELECT data FROM states WHERE user_id = ?').bind(reqRow.user_id).first();
          if (stRow?.data) {
            try {
              const stData = JSON.parse(stRow.data);
              stData.stats ??= {};
              stData.stats.balance = (Number(stData.stats.balance) || 0) + reqRow.amount;
              stData.stats.topup = (Number(stData.stats.topup) || 0) + reqRow.amount;
              const worth = Number(stData.stats.balance || 0) + (stData.inv || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
              await env.DB.prepare('UPDATE states SET data = ?, worth = ?, updated = ? WHERE user_id = ?')
                .bind(JSON.stringify(stData), worth, now, reqRow.user_id).run();
            } catch (e) {}
          }
        }
        return reply({ ok: true, status: newStatus });
      }

      // ==========================================
      // BATTLE ONLINE ENDPOINTS (PUBLIC)
      // ==========================================
      if (path === '/battles' && req.method === 'GET') {
        const tenMinsAgo = Date.now() - 10 * 60 * 1000;
        const { results } = await env.DB.prepare(
          "SELECT * FROM online_battles WHERE status IN ('waiting', 'running') OR (status = 'finished' AND updated > ?) ORDER BY created DESC LIMIT 25"
        ).bind(tenMinsAgo).all();
        const safeParse = (str, fallback) => {
          try { return JSON.parse(str || ''); } catch (e) { return fallback; }
        };
        const battles = (results || []).map(b => ({
          ...b,
          cases: safeParse(b.cases_json, []),
          players: safeParse(b.players_json, []),
          drops: b.drops_json ? safeParse(b.drops_json, null) : null,
        }));
        return reply({ battles });
      }

      if (path === '/battles/get' && req.method === 'GET') {
        const battleId = url.searchParams.get('id');
        if (!battleId) return reply({ error: 'Thiếu mã trận đấu.' }, 400);
        const b = await env.DB.prepare('SELECT * FROM online_battles WHERE id = ?').bind(battleId).first();
        if (!b) return reply({ error: 'Không tìm thấy trận đấu.' }, 404);
        const safeParse = (str, fallback) => {
          try { return JSON.parse(str || ''); } catch (e) { return fallback; }
        };
        return reply({
          battle: {
            ...b,
            cases: safeParse(b.cases_json, []),
            players: safeParse(b.players_json, []),
            drops: b.drops_json ? safeParse(b.drops_json, null) : null,
          }
        });
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

      if (path === '/topup-request' && req.method === 'POST') {
        const pending = await env.DB.prepare("SELECT id FROM topup_requests WHERE user_id = ? AND status = 'pending'").bind(me.id).first();
        if (pending) {
          return reply({ ok: false, pending: true, message: 'Bạn đang có một yêu cầu nạp tiền đang chờ Quản trị viên duyệt. Vui lòng chờ hoặc nhắn tin Zalo 0968070182 để được duyệt nhanh!' });
        }
        const approveToken = randomHex(32);
        const now = Date.now();
        const amount = 5000;
        const fee = 10000;
        await env.DB.prepare(
          "INSERT INTO topup_requests (user_id, user_name, amount, fee, status, approve_token, created) VALUES (?, ?, ?, ?, 'pending', ?, ?)"
        ).bind(me.id, me.name, amount, fee, approveToken, now).run();

        const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || '';
        await sendTopupNotification(env, { name: me.name, amount, fee, approveToken, reqUrl: req.url, ip });

        return reply({
          ok: true,
          pending: true,
          message: 'Đã gửi yêu cầu nạp $5.000 (phí 10.000đ) tới Quản trị viên thành công!',
        });
      }

      if (path === '/topup-status' && req.method === 'GET') {
        const reqRow = await env.DB.prepare(
          "SELECT id, amount, status, created, updated, acknowledged FROM topup_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1"
        ).bind(me.id).first();
        if (!reqRow) return reply({ request: null });
        if (reqRow.status === 'approved' && !reqRow.acknowledged) {
          await env.DB.prepare("UPDATE topup_requests SET acknowledged = 1 WHERE id = ?").bind(reqRow.id).run();
          return reply({ request: reqRow, justApproved: true });
        }
        return reply({ request: reqRow, justApproved: false });
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

      // ==========================================
      // BATTLE ONLINE ENDPOINTS (AUTHENTICATED)
      // ==========================================
      if (path === '/battles/create' && req.method === 'POST') {
        const { cases, cost, mode } = await readBody(req);
        if (!Array.isArray(cases) || !cases.length || cases.length > 10) {
          return reply({ error: 'Số lượng hòm phải từ 1 đến 10.' }, 400);
        }
        const numericCost = Number(cost) || 0;
        if (numericCost <= 0) return reply({ error: 'Chi phí không hợp lệ.' }, 400);

        // Kiểm tra tiền trong ví
        const stRow = await env.DB.prepare('SELECT data FROM states WHERE user_id = ?').bind(me.id).first();
        let stData = { inv: [], stats: { balance: 0, opened: 0, spent: 0 } };
        if (stRow?.data) {
          try { stData = JSON.parse(stRow.data); } catch (e) {}
        }
        stData.stats ??= {};
        stData.stats.balance = Number(stData.stats.balance) || 0;
        if (stData.stats.balance < numericCost) {
          return reply({ error: 'Số dư ví không đủ để tạo trận Case Battle!' }, 400);
        }

        // Trừ tiền cược
        stData.stats.balance -= numericCost;
        stData.stats.spent = (Number(stData.stats.spent) || 0) + numericCost;
        const worth = Number(stData.stats.balance || 0) + (stData.inv || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
        const now = Date.now();
        await env.DB.prepare(
          'INSERT INTO states (user_id, data, worth, opened, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, worth = excluded.worth, updated = excluded.updated'
        ).bind(me.id, JSON.stringify(stData), worth, stData.stats.opened || 0, now).run();

        const battleId = 'btl_' + Date.now().toString(36) + '_' + randomHex(4);
        const players = [{ id: me.id, name: me.name, isCreator: true, av: '🧑', ready: true }];
        await env.DB.prepare(
          "INSERT INTO online_battles (id, creator_id, creator_name, cases_json, cost, mode, players_needed, status, players_json, created, updated) VALUES (?, ?, ?, ?, ?, ?, 2, 'waiting', ?, ?, ?)"
        ).bind(battleId, me.id, me.name, JSON.stringify(cases), numericCost, mode || 'normal', JSON.stringify(players), now, now).run();

        return reply({ ok: true, battleId, balance: stData.stats.balance });
      }

      if (path === '/battles/join' && req.method === 'POST') {
        const { battleId } = await readBody(req);
        if (!battleId) return reply({ error: 'Thiếu mã phòng.' }, 400);
        const b = await env.DB.prepare("SELECT * FROM online_battles WHERE id = ? AND status = 'waiting'").bind(battleId).first();
        if (!b) return reply({ error: 'Phòng không tồn tại hoặc đã bắt đầu thi đấu.' }, 404);

        const players = JSON.parse(b.players_json || '[]');
        if (players.some(p => p.id === me.id)) {
          return reply({ error: 'Bạn đã tham gia phòng này rồi!' }, 400);
        }

        // Kiểm tra tiền ví
        const stRow = await env.DB.prepare('SELECT data FROM states WHERE user_id = ?').bind(me.id).first();
        let stData = { inv: [], stats: { balance: 0, opened: 0, spent: 0 } };
        if (stRow?.data) {
          try { stData = JSON.parse(stRow.data); } catch (e) {}
        }
        stData.stats ??= {};
        stData.stats.balance = Number(stData.stats.balance) || 0;
        if (stData.stats.balance < b.cost) {
          return reply({ error: 'Số dư ví của bạn không đủ để tham gia phòng này!' }, 400);
        }

        // Trừ tiền cược
        stData.stats.balance -= b.cost;
        stData.stats.spent = (Number(stData.stats.spent) || 0) + b.cost;
        const worth = Number(stData.stats.balance || 0) + (stData.inv || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
        const now = Date.now();
        await env.DB.prepare(
          'INSERT INTO states (user_id, data, worth, opened, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, worth = excluded.worth, updated = excluded.updated'
        ).bind(me.id, JSON.stringify(stData), worth, stData.stats.opened || 0, now).run();

        // Thêm người chơi vào phòng
        players.push({ id: me.id, name: me.name, isCreator: false, av: '👤', ready: true });
        const newStatus = players.length >= b.players_needed ? 'running' : 'waiting';

        await env.DB.prepare(
          'UPDATE online_battles SET players_json = ?, status = ?, updated = ? WHERE id = ?'
        ).bind(JSON.stringify(players), newStatus, now, battleId).run();

        return reply({ ok: true, battleId, status: newStatus, balance: stData.stats.balance });
      }

      if (path === '/battles/call-bot' && req.method === 'POST') {
        const { battleId } = await readBody(req);
        if (!battleId) return reply({ error: 'Thiếu mã phòng.' }, 400);
        const b = await env.DB.prepare("SELECT * FROM online_battles WHERE id = ? AND creator_id = ? AND status = 'waiting'").bind(battleId, me.id).first();
        if (!b) return reply({ error: 'Chỉ chủ phòng mới có quyền gọi Bot PK.' }, 403);

        const players = JSON.parse(b.players_json || '[]');
        players.push({ id: -1, name: 'Bot Bravo', isCreator: false, av: '🤖', isBot: true, ready: true });
        const now = Date.now();
        await env.DB.prepare(
          "UPDATE online_battles SET players_json = ?, status = 'running', updated = ? WHERE id = ?"
        ).bind(JSON.stringify(players), now, battleId).run();

        return reply({ ok: true, battleId, status: 'running' });
      }

      if (path === '/battles/cancel' && req.method === 'POST') {
        const { battleId } = await readBody(req);
        if (!battleId) return reply({ error: 'Thiếu mã phòng.' }, 400);
        const b = await env.DB.prepare("SELECT * FROM online_battles WHERE id = ? AND creator_id = ? AND status = 'waiting'").bind(battleId, me.id).first();
        if (!b) return reply({ error: 'Phòng không tồn tại hoặc không thể hủy.' }, 403);

        const now = Date.now();
        await env.DB.prepare("UPDATE online_battles SET status = 'cancelled', updated = ? WHERE id = ?").bind(now, battleId).run();

        // Hoàn tiền cho chủ phòng
        const stRow = await env.DB.prepare('SELECT data FROM states WHERE user_id = ?').bind(me.id).first();
        let stData = { inv: [], stats: { balance: 0, spent: 0 } };
        if (stRow?.data) {
          try { stData = JSON.parse(stRow.data); } catch (e) {}
        }
        stData.stats ??= {};
        stData.stats.balance = (Number(stData.stats.balance) || 0) + b.cost;
        stData.stats.spent = Math.max(0, (Number(stData.stats.spent) || 0) - b.cost);
        const worth = Number(stData.stats.balance || 0) + (stData.inv || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
        await env.DB.prepare(
          'INSERT INTO states (user_id, data, worth, opened, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, worth = excluded.worth, updated = excluded.updated'
        ).bind(me.id, JSON.stringify(stData), worth, stData.stats.opened || 0, now).run();

        return reply({ ok: true, balance: stData.stats.balance, message: 'Đã hủy phòng và hoàn tiền cược.' });
      }

      if (path === '/battles/finish' && req.method === 'POST') {
        const { battleId, winnerId, winnerName, drops, wonItems } = await readBody(req);
        if (!battleId) return reply({ error: 'Thiếu mã phòng.' }, 400);
        const b = await env.DB.prepare("SELECT * FROM online_battles WHERE id = ?").bind(battleId).first();
        if (!b) return reply({ error: 'Phòng không tồn tại.' }, 404);

        if (b.status !== 'finished') {
          const now = Date.now();
          await env.DB.prepare(
            "UPDATE online_battles SET status = 'finished', winner_id = ?, winner_name = ?, drops_json = ?, updated = ? WHERE id = ?"
          ).bind(winnerId || null, winnerName || '', JSON.stringify(drops || []), now, battleId).run();

          // Nếu người thắng là người chơi thật (id > 0) và có wonItems
          if (winnerId && winnerId > 0 && Array.isArray(wonItems) && wonItems.length > 0) {
            const stRow = await env.DB.prepare('SELECT data FROM states WHERE user_id = ?').bind(winnerId).first();
            if (stRow?.data) {
              try {
                const stData = JSON.parse(stRow.data);
                stData.inv = [...(wonItems || []), ...(stData.inv || [])];
                if (stData.inv.length > 2000) stData.inv.length = 2000;
                stData.stats ??= {};
                stData.stats.battles ??= { played: 0, won: 0 };
                stData.stats.battles.played = (Number(stData.stats.battles.played) || 0) + 1;
                stData.stats.battles.won = (Number(stData.stats.battles.won) || 0) + 1;
                const worth = Number(stData.stats.balance || 0) + (stData.inv || []).reduce((s, i) => s + (Number(i.price) || 0), 0);
                await env.DB.prepare('UPDATE states SET data = ?, worth = ?, updated = ? WHERE user_id = ?')
                  .bind(JSON.stringify(stData), worth, now, winnerId).run();
              } catch (e) {
                console.error('Lỗi cộng thưởng battle:', e);
              }
            }
          }
        }
        return reply({ ok: true });
      }

      return reply({ error: 'Không tìm thấy.' }, 404);
    } catch (e) {
      return reply({ error: 'Lỗi máy chủ: ' + (e.message || e) }, 500);
    }
  },
};
