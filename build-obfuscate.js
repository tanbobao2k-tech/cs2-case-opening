const { execSync } = require('child_process');

console.log('🔄 Đang mã hóa bảo vệ mã nguồn (Obfuscating src/app.js -> js/app.js)...');
try {
  execSync(
    'npx javascript-obfuscator src/app.js --output js/app.js --compact true --control-flow-flattening true --control-flow-flattening-threshold 0.6 --string-array true --string-array-encoding base64 --string-array-threshold 0.8 --split-strings true --self-defending true',
    { stdio: 'inherit' }
  );
  console.log('✅ Đã mã hóa và làm rối mã nguồn thành công!');
} catch (err) {
  console.error('❌ Lỗi khi mã hóa:', err);
}
