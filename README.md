# Mở Hòm CS2 — miễn phí

Web tĩnh mô phỏng mở hòm CS2. Không backend, không tài khoản, không tốn tiền.

- 42 hòm chính thức, ~2500 vật phẩm, ảnh lấy trực tiếp từ Steam CDN
- Giá vật phẩm theo Steam Market (Doppler theo phase từ Buff163), quy đổi ₫ tham khảo
- Tỷ lệ rớt đúng công bố Valve: Mil-Spec 79,92% · Restricted 15,98% · Classified 3,2% · Covert 0,64% · Dao/găng 0,26% · StatTrak 10%
- Float roll theo phân phối độ mòn rồi ép vào khoảng float riêng của từng skin (giống cơ chế game)
- Roulette quay như trong game (có "Mở nhanh" để bỏ qua animation)
- **Case Battle**: chọn 1–10 hòm, đấu 1–3 bot, chế độ Thường / Đảo ngược, thắng ôm trọn đồ cả bàn
- **Zoom soi skin**: nhấn vào ảnh (kết quả, kho đồ, drop battle) → lăn chuột / véo hai ngón để zoom, kéo để di chuyển
- Kho đồ + thống kê (đã chi / đã nhận / lãi lỗ ảo, tỷ lệ thực tế vs kỳ vọng) lưu trong `localStorage`
- Responsive mobile

## Chạy

Mở thẳng `index.html` bằng trình duyệt là chạy được (dữ liệu nằm trong `data/cases.js`).
Hoặc chạy server tĩnh bất kỳ: `npx serve .`

## Deploy

Copy nguyên thư mục lên GitHub Pages / Netlify / Vercel / Cloudflare Pages. Không cần build.

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
js/app.js       roll, roulette, zoom, case battle, kho đồ, thống kê
data/cases.js   dữ liệu hòm + giá + khoảng float (window.CS2_CASES)
build-data.js   script gộp dữ liệu ByMykel/CSGO-API + giá csgotrader.app
```

Giá chỉ mang tính tham khảo. Dự án phi lợi nhuận, không liên kết với Valve. Counter-Strike 2 và hình ảnh skin thuộc Valve Corporation.
