# Mở Hòm CS2 — miễn phí

Web tĩnh mô phỏng mở hòm CS2. Không backend, không tài khoản, không tốn tiền.

- **Tài khoản online** (Cloudflare Worker + D1, thư mục `api/`): đăng ký/đăng nhập bằng tên + mật khẩu (băm PBKDF2 phía máy chủ), ví/kho/thống kê đồng bộ mọi thiết bị, tự lưu sau mỗi thay đổi (chấm xanh cạnh tên), đổi/xoá mật khẩu, xoá tài khoản, bảng xếp hạng tài sản toàn cầu
- **Ví ảo**: bắt đầu $1.000, nút nạp thêm $1.000 không giới hạn (miễn phí). Mở hòm/battle trừ ví, bán đồ cộng ví. Lãi/lỗ = (ví + kho) − tổng nạp
- 42 hòm chính thức + 25 **hòm đặc biệt kiểu Skin Club** (toàn dao, găng, Karambit, Doppler, AK/AWP, Huyền thoại ≥$1.000, Bình dân…) — tỷ lệ ∝ 1/giá^0.9, giá hòm = EV/0,9
- Catalog **toàn bộ 2.119 skin/dao/găng** có giá (kể cả Dragon Lore, Howl, Doppler từng phase), ảnh từ Steam CDN
- Giá theo Steam Market (Doppler theo phase từ Buff163), quy đổi ₫ tham khảo
- Tỷ lệ hòm chính thức đã nâng tỉ lệ dao/găng lên **30%**: Mil-Spec 56,09% · Restricted 11,22% · Classified 2,25% · Covert 0,45% · Dao/găng 30,00% · StatTrak 10%
- Float roll theo phân phối độ mòn rồi ép vào khoảng float riêng của từng skin (giống cơ chế game)
- Roulette quay như trong game (có "Mở nhanh" để bỏ qua animation)
- **Case Battle**: chọn 1–10 hòm, đấu 1–3 bot, chế độ Thường / Đảo ngược, thắng ôm trọn đồ cả bàn
- **Zoom soi skin**: nhấn vào ảnh (kết quả, kho đồ, drop battle) → lăn chuột / véo hai ngón để zoom, kéo để di chuyển
- **Bán đồ**: nút bán trên từng món, bán cả trang lọc, bán ngay sau khi mở
- **Trade với bot**: đưa đồ trong kho, lấy bất kỳ món nào trong catalog, phí bot 5%, chênh lệch bù trừ qua ví
- **Trade-Up**: 10 món cùng bậc (cùng StatTrak) → 1 món bậc trên cùng bộ sưu tập, xác suất và float như CS2
- Kho đồ phân trang 3 hàng/trang; thống kê lãi/lỗ, số hòm đã mở theo từng loại, món đắt nhất — lưu trong `localStorage`
- Responsive mobile

## Chạy

Mở thẳng `index.html` bằng trình duyệt là chạy được (dữ liệu nằm trong `data/cases.js`).
Hoặc chạy server tĩnh bất kỳ: `npx serve .`

## Deploy

Frontend: copy nguyên thư mục lên GitHub Pages / Netlify / Vercel / Cloudflare Pages. Không cần build.
Backend: xem `api/README.md` (wrangler). URL API đặt ở hằng `API_URL` trong `js/app.js`; origin được phép đặt ở `ALLOWED_ORIGINS` trong `api/wrangler.toml`.

## Cập nhật dữ liệu hòm / giá

```
curl -sL -o data/crates_raw.json https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json
curl -sL -o data/skins_raw.json  https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
curl -sL --compressed -A "Mozilla/5.0" -o data/p_steam.json    https://prices.csgotrader.app/latest/steam.json
curl -sL --compressed -A "Mozilla/5.0" -o data/p_buff163.json  https://prices.csgotrader.app/latest/buff163.json
curl -sL --compressed -A "Mozilla/5.0" -o data/p_skinport.json https://prices.csgotrader.app/latest/skinport.json
node build-data.js
rm data/*_raw.json data/p_*.json
```

## Cấu trúc

```
index.html      giao diện
css/style.css
js/app.js       roll, hòm đặc biệt, roulette, zoom, battle, trade, trade-up, ví, kho, thống kê
data/cases.js   catalog item (window.CS2_ITEMS) + hòm chính thức (window.CS2_CASES)
build-data.js   script gộp dữ liệu ByMykel/CSGO-API + giá csgotrader.app
```

Giá chỉ mang tính tham khảo. Dự án phi lợi nhuận, không liên kết với Valve. Counter-Strike 2 và hình ảnh skin thuộc Valve Corporation.
