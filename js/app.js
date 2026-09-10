const ITEMS = window.CS2_ITEMS;
const OFFICIAL = window.CS2_CASES;

const RARITY = {
  // Tỷ lệ Valve gốc: 79,92 / 15,98 / 3,20 / 0,64 / 0,26 — trang này nâng dao/găng lên 1%, các bậc còn lại co theo tỷ lệ
  1: { name: 'Mil-Spec', color: '#4b69ff', p: 0.79327 },
  2: { name: 'Restricted', color: '#8847ff', p: 0.15861 },
  3: { name: 'Classified', color: '#d32ce6', p: 0.031763 },
  4: { name: 'Covert', color: '#eb4b4b', p: 0.006353 },
  5: { name: 'Vật phẩm đặc biệt ★', color: '#ffd700', p: 0.01 },
  6: { name: 'Industrial', color: '#5e98d9', p: 0 },
  7: { name: 'Consumer', color: '#b0c3d9', p: 0 },
};
const CASE_RARITIES = [1, 2, 3, 4, 5];
const WEARS = [
  { name: 'Factory New', p: 0.03, min: 0, max: 0.07 },
  { name: 'Minimal Wear', p: 0.24, min: 0.07, max: 0.15 },
  { name: 'Field-Tested', p: 0.33, min: 0.15, max: 0.38 },
  { name: 'Well-Worn', p: 0.24, min: 0.38, max: 0.45 },
  { name: 'Battle-Scarred', p: 0.16, min: 0.45, max: 1 },
];
const STATTRAK_P = 0.1;
const KEY_PRICE = 2.49;
const USD_VND = 25500;
const TOPUP = 1000;
const TRADE_FEE = 0.05;
const CUSTOM_RTP = 0.9;
const CUSTOM_ALPHA = 0.9;
// ---------- Hồ sơ người chơi (theo tên, lưu riêng trên thiết bị) ----------
const API_URL = 'https://cs2-case-api.tanbobao2k.workers.dev';
const PROFILES_KEY = 'cs2-profiles';
const CURRENT_KEY = 'cs2-current';
const TOKEN_KEY = 'cs2-token';
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const profile = lsGet(CURRENT_KEY, null);
const profiles = lsGet(PROFILES_KEY, []);
const STORE_INV = profile ? `cs2-inv:${profile}` : 'cs2-inv';
const STORE_STATS = profile ? `cs2-stats:${profile}` : 'cs2-stats';
const INV_LIMIT = 2000;
const BOT_NAMES = ['Bot Alpha', 'Bot Bravo', 'Bot Charlie'];
const BOT_AVATARS = ['🤖', '👾', '🦾'];

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const sum = (a, f = (x) => x) => a.reduce((s, x) => s + f(x), 0);

// ---------- Random ----------
function weightedPick(list, getP) {
  let r = Math.random() * sum(list, getP);
  for (const x of list) {
    r -= getP(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}
const rollRarity = () => Number(weightedPick(CASE_RARITIES, (k) => RARITY[k].p));

// Roll float 0–1 theo phân phối độ mòn rồi ép vào khoảng float của skin (cơ chế CS2)
function rollFloat(range) {
  const bucket = weightedPick(WEARS, (w) => w.p);
  const f01 = bucket.min + Math.random() * (bucket.max - bucket.min);
  return +(range[0] + f01 * (range[1] - range[0])).toFixed(6);
}
const wearIndex = (f) => (f < 0.07 ? 0 : f < 0.15 ? 1 : f < 0.38 ? 2 : f < 0.45 ? 3 : 4);
const priceAt = (base, wi, st) => (st ? base.ps : base.p)?.[wi] ?? base.p?.[wi] ?? 0;
const typicalPrice = (base) => base.p[2] ?? base.p.find((x) => x != null) ?? 0;

function instanceOf(base, float, st, extra = {}) {
  const wi = wearIndex(float);
  return {
    iid: ITEMS.indexOf(base), n: base.n, img: base.img, ph: base.ph, r: base.r,
    wear: WEARS[wi].name, float, st, price: priceAt(base, wi, st), t: Date.now(), ...extra,
  };
}
const baseOf = (item) => (item.iid != null ? ITEMS[item.iid] : ITEMS.find((b) => b.n === item.n && b.ph === item.ph));

function rollItem(c, forcedRarity) {
  let base, st;
  if (c.custom) {
    base = weightedPick(c.pool, (x) => x.w).base;
    st = false;
  } else {
    const r = forcedRarity || rollRarity();
    if (r === 5) {
      const names = [...new Set(c.rare.map((i) => ITEMS[i].n))];
      const name = rand(names);
      base = ITEMS[rand(c.rare.filter((i) => ITEMS[i].n === name))];
    } else {
      base = ITEMS[rand(c.items.filter((i) => ITEMS[i].r === r))];
    }
    st = base.st !== 0 && Math.random() < STATTRAK_P;
  }
  return instanceOf(base, rollFloat(base.f), st, { caseId: c.id, caseName: c.name });
}
const caseCost = (c) => (c.custom ? c.price : (c.price || 0) + KEY_PRICE);

// ---------- Hòm đặc biệt (kiểu Skin Club) ----------
const CUSTOM_DEFS = [
  { id: 'cc-all', name: 'Hòm Tất Cả', desc: 'Toàn bộ hơn 2.100 skin, dao, găng trong game', tag: 'Tổng hợp', color: '#f5a524', f: () => true },
  { id: 'cc-knife', name: 'Hòm Toàn Dao', desc: 'Chỉ có dao — 100% rớt dao', tag: 'Dao', color: '#ffd700', f: (i) => i.cat === 'Knives' },
  { id: 'cc-glove', name: 'Hòm Găng Tay', desc: 'Chỉ có găng tay', tag: 'Găng', color: '#ffd700', f: (i) => i.cat === 'Gloves' },
  { id: 'cc-karambit', name: 'Hòm Karambit', desc: 'Mọi finish của Karambit', tag: 'Dao', color: '#ffd700', f: (i) => i.w === 'Karambit' },
  { id: 'cc-butterfly', name: 'Hòm Butterfly', desc: 'Mọi finish của Butterfly Knife', tag: 'Dao', color: '#ffd700', f: (i) => i.w === 'Butterfly Knife' },
  { id: 'cc-m9', name: 'Hòm M9 Bayonet', desc: 'Mọi finish của M9 Bayonet', tag: 'Dao', color: '#ffd700', f: (i) => i.w === 'M9 Bayonet' },
  { id: 'cc-bayonet', name: 'Hòm Bayonet', desc: 'Mọi finish của Bayonet', tag: 'Dao', color: '#ffd700', f: (i) => i.w === 'Bayonet' },
  { id: 'cc-doppler', name: 'Hòm Doppler', desc: 'Doppler & Gamma Doppler mọi phase, có Ruby/Sapphire/Black Pearl/Emerald', tag: 'Dao', color: '#e94b8a', f: (i) => /Doppler/.test(i.n) },
  { id: 'cc-fade', name: 'Hòm Fade', desc: 'Fade, Marble Fade, Amber Fade, Ultraviolet…', tag: 'Theme', color: '#c77dff', f: (i) => /\| .*Fade/.test(i.n) },
  { id: 'cc-legend', name: 'Hòm Huyền Thoại', desc: 'Chỉ đồ trên $1.000: Dragon Lore, Howl, Gungnir, dao xịn…', tag: 'VIP', color: '#ff5f5f', f: (i) => typicalPrice(i) >= 1000 },
  { id: 'cc-ak', name: 'Hòm AK-47', desc: 'Toàn bộ skin AK-47', tag: 'Súng', color: '#eb4b4b', f: (i) => i.w === 'AK-47' },
  { id: 'cc-awp', name: 'Hòm AWP', desc: 'Toàn bộ skin AWP', tag: 'Súng', color: '#eb4b4b', f: (i) => i.w === 'AWP' },
  { id: 'cc-m4a4', name: 'Hòm M4A4', desc: 'Toàn bộ skin M4A4', tag: 'Súng', color: '#eb4b4b', f: (i) => i.w === 'M4A4' },
  { id: 'cc-m4a1', name: 'Hòm M4A1-S', desc: 'Toàn bộ skin M4A1-S', tag: 'Súng', color: '#eb4b4b', f: (i) => i.w === 'M4A1-S' },
  { id: 'cc-deagle', name: 'Hòm Desert Eagle', desc: 'Toàn bộ skin Desert Eagle', tag: 'Súng', color: '#eb4b4b', f: (i) => i.w === 'Desert Eagle' },
  { id: 'cc-usp', name: 'Hòm USP-S', desc: 'Toàn bộ skin USP-S', tag: 'Súng', color: '#eb4b4b', f: (i) => i.w === 'USP-S' },
  { id: 'cc-glock', name: 'Hòm Glock-18', desc: 'Toàn bộ skin Glock-18', tag: 'Súng', color: '#eb4b4b', f: (i) => i.w === 'Glock-18' },
  { id: 'cc-pistol', name: 'Hòm Súng Lục', desc: 'Mọi skin súng lục', tag: 'Nhóm', color: '#8847ff', f: (i) => i.cat === 'Pistols' },
  { id: 'cc-rifle', name: 'Hòm Súng Trường', desc: 'Mọi skin rifle & sniper', tag: 'Nhóm', color: '#8847ff', f: (i) => i.cat === 'Rifles' },
  { id: 'cc-smg', name: 'Hòm SMG', desc: 'Mọi skin tiểu liên', tag: 'Nhóm', color: '#8847ff', f: (i) => i.cat === 'SMGs' },
  { id: 'cc-heavy', name: 'Hòm Hạng Nặng', desc: 'Shotgun & súng máy', tag: 'Nhóm', color: '#8847ff', f: (i) => i.cat === 'Heavy' },
  { id: 'cc-covert', name: 'Hòm Đỏ Rực', desc: 'Toàn bộ skin bậc Covert', tag: 'Bậc', color: '#eb4b4b', f: (i) => i.r === 4 },
  { id: 'cc-classified', name: 'Hòm Hồng', desc: 'Toàn bộ skin bậc Classified', tag: 'Bậc', color: '#d32ce6', f: (i) => i.r === 3 },
  { id: 'cc-mid', name: 'Hòm Tầm Trung', desc: 'Skin từ $5 đến $50', tag: 'Giá', color: '#7ee2a8', f: (i) => { const v = typicalPrice(i); return v >= 5 && v <= 50; } },
  { id: 'cc-budget', name: 'Hòm Bình Dân', desc: 'Skin dưới $1 — mở cho vui', tag: 'Giá', color: '#7ee2a8', f: (i) => typicalPrice(i) < 1 },
];
// Tỷ lệ ∝ 1/giá^α, giá hòm = EV / RTP (cách các site mở hòm định giá)
const CUSTOM = CUSTOM_DEFS.map((d) => {
  const pool = ITEMS.filter(d.f).map((base) => ({ base, v: typicalPrice(base) })).filter((x) => x.v > 0);
  pool.forEach((x) => { x.w = Math.pow(x.v, -CUSTOM_ALPHA); });
  const W = sum(pool, (x) => x.w);
  pool.forEach((x) => { x.pct = x.w / W; });
  pool.sort((a, b) => b.v - a.v);
  const ev = sum(pool, (x) => x.pct * x.v);
  const feat = pool[Math.min(pool.length - 1, Math.floor(pool.length * 0.04))].base.img;
  // Thùng hòm thật của Valve: nhóm dao/găng/VIP dùng thùng đen, còn lại thùng cam xoay màu sang màu chủ đề
  const premium = ['Dao', 'Găng', 'VIP'].includes(d.tag);
  const crateName = premium ? (d.tag === 'Găng' ? 'Glove Case' : 'Shadow Case') : ['Fever Case', 'Kilowatt Case', 'Gallery Case'][CUSTOM_DEFS.indexOf(d) % 3];
  const crate = OFFICIAL.find((c) => c.name === crateName) || OFFICIAL[0];
  const hue = premium ? 0 : Math.round(hexHue(d.color) - 28);
  return { ...d, custom: true, pool, price: Math.round((ev / CUSTOM_RTP) * 100) / 100, image: crate.image, feat, hue };
}).filter((c) => c.pool.length >= 5);
function hexHue(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const caseIcon = (c, cls = '') => `<img class="${cls} ${c.custom ? 'cc-mini' : ''}" src="${c.image}" alt="" style="${c.custom ? `--hue:${c.hue}deg` : ''}" loading="lazy" />`;
const CASES = [...OFFICIAL, ...CUSTOM];
const caseById = (id) => CASES.find((c) => c.id === id);

// ---------- Storage ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  if (k === STORE_INV || k === STORE_STATS) scheduleSync();
};
const freshStats = () => ({
  opened: 0, by: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, st: 0, spent: 0,
  balance: TOPUP, topup: TOPUP, sold: 0, byCase: {}, best: null,
  battles: { played: 0, won: 0 }, trades: 0, tradeups: 0,
});

let inventory = load(STORE_INV, []);
let stats = { ...freshStats(), ...load(STORE_STATS, {}) };
if (stats.balance == null) { stats.balance = TOPUP; stats.topup = TOPUP; }
stats.byCase ??= {}; stats.battles ??= { played: 0, won: 0 }; stats.sold ??= 0; stats.trades ??= 0; stats.tradeups ??= 0; stats.equipped ??= {};

function addToInventory(items) {
  inventory.unshift(...items);
  if (inventory.length > INV_LIMIT) inventory.length = INV_LIMIT;
  save(STORE_INV, inventory);
}
function removeFromInventory(items) {
  const set = new Set(items);
  items.forEach((i) => { if (isEquipped(i)) delete stats.equipped[slotOf(i)]; });
  inventory = inventory.filter((i) => !set.has(i));
  save(STORE_INV, inventory);
}
const slotOf = (item) => baseOf(item)?.w || item.n.split(' | ')[0];
const isEquipped = (item) => !!item.uid && stats.equipped[slotOf(item)] === item.uid;
function toggleEquip(item) {
  if (!inventory.includes(item)) return;
  const slot = slotOf(item);
  if (isEquipped(item)) { delete stats.equipped[slot]; toast(`Đã tháo ${item.n}`); }
  else {
    item.uid ||= Date.now() + Math.random();
    stats.equipped[slot] = item.uid;
    save(STORE_INV, inventory);
    toast(`Đã trang bị ${item.n} (slot ${slot})`);
    playInspect(true);
  }
  persistAndRender();
  updateEquipBtn(item);
}
function countDrop(item, c) {
  stats.opened++;
  stats.by[item.r] = (stats.by[item.r] || 0) + 1;
  if (item.st) stats.st++;
  const bc = (stats.byCase[c.id] ??= { n: 0, spent: 0, got: 0 });
  bc.n++; bc.spent += caseCost(c); bc.got += item.price;
  if (!stats.best || item.price > stats.best.price) stats.best = { n: item.n, ph: item.ph, img: item.img, r: item.r, st: item.st, wear: item.wear, float: item.float, price: item.price, caseName: c.name };
}
function pay(amount) {
  stats.balance -= amount;
  stats.spent += amount;
}
function persistAndRender() {
  save(STORE_STATS, stats);
  renderInventory();
  renderStats();
}
const invValue = () => sum(inventory, (i) => i.price || 0);

// ---------- Format ----------
const fmtUSD = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSDShort = (n) => '$' + (n || 0).toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 });
const fmtVND = (n) => Math.round((n || 0) * USD_VND).toLocaleString('vi-VN') + '₫';
const fmtPct = (p) => (p * 100).toLocaleString('vi-VN', { maximumFractionDigits: p * 100 < 0.1 ? 4 : 2 }) + '%';
const nameHTML = (item) => (item.st ? '<span class="st-badge">StatTrak™</span> ' : '') + item.n + (item.ph ? ` <span class="muted">(${item.ph})</span>` : '');
const shortCase = (n) => n.replace(/ (Weapon )?Case$/, '').replace(/^Hòm /, '');

function itemCard(item, { showFrom = false, sell = false, odds } = {}) {
  const el = document.createElement('div');
  el.className = 'item';
  el.style.setProperty('--rc', RARITY[item.r].color);
  const priceLine = item.price != null
    ? `<span class="price">${fmtUSD(item.price)}</span>`
    : item.p ? `<span class="price">từ ${fmtUSD(Math.min(...item.p))}</span>` : '';
  el.innerHTML = `
    ${item.st ? '<span class="st">StatTrak™</span>' : ''}
    ${isEquipped(item) ? `<span class="eq ${item.st ? 'shift' : ''}">Đang dùng</span>` : ''}
    ${showFrom && item.caseName ? `<span class="from">${shortCase(item.caseName)}</span>` : ''}
    <img src="${item.img}" alt="" loading="lazy" />
    <div class="name">${item.n}${item.ph ? ` <span class="muted">(${item.ph})</span>` : ''}</div>
    ${item.wear ? `<div class="sub">${item.wear} · ${item.float.toFixed(4)}</div>` : ''}
    ${priceLine}
    ${odds != null ? `<div class="odds">${fmtPct(odds)}</div>` : ''}
    ${sell ? `<button class="sell" data-sell>Bán ${fmtUSD(item.price)}</button>` : ''}`;
  el.onclick = (e) => {
    if (e.target.matches('[data-sell]')) { sellItems([item]); return; }
    openZoom(item);
  };
  return el;
}

// ---------- Case grid ----------
function caseCard(c) {
  const el = document.createElement('div');
  el.className = 'case-card' + (c.custom ? ' custom' : '');
  if (c.custom) el.style.setProperty('--tag', c.color);
  const meta = c.custom
    ? `<div class="desc">${c.desc}</div><div class="year">${c.pool.length} món</div>`
    : `<div class="year">${c.date ? c.date.slice(0, 4) : ''} · ${c.items.length} skin · ${new Set(c.rare.map((i) => ITEMS[i].n)).size} dao/găng</div>`;
  const art = c.custom
    ? `<div class="cc-art" style="--hue:${c.hue}deg"><img class="crate" src="${c.image}" alt="" loading="lazy" /><img class="feat" src="${c.feat}" alt="" loading="lazy" /></div>`
    : `<img src="${c.image}" alt="${c.name}" loading="lazy" />`;
  el.innerHTML = `
    ${c.custom ? `<span class="tag">${c.tag}</span>` : ''}
    ${art}
    <h3>${c.name}</h3>
    ${meta}
    <div class="cost">Giá mở <b>${fmtUSD(caseCost(c))}</b> <span class="price-vnd">≈ ${fmtVND(caseCost(c))}</span></div>
    <div class="actions">
      <button class="btn" data-view="${c.id}">Xem</button>
      <button class="btn btn-primary" data-open="${c.id}">Mở hòm</button>
    </div>`;
  return el;
}
function renderCases(filter = $('#case-search').value) {
  const q = filter.trim().toLowerCase();
  const match = (c) => c.name.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q);
  const cg = $('#custom-grid'), og = $('#case-grid');
  cg.innerHTML = ''; og.innerHTML = '';
  CUSTOM.filter(match).forEach((c) => cg.appendChild(caseCard(c)));
  OFFICIAL.filter(match).forEach((c) => og.appendChild(caseCard(c)));
  $('#official').hidden = q && !OFFICIAL.some(match);
}

// ---------- Case detail ----------
function showCaseDetail(c) {
  $('#cd-image').src = c.custom ? c.feat : c.image;
  $('#cd-name').textContent = c.name;
  $('#cd-meta').textContent = c.custom
    ? `${c.desc} · ${c.pool.length} món · giá mở ${fmtUSD(c.price)} · hoàn trả ~${Math.round(CUSTOM_RTP * 100)}%`
    : `Phát hành ${c.date || '—'} · ${c.items.length} skin thường · ${new Set(c.rare.map((i) => ITEMS[i].n)).size} vật phẩm đặc biệt · giá mở ${fmtUSD(caseCost(c))}`;
  $('#cd-open').onclick = () => { closeModal('#modal-case'); openCase(c); };
  $('#cd-battle').onclick = () => { closeModal('#modal-case'); openBattleSetup([c.id]); };

  const wrap = $('#cd-items');
  wrap.innerHTML = '';
  if (c.custom) {
    const g = document.createElement('div');
    g.className = 'cd-group';
    g.style.setProperty('--rc', c.color);
    const shown = c.pool.slice(0, 400);
    g.innerHTML = `<h4>Tỷ lệ từng món <span>sắp xếp theo giá · ${shown.length < c.pool.length ? `hiện ${shown.length}/${c.pool.length} món đắt nhất` : `${c.pool.length} món`}</span></h4><div class="cd-list"></div>`;
    const list = $('.cd-list', g);
    shown.forEach((x) => list.appendChild(itemCard({ ...x.base, price: x.v, ph: undefined }, { odds: x.pct })));
    wrap.appendChild(g);
  } else {
    [4, 3, 2, 1].forEach((r) => {
      const items = c.items.map((i) => ITEMS[i]).filter((i) => i.r === r);
      if (!items.length) return;
      wrap.appendChild(detailGroup(RARITY[r], items, RARITY[r].p / items.length));
    });
    const rareNames = [...new Map(c.rare.map((i) => [ITEMS[i].n, ITEMS[i]]).entries()).values()];
    wrap.appendChild(detailGroup(RARITY[5], rareNames, RARITY[5].p / rareNames.length));
  }
  openModal('#modal-case');
}
function detailGroup(rarity, items, pEach) {
  const g = document.createElement('div');
  g.className = 'cd-group';
  g.style.setProperty('--rc', rarity.color);
  g.innerHTML = `<h4>${rarity.name} <span>${fmtPct(rarity.p)} · mỗi món ~${fmtPct(pEach)}</span></h4><div class="cd-list"></div>`;
  const list = $('.cd-list', g);
  items.forEach((i) => list.appendChild(itemCard({ ...i, ph: undefined })));
  return g;
}

// ---------- Sound ----------
let audioCtx;
function tick(freq = 900) {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.03, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.05);
  } catch {}
}
function playWinSound() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const t = audioCtx.currentTime + idx * 0.09;
      o.type = 'triangle';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + 0.65);
    });
  } catch {}
}
function playLoseSound() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.5);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 0.55);
  } catch {}
}
function animateSpin({ target, duration, onFrame, onTick, pitch }) {
  return new Promise((resolve) => {
    const ease = (t) => 1 - Math.pow(1 - t, 5);
    const start = performance.now();
    let lastIdx = -1;
    const frame = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const x = target * ease(p);
      onFrame(x);
      const idx = Math.floor(x / pitch);
      if (idx !== lastIdx) { lastIdx = idx; onTick?.(); }
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

// ---------- Ví ----------
function topUp() {
  stats.balance += TOPUP;
  stats.topup += TOPUP;
  persistAndRender();
  toast(`Đã nạp ${fmtUSD(TOPUP)} vào ví ảo`);
}
function ensureBalance(amount) {
  if (stats.balance >= amount) return true;
  if (confirm(`Ví còn ${fmtUSD(stats.balance)}, cần ${fmtUSD(amount)}. Nạp thêm ${fmtUSD(TOPUP)} (ảo, miễn phí)?`)) { topUp(); return ensureBalance(amount); }
  return false;
}
function sellItems(items, { silent = false } = {}) {
  if (!items.length) return;
  const total = sum(items, (i) => i.price || 0);
  removeFromInventory(items);
  stats.balance += total;
  stats.sold += total;
  persistAndRender();
  if (!silent) toast(`Đã bán ${items.length} món, +${fmtUSD(total)} vào ví`);
}
let toastTimer;
function toast(msg) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- Mở hòm lẻ ----------
const TILE_COUNT = 60;
const WIN_INDEX = 50;
let currentCase = null;
let spinning = false;
let lastWon = null;

async function openCase(c) {
  if (spinning) return;
  if (!ensureBalance(caseCost(c))) return;
  currentCase = c;
  pay(caseCost(c));
  const won = rollItem(c);
  $('#open-title').textContent = `Đang mở ${c.name}`;
  $('#result').hidden = true;
  openModal('#modal-open');

  const strip = $('#roulette-strip');
  strip.innerHTML = '';
  strip.style.transform = 'translateX(0)';
  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => (i === WIN_INDEX ? won : rollItem(c)));
  tiles.forEach((it) => {
    const t = document.createElement('div');
    t.className = 'tile';
    t.style.setProperty('--rc', RARITY[it.r].color);
    t.innerHTML = `<img src="${it.img}" alt="" /><div class="name">${it.n}</div>`;
    strip.appendChild(t);
  });

  const tileW = strip.firstElementChild.offsetWidth + 6;
  const viewW = strip.parentElement.clientWidth;
  const offset = (Math.random() * 0.7 - 0.35) * tileW;
  const target = WIN_INDEX * tileW + tileW / 2 - viewW / 2 + offset;

  if ($('#fast-mode').checked) {
    strip.style.transform = `translateX(${-target}px)`;
    revealResult(won);
    return;
  }
  spinning = true;
  await animateSpin({
    target, duration: 6500, pitch: tileW,
    onFrame: (x) => { strip.style.transform = `translateX(${-x}px)`; },
    onTick: () => tick(),
  });
  spinning = false;
  await sleep(350);
  revealResult(won);
}

function revealResult(item) {
  lastWon = item;
  countDrop(item, currentCase);
  addToInventory([item]);
  persistAndRender();

  $('.result-card').style.setProperty('--rc', RARITY[item.r].color);
  $('#res-rarity').textContent = RARITY[item.r].name;
  $('#res-image').src = item.img;
  $('#res-name').innerHTML = nameHTML(item);
  $('#res-wear').textContent = `${item.wear} · Float ${item.float}`;
  $('#res-price').innerHTML = `<span class="price">${fmtUSD(item.price)}</span> <span class="price-vnd">≈ ${fmtVND(item.price)}</span>`;
  $('#res-sell').textContent = `Bán ngay ${fmtUSD(item.price)}`;
  $('#res-sell').disabled = false;
  $('#res-again').textContent = `Mở tiếp (${fmtUSD(caseCost(currentCase))})`;
  $('#result').hidden = false;
  const big = item.price >= 100 || item.r >= 4;
  $('#open-title').textContent = big ? 'Trúng lớn!' : 'Bạn nhận được';
  if (big) tick(1400);
  $('#result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---------- Zoom ----------
const zoom = { scale: 1, x: 0, y: 0, pointers: new Map(), lastDist: 0 };
function applyZoom() {
  $('#zoom-img').style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`;
  $('#zoom-level').textContent = Math.round(zoom.scale * 100) + '%';
}
function setZoom(s, cx, cy) {
  const next = Math.min(6, Math.max(1, s));
  if (cx != null) {
    const k = next / zoom.scale;
    zoom.x = cx - (cx - zoom.x) * k;
    zoom.y = cy - (cy - zoom.y) * k;
  }
  zoom.scale = next;
  if (next === 1) { zoom.x = 0; zoom.y = 0; }
  if (next > 1) $('#zoom-wrap').style.transform = '';
  applyZoom();
}
let zoomItem = null;
function updateEquipBtn(item) {
  const b = $('#zoom-equip');
  b.hidden = !inventory.includes(item);
  b.textContent = isEquipped(item) ? '✓ Đang dùng — Tháo' : 'Trang bị';
}
function whoosh() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const f = audioCtx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    f.type = 'lowpass'; f.frequency.value = 1200;
    o.connect(f).connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.95);
  } catch {}
}
function playInspect(short = false) {
  const wrap = $('#zoom-wrap'), shine = $('#zoom-shine');
  setZoom(1);
  wrap.style.transform = '';
  wrap.classList.remove('inspecting', 'idle');
  shine.classList.remove('run');
  void wrap.offsetWidth;
  wrap.classList.add('inspecting');
  setTimeout(() => shine.classList.add('run'), short ? 100 : 500);
  whoosh();
  wrap.addEventListener('animationend', () => { wrap.classList.remove('inspecting'); wrap.classList.add('idle'); shine.classList.remove('run'); }, { once: true });
}
function tiltTo(nx, ny) {
  const wrap = $('#zoom-wrap');
  if (wrap.classList.contains('inspecting') || zoom.scale > 1) return;
  wrap.style.transform = `rotateY(${(nx * 18).toFixed(1)}deg) rotateX(${(-ny * 14).toFixed(1)}deg)`;
}
function openZoom(item) {
  zoomItem = item;
  zoom.scale = 1; zoom.x = 0; zoom.y = 0;
  applyZoom();
  const wrap = $('#zoom-wrap'), shine = $('#zoom-shine');
  wrap.style.transform = '';
  wrap.classList.remove('inspecting', 'idle');
  void wrap.offsetWidth;
  wrap.classList.add('idle');
  shine.classList.remove('run');
  shine.style.setProperty('--mask', `url("${item.img}")`);
  $('#zoom-glow').style.setProperty('--rc', RARITY[item.r]?.color || '#ffd700');
  updateEquipBtn(item);
  setTimeout(() => { if (zoomItem === item && !$('#modal-zoom').hidden) { shine.classList.add('run'); shine.addEventListener('animationend', () => shine.classList.remove('run'), { once: true }); } }, 450);
  $('#zoom-img').src = item.img;
  $('#zoom-name').innerHTML = nameHTML(item);
  const bits = [];
  if (item.wear) bits.push(`${item.wear} · Float ${item.float}`);
  if (item.price != null) bits.push(`${fmtUSD(item.price)} ≈ ${fmtVND(item.price)}`);
  else if (item.p) bits.push(`từ ${fmtUSD(Math.min(...item.p))}`);
  if (item.caseName) bits.push(item.caseName);
  $('#zoom-sub').textContent = bits.join(' · ');
  openModal('#modal-zoom');
}
(function bindZoom() {
  const stage = $('#zoom-stage');
  const rel = (e) => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; };
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [cx, cy] = rel(e);
    setZoom(zoom.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), cx, cy);
  }, { passive: false });
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    zoom.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!zoom.pointers.size && e.pointerType === 'mouse') {
      const r = stage.getBoundingClientRect();
      tiltTo((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1);
      return;
    }
    if (!zoom.pointers.has(e.pointerId)) return;
    const prev = zoom.pointers.get(e.pointerId);
    zoom.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    const pts = [...zoom.pointers.values()];
    if (pts.length === 2) {
      const dist = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
      if (zoom.lastDist) {
        const r = stage.getBoundingClientRect();
        setZoom(zoom.scale * (dist / zoom.lastDist), (pts[0][0] + pts[1][0]) / 2 - r.left - r.width / 2, (pts[0][1] + pts[1][1]) / 2 - r.top - r.height / 2);
      }
      zoom.lastDist = dist;
    } else if (zoom.scale > 1) {
      zoom.x += e.clientX - prev[0];
      zoom.y += e.clientY - prev[1];
      applyZoom();
    }
  });
  const up = (e) => { zoom.pointers.delete(e.pointerId); zoom.lastDist = 0; if (!zoom.pointers.size) stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('pointerleave', () => { const w = $('#zoom-wrap'); if (!w.classList.contains('inspecting')) w.style.transform = ''; });
  stage.addEventListener('dblclick', (e) => { const [cx, cy] = rel(e); setZoom(zoom.scale > 1 ? 1 : 2.5, cx, cy); });
  $('#zoom-inspect').onclick = () => playInspect();
  $('#zoom-equip').onclick = () => zoomItem && toggleEquip(zoomItem);
  // Điện thoại: nghiêng theo cảm biến nếu có
  window.addEventListener('deviceorientation', (e) => {
    if ($('#modal-zoom').hidden || e.gamma == null) return;
    tiltTo(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30)));
  });
  $$('[data-zoom]').forEach((b) => { b.onclick = () => { const d = Number(b.dataset.zoom); setZoom(d === 0 ? 1 : zoom.scale * (d > 0 ? 1.4 : 1 / 1.4)); }; });
})();

// ---------- Case Battle: thiết lập ----------
const bs = { bots: 1, mode: 'normal', cases: [] };
const MAX_ROUNDS = 10;

function openBattleSetup(preset) {
  if (preset) bs.cases = [...preset];
  renderBattleSetup();
  openModal('#modal-battle-setup');
}
function renderBattleSetup() {
  $$('#bs-bots button').forEach((b) => b.classList.toggle('active', Number(b.dataset.bots) === bs.bots));
  $$('#bs-mode button').forEach((b) => b.classList.toggle('active', b.dataset.mode === bs.mode));
  const sel = $('#bs-selected');
  sel.innerHTML = '';
  const counts = new Map();
  bs.cases.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  counts.forEach((qty, id) => {
    const c = caseById(id);
    const chip = document.createElement('div');
    chip.className = 'bs-chip';
    chip.innerHTML = `${caseIcon(c)}<span>${shortCase(c.name)}</span>
      <span class="qty"><button data-dec="${id}">−</button><b>${qty}</b><button data-inc="${id}">+</button></span>`;
    sel.appendChild(chip);
  });
  $('#bs-selected-empty').hidden = bs.cases.length > 0;
  $('#bs-round-count').textContent = bs.cases.length ? `(${bs.cases.length}/${MAX_ROUNDS} vòng)` : '';
  const cost = sum(bs.cases, (id) => caseCost(caseById(id)));
  $('#bs-cost').innerHTML = `${fmtUSD(cost)} <span class="price-vnd">≈ ${fmtVND(cost)}</span>`;
  $('#bs-start').disabled = bs.cases.length === 0;
}
function renderBattleCases(filter = '') {
  const q = filter.trim().toLowerCase();
  const wrap = $('#bs-cases');
  wrap.innerHTML = '';
  CASES.filter((c) => c.name.toLowerCase().includes(q)).forEach((c) => {
    const b = document.createElement('button');
    b.className = 'bs-case';
    b.dataset.add = c.id;
    b.innerHTML = `${caseIcon(c)}<span class="n">${c.name}</span><span class="c">${fmtUSD(caseCost(c))}</span>`;
    wrap.appendChild(b);
  });
}

// ---------- Case Battle: trận đấu ----------
const BT_TILES = 40;
const BT_WIN = 32;
let battle = null;

async function startBattle() {
  const rounds = bs.cases.map(caseById);
  const cost = sum(rounds, caseCost);
  if (!ensureBalance(cost)) return;
  closeModal('#modal-battle-setup');
  pay(cost);
  persistAndRender();

  const players = [
    { name: profile || 'Bạn', me: true, av: '🧑', total: 0, items: [] },
    ...Array.from({ length: bs.bots }, (_, i) => ({ name: BOT_NAMES[i], av: BOT_AVATARS[i], total: 0, items: [] })),
  ];
  const me = players[0];
  const current = { rounds, players, mode: bs.mode, cost, aborted: false, running: true };
  battle = current;

  $('#bt-title').textContent = `Case Battle · ${players.length} người · ${bs.mode === 'crazy' ? 'Đảo ngược' : 'Thường'} · ${fmtUSD(cost)}`;
  $('#bt-rounds').innerHTML = rounds.map((c) => caseIcon(c)).join('');
  $('#bt-final').hidden = true;
  const wrap = $('#bt-players');
  wrap.style.setProperty('--n', players.length);
  wrap.innerHTML = '';
  players.forEach((p) => {
    const el = document.createElement('div');
    el.className = 'bt-player';
    el.innerHTML = `
      <div class="bt-ph"><span class="av ${p.me ? 'me' : ''}">${p.av}</span><span class="nm">${p.name}</span><span class="tot">$0.00</span></div>
      <div class="bt-reel"><div class="bt-marker"></div><div class="bt-strip"></div></div>
      <div class="bt-drops"></div>`;
    wrap.appendChild(el);
    p.el = el;
  });
  openModal('#modal-battle');

  const fast = $('#fast-mode').checked;
  const roundIcons = $$('#bt-rounds img');
  for (let r = 0; r < rounds.length; r++) {
    if (current.aborted) return;
    roundIcons.forEach((im, i) => { im.classList.toggle('now', i === r); im.classList.toggle('done', i < r); });
    const c = rounds[r];
    const drops = players.map(() => rollItem(c));
    await Promise.all(players.map((p, i) => spinReel(p, c, drops[i], fast, i === 0)));
    if (current.aborted) return;
    players.forEach((p, i) => {
      const it = drops[i];
      p.items.push(it);
      p.total += it.price;
      $('.tot', p.el).textContent = fmtUSD(p.total);
      const d = document.createElement('div');
      d.className = 'bt-drop';
      d.style.setProperty('--rc', RARITY[it.r].color);
      d.innerHTML = `<img src="${it.img}" alt="" /><span class="n">${it.st ? 'ST™ ' : ''}${it.n}</span><span class="p">${fmtUSD(it.price)}</span>`;
      d.onclick = () => openZoom(it);
      $('.bt-drops', p.el).prepend(d);
    });
    await sleep(fast ? 250 : 900);
  }
  if (current.aborted) return;
  roundIcons.forEach((im) => { im.classList.remove('now'); im.classList.add('done'); });
  finishBattle(current, me);
}
function spinReel(p, c, won, fast, withSound) {
  const strip = $('.bt-strip', p.el);
  strip.innerHTML = '';
  strip.style.transform = 'translateY(0)';
  const tiles = Array.from({ length: BT_TILES }, (_, i) => (i === BT_WIN ? won : rollItem(c)));
  tiles.forEach((it) => {
    const t = document.createElement('div');
    t.className = 'bt-tile';
    t.style.setProperty('--rc', RARITY[it.r].color);
    t.innerHTML = `<img src="${it.img}" alt="" /><div><div class="n">${it.n}</div><div class="p">${fmtUSD(it.price)}</div></div>`;
    strip.appendChild(t);
  });
  const th = strip.firstElementChild.offsetHeight + 6;
  const reelH = strip.parentElement.clientHeight;
  const target = BT_WIN * th + th / 2 - reelH / 2;
  if (fast) { strip.style.transform = `translateY(${-target}px)`; return sleep(120); }
  return animateSpin({
    target, duration: 4200 + Math.random() * 600, pitch: th,
    onFrame: (y) => { strip.style.transform = `translateY(${-y}px)`; },
    onTick: withSound ? () => tick(700) : null,
  });
}
function finishBattle(current, me) {
  const { players, rounds, mode, cost } = current;
  current.running = false;
  const best = mode === 'crazy' ? Math.min(...players.map((p) => p.total)) : Math.max(...players.map((p) => p.total));
  const tied = players.filter((p) => Math.abs(p.total - best) < 0.005);
  const winner = rand(tied);
  players.forEach((p) => p.el.classList.add(p === winner ? 'winner' : 'loser'));

  const allItems = players.flatMap((p) => p.items);
  const pot = sum(allItems, (i) => i.price);
  me.items.forEach((it, i) => countDrop(it, rounds[i]));
  stats.battles.played++;
  if (winner === me) {
    stats.battles.won++;
    addToInventory([...allItems].sort((a, b) => b.price - a.price));
  }
  persistAndRender();

  const tieNote = tied.length > 1 ? 'Hoà điểm, tung xu. ' : '';
  $('#bt-final-title').textContent = winner === me
    ? `Bạn thắng! Ôm trọn ${allItems.length} món trị giá ${fmtUSD(pot)}`
    : `${winner.name} thắng với ${fmtUSD(winner.total)}`;
  $('#bt-final-sub').textContent = winner === me
    ? `${tieNote}Chi phí ${fmtUSD(cost)} → ${pot >= cost ? 'lãi' : 'lỗ'} ${fmtUSD(Math.abs(pot - cost))}. Tất cả đã vào kho đồ.`
    : `${tieNote}Bạn mở được ${fmtUSD(me.total)} nhưng mất hết. Chi phí ${fmtUSD(cost)}.`;
  $('#bt-final').hidden = false;
  $('#bt-final').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  tick(winner === me ? 1400 : 300);
}

// ---------- NÂNG CẤP SKIN (SKIN UPGRADE) ----------
const BOT_STOCK = ITEMS.map((base) => {
  // bot có sẵn skin ở độ mòn Field-Tested nếu có, không thì độ mòn gần nhất trong khoảng float
  const [lo, hi] = base.f;
  const wi = Math.max(wearIndex(lo), Math.min(2, wearIndex(hi - 1e-6)));
  const mid = Math.min(hi, Math.max(lo, (WEARS[wi].min + WEARS[wi].max) / 2));
  return instanceOf(base, +mid.toFixed(6), false, { caseName: 'Bot' });
});

const up = {
  wager: new Set(),
  target: null,
  side: 'right', // 'left' hoặc 'right'
  rolling: false,
  rotation: 0,
  botShown: 60,
  multFilter: 'all',
};

function pickCard(item, selected, onToggle, { disabled = false } = {}) {
  const el = itemCard(item, { showFrom: false });
  el.classList.add('pick');
  el.classList.toggle('selected', selected);
  el.classList.toggle('disabled', disabled);
  el.insertAdjacentHTML('afterbegin', '<span class="chk"></span><button class="zoom-btn" data-zoomer>🔍</button>');
  el.onclick = (e) => {
    if (up.rolling) return;
    if (e.target.matches('[data-zoomer]')) openZoom(item);
    else onToggle(item);
  };
  return el;
}

function openTrade() {
  up.wager.clear();
  up.target = null;
  up.botShown = 60;
  up.multFilter = 'all';
  const resPanel = $('#up-result-panel');
  if (resPanel) resPanel.hidden = true;
  const needle = $('#up-needle-wrap');
  if (needle) needle.style.transform = `rotate(${up.rotation % 360}deg)`;
  renderUpgrade();
  openModal('#modal-trade');
}

// Hàm tính toán và vẽ cung tròn SVG cho Vòng xoay Nâng cấp
function polarToCartesian(cx, cy, r, angleInDegrees) {
  const rad = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: +(cx + (r * Math.cos(rad))).toFixed(2),
    y: +(cy + (r * Math.sin(rad))).toFixed(2),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const diff = (endAngle - startAngle + 360) % 360;
  const largeArcFlag = diff > 180 ? '1' : '0';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

function updateWheelArc(rate) {
  const path = $('#up-wheel-arc');
  if (!path) return;
  if (rate <= 0) {
    path.setAttribute('d', '');
    return;
  }
  const angle = Math.min(359.99, (rate / 100) * 360);
  let d = '';
  if (up.side === 'right') {
    // Từ 12h (0°) thuận chiều kim đồng hồ đến angle
    d = describeArc(140, 140, 110, 0, angle);
  } else {
    // Từ 12h (0°) ngược chiều kim đồng hồ (từ 360 - angle đến 360)
    d = describeArc(140, 140, 110, 360 - angle, 360);
  }
  path.setAttribute('d', d);
}

function getUpgradeWinRate() {
  const wagerVal = sum([...up.wager], (i) => i.price || 0);
  const targetVal = up.target?.price || 0;
  if (wagerVal <= 0 || targetVal <= 0) return 0;
  return Math.min(95, Math.max(0.01, (wagerVal / targetVal) * 100));
}

function renderUpgrade() {
  if (!$('#modal-trade') || $('#modal-trade').hidden) return;

  // 1. Cột Đồ của bạn (Wager)
  const mineList = $('#up-mine-list');
  if (mineList) {
    mineList.innerHTML = '';
    const mineSearch = ($('#up-mine-search')?.value || '').trim().toLowerCase();
    const mineRarity = $('#up-mine-rarity')?.value || 'all';
    const mineSort = $('#up-mine-sort')?.value || 'price-desc';

    let myItems = [...inventory].filter((item) => {
      if (mineRarity !== 'all' && item.r !== Number(mineRarity)) return false;
      if (mineSearch && !item.n.toLowerCase().includes(mineSearch)) return false;
      return true;
    });

    if (mineSort === 'price-desc') myItems.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (mineSort === 'price-asc') myItems.sort((a, b) => (a.price || 0) - (b.price || 0));

    myItems.slice(0, 300).forEach((item) => {
      mineList.appendChild(pickCard(item, up.wager.has(item), (it) => {
        if (up.wager.has(it)) up.wager.delete(it);
        else up.wager.add(it);
        renderUpgrade();
      }));
    });

    $('#up-mine-empty').hidden = inventory.length > 0;
  }

  const wagerVal = sum([...up.wager], (i) => i.price || 0);
  $('#up-wager-summary').textContent = `${up.wager.size} món · ${fmtUSD(wagerVal)}`;
  $('#up-compare-wager-val').textContent = fmtUSD(wagerVal);
  $('#up-compare-wager-count').textContent = `${up.wager.size} món đã chọn`;

  // 2. Cột Đồ mong muốn (Target)
  const targetSearch = ($('#up-target-search')?.value || '').trim().toLowerCase();
  const targetRarity = $('#up-target-rarity')?.value || 'all';

  let targetPool = BOT_STOCK.filter((item) => {
    if (targetRarity !== 'all' && item.r !== Number(targetRarity)) return false;
    if (targetSearch && !item.n.toLowerCase().includes(targetSearch)) return false;
    return true;
  });

  // Áp dụng multiplier filter nếu có
  if (up.multFilter !== 'all' && wagerVal > 0) {
    const mult = Number(up.multFilter);
    const targetPrice = wagerVal * mult;
    targetPool = targetPool
      .filter((i) => i.price >= targetPrice * 0.7 && i.price <= targetPrice * 1.35)
      .sort((a, b) => Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice));
  } else {
    targetPool.sort((a, b) => b.price - a.price);
  }

  const targetList = $('#up-target-list');
  if (targetList) {
    targetList.innerHTML = '';
    const targetsToShow = [...(up.target ? [up.target] : []), ...targetPool.filter((i) => i !== up.target)];
    targetsToShow.slice(0, up.botShown).forEach((item) => {
      targetList.appendChild(pickCard(item, up.target === item, (it) => {
        up.target = (up.target === it ? null : it);
        renderUpgrade();
      }));
    });
  }

  $('#up-target-more').hidden = targetPool.length <= up.botShown;
  $('#up-target-count').textContent = `${targetPool.length} món có sẵn`;

  // Target preview
  if (up.target) {
    $('#up-compare-target-val').textContent = fmtUSD(up.target.price);
    $('#up-compare-target-name').textContent = up.target.n;
    $('#up-compare-target-name').title = up.target.n;
  } else {
    $('#up-compare-target-val').textContent = '$0.00';
    $('#up-compare-target-name').textContent = 'Chưa chọn skin';
    $('#up-compare-target-name').title = '';
  }

  // 3. Vòng xoay & Tỷ lệ
  const winRate = getUpgradeWinRate();
  $('#up-rate-num').textContent = winRate > 0 ? winRate.toFixed(2) + '%' : '0.00%';
  if (wagerVal > 0 && up.target) {
    const mult = up.target.price / wagerVal;
    $('#up-target-multiplier').textContent = mult >= 1 ? `${mult.toFixed(2)}x` : `0.${Math.round(mult * 100)}x`;
  } else {
    $('#up-target-multiplier').textContent = '—';
  }

  updateWheelArc(winRate);

  // Selector Trái / Phải
  $('#up-dir-left').classList.toggle('active', up.side === 'left');
  $('#up-dir-right').classList.toggle('active', up.side === 'right');

  // Nút Nâng Cấp
  const canRoll = !up.rolling && up.wager.size > 0 && up.target != null;
  $('#up-roll-btn').disabled = !canRoll;
  if (!up.rolling) {
    $('#up-roll-text').textContent = winRate > 0 ? `NÂNG CẤP (${winRate.toFixed(2)}%)` : 'NÂNG CẤP';
  }

  // Status message
  if (up.wager.size === 0) {
    $('#up-status-msg').textContent = 'Chọn ít nhất 1 món từ kho bên trái (hoặc bấm Chọn tất cả).';
  } else if (!up.target) {
    $('#up-status-msg').textContent = 'Chọn 1 món đồ mong muốn từ danh sách bên phải.';
  } else {
    $('#up-status-msg').textContent = `Sẵn sàng! Tỷ lệ trúng: ${winRate.toFixed(2)}% (Vùng ${up.side === 'left' ? 'TRÁI' : 'PHẢI'}). Bấm Nâng cấp để quay!`;
  }
}

function selectAllWager() {
  if (up.rolling) return;
  const mineSearch = ($('#up-mine-search')?.value || '').trim().toLowerCase();
  const mineRarity = $('#up-mine-rarity')?.value || 'all';
  let count = 0;
  inventory.forEach((item) => {
    if (mineRarity !== 'all' && item.r !== Number(mineRarity)) return;
    if (mineSearch && !item.n.toLowerCase().includes(mineSearch)) return;
    up.wager.add(item);
    count++;
  });
  renderUpgrade();
  toast(`Đã chọn tất cả ${count} món vào cược`);
}

function clearWager() {
  if (up.rolling) return;
  up.wager.clear();
  renderUpgrade();
}

async function startUpgrade() {
  if (up.rolling) return;
  const winRate = getUpgradeWinRate();
  if (winRate <= 0 || up.wager.size === 0 || !up.target) return;

  up.rolling = true;
  $('#up-roll-btn').disabled = true;
  $('#up-roll-text').textContent = 'ĐANG QUAY...';
  $('#up-result-panel').hidden = true;

  // Tính góc trúng thưởng
  // Nếu up.side === 'right': vùng trúng là [0, theta)
  // Nếu up.side === 'left': vùng trúng là [360 - theta, 360)
  const theta = (winRate / 100) * 360;

  // Roll góc dừng ngẫu nhiên đồng đều 0 -> 360
  const stopAngle = Math.random() * 360;

  // Kiểm tra thắng hay thua dựa trên góc dừng
  let isWin = false;
  if (up.side === 'right') {
    isWin = stopAngle >= 0 && stopAngle < theta;
  } else {
    isWin = stopAngle >= (360 - theta) && stopAngle < 360;
  }

  // Số vòng quay tối thiểu: 5-6 vòng (1800-2160 độ) + góc tới stopAngle
  const currentNormalized = up.rotation % 360;
  const deltaToStop = (stopAngle - currentNormalized + 360) % 360;
  const fullSpins = (5 + Math.floor(Math.random() * 2)) * 360;
  const totalTargetDeg = up.rotation + fullSpins + deltaToStop;

  const needle = $('#up-needle-wrap');
  const duration = 3800;
  const start = performance.now();
  const startDeg = up.rotation;
  const diffDeg = totalTargetDeg - startDeg;

  // Easing: bezier mượt mà giảm tốc
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);

  let lastSector = -1;
  await new Promise((resolve) => {
    function frame(now) {
      const p = Math.min(1, (now - start) / duration);
      const current = startDeg + diffDeg * easeOut(p);
      needle.style.transform = `rotate(${current}deg)`;

      // Âm thanh tick mỗi 20 độ xoay
      const sector = Math.floor(current / 20);
      if (sector !== lastSector) {
        lastSector = sector;
        tick(600 + (1 - p) * 500);
      }

      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });

  up.rotation = totalTargetDeg;
  await sleep(400);

  // Xử lý kết quả
  const wageredItems = [...up.wager];
  const wonItem = up.target;

  // Luôn xoá đồ cược khỏi kho
  removeFromInventory(wageredItems);

  if (isWin) {
    // Thắng!
    playWinSound();
    const itemToAdd = { ...wonItem, t: Date.now(), caseName: 'Nâng cấp' };
    addToInventory([itemToAdd]);
    stats.trades++;
    if (!stats.best || itemToAdd.price > stats.best.price) {
      stats.best = { ...itemToAdd };
    }
    persistAndRender();

    // Hiển thị panel thắng
    const panel = $('#up-result-panel');
    panel.className = 'up-result-panel win';
    $('#up-res-badge').textContent = 'NÂNG CẤP THÀNH CÔNG!';
    $('#up-res-img').src = itemToAdd.img;
    $('#up-res-name').innerHTML = nameHTML(itemToAdd);
    $('#up-res-meta').textContent = `${itemToAdd.wear} · Float ${itemToAdd.float}`;
    $('#up-res-price').textContent = fmtUSD(itemToAdd.price);
    $('#up-res-again').textContent = 'Nâng cấp tiếp';
    panel.hidden = false;

    // Reset cược
    up.wager.clear();
    up.target = null;
  } else {
    // Thua
    playLoseSound();
    stats.trades++;
    persistAndRender();

    const panel = $('#up-result-panel');
    panel.className = 'up-result-panel lose';
    $('#up-res-badge').textContent = 'NÂNG CẤP THẤT BẠI';
    $('#up-res-img').src = wonItem.img;
    $('#up-res-name').innerHTML = `Trượt: ${wonItem.n}`;
    $('#up-res-meta').textContent = `Kim dừng ở ${stopAngle.toFixed(1)}° (ngoài vùng ${up.side === 'left' ? 'Trái' : 'Phải'})`;
    $('#up-res-price').textContent = `Mất ${wageredItems.length} món cược`;
    $('#up-res-again').textContent = 'Thử lại';
    panel.hidden = false;

    // Reset cược
    up.wager.clear();
  }

  up.rolling = false;
  renderUpgrade();
}

// ---------- Trade-Up ----------
const tu = { tier: 1, picked: [] };
const nextTierPool = (col, tier) => (col ? ITEMS.filter((b) => b.col === col && b.r === tier + 1) : []);
function tuEligible(item) {
  const b = baseOf(item);
  return b && b.r === tu.tier && item.r === tu.tier && nextTierPool(b.col, tu.tier).length > 0;
}
function openTradeUp() {
  tu.picked = [];
  $('#tu-result').hidden = true;
  renderTradeUp();
  openModal('#modal-tradeup');
}
function tuOutcomes() {
  if (!tu.picked.length) return { list: [], avgF: 0, ev: 0 };
  const st = tu.picked[0].st;
  const n = tu.picked.length;
  const avgF = sum(tu.picked, (i) => { const b = baseOf(i); return (i.float - b.f[0]) / ((b.f[1] - b.f[0]) || 1); }) / n;
  const probs = new Map();
  tu.picked.forEach((i) => {
    const pool = nextTierPool(baseOf(i).col, tu.tier);
    pool.forEach((o) => probs.set(o, (probs.get(o) || 0) + 1 / n / pool.length));
  });
  const list = [...probs.entries()].map(([b, p]) => {
    const f = +(b.f[0] + avgF * (b.f[1] - b.f[0])).toFixed(6);
    const inst = instanceOf(b, f, !!st && b.st !== 0);
    return { base: b, p, inst };
  }).sort((a, b) => b.p - a.p || b.inst.price - a.inst.price);
  return { list, avgF, ev: sum(list, (x) => x.p * x.inst.price) };
}
function renderTradeUp() {
  $$('#tu-tabs button').forEach((b) => b.classList.toggle('active', Number(b.dataset.tier) === tu.tier));
  const mine = $('#tu-mine');
  mine.innerHTML = '';
  const st = tu.picked[0]?.st;
  const eligible = inventory.filter(tuEligible).sort((a, b) => (a.price || 0) - (b.price || 0));
  eligible.slice(0, 300).forEach((i) => {
    const disabled = tu.picked.length > 0 && !tu.picked.includes(i) && (!!i.st !== !!st || tu.picked.length >= 10);
    mine.appendChild(pickCard(i, tu.picked.includes(i), (it) => {
      const k = tu.picked.indexOf(it);
      if (k >= 0) tu.picked.splice(k, 1); else if (tu.picked.length < 10) tu.picked.push(it);
      renderTradeUp();
    }, { disabled }));
  });
  $('#tu-mine-empty').hidden = eligible.length > 0;
  $('#tu-count').textContent = `${tu.picked.length}/10${st ? ' · StatTrak™' : ''}`;
  $('#tu-auto').disabled = eligible.filter((i) => !i.st).length < 10 && eligible.filter((i) => i.st).length < 10;

  const { list, avgF, ev } = tuOutcomes();
  const out = $('#tu-outcomes');
  out.innerHTML = '';
  list.forEach((x) => {
    const el = document.createElement('div');
    el.className = 'tu-out';
    el.style.setProperty('--rc', RARITY[x.base.r].color);
    el.innerHTML = `<img src="${x.base.img}" alt="" /><div class="n">${nameHTML(x.inst)}<small>${x.inst.wear} · ${x.inst.float} · ${x.base.colName || ''}</small><div class="tu-bar"><i style="width:${x.p * 100}%"></i></div></div><span class="pr">${fmtUSD(x.inst.price)}</span><span class="pc">${fmtPct(x.p)}</span>`;
    el.onclick = () => openZoom(x.inst);
    out.appendChild(el);
  });
  $('#tu-outcomes-empty').hidden = list.length > 0;
  const inV = sum(tu.picked, (i) => i.price || 0);
  $('#tu-in').textContent = fmtUSD(inV);
  $('#tu-float').textContent = tu.picked.length ? avgF.toFixed(4) : '—';
  $('#tu-evv').textContent = fmtUSD(ev);
  $('#tu-evv').className = ev >= inV ? 'pos' : 'neg';
  $('#tu-ev').textContent = list.length ? `${list.length} kết quả · kỳ vọng ${fmtUSD(ev)}` : '';
  $('#tu-confirm').disabled = tu.picked.length !== 10;
}
function tuAutoPick() {
  const eligible = inventory.filter(tuEligible).sort((a, b) => (a.price || 0) - (b.price || 0));
  const normal = eligible.filter((i) => !i.st), stt = eligible.filter((i) => i.st);
  tu.picked = (normal.length >= 10 ? normal : stt).slice(0, 10);
  renderTradeUp();
}
function confirmTradeUp() {
  if (tu.picked.length !== 10) return;
  const { list } = tuOutcomes();
  const won = { ...weightedPick(list, (x) => x.p).inst, t: Date.now(), caseName: 'Trade-Up' };
  removeFromInventory(tu.picked);
  addToInventory([won]);
  stats.tradeups++;
  if (!stats.best || won.price > stats.best.price) stats.best = { ...won, caseName: 'Trade-Up' };
  persistAndRender();
  tu.picked = [];
  renderTradeUp();
  const card = $('#tu-result .result-card');
  card.style.setProperty('--rc', RARITY[won.r].color);
  $('#tu-res-rarity').textContent = RARITY[won.r].name;
  $('#tu-res-image').src = won.img;
  $('#tu-res-name').innerHTML = nameHTML(won);
  $('#tu-res-wear').textContent = `${won.wear} · Float ${won.float}`;
  $('#tu-res-price').innerHTML = `<span class="price">${fmtUSD(won.price)}</span> <span class="price-vnd">≈ ${fmtVND(won.price)}</span>`;
  $('#tu-res-zoom').onclick = () => openZoom(won);
  $('#tu-result').hidden = false;
  $('#tu-result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  tick(won.price >= 50 ? 1400 : 900);
}

// ---------- Inventory (phân trang 3 hàng) ----------
let invPage = 0;
function invPageSize() {
  const grid = $('#inv-grid');
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 4;
  return cols * 3;
}
function invFiltered() {
  const f = $('#inv-filter').value;
  let list = inventory.filter((i) => f === 'all' || (f === 'st' ? i.st : f === 'eq' ? isEquipped(i) : i.r === Number(f)));
  if ($('#inv-sort').value === 'price') list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
  return list;
}
function renderInventory() {
  const grid = $('#inv-grid');
  const list = invFiltered();
  const size = invPageSize();
  const pages = Math.max(1, Math.ceil(list.length / size));
  invPage = Math.min(invPage, pages - 1);
  grid.innerHTML = '';
  list.slice(invPage * size, (invPage + 1) * size).forEach((i) => grid.appendChild(itemCard(i, { showFrom: true, sell: true })));
  $('#inv-empty').hidden = list.length > 0;
  $('#inv-count').textContent = inventory.length;
  const total = invValue();
  $('#inv-value').textContent = inventory.length ? `${fmtUSD(total)} · ${inventory.length} món` : '';
  $('#inv-sell-all').disabled = list.length === 0;
  $('#inv-sell-all').textContent = list.length ? `Bán ${list.length} món (${fmtUSD(sum(list, (i) => i.price || 0))})` : 'Bán tất cả';

  const pager = $('#inv-pager');
  pager.innerHTML = '';
  if (pages <= 1) return;
  const btn = (label, page, { active = false, disabled = false } = {}) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.disabled = disabled;
    b.classList.toggle('active', active);
    b.onclick = () => { invPage = page; renderInventory(); $('#inventory').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    pager.appendChild(b);
  };
  btn('‹', invPage - 1, { disabled: invPage === 0 });
  const nums = new Set([0, pages - 1, invPage - 1, invPage, invPage + 1].filter((p) => p >= 0 && p < pages));
  let last = -1;
  [...nums].sort((a, b) => a - b).forEach((p) => {
    if (p - last > 1) { const dots = document.createElement('span'); dots.textContent = '…'; dots.className = 'info'; pager.appendChild(dots); }
    btn(p + 1, p, { active: p === invPage });
    last = p;
  });
  btn('›', invPage + 1, { disabled: invPage === pages - 1 });
  const info = document.createElement('span');
  info.className = 'info';
  info.textContent = `Trang ${invPage + 1}/${pages}`;
  pager.appendChild(info);
}
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderInventory, 200); });

// ---------- Stats ----------
function renderStats() {
  const inv = invValue();
  const worth = stats.balance + inv;
  const profit = worth - stats.topup;
  const sign = profit >= 0 ? '+' : '−';
  $('#wallet').textContent = fmtUSD(stats.balance);
  $('#stat-opened').textContent = stats.opened.toLocaleString('vi-VN');
  $('#stat-value').textContent = fmtUSDShort(inv);
  $('#stat-profit').textContent = sign + fmtUSDShort(Math.abs(profit));
  $('#stat-profit').style.color = profit >= 0 ? '#7ee2a8' : '#ff7b7b';
  $('#stat-rare').textContent = stats.by[5] || 0;
  $('#battle-record').textContent = stats.battles.played
    ? `Thành tích: ${stats.battles.won} thắng / ${stats.battles.played} trận (${fmtPct(stats.battles.won / stats.battles.played)}).`
    : 'Thành tích: chưa đấu trận nào.';

  const wrap = $('#stats-table');
  wrap.innerHTML = '';
  const row = (lbl, val, cmp, color, cls = '') => {
    const el = document.createElement('div');
    el.className = 'stat-row ' + cls;
    el.style.setProperty('--rc', color);
    el.innerHTML = `<div class="lbl">${lbl}</div><div class="val ${cls ? (profit >= 0 ? 'pos' : 'neg') : ''}">${val}</div><div class="cmp">${cmp}</div>`;
    wrap.appendChild(el);
  };
  row('Tổng đã nạp', fmtUSD(stats.topup), 'ví ảo, miễn phí', '#8b93a7');
  row('Tài sản hiện tại', fmtUSD(worth), `ví ${fmtUSD(stats.balance)} + kho ${fmtUSD(inv)}`, '#7ee2a8');
  row('Lãi / lỗ', sign + fmtUSD(Math.abs(profit)), `đã chi mở hòm ${fmtUSD(stats.spent)} · đã bán ${fmtUSD(stats.sold)}`, profit >= 0 ? '#7ee2a8' : '#ff7b7b', 'profit');
  row('Hòm đã mở', stats.opened, `${Object.keys(stats.byCase).length} loại hòm khác nhau`, '#f5a524');
  [5, 4, 3, 2, 1].forEach((r) => {
    const n = stats.by[r] || 0;
    row(RARITY[r].name, n, `${fmtPct(stats.opened ? n / stats.opened : 0)} · kỳ vọng hòm chính thức ${fmtPct(RARITY[r].p)}`, RARITY[r].color);
  });
  row('StatTrak™', stats.st, `${fmtPct(stats.opened ? stats.st / stats.opened : 0)} · kỳ vọng 10%`, '#ff8a3d');
  row('Case Battle', `${stats.battles.won}/${stats.battles.played}`, 'thắng / tổng trận', '#f5a524');
  row('Nâng cấp / Trade-Up', `${stats.trades} / ${stats.tradeups}`, 'lượt nâng cấp skin / hợp đồng đã ký', '#c77dff');

  const sc = $('#stats-cases');
  sc.innerHTML = '';
  const rows = Object.entries(stats.byCase).map(([id, v]) => ({ c: caseById(id), ...v })).filter((x) => x.c).sort((a, b) => b.n - a.n);
  rows.forEach((x) => {
    const el = document.createElement('div');
    el.className = 'sc-row';
    el.innerHTML = `${caseIcon(x.c)}<span class="n">${x.c.name}</span><span class="s">chi ${fmtUSD(x.spent)} · nhận ${fmtUSD(x.got)}</span><span class="c">×${x.n}</span>`;
    sc.appendChild(el);
  });
  $('#stats-cases-empty').hidden = rows.length > 0;

  const best = $('#stats-best');
  best.innerHTML = '';
  if (stats.best) {
    const b = stats.best;
    const el = document.createElement('div');
    el.className = 'best';
    el.innerHTML = `<img src="${b.img}" alt="" /><div><div class="n" style="color:${RARITY[b.r].color}">${nameHTML(b)}</div><div class="p">${fmtUSD(b.price)}</div><div class="s">${b.wear} · Float ${b.float}<br>${b.caseName}</div></div>`;
    el.onclick = () => openZoom(b);
    best.appendChild(el);
  }
  $('#stats-best-empty').hidden = !!stats.best;
}

// ---------- Modal ----------
function openModal(sel) { $(sel).hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal(sel) {
  $(sel).hidden = true;
  if (!$$('.modal').some((m) => !m.hidden)) document.body.style.overflow = '';
}
function closeBattle() {
  if (battle?.running) battle.aborted = true;
  battle = null;
  closeModal('#modal-battle');
}

// ---------- Events ----------
document.addEventListener('click', (e) => {
  const view = e.target.closest('[data-view]');
  const open = e.target.closest('[data-open]');
  const add = e.target.closest('[data-add], [data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (view) showCaseDetail(caseById(view.dataset.view));
  if (open) openCase(caseById(open.dataset.open));
  if (add) { if (bs.cases.length < MAX_ROUNDS) bs.cases.push(add.dataset.add || add.dataset.inc); renderBattleSetup(); }
  if (dec) { bs.cases.splice(bs.cases.lastIndexOf(dec.dataset.dec), 1); renderBattleSetup(); }
  if (e.target.matches('[data-close]')) closeModal('#' + e.target.closest('.modal').id);
  if (e.target.classList.contains('modal') && !spinning && e.target.id !== 'modal-battle' && !(e.target.id === 'modal-profile' && !profile)) closeModal('#' + e.target.id);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || spinning) return;
  if (!$('#modal-profile').hidden && !profile) return;
  if (!$('#modal-zoom').hidden) return closeModal('#modal-zoom');
  if (!$('#modal-battle').hidden) return closeBattle();
  $$('.modal').forEach((m) => { if (!m.hidden) closeModal('#' + m.id); });
});
$('#topup').onclick = topUp;
$('#res-again').onclick = () => openCase(currentCase);
$('#res-close').onclick = () => closeModal('#modal-open');
$('#res-zoom').onclick = () => lastWon && openZoom(lastWon);
$('#res-sell').onclick = () => {
  if (!lastWon || !inventory.includes(lastWon)) return;
  sellItems([lastWon]);
  $('#res-sell').textContent = 'Đã bán';
  $('#res-sell').disabled = true;
};
$('#case-search').oninput = (e) => renderCases(e.target.value);
$('#inv-filter').onchange = () => { invPage = 0; renderInventory(); };
$('#inv-sort').onchange = () => { invPage = 0; renderInventory(); };
$('#inv-sell-all').onclick = () => {
  const list = invFiltered();
  if (!list.length || !confirm(`Bán ${list.length} món với tổng ${fmtUSD(sum(list, (i) => i.price || 0))}?`)) return;
  sellItems(list);
};
$('#inv-clear').onclick = () => {
  if (!confirm('Xoá toàn bộ kho đồ, ví và thống kê, bắt đầu lại từ đầu?')) return;
  inventory = [];
  stats = freshStats();
  save(STORE_INV, inventory);
  persistAndRender();
};
$('#fast-mode').checked = load('cs2-fast', false);
$('#fast-mode').onchange = (e) => save('cs2-fast', e.target.checked);

$('#battle-new').onclick = () => openBattleSetup();
$('#bs-bots').onclick = (e) => { const b = e.target.closest('[data-bots]'); if (b) { bs.bots = Number(b.dataset.bots); renderBattleSetup(); } };
$('#bs-mode').onclick = (e) => { const b = e.target.closest('[data-mode]'); if (b) { bs.mode = b.dataset.mode; renderBattleSetup(); } };
$('#bs-search').oninput = (e) => renderBattleCases(e.target.value);
$('#bs-start').onclick = startBattle;
$('#bt-exit').onclick = closeBattle;
$('#bt-close').onclick = closeBattle;
$('#bt-again').onclick = () => { closeBattle(); startBattle(); };

$('#trade-open').onclick = openTrade;
$('#up-select-all').onclick = selectAllWager;
$('#up-clear-wager').onclick = clearWager;
$('#up-mine-search').oninput = renderUpgrade;
$('#up-mine-sort').onchange = renderUpgrade;
$('#up-mine-rarity').onchange = renderUpgrade;
$('#up-target-search').oninput = () => { up.botShown = 60; renderUpgrade(); };
$('#up-target-rarity').onchange = () => { up.botShown = 60; renderUpgrade(); };
$('#up-target-more').onclick = () => { up.botShown += 60; renderUpgrade(); };
$('#up-dir-left').onclick = () => { if (!up.rolling) { up.side = 'left'; renderUpgrade(); } };
$('#up-dir-right').onclick = () => { if (!up.rolling) { up.side = 'right'; renderUpgrade(); } };
$('#up-roll-btn').onclick = startUpgrade;
$('#up-res-again').onclick = () => { $('#up-result-panel').hidden = true; };
$('#up-res-close').onclick = () => { $('#up-result-panel').hidden = true; closeModal('#modal-trade'); };
$('#up-mult-chips').onclick = (e) => {
  const chip = e.target.closest('[data-mult]');
  if (!chip || up.rolling) return;
  $$('#up-mult-chips .up-chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  up.multFilter = chip.dataset.mult;
  up.botShown = 60;
  renderUpgrade();
};

$('#tradeup-open').onclick = openTradeUp;
$('#tu-tabs').onclick = (e) => { const b = e.target.closest('[data-tier]'); if (b) { tu.tier = Number(b.dataset.tier); tu.picked = []; renderTradeUp(); } };
$('#tu-auto').onclick = tuAutoPick;
$('#tu-clear').onclick = () => { tu.picked = []; renderTradeUp(); };
$('#tu-confirm').onclick = confirmTradeUp;
$('#tu-res-ok').onclick = () => { $('#tu-result').hidden = true; };

// ---------- Tài khoản (máy chủ Cloudflare) + đồng bộ ----------
const token = () => localStorage.getItem(TOKEN_KEY);
async function api(path, { method = 'GET', body, keepalive = false } = {}) {
  const res = await fetch(API_URL + path, {
    method, keepalive,
    headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || `Lỗi ${res.status}`); e.status = res.status; throw e; }
  return data;
}
let syncTimer = null, syncing = false, dirty = false;
function setSync(state, title) {
  const d = $('#sync-dot');
  d.className = 'sync-dot ' + state;
  d.title = title || { '': 'Đã lưu lên máy chủ', saving: 'Đang lưu…', error: 'Chưa lưu được — sẽ thử lại', offline: 'Chưa đăng nhập' }[state];
}
function scheduleSync() {
  if (!profile || !token()) return;
  dirty = true;
  setSync('saving');
  clearTimeout(syncTimer);
  syncTimer = setTimeout(flushSync, 700);
}
async function flushSync(keepalive = false) {
  if (!dirty || syncing || !token()) return;
  syncing = true; dirty = false;
  try {
    await api('/state', { method: 'PUT', body: { data: { inv: inventory, stats } }, keepalive });
    setSync('');
  } catch (e) {
    dirty = true;
    if (e.status === 401) { setSync('error', 'Phiên đăng nhập hết hạn — hãy đăng nhập lại'); }
    else { setSync('error'); setTimeout(flushSync, 4000); }
  } finally { syncing = false; if (dirty && !syncTimer) scheduleSync(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(syncTimer); flushSync(true); } });
window.addEventListener('pagehide', () => { clearTimeout(syncTimer); flushSync(true); });
window.addEventListener('online', () => dirty && flushSync());

async function loadFromServer() {
  if (!profile || !token()) return;
  try {
    const { data } = await api('/state');
    if (data && Array.isArray(data.inv)) {
      inventory = data.inv;
      stats = { ...freshStats(), ...data.stats };
      stats.byCase ??= {}; stats.battles ??= { played: 0, won: 0 }; stats.equipped ??= {};
      try { localStorage.setItem(STORE_INV, JSON.stringify(inventory)); localStorage.setItem(STORE_STATS, JSON.stringify(stats)); } catch {}
      setSync('');
    } else if (inventory.length || stats.opened) {
      // Máy chủ chưa có gì nhưng máy này có dữ liệu cũ → đẩy lên
      dirty = true; await flushSync();
    } else {
      dirty = true; await flushSync();
    }
  } catch (e) {
    if (e.status === 401) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CURRENT_KEY); location.reload(); return; }
    setSync('error', 'Không kết nối được máy chủ — đang dùng bản lưu trên máy');
    toast('Không kết nối được máy chủ, đang dùng dữ liệu lưu trên máy này');
  }
  renderInventory(); renderStats();
}

const knownNames = () => lsGet(PROFILES_KEY, []);
const rememberName = (n) => lsSet(PROFILES_KEY, [n, ...knownNames().filter((x) => x !== n)].slice(0, 8));
const validName = (n) => /^[\p{L}\p{N} _.-]{1,20}$/u.test(n);
function accountSummary(name) {
  const st = lsGet(`cs2-stats:${name}`, null);
  const inv = lsGet(`cs2-inv:${name}`, []);
  return st ? `${fmtUSDShort(st.balance || 0)} · ${inv.length} món · ${st.opened || 0} hòm` : '';
}

let authMode = 'login';
function setAuthMode(mode) {
  authMode = mode;
  $$('#auth-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  $('#auth-title').textContent = mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản';
  $('#auth-submit').textContent = mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản & bắt đầu';
  $('#auth-pass2').hidden = mode === 'login';
  showAuthErr('');
}
function showAuthErr(msg, sel = '#auth-err') { const el = $(sel); el.textContent = msg; el.hidden = !msg; }
function renderAccountList() {
  const list = $('#pf-list');
  list.innerHTML = '';
  const names = knownNames();
  names.forEach((name) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'pf-item';
    el.innerHTML = `<span>👤 <b>${name}</b><div class="pf-meta">${accountSummary(name)}</div></span>`;
    el.onclick = () => { setAuthMode('login'); $('#auth-name').value = name; $('#auth-pass').focus(); };
    list.appendChild(el);
  });
  $('.auth-hint').hidden = names.length === 0;
}
function enterAccount(name, tok) {
  localStorage.setItem(TOKEN_KEY, tok);
  lsSet(CURRENT_KEY, name);
  rememberName(name);
  // Dữ liệu chơi từ bản cũ (chưa có tài khoản) chuyển cho tài khoản đầu tiên trên máy này
  if (localStorage.getItem('cs2-inv') && !localStorage.getItem(`cs2-inv:${name}`)) {
    localStorage.setItem(`cs2-inv:${name}`, localStorage.getItem('cs2-inv'));
    if (localStorage.getItem('cs2-stats')) localStorage.setItem(`cs2-stats:${name}`, localStorage.getItem('cs2-stats'));
    localStorage.removeItem('cs2-inv'); localStorage.removeItem('cs2-stats');
  }
  location.reload();
}
async function submitAuth(e) {
  e.preventDefault();
  const name = $('#auth-name').value.trim();
  const pass = $('#auth-pass').value;
  if (!validName(name)) return showAuthErr('Tên 1–20 ký tự, chỉ chữ, số, khoảng trắng, . _ -');
  if (pass.length < 4) return showAuthErr('Mật khẩu tối thiểu 4 ký tự.');
  if (authMode === 'register' && pass !== $('#auth-pass2').value) return showAuthErr('Mật khẩu nhập lại không khớp.');
  const btn = $('#auth-submit');
  btn.disabled = true; btn.textContent = 'Đang xử lý…';
  try {
    const r = await api(authMode === 'register' ? '/register' : '/login', { method: 'POST', body: { name, password: pass } });
    enterAccount(r.name, r.token);
  } catch (err) {
    showAuthErr(err.status ? err.message : 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    btn.disabled = false; setAuthMode(authMode);
  }
}
async function logout() {
  clearTimeout(syncTimer); await flushSync();
  try { await api('/logout', { method: 'POST' }); } catch {}
  localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CURRENT_KEY);
  location.reload();
}
async function changePassword(e) {
  e.preventDefault();
  const o = $('#pw-old').value, n = $('#pw-new').value, n2 = $('#pw-new2').value;
  if (n.length < 4) return showAuthErr('Mật khẩu mới tối thiểu 4 ký tự.', '#pw-err');
  if (n !== n2) return showAuthErr('Mật khẩu mới nhập lại không khớp.', '#pw-err');
  try { await api('/password', { method: 'POST', body: { old: o, new: n } }); }
  catch (err) { return showAuthErr(err.message, '#pw-err'); }
  $('#pw-form').hidden = true;
  toast('Đã đổi mật khẩu (các thiết bị khác cần đăng nhập lại)');
}
async function deleteAccount() {
  const pw = prompt(`Nhập mật khẩu của "${profile}" để xoá tài khoản vĩnh viễn (mất toàn bộ kho đồ và ví):`);
  if (pw == null) return;
  try { await api('/account', { method: 'DELETE', body: { password: pw } }); }
  catch (err) { return toast(err.message); }
  localStorage.removeItem(`cs2-inv:${profile}`); localStorage.removeItem(`cs2-stats:${profile}`);
  lsSet(PROFILES_KEY, knownNames().filter((n) => n !== profile));
  localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CURRENT_KEY);
  location.reload();
}
function openProfileModal(force = false) {
  $('#profile-close').hidden = force;
  $('#auth-guest').hidden = !!profile;
  $('#auth-user').hidden = !profile;
  if (profile) {
    $('#auth-username').textContent = profile;
    $('#auth-usersum').textContent = `${fmtUSD(stats.balance)} trong ví · ${inventory.length} món · ${stats.opened} hòm đã mở · đồng bộ mọi thiết bị`;
    $('#pw-form').hidden = true;
  } else {
    renderAccountList();
    setAuthMode(knownNames().length ? 'login' : 'register');
    $('#auth-name').value = ''; $('#auth-pass').value = ''; $('#auth-pass2').value = '';
  }
  openModal('#modal-profile');
  setTimeout(() => (profile ? null : $('#auth-name').focus()), 50);
}
async function renderLeaderboard() {
  const wrap = $('#leaderboard');
  try {
    const { top } = await api('/top');
    wrap.innerHTML = '';
    top.forEach((r, i) => {
      const el = document.createElement('div');
      el.className = `lb-row top${i + 1}` + (r.name === profile ? ' me' : '');
      el.innerHTML = `<span class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="n">${r.name}</span><span class="o">${r.opened} hòm</span><span class="w">${fmtUSDShort(r.worth)}</span>`;
      wrap.appendChild(el);
    });
    $('#leaderboard-empty').hidden = top.length > 0;
    $('#leaderboard-empty').textContent = 'Chưa có ai.';
  } catch { $('#leaderboard-empty').textContent = 'Không tải được bảng xếp hạng.'; }
}
$('#auth-tabs').onclick = (e) => { const b = e.target.closest('[data-mode]'); if (b) setAuthMode(b.dataset.mode); };
$('#auth-form').onsubmit = submitAuth;
$('#auth-logout').onclick = logout;
$('#auth-changepw').onclick = () => { $('#pw-form').hidden = !$('#pw-form').hidden; showAuthErr('', '#pw-err'); $('#pw-old').value = $('#pw-new').value = $('#pw-new2').value = ''; };
$('#pw-form').onsubmit = changePassword;
$('#auth-delete').onclick = deleteAccount;
$('#profile-btn').onclick = () => openProfileModal(false);
$('#profile-name').textContent = profile || 'Đăng nhập';
if (profile) $('#hero-title').innerHTML = `Chào ${profile}.<br />Mở hòm không tốn một xu.`;
if (!profile || !token()) { localStorage.removeItem(TOKEN_KEY); setSync('offline'); openProfileModal(true); }
else { loadFromServer(); }
renderLeaderboard();
setInterval(renderLeaderboard, 60000);

$('#prices-date').textContent = window.CS2_PRICES_UPDATED || '';
renderCases('');
renderBattleCases();
renderInventory();
renderStats();
