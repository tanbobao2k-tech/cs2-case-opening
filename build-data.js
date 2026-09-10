// Gộp skins.json + crates.json (ByMykel/CSGO-API) + giá (prices.csgotrader.app) thành data/cases.js:
//   window.CS2_ITEMS  – catalog toàn bộ skin/dao/găng có giá
//   window.CS2_CASES  – hòm chính thức, tham chiếu ITEMS theo index
// Chạy: node build-data.js  (xem README để tải các file nguồn trước)
const fs = require('fs');
const crates = require('./data/crates_raw.json');
const skins = require('./data/skins_raw.json');
const steam = require('./data/p_steam.json');
const buff = require('./data/p_buff163.json');
const skinport = require('./data/p_skinport.json');

// 1 Mil-Spec · 2 Restricted · 3 Classified · 4 Covert/Contraband · 5 Dao/Găng · 6 Industrial · 7 Consumer
const RARITY = {
  rarity_rare_weapon: 1,
  rarity_mythical_weapon: 2,
  rarity_legendary_weapon: 3,
  rarity_ancient_weapon: 4,
  rarity_contraband_weapon: 4,
  rarity_uncommon_weapon: 6,
  rarity_common_weapon: 7,
};
const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
const round = (v) => (v == null ? null : Math.round(v * 100) / 100);
const nz = (v) => (v == null || v === 0 ? null : v);

function lookup(hashName, phase) {
  if (phase) return buff[hashName]?.starting_at?.doppler?.[phase] ?? null;
  const s = steam[hashName];
  const fromSteam = s ? nz(s.last_7d) ?? nz(s.last_30d) ?? nz(s.last_24h) ?? nz(s.last_90d) : null;
  if (fromSteam != null) return fromSteam;
  if (nz(buff[hashName]?.starting_at?.price) != null) return buff[hashName].starting_at.price;
  return nz(skinport[hashName]?.starting_at) ?? null;
}
const statTrakName = (name) => (name.startsWith('★ ') ? '★ StatTrak™ ' + name.slice(2) : 'StatTrak™ ' + name);

function priceTable(skin) {
  const vanilla = skin.min_float == null;
  const hasST = skin.stattrak !== false && skin.category?.name !== 'Gloves';
  const phase = skin.phase || undefined;
  const nameOf = (wear, prefix) => (vanilla ? prefix + skin.name : `${prefix}${skin.name} (${wear})`);
  const table = (prefixes) => {
    for (const pre of prefixes) {
      const arr = WEARS.map((w) => round(lookup(pre === 'ST' ? nameOf(w, '').replace(skin.name, statTrakName(skin.name)) : nameOf(w, pre), phase)));
      if (arr.some((x) => x != null)) return arr;
    }
    return null;
  };
  let p = table(['']);
  let ps = hasST ? table(['ST']) : null;
  if (!p && phase) p = table(['']) || WEARS.map((w) => round(lookup(nameOf(w, ''))));
  if (!p && skin.souvenir) p = table(['Souvenir ']);
  if (!p || p.every((x) => x == null)) return null;
  const fill = (arr) => {
    if (!arr) return arr;
    for (let i = 0; i < arr.length; i++) if (arr[i] == null) arr[i] = arr[i - 1] ?? arr.slice(i).find((x) => x != null);
    return arr;
  };
  return { p: fill(p), ps: fill(ps), f: vanilla ? [0.06, 0.8] : [skin.min_float, skin.max_float], st: hasST ? 1 : 0 };
}

const items = [];
const indexById = new Map();
let noPrice = 0;
for (const s of skins) {
  if (s.category?.name === 'Equipment') continue;
  const special = s.category?.name === 'Knives' || s.category?.name === 'Gloves';
  const r = special ? 5 : RARITY[s.rarity?.id];
  if (!r) continue;
  const pt = priceTable(s);
  if (!pt) { noPrice++; continue; }
  indexById.set(s.id, items.length);
  items.push({
    id: s.id, n: s.name, r, img: s.image, ph: s.phase || undefined,
    w: s.weapon?.name, cat: s.category?.name, col: s.collections?.[0]?.id, colName: s.collections?.[0]?.name,
    ...pt,
  });
}

const cases = crates
  .filter((c) => c.type === 'Case' && c.contains_rare.length > 0)
  .sort((a, b) => (b.first_sale_date || '').localeCompare(a.first_sale_date || ''))
  .map((c) => ({
    id: c.id, name: c.name, image: c.image, date: c.first_sale_date, price: round(lookup(c.name)),
    items: c.contains.map((i) => indexById.get(i.id)).filter((i) => i != null),
    rare: c.contains_rare.map((i) => indexById.get(i.id)).filter((i) => i != null),
  }));

const byCat = {};
items.forEach((i) => { byCat[i.cat] = (byCat[i.cat] || 0) + 1; });
console.log(`items: ${items.length} (bỏ ${noPrice} món không có giá)`, byCat);
console.log(`cases: ${cases.length}`, cases.filter((c) => c.items.length < 5 || c.rare.length < 1).map((c) => c.name));
const withCol = items.filter((i) => i.col).length;
console.log('items có collection:', withCol);

const out = 'window.CS2_ITEMS=' + JSON.stringify(items) + ';window.CS2_CASES=' + JSON.stringify(cases) + ';window.CS2_PRICES_UPDATED=' + JSON.stringify(new Date().toISOString().slice(0, 10)) + ';';
fs.writeFileSync('data/cases.js', out);
fs.writeFileSync('data/items.json', JSON.stringify(items));
fs.writeFileSync('data/cases.json', JSON.stringify(cases));
console.log('written data/cases.js', (fs.statSync('data/cases.js').size / 1024).toFixed(0), 'KB');
