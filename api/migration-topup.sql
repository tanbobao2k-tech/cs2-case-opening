CREATE TABLE IF NOT EXISTS topup_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 5000,
  fee REAL NOT NULL DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'pending',
  approve_token TEXT,
  created INTEGER NOT NULL,
  updated INTEGER,
  acknowledged INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_topup_requests_user ON topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_token ON topup_requests(approve_token);
