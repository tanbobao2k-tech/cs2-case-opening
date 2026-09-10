// Gộp crates.json + skins.json (ByMykel/CSGO-API) + giá (prices.csgotrader.app) thành data/cases.js.
// Chạy: node build-data.js  (xem README để tải các file *_raw / p_*.json trước)
const fs = require('fs');
const crates = require('./data/crates_raw.json');
const skins = require('./data/skins_raw.json');
const steam = require('./data/p_steam.json');
const buff = require('./data/p_buff163.json');
const skinport = require('./data/p_skinport.json');

const RARITY = {
  rarity_rare_weapon: 1,      // Mil-Spec
  rarity_mythical_weapon: 2,  // Restricted
  rarity_legendary_weapon: 3, // Classified
  rarity_ancient_weapon: 4,   // Covert
};
const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const skinById = new Map(skins.map((s) => [s.id, s]));

const round = (v) => (v == null ? null : Math.round(v * 100) / 100);

function lookup(hashName, phase) {
  if (phase) return buff[hashName]?.starting_at?.doppler?.[phase] ?? null;
  const s = steam[hashName];
  if (s) return s.last_7d ?? s.last_30d ?? s.last_24h ?? s.last_90d;
  if (buff[hashName]?.starting_at?.price != null) return buff[hashName].starting_at.price;
  return skinport[hashName]?.starting_at ?? null;
}

function statTrakName(name) {
  return name.startsWith('★ ') ? '★ StatTrak™ ' + name.slice(2) : 'StatTrak™ ' + name;
}

function priceTable(item) {
  const skin = skinById.get(item.id);
  const vanilla = skin ? skin.min_float == null : false;
  const hasST = skin ? skin.stattrak !== false : true;
  const phase = item.phase || undefined;
  const nameOf = (wear, st) => {
    const base = st ? statTrakName(item.name) : item.name;
    return vanilla ? base : `${base} (${wear})`;
  };
  let p = WEARS.map((w) => round(lookup(nameOf(w, false), phase)));
  let ps = hasST ? WEARS.map((w) => round(lookup(nameOf(w, true), phase))) : null;
  // Doppler không có giá theo phase → dùng giá gộp
  if (phase && p.every((x) => x == null)) p = WEARS.map((w) => round(lookup(nameOf(w, false))));
  if (phase && ps && ps.every((x) => x == null)) ps = WEARS.map((w) => round(lookup(nameOf(w, true))));
  // Điền lỗ hổng: độ mòn không có giá → lấy giá độ mòn gần nhất
  const fill = (arr) => {
    if (!arr || arr.every((x) => x == null)) return arr;
    for (let i = 0; i < arr.length; i++) if (arr[i] == null) arr[i] = arr[i - 1] ?? arr.slice(i).find((x) => x != null);
    return arr;
  };
  return {
    p: fill(p),
    ps: fill(ps),
    f: vanilla ? [0.06, 0.8] : [skin?.min_float ?? 0, skin?.max_float ?? 1],
    st: hasST ? 1 : 0,
  };
}

let missing = 0, total = 0;
const cases = crates
  .filter((c) => c.type === 'Case' && c.contains_rare.length > 0)
  .sort((a, b) => (b.first_sale_date || '').localeCompare(a.first_sale_date || ''))
  .map((c) => {
    const items = c.contains
      .filter((i) => RARITY[i.rarity.id])
      .map((i) => ({ n: i.name, r: RARITY[i.rarity.id], img: i.image, ...priceTable(i) }));
    const rare = c.contains_rare.map((i) => ({ n: i.name, img: i.image, ph: i.phase || undefined, ...priceTable(i) }));
    [...items, ...rare].forEach((i) => { total++; if (!i.p || i.p.every((x) => x == null)) { missing++; console.log('  không có giá:', c.name, '→', i.n, i.ph || ''); } });
    return { id: c.id, name: c.name, image: c.image, date: c.first_sale_date, price: round(lookup(c.name)), items, rare };
  });

console.log(`cases: ${cases.length} | items: ${total} | thiếu giá: ${missing}`);
fs.writeFileSync('data/cases.json', JSON.stringify(cases));
fs.writeFileSync('data/cases.js', 'window.CS2_CASES=' + JSON.stringify(cases) + ';window.CS2_PRICES_UPDATED=' + JSON.stringify(new Date().toISOString().slice(0, 10)) + ';');
console.log('written data/cases.js', (fs.statSync('data/cases.js').size / 1024).toFixed(0), 'KB');
