-- Chạy migration này trên database D1 hiện có để cập nhật cột duyệt tài khoản
-- Lệnh: npx wrangler d1 execute cs2-case-db --remote --file=migration-approval.sql

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN approve_token TEXT;
