# API (Cloudflare Worker + D1)

### 1. Cài đặt lần đầu
```bash
npx wrangler login
npx wrangler d1 create cs2-case-db          # dán database_id vào wrangler.toml
npx wrangler d1 execute cs2-case-db --remote --file=schema.sql
npx wrangler deploy
```

### 2. Cập nhật tính năng duyệt tài khoản qua Email (Database đã có sẵn)
Nếu bạn đã có database từ trước, chạy lệnh migration sau để thêm cột `status` và `approve_token`:
```bash
npx wrangler d1 execute cs2-case-db --remote --file=migration-approval.sql
```

### 3. Cấu hình Email Quản trị viên & Resend API Key
1. Điền email của bạn vào `ADMIN_EMAIL` trong file `wrangler.toml`:
   ```toml
   [vars]
   ADMIN_EMAIL = "email_cua_ban@gmail.com"
   ```
2. Thêm `RESEND_API_KEY` (lấy miễn phí tại https://resend.com):
   ```bash
   npx wrangler secret put RESEND_API_KEY
   # (Dán API key dạng re_... vào terminal)
   ```
3. Deploy bản cập nhật lên Cloudflare:
   ```bash
   npx wrangler deploy
   ```

Sau khi deploy, URL worker đã được kết nối tự động với `js/app.js`.

