# API (Cloudflare Worker + D1)

```
npx wrangler login
npx wrangler d1 create cs2-case-db          # dán database_id vào wrangler.toml
npx wrangler d1 execute cs2-case-db --remote --file=schema.sql
npx wrangler deploy
```
Sau khi deploy, dán URL worker vào `js/app.js` (hằng `API_URL`).
