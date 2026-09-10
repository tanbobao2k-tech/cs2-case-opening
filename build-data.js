// Rút gọn crates.json (ByMykel/CSGO-API) thành data/cases.json chỉ giữ thứ app cần.
const fs = require('fs');
const raw = require('./data/crates_raw.json');

const RARITY = {
  rarity_rare_weapon: 1,      // Mil-Spec
  rarity_mythical_weapon: 2,  // Restricted
  rarity_legendary_weapon: 3, // Classified
  rarity_ancient_weapon: 4,   // Covert
};

const cases = raw
  .filter((c) => c.type === 'Case' && c.contains_rare.length > 0)
  .sort((a, b) => (b.first_sale_date || '').localeCompare(a.first_sale_date || ''))
  .map((c) => ({
    id: c.id,
    name: c.name,
    image: c.image,
    date: c.first_sale_date,
    items: c.contains
      .filter((i) => RARITY[i.rarity.id])
      .map((i) => ({ n: i.name, r: RARITY[i.rarity.id], img: i.image })),
    rare: c.contains_rare.map((i) => ({ n: i.name, img: i.image, ph: i.phase || undefined })),
  }));

const missing = cases.filter((c) => [1, 2, 3, 4].some((r) => !c.items.some((i) => i.r === r)));
console.log('cases:', cases.length, '| thiếu bậc hiếm:', missing.map((c) => c.name));

fs.writeFileSync('data/cases.json', JSON.stringify(cases));
fs.writeFileSync('data/cases.js', 'window.CS2_CASES=' + JSON.stringify(cases) + ';');
console.log('written data/cases.json', (fs.statSync('data/cases.json').size / 1024).toFixed(0), 'KB');
