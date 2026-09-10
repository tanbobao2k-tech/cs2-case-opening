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
const USD_VND = 25500;
const STORE_INV = 'cs2-inv';
const STORE_STATS = 'cs2-stats';
const INV_LIMIT = 1000;
const BOT_NAMES = ['Bot Alpha', 'Bot Bravo', 'Bot Charlie'];
const BOT_AVATARS = ['🤖', '👾', '🦾'];

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Roll float 0–1 theo phân phối độ mòn rồi ép vào khoảng float của skin (cơ chế CS2)
function rollFloat(range) {
  const bucket = weightedPick(WEARS, (w) => w.p);
  const f01 = bucket.min + Math.random() * (bucket.max - bucket.min);
  return +(range[0] + f01 * (range[1] - range[0])).toFixed(6);
}
const wearIndex = (f) => (f < 0.07 ? 0 : f < 0.15 ? 1 : f < 0.38 ? 2 : f < 0.45 ? 3 : 4);

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
  const float = rollFloat(base.f || [0, 1]);
  const wi = wearIndex(float);
  const st = base.st !== 0 && Math.random() < STATTRAK_P;
  const price = (st ? base.ps : base.p)?.[wi] ?? base.p?.[wi] ?? 0;
  return {
    n: base.n, img: base.img, ph: base.ph, r,
    wear: WEARS[wi].name, float, st, price,
    caseId: c.id, caseName: c.name, t: Date.now(),
  };
}

const caseCost = (c) => (c.price || 0) + KEY_PRICE;

// ---------- Storage ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const freshStats = () => ({ opened: 0, by: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, st: 0, spent: 0, value: 0, battles: { played: 0, won: 0 } });

let inventory = load(STORE_INV, []);
let stats = { ...freshStats(), ...load(STORE_STATS, {}) };
stats.battles ??= { played: 0, won: 0 };

function addToInventory(items) {
  inventory.unshift(...items);
  if (inventory.length > INV_LIMIT) inventory.length = INV_LIMIT;
  save(STORE_INV, inventory);
}
function countDrop(item, cost) {
  stats.opened++;
  stats.by[item.r]++;
  if (item.st) stats.st++;
  stats.spent += cost;
}
function persistAndRender() {
  save(STORE_STATS, stats);
  renderInventory();
  renderStats();
}

// ---------- Format ----------
const fmtUSD = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtUSDShort = (n) => '$' + (n || 0).toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 });
const fmtVND = (n) => Math.round((n || 0) * USD_VND).toLocaleString('vi-VN') + '₫';
const fmtPct = (p) => (p * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + '%';
const minPrice = (base) => Math.min(...(base.p || []).filter((x) => x != null));
const nameHTML = (item) => (item.st ? '<span class="st-badge">StatTrak™</span> ' : '') + item.n + (item.ph ? ` <span class="muted">(${item.ph})</span>` : '');

function itemCard(item, { showFrom = false } = {}) {
  const el = document.createElement('div');
  el.className = 'item';
  el.style.setProperty('--rc', RARITY[item.r].color);
  const priceLine = item.price != null
    ? `<span class="price">${fmtUSD(item.price)}</span>`
    : item.p ? `<span class="price">từ ${fmtUSD(minPrice(item))}</span>` : '';
  el.innerHTML = `
    ${item.st ? '<span class="st">StatTrak™</span>' : ''}
    ${showFrom ? `<span class="from">${item.caseName.replace(/ (Weapon )?Case$/, '')}</span>` : ''}
    <img src="${item.img}" alt="" loading="lazy" />
    <div class="name">${item.n}${item.ph ? ` <span class="muted">(${item.ph})</span>` : ''}</div>
    ${item.wear ? `<div class="sub">${item.wear} · ${item.float.toFixed(4)}</div>` : ''}
    ${priceLine}`;
  el.onclick = () => openZoom(item);
  return el;
}

// ---------- Case grid ----------
function caseMeta(c) {
  return `${c.date ? c.date.slice(0, 4) : ''} · ${c.items.length} skin · ${new Set(c.rare.map((i) => i.n)).size} dao/găng`;
}
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
      <div class="year">${caseMeta(c)}</div>
      <div class="cost">Giá mở <b>${fmtUSD(caseCost(c))}</b> <span class="price-vnd">≈ ${fmtVND(caseCost(c))}</span></div>
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
  $('#cd-meta').textContent = `Phát hành ${c.date || '—'} · ${c.items.length} skin thường · ${new Set(c.rare.map((i) => i.n)).size} vật phẩm đặc biệt · giá mở ${fmtUSD(caseCost(c))}`;
  $('#cd-open').onclick = () => { closeModal('#modal-case'); openCase(c); };
  $('#cd-battle').onclick = () => { closeModal('#modal-case'); openBattleSetup([c.id]); };

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

// Chạy animation cuộn: gọi onFrame(x) với x từ 0 → target
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

// ---------- Mở hòm lẻ ----------
const TILE_COUNT = 60;
const WIN_INDEX = 50;
let currentCase = null;
let spinning = false;
let lastWon = null;

async function openCase(c) {
  if (spinning) return;
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
  countDrop(item, caseCost(currentCase));
  stats.value += item.price;
  addToInventory([item]);
  persistAndRender();

  const rc = RARITY[item.r].color;
  $('.result-card').style.setProperty('--rc', rc);
  $('#res-rarity').textContent = RARITY[item.r].name;
  $('#res-image').src = item.img;
  $('#res-name').innerHTML = nameHTML(item);
  $('#res-wear').textContent = `${item.wear} · Float ${item.float}`;
  $('#res-price').innerHTML = `<span class="price">${fmtUSD(item.price)}</span> <span class="price-vnd">≈ ${fmtVND(item.price)}</span>`;
  $('#result').hidden = false;
  $('#open-title').textContent = item.r >= 4 ? 'Trúng lớn!' : 'Bạn nhận được';
  if (item.r >= 4) tick(1400);
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
  else if (item.p) bits.push(`từ ${fmtUSD(minPrice(item))}`);
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
    const c = CASES.find((x) => x.id === id);
    const chip = document.createElement('div');
    chip.className = 'bs-chip';
    chip.innerHTML = `<img src="${c.image}" alt="" /><span>${c.name.replace(/ (Weapon )?Case$/, '')}</span>
      <span class="qty"><button data-dec="${id}">−</button><b>${qty}</b><button data-inc="${id}">+</button></span>`;
    sel.appendChild(chip);
  });
  $('#bs-selected-empty').hidden = bs.cases.length > 0;
  $('#bs-round-count').textContent = bs.cases.length ? `(${bs.cases.length}/${MAX_ROUNDS} vòng)` : '';
  const cost = bs.cases.reduce((s, id) => s + caseCost(CASES.find((c) => c.id === id)), 0);
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
  closeModal('#modal-battle-setup');
  const rounds = bs.cases.map((id) => CASES.find((c) => c.id === id));
  const players = [
    { name: 'Bạn', me: true, av: '🧑', total: 0, items: [] },
    ...Array.from({ length: bs.bots }, (_, i) => ({ name: BOT_NAMES[i], av: BOT_AVATARS[i], total: 0, items: [] })),
  ];
  const me = players[0];
  const current = { rounds, players, mode: bs.mode, aborted: false, running: true };
  battle = current;

  $('#bt-title').textContent = `Case Battle · ${players.length} người · ${bs.mode === 'crazy' ? 'Đảo ngược' : 'Thường'}`;
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
  const { players, rounds, mode } = current;
  current.running = false;
  const best = mode === 'crazy' ? Math.min(...players.map((p) => p.total)) : Math.max(...players.map((p) => p.total));
  const tied = players.filter((p) => Math.abs(p.total - best) < 0.005);
  const winner = rand(tied);
  players.forEach((p) => p.el.classList.add(p === winner ? 'winner' : 'loser'));

  const cost = rounds.reduce((s, c) => s + caseCost(c), 0);
  const allItems = players.flatMap((p) => p.items);
  const pot = allItems.reduce((s, i) => s + i.price, 0);

  me.items.forEach((it, i) => countDrop(it, caseCost(rounds[i])));
  stats.battles.played++;
  if (winner === me) {
    stats.battles.won++;
    stats.value += pot;
    addToInventory([...allItems].sort((a, b) => b.price - a.price));
  }
  persistAndRender();

  const tieNote = tied.length > 1 ? 'Hoà điểm, tung xu. ' : '';
  $('#bt-final-title').textContent = winner === me
    ? `Bạn thắng! Ôm trọn ${allItems.length} món trị giá ${fmtUSD(pot)}`
    : `${winner.name} thắng với ${fmtUSD(winner.total)}`;
  $('#bt-final-sub').textContent = winner === me
    ? `${tieNote}Chi phí của bạn ${fmtUSD(cost)} → ${pot >= cost ? 'lãi' : 'lỗ'} ${fmtUSD(Math.abs(pot - cost))}. Tất cả đã vào kho đồ.`
    : `${tieNote}Bạn mở được ${fmtUSD(me.total)} nhưng mất hết. Chi phí ${fmtUSD(cost)}.`;
  $('#bt-final').hidden = false;
  $('#bt-final').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  tick(winner === me ? 1400 : 300);
}

// ---------- Inventory & stats ----------
function renderInventory() {
  const grid = $('#inv-grid');
  const f = $('#inv-filter').value;
  let list = inventory.filter((i) => f === 'all' || (f === 'st' ? i.st : i.r === Number(f)));
  if ($('#inv-sort').value === 'price') list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
  grid.innerHTML = '';
  list.slice(0, 200).forEach((i) => grid.appendChild(itemCard(i, { showFrom: true })));
  $('#inv-empty').hidden = list.length > 0;
  $('#inv-count').textContent = inventory.length;
  const total = inventory.reduce((s, i) => s + (i.price || 0), 0);
  $('#inv-value').textContent = inventory.length ? `${fmtUSD(total)} · ${inventory.length} món` : '';
}

function renderStats() {
  const profit = stats.value - stats.spent;
  const sign = profit >= 0 ? '+' : '−';
  $('#stat-opened').textContent = stats.opened.toLocaleString('vi-VN');
  $('#stat-value').textContent = fmtUSDShort(stats.value);
  $('#stat-profit').textContent = sign + fmtUSDShort(Math.abs(profit));
  $('#stat-profit').style.color = profit >= 0 ? '#7ee2a8' : '#ff7b7b';
  $('#stat-rare').textContent = stats.by[5];
  $('#battle-record').textContent = stats.battles.played
    ? `Thành tích: ${stats.battles.won} thắng / ${stats.battles.played} trận (${fmtPct(stats.battles.won / stats.battles.played)}).`
    : 'Thành tích: chưa đấu trận nào.';

  const wrap = $('#stats-table');
  wrap.innerHTML = '';
  const row = (lbl, val, cmp, color, cls = '') => {
    const el = document.createElement('div');
    el.className = 'stat-row ' + cls;
    el.style.setProperty('--rc', color);
    el.innerHTML = `<div class="lbl">${lbl}</div><div class="val ${profit >= 0 ? 'pos' : 'neg'}">${val}</div><div class="cmp">${cmp}</div>`;
    wrap.appendChild(el);
  };
  row('Đã chi (ảo)', fmtUSD(stats.spent), `${stats.opened} lượt mở · hòm + key`, '#8b93a7');
  row('Đã nhận', fmtUSD(stats.value), 'đồ rơi + thắng battle', '#7ee2a8');
  row('Lãi / lỗ', sign + fmtUSD(Math.abs(profit)), stats.spent ? `hoàn vốn ${fmtPct(stats.value / stats.spent)}` : '—', profit >= 0 ? '#7ee2a8' : '#ff7b7b', 'profit');
  [5, 4, 3, 2, 1].forEach((r) => {
    const n = stats.by[r];
    row(RARITY[r].name, n, `${fmtPct(stats.opened ? n / stats.opened : 0)} · kỳ vọng ${fmtPct(RARITY[r].p)}`, RARITY[r].color);
  });
  row('StatTrak™', stats.st, `${fmtPct(stats.opened ? stats.st / stats.opened : 0)} · kỳ vọng 10%`, '#ff8a3d');
  row('Case Battle', `${stats.battles.won}/${stats.battles.played}`, 'thắng / tổng trận', '#f5a524');
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
  if (view) showCaseDetail(CASES.find((c) => c.id === view.dataset.view));
  if (open) openCase(CASES.find((c) => c.id === open.dataset.open));
  if (add) {
    if (bs.cases.length < MAX_ROUNDS) bs.cases.push(add.dataset.add || add.dataset.inc);
    renderBattleSetup();
  }
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
$('#res-again').onclick = () => openCase(currentCase);
$('#res-close').onclick = () => closeModal('#modal-open');
$('#res-zoom').onclick = () => lastWon && openZoom(lastWon);
$('#case-search').oninput = (e) => renderCases(e.target.value);
$('#inv-filter').onchange = renderInventory;
$('#inv-sort').onchange = renderInventory;
$('#inv-clear').onclick = () => {
  if (!inventory.length || !confirm('Xoá toàn bộ kho đồ và thống kê?')) return;
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

$('#prices-date').textContent = window.CS2_PRICES_UPDATED || '';
renderCases();
renderBattleCases();
renderInventory();
renderStats();
