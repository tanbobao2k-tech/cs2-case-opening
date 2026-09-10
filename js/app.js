const CASES = window.CS2_CASES;

const RARITY = {
  1: { name: 'Mil-Spec', color: '#4b69ff', p: 0.7992 },
  2: { name: 'Restricted', color: '#8847ff', p: 0.1598 },
  3: { name: 'Classified', color: '#d32ce6', p: 0.032 },
  4: { name: 'Covert', color: '#eb4b4b', p: 0.0064 },
  5: { name: 'Vật phẩm đặc biệt ★', color: '#ffd700', p: 0.0026 },
};
const WEARS = [
  { name: 'Factory New', p: 0.03, min: 0, max: 0.07 },
  { name: 'Minimal Wear', p: 0.24, min: 0.07, max: 0.15 },
  { name: 'Field-Tested', p: 0.33, min: 0.15, max: 0.38 },
  { name: 'Well-Worn', p: 0.24, min: 0.38, max: 0.45 },
  { name: 'Battle-Scarred', p: 0.16, min: 0.45, max: 1 },
];
const STATTRAK_P = 0.1;
const KEY_PRICE = 2.49;
const STORE_INV = 'cs2-inv';
const STORE_STATS = 'cs2-stats';
const INV_LIMIT = 1000;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

// ---------- Random ----------
function weightedPick(list, getP) {
  let r = Math.random();
  for (const x of list) {
    r -= getP(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1];
}
const rand = (a) => a[Math.floor(Math.random() * a.length)];

function rollRarity() {
  return Number(weightedPick(Object.keys(RARITY), (k) => RARITY[k].p));
}

function rollItem(c, forcedRarity) {
  const r = forcedRarity || rollRarity();
  let base;
  if (r === 5) {
    const names = [...new Set(c.rare.map((i) => i.n))];
    const name = rand(names);
    base = rand(c.rare.filter((i) => i.n === name));
  } else {
    base = rand(c.items.filter((i) => i.r === r));
  }
  const wear = weightedPick(WEARS, (w) => w.p);
  return {
    n: base.n,
    img: base.img,
    ph: base.ph,
    r,
    wear: wear.name,
    float: +(wear.min + Math.random() * (wear.max - wear.min)).toFixed(6),
    st: Math.random() < STATTRAK_P,
    caseId: c.id,
    caseName: c.name,
    t: Date.now(),
  };
}

// ---------- Storage ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let inventory = load(STORE_INV, []);
let stats = load(STORE_STATS, { opened: 0, by: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, st: 0 });

function recordDrop(item) {
  inventory.unshift(item);
  if (inventory.length > INV_LIMIT) inventory.length = INV_LIMIT;
  stats.opened++;
  stats.by[item.r]++;
  if (item.st) stats.st++;
  save(STORE_INV, inventory);
  save(STORE_STATS, stats);
  renderInventory();
  renderStats();
}

// ---------- Helpers ----------
const fmtMoney = (n) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtPct = (p) => (p * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + '%';

function itemCard(item, { showFrom = false } = {}) {
  const el = document.createElement('div');
  el.className = 'item';
  el.style.setProperty('--rc', RARITY[item.r].color);
  el.innerHTML = `
    ${item.st ? '<span class="st">StatTrak™</span>' : ''}
    ${showFrom ? `<span class="from">${item.caseName.replace(/ (Weapon )?Case$/, '')}</span>` : ''}
    <img src="${item.img}" alt="" loading="lazy" />
    <div class="name">${item.n}${item.ph ? ` <span class="muted">(${item.ph})</span>` : ''}</div>
    ${item.wear ? `<div class="sub">${item.wear} · ${item.float.toFixed(4)}</div>` : ''}`;
  return el;
}

// ---------- Case grid ----------
function renderCases(filter = '') {
  const grid = $('#case-grid');
  grid.innerHTML = '';
  const q = filter.trim().toLowerCase();
  CASES.filter((c) => c.name.toLowerCase().includes(q)).forEach((c) => {
    const el = document.createElement('div');
    el.className = 'case-card';
    el.innerHTML = `
      <img src="${c.image}" alt="${c.name}" loading="lazy" />
      <h3>${c.name}</h3>
      <div class="year">${c.date ? c.date.slice(0, 4) : ''} · ${c.items.length} skin · ${new Set(c.rare.map((i) => i.n)).size} dao/găng</div>
      <div class="actions">
        <button class="btn" data-view="${c.id}">Xem</button>
        <button class="btn btn-primary" data-open="${c.id}">Mở hòm</button>
      </div>`;
    grid.appendChild(el);
  });
}

// ---------- Case detail ----------
function showCaseDetail(c) {
  $('#cd-image').src = c.image;
  $('#cd-name').textContent = c.name;
  $('#cd-meta').textContent = `Phát hành ${c.date || '—'} · ${c.items.length} skin thường · ${new Set(c.rare.map((i) => i.n)).size} vật phẩm đặc biệt`;
  $('#cd-open').onclick = () => { closeModal('#modal-case'); openCase(c); };

  const wrap = $('#cd-items');
  wrap.innerHTML = '';
  [4, 3, 2, 1].forEach((r) => {
    const items = c.items.filter((i) => i.r === r);
    if (!items.length) return;
    wrap.appendChild(detailGroup(RARITY[r], items, RARITY[r].p / items.length));
  });
  const rareNames = [...new Map(c.rare.map((i) => [i.n, i])).values()];
  wrap.appendChild(detailGroup(RARITY[5], rareNames, RARITY[5].p / rareNames.length));
  openModal('#modal-case');
}

function detailGroup(rarity, items, pEach) {
  const g = document.createElement('div');
  g.className = 'cd-group';
  g.style.setProperty('--rc', rarity.color);
  g.innerHTML = `<h4>${rarity.name} <span>${fmtPct(rarity.p)} · mỗi món ~${fmtPct(pEach)}</span></h4><div class="cd-list"></div>`;
  const list = $('.cd-list', g);
  items.forEach((i) => list.appendChild(itemCard({ ...i, r: i.r || 5, ph: undefined })));
  return g;
}

// ---------- Opening ----------
const TILE_COUNT = 60;
const WIN_INDEX = 50;
let audioCtx;

function tick() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 900;
    g.gain.setValueAtTime(0.03, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.05);
  } catch {}
}

let currentCase = null;
let spinning = false;

function openCase(c) {
  currentCase = c;
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

  const fast = $('#fast-mode').checked;
  if (fast) { revealResult(won); return; }

  const tileEl = strip.firstElementChild;
  const tileW = tileEl.offsetWidth + 6;
  const viewW = strip.parentElement.clientWidth;
  const offset = (Math.random() * 0.7 - 0.35) * tileW;
  const target = WIN_INDEX * tileW + tileW / 2 - viewW / 2 + offset;
  const duration = 6500;
  const ease = (t) => 1 - Math.pow(1 - t, 5);

  spinning = true;
  let lastIdx = -1;
  const start = performance.now();
  const frame = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const x = target * ease(p);
    strip.style.transform = `translateX(${-x}px)`;
    const idx = Math.floor((x + viewW / 2) / tileW);
    if (idx !== lastIdx) { lastIdx = idx; tick(); }
    if (p < 1) requestAnimationFrame(frame);
    else { spinning = false; setTimeout(() => revealResult(won), 350); }
  };
  requestAnimationFrame(frame);
}

function revealResult(item) {
  recordDrop(item);
  const rc = RARITY[item.r].color;
  const card = $('.result-card');
  card.style.setProperty('--rc', rc);
  $('#res-rarity').textContent = RARITY[item.r].name;
  $('#res-image').src = item.img;
  $('#res-name').innerHTML = (item.st ? '<span class="st-badge">StatTrak™</span> ' : '') + item.n + (item.ph ? ` <span class="muted">(${item.ph})</span>` : '');
  $('#res-wear').textContent = `${item.wear} · Float ${item.float}`;
  $('#result').hidden = false;
  $('#open-title').textContent = item.r >= 4 ? 'Trúng lớn!' : 'Bạn nhận được';
  $('#result').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---------- Inventory & stats ----------
function renderInventory() {
  const grid = $('#inv-grid');
  const f = $('#inv-filter').value;
  const list = inventory.filter((i) => f === 'all' || (f === 'st' ? i.st : i.r === Number(f)));
  grid.innerHTML = '';
  list.slice(0, 200).forEach((i) => grid.appendChild(itemCard(i, { showFrom: true })));
  $('#inv-empty').hidden = list.length > 0;
  $('#inv-count').textContent = inventory.length;
}

function renderStats() {
  $('#stat-opened').textContent = stats.opened.toLocaleString('vi-VN');
  $('#stat-saved').textContent = fmtMoney(stats.opened * KEY_PRICE);
  $('#stat-rare').textContent = stats.by[5];

  const wrap = $('#stats-table');
  wrap.innerHTML = '';
  [5, 4, 3, 2, 1].forEach((r) => {
    const n = stats.by[r];
    const actual = stats.opened ? n / stats.opened : 0;
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.style.setProperty('--rc', RARITY[r].color);
    row.innerHTML = `<div class="lbl">${RARITY[r].name}</div><div class="val">${n}</div><div class="cmp">${fmtPct(actual)} · kỳ vọng ${fmtPct(RARITY[r].p)}</div>`;
    wrap.appendChild(row);
  });
  const st = document.createElement('div');
  st.className = 'stat-row';
  st.style.setProperty('--rc', '#ff8a3d');
  st.innerHTML = `<div class="lbl">StatTrak™</div><div class="val">${stats.st}</div><div class="cmp">${fmtPct(stats.opened ? stats.st / stats.opened : 0)} · kỳ vọng 10%</div>`;
  wrap.appendChild(st);
}

// ---------- Modal ----------
function openModal(sel) { $(sel).hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal(sel) { $(sel).hidden = true; document.body.style.overflow = ''; }

// ---------- Events ----------
document.addEventListener('click', (e) => {
  const view = e.target.closest('[data-view]');
  const open = e.target.closest('[data-open]');
  if (view) showCaseDetail(CASES.find((c) => c.id === view.dataset.view));
  if (open) openCase(CASES.find((c) => c.id === open.dataset.open));
  if (e.target.matches('[data-close]')) closeModal('#' + e.target.closest('.modal').id);
  if (e.target.classList.contains('modal') && !spinning) closeModal('#' + e.target.id);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !spinning) $$('.modal').forEach((m) => { m.hidden = true; });
  if (e.key === 'Escape') document.body.style.overflow = '';
});
$('#res-again').onclick = () => openCase(currentCase);
$('#res-close').onclick = () => closeModal('#modal-open');
$('#case-search').oninput = (e) => renderCases(e.target.value);
$('#inv-filter').onchange = renderInventory;
$('#inv-clear').onclick = () => {
  if (!inventory.length || !confirm('Xoá toàn bộ kho đồ và thống kê?')) return;
  inventory = [];
  stats = { opened: 0, by: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, st: 0 };
  save(STORE_INV, inventory);
  save(STORE_STATS, stats);
  renderInventory();
  renderStats();
};
$('#fast-mode').checked = load('cs2-fast', false);
$('#fast-mode').onchange = (e) => save('cs2-fast', e.target.checked);

renderCases();
renderInventory();
renderStats();
