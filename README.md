# Mở Hòm CS2 — miễn phí

Web tĩnh mô phỏng mở hòm CS2. Không backend, không tài khoản, không tốn tiền.

- 42 hòm chính thức, ~2000 skin, ảnh lấy trực tiếp từ Steam CDN
- Tỷ lệ rớt đúng công bố Valve: Mil-Spec 79,92% · Restricted 15,98% · Classified 3,2% · Covert 0,64% · Dao/găng 0,26% · StatTrak 10%
- Roulette quay như trong game (có "Mở nhanh" để bỏ qua animation)
- Kho đồ + thống kê lưu trong `localStorage` của trình duyệt
- Responsive mobile

## Chạy

Mở thẳng `index.html` bằng trình duyệt là chạy được (dữ liệu nằm trong `data/cases.js`).
Hoặc chạy server tĩnh bất kỳ: `npx serve .`

## Deploy

Copy nguyên thư mục lên GitHub Pages / Netlify / Vercel / Cloudflare Pages. Không cần build.

## Cập nhật dữ liệu hòm (khi Valve ra hòm mới)

```
curl -sL -o data/crates_raw.json https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json
node build-data.js
rm data/crates_raw.json
```

## Cấu trúc

```
index.html      giao diện
css/style.css
js/app.js       roll, roulette, kho đồ, thống kê
data/cases.js   dữ liệu hòm rút gọn (window.CS2_CASES)
build-data.js   script rút gọn từ ByMykel/CSGO-API
```

Dự án phi lợi nhuận, không liên kết với Valve. Counter-Strike 2 và hình ảnh skin thuộc Valve Corporation.
