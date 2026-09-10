const { execSync } = require('child_process');

console.log('🔄 Đang nén và bảo vệ mã nguồn (Terser Mangle & Compress)...');
try {
  execSync(
    'npx -y terser src/app.js -o js/app.js --compress --mangle',
    { stdio: 'inherit' }
  );
  console.log('✅ Đã bảo vệ mã nguồn thành công siêu mượt!');
} catch (err) {
  console.error('❌ Lỗi khi nén mã:', err);
}
