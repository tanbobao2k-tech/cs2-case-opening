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
const STORE_INV = 'cs2-inv';
const STORE_STATS = 'cs2-stats';
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
  return { ...d, custom: true, pool, price: Math.round((ev / CUSTOM_RTP) * 100) / 100, image: pool[Math.min(pool.length - 1, Math.floor(pool.length * 0.04))].base.img };
}).filter((c) => c.pool.length >= 5);
const CASES = [...OFFICIAL, ...CUSTOM];
const caseById = (id) => CASES.find((c) => c.id === id);

// ---------- Storage ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const freshStats = () => ({
  opened: 0, by: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, st: 0, spent: 0,
  balance: TOPUP, topup: TOPUP, sold: 0, byCase: {}, best: null,
  battles: { played: 0, won: 0 }, trades: 0, tradeups: 0,
});

let inventory = load(STORE_INV, []);
let stats = { ...freshStats(), ...load(STORE_STATS, {}) };
if (stats.balance == null) { stats.balance = TOPUP; stats.topup = TOPUP; }
stats.byCase ??= {}; stats.battles ??= { played: 0, won: 0 }; stats.sold ??= 0; stats.trades ??= 0; stats.tradeups ??= 0;

function addToInventory(items) {
  inventory.unshift(...items);
  if (inventory.length > INV_LIMIT) inventory.length = INV_LIMIT;
  save(STORE_INV, inventory);
}
function removeFromInventory(items) {
  const set = new Set(items);
  inventory = inventory.filter((i) => !set.has(i));
  save(STORE_INV, inventory);
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
  el.innerHTML = `
    ${c.custom ? `<span class="tag">${c.tag}</span>` : ''}
    <img src="${c.image}" alt="${c.name}" loading="lazy" />
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
  $('#cd-image').src = c.image;
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
  applyZoom();
}
function openZoom(item) {
  zoom.scale = 1; zoom.x = 0; zoom.y = 0;
  applyZoom();
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
  stage.addEventListener('dblclick', (e) => { const [cx, cy] = rel(e); setZoom(zoom.scale > 1 ? 1 : 2.5, cx, cy); });
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
    chip.innerHTML = `<img src="${c.image}" alt="" /><span>${shortCase(c.name)}</span>
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
    b.innerHTML = `<img src="${c.image}" alt="" loading="lazy" /><span class="n">${c.name}</span><span class="c">${fmtUSD(caseCost(c))}</span>`;
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
    { name: 'Bạn', me: true, av: '🧑', total: 0, items: [] },
    ...Array.from({ length: bs.bots }, (_, i) => ({ name: BOT_NAMES[i], av: BOT_AVATARS[i], total: 0, items: [] })),
  ];
  const me = players[0];
  const current = { rounds, players, mode: bs.mode, cost, aborted: false, running: true };
  battle = current;

  $('#bt-title').textContent = `Case Battle · ${players.length} người · ${bs.mode === 'crazy' ? 'Đảo ngược' : 'Thường'} · ${fmtUSD(cost)}`;
  $('#bt-rounds').innerHTML = rounds.map((c) => `<img src="${c.image}" alt="" title="${c.name}" />`).join('');
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

// ---------- Trade với bot ----------
const BOT_STOCK = ITEMS.map((base) => {
  // bot bán ở độ mòn Field-Tested nếu skin có, không thì độ mòn gần nhất trong khoảng float
  const [lo, hi] = base.f;
  const wi = Math.max(wearIndex(lo), Math.min(2, wearIndex(hi - 1e-6)));
  const mid = Math.min(hi, Math.max(lo, (WEARS[wi].min + WEARS[wi].max) / 2));
  return instanceOf(base, +mid.toFixed(6), false, { caseName: 'Bot' });
});
const tr = { mine: new Set(), bot: new Set(), botShown: 60 };
function pickCard(item, selected, onToggle, { disabled = false } = {}) {
  const el = itemCard(item, { showFrom: false });
  el.classList.add('pick');
  el.classList.toggle('selected', selected);
  el.classList.toggle('disabled', disabled);
  el.insertAdjacentHTML('afterbegin', '<span class="chk"></span><button class="zoom-btn" data-zoomer>🔍</button>');
  el.onclick = (e) => { if (e.target.matches('[data-zoomer]')) openZoom(item); else onToggle(item); };
  return el;
}
function openTrade() {
  tr.mine.clear(); tr.bot.clear(); tr.botShown = 60;
  renderTrade();
  openModal('#modal-trade');
}
function renderTrade() {
  const mine = $('#tr-mine');
  mine.innerHTML = '';
  const list = $('#tr-mine-sort').value === 'price' ? [...inventory].sort((a, b) => (b.price || 0) - (a.price || 0)) : inventory;
  list.slice(0, 300).forEach((i) => mine.appendChild(pickCard(i, tr.mine.has(i), (it) => { tr.mine.has(it) ? tr.mine.delete(it) : tr.mine.add(it); renderTrade(); })));
  $('#tr-mine-empty').hidden = inventory.length > 0;
  $('#tr-mine-count').textContent = inventory.length ? `(${tr.mine.size} chọn / ${inventory.length})` : '';

  const q = $('#tr-search').value.trim().toLowerCase();
  const f = $('#tr-bot-filter').value;
  const stock = BOT_STOCK
    .filter((i) => (f === 'all' || i.r === Number(f)) && (!q || i.n.toLowerCase().includes(q)))
    .sort((a, b) => b.price - a.price);
  const bot = $('#tr-bot');
  bot.innerHTML = '';
  // Đồ đang chọn luôn hiện đầu danh sách
  const selectedFirst = [...tr.bot].filter((i) => !stock.slice(0, tr.botShown).includes(i));
  [...selectedFirst, ...stock.slice(0, tr.botShown)].forEach((i) => bot.appendChild(pickCard(i, tr.bot.has(i), (it) => { tr.bot.has(it) ? tr.bot.delete(it) : tr.bot.add(it); renderTrade(); })));
  $('#tr-bot-more').hidden = stock.length <= tr.botShown;
  $('#tr-bot-more').textContent = `Xem thêm (${Math.min(60, stock.length - tr.botShown)} / còn ${stock.length - tr.botShown})`;

  const give = sum([...tr.mine], (i) => i.price || 0);
  const get = sum([...tr.bot], (i) => i.price);
  const fee = get * TRADE_FEE;
  const delta = give - get - fee;
  const after = stats.balance + delta;
  $('#tr-give').textContent = fmtUSD(give);
  $('#tr-get').textContent = fmtUSD(get);
  $('#tr-fee').textContent = fmtUSD(fee);
  $('#tr-delta').textContent = (delta >= 0 ? '+' : '−') + fmtUSD(Math.abs(delta));
  $('#tr-delta').className = delta >= 0 ? 'pos' : 'neg';
  $('#tr-left').textContent = fmtUSD(after);
  $('#tr-left').className = after >= 0 ? '' : 'neg';
  const ok = (tr.mine.size || tr.bot.size) && after >= -1e-9;
  $('#tr-confirm').disabled = !ok;
  $('#tr-msg').textContent = !tr.mine.size && !tr.bot.size ? 'Chọn đồ bạn muốn đưa (trái) và/hoặc đồ muốn lấy (phải). Chênh lệch tự bù trừ qua ví.'
    : after < 0 ? `Thiếu ${fmtUSD(-after)} — chọn thêm đồ để đưa, bỏ bớt đồ nhận, hoặc nạp ví.`
    : tr.bot.size === 0 ? 'Bạn đang bán đồ cho bot lấy tiền vào ví (không mất phí).'
    : 'Sẵn sàng trade.';
}
function confirmTrade() {
  const give = [...tr.mine], get = [...tr.bot];
  const giveV = sum(give, (i) => i.price || 0), getV = sum(get, (i) => i.price);
  const delta = giveV - getV - getV * TRADE_FEE;
  if (stats.balance + delta < -1e-9) return;
  removeFromInventory(give);
  const received = get.map((i) => ({ ...i, t: Date.now(), caseName: 'Trade bot' }));
  addToInventory(received);
  stats.balance += delta;
  stats.trades++;
  persistAndRender();
  toast(`Trade xong: đưa ${give.length} món, nhận ${received.length} món, ví ${delta >= 0 ? '+' : '−'}${fmtUSD(Math.abs(delta))}`);
  tr.mine.clear(); tr.bot.clear();
  renderTrade();
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
  let list = inventory.filter((i) => f === 'all' || (f === 'st' ? i.st : i.r === Number(f)));
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
  row('Trade / Trade-Up', `${stats.trades} / ${stats.tradeups}`, 'lượt trade bot / hợp đồng đã ký', '#c77dff');

  const sc = $('#stats-cases');
  sc.innerHTML = '';
  const rows = Object.entries(stats.byCase).map(([id, v]) => ({ c: caseById(id), ...v })).filter((x) => x.c).sort((a, b) => b.n - a.n);
  rows.forEach((x) => {
    const el = document.createElement('div');
    el.className = 'sc-row';
    el.innerHTML = `<img src="${x.c.image}" alt="" loading="lazy" /><span class="n">${x.c.name}</span><span class="s">chi ${fmtUSD(x.spent)} · nhận ${fmtUSD(x.got)}</span><span class="c">×${x.n}</span>`;
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
  if (e.target.classList.contains('modal') && !spinning && e.target.id !== 'modal-battle') closeModal('#' + e.target.id);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || spinning) return;
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
$('#tr-mine-sort').onchange = renderTrade;
$('#tr-search').oninput = () => { tr.botShown = 60; renderTrade(); };
$('#tr-bot-filter').onchange = () => { tr.botShown = 60; renderTrade(); };
$('#tr-bot-more').onclick = () => { tr.botShown += 60; renderTrade(); };
$('#tr-clear').onclick = () => { tr.mine.clear(); tr.bot.clear(); renderTrade(); };
$('#tr-confirm').onclick = confirmTrade;

$('#tradeup-open').onclick = openTradeUp;
$('#tu-tabs').onclick = (e) => { const b = e.target.closest('[data-tier]'); if (b) { tu.tier = Number(b.dataset.tier); tu.picked = []; renderTradeUp(); } };
$('#tu-auto').onclick = tuAutoPick;
$('#tu-clear').onclick = () => { tu.picked = []; renderTradeUp(); };
$('#tu-confirm').onclick = confirmTradeUp;
$('#tu-res-ok').onclick = () => { $('#tu-result').hidden = true; };

$('#prices-date').textContent = window.CS2_PRICES_UPDATED || '';
renderCases('');
renderBattleCases();
renderInventory();
renderStats();
