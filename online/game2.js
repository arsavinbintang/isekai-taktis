/* game2.js - dimuat setelah game.js. Fungsi dengan nama sama di sini menggantikan versi lama. */
let ME = { admin: false, user: null }, bsel = 0, FOR = [], ROAD = [], BIOME = 'meadow';
DB.banners = [];
const bIds = b => (b.chars || '').split(',').map(Number).filter(id => char(id));

/* ===== Data & login ===== */
async function loadAll() {
  DB.chars = await api('chars'); DB.story = await api('story'); DB.banners = await api('banners');
  DB.chars.forEach(c => { c.id = +c.id; c.hp = +c.hp; c.atk = +c.atk; c.ap = +c.ap; if (c.image) { const i = new Image(); i.src = c.image; IMG[c.id] = i; } });
}
async function boot() {
  try { await loadAll(); if (DB.chars.error) throw 0; ME = await api('me'); }
  catch (e) { DB.chars = FALLBACK; DB.banners = []; DB.story = [{ id: 0, title: 'Bab contoh', battle: 1, script: '@bg hall\nNarator: Server belum aktif, ini bab contoh.\nValerius: Ayo bertempur.' }]; $('#offline').hidden = false; }
  S.own = S.own.filter(id => char(id)); if (!S.own.length) S.own = DB.chars.slice(0, 3).map(c => c.id);
  save(); authUI(); go('menu');
}
function authUI() { $$('.adm').forEach(e => e.hidden = !ME.admin); $('#authBtn').textContent = ME.user ? 'Keluar (' + ME.user + ')' : 'Masuk'; }
async function doAuth(kind) {
  const fd = new FormData(); fd.append('username', $('#lu').value.trim()); fd.append('password', $('#lp').value);
  let r = kind === 'register' ? await api('register', fd) : { ok: 1 };
  if (!r.error) r = await api('login', fd);
  if (r.error) return toast(r.error);
  ME = r; authUI(); toast(ME.admin ? 'Masuk sebagai admin' : 'Selamat datang, ' + ME.user); go('menu');
}
async function authClick() { if (ME.user) { await api('logout', new FormData()); ME = { admin: false, user: null }; authUI(); toast('Sudah keluar'); } else go('login'); }
async function send(a, fd) { const r = await api(a, fd); if (r.error) { toast(r.error); return null; } return r; }

/* ===== Visual novel: latar, dua sosok, perintah @bg ===== */
let slot = { L: null, R: null }, lastSide = 'R';
function play(i) {
  curCh = DB.story[i];
  LN = curCh.script.split('\n').map(s => s.trim()).filter(s => s && s[0] !== '#').map(s => {
    if (/^@bg\s/i.test(s)) return { bg: s.slice(3).trim().toLowerCase() };
    const k = s.indexOf(':'); return k > 0 ? { who: s.slice(0, k).trim(), txt: s.slice(k + 1).trim() } : { who: '', txt: s };
  });
  li = 0; slot = { L: null, R: null }; $('#scene').dataset.bg = 'field'; go('scene'); $('#dlg').hidden = false; line();
}
function line() {
  clearInterval(typing);
  while (LN[li] && LN[li].bg !== undefined) { $('#scene').dataset.bg = LN[li].bg; li++; }
  if (li >= LN.length) { $('#dlg').hidden = true; return +curCh.battle ? setup('STORY') : go('story'); }
  const l = LN[li], c = DB.chars.find(x => x.name.toLowerCase() === l.who.toLowerCase());
  if (c && slot.L !== c.id && slot.R !== c.id) { const s = !slot.L ? 'L' : !slot.R ? 'R' : lastSide === 'L' ? 'R' : 'L'; slot[s] = c.id; }
  if (c) lastSide = slot.L === c.id ? 'L' : 'R';
  $('#stand').innerHTML = ['L', 'R'].map(s => { const ch = char(slot[s]); return `<div class="slot ${s} ${ch && c && ch.id === c.id ? 'on' : 'dim'}">${ch ? face(ch, 220) : ''}</div>`; }).join('');
  $('#who').textContent = l.who; $('#who').hidden = !l.who;
  let n = 0; $('#txt').textContent = '';
  typing = setInterval(() => { $('#txt').textContent = l.txt.slice(0, ++n); if (n >= l.txt.length) clearInterval(typing); }, 22);
}

/* ===== Banner gacha ===== */
R.gacha = () => {
  $('#pity').textContent = S.pity; $('#pulls').innerHTML = '';
  $('#banners').innerHTML = DB.banners.length ? DB.banners.map((b, i) => `<div class="card panel ${i === bsel ? 'sel' : ''}" onclick="bsel=${i};R.gacha()"><b>${esc(b.name)}</b><small>${esc(b.description)}</small><div class="row">${bIds(b).map(id => face(char(id), 40)).join('')}</div></div>`).join('') : '<div class="panel">Belum ada banner. Admin bisa membuatnya di Studio.</div>';
};
function pull(n) {
  if (S.gem < n * 100) return toast('Permata tidak cukup');
  S.gem -= n * 100; const out = [], bn = DB.banners[bsel], up = bn ? bIds(bn) : [];
  for (let i = 0; i < n; i++) {
    S.pity++;
    if (S.pity >= 30 || Math.random() < .05) {
      S.pity = 0;
      let pool = up.length && Math.random() < .5 ? up.map(char) : DB.chars;
      const un = pool.filter(c => !S.own.includes(c.id)); if (S.pity === 0 && un.length) pool = un;
      const c = pool[Math.random() * pool.length | 0];
      if (S.own.includes(c.id)) { S.gem += 200; out.push({ c, t: 'Duplikat +200' }); } else { S.own.push(c.id); out.push({ c, t: 'Baru!' }); }
    } else { S.gem += 5; out.push({ t: 'Prajurit +5' }); }
  }
  save(); $('#pity').textContent = S.pity;
  $('#pulls').innerHTML = out.map(o => `<div class="card panel ${o.c ? 'sel' : ''}">${o.c ? face(o.c, 64) : face(null, 64, 'P')}<b>${esc(o.c ? o.c.name : 'Prajurit')}</b><small>${o.t}</small></div>`).join('');
}

/* ===== Studio (admin) ===== */
const tabTo = t => { tab = t; R.studio(); };
R.studio = () => {
  if (!ME.admin) { toast('Studio khusus admin. Silakan masuk.'); return go('login'); }
  $('#tabChar').hidden = tab !== 'char'; $('#tabStory').hidden = tab !== 'story'; $('#tabBanner').hidden = tab !== 'banner';
  const nw = (fn, t) => `<button class="btn" style="width:100%;margin-bottom:10px" onclick="${fn}(0)">${t}</button>`;
  $('#clist').innerHTML = nw('editChar', 'Karakter baru') + DB.chars.map(c => `<div class="card panel row" onclick="editChar(${c.id})">${face(c, 40)}<span>${esc(c.name)}</span></div>`).join('');
  $('#slist').innerHTML = nw('editChap', 'Bab baru') + DB.story.map(c => `<div class="card panel row" onclick="editChap(${c.id})"><span>${esc(c.title)}</span></div>`).join('');
  $('#blist').innerHTML = nw('editBanner', 'Banner baru') + DB.banners.map(b => `<div class="card panel row" onclick="editBanner(${b.id})"><span>${esc(b.name)}</span></div>`).join('');
  ({ char: editChar, story: editChap, banner: editBanner })[tab](0);
};
function editBanner(id) {
  const f = $('#bf'), b = DB.banners.find(x => +x.id === id) || { name: '', description: '', chars: '' }, on = bIds(b);
  f.elements.id.value = id; f.elements.name.value = b.name; f.elements.description.value = b.description;
  $('#bchars').innerHTML = DB.chars.map(c => `<label class="chk"><input type="checkbox" name="chars[]" value="${c.id}" ${on.includes(c.id) ? 'checked' : ''}>${face(c, 28)} ${esc(c.name)}</label>`).join('');
}
async function saveBanner(e) { e.preventDefault(); const r = await send('banner_save', new FormData(e.target)); if (!r) return; await loadAll(); R.studio(); editBanner(r.id); toast('Banner disimpan'); }
async function delBanner() {
  const id = $('#bf').elements.id.value; if (!+id || !confirm('Hapus banner ini?')) return;
  const fd = new FormData(); fd.append('id', id); if (await send('banner_del', fd)) { bsel = 0; await loadAll(); R.studio(); toast('Banner dihapus'); }
}

/* ===== Biome: tilesheet digambar ulang tiap peta ===== */
const BIO = {
  meadow: { n: 'Padang Rumput', g: '#58863a', a: '#6b9b47', d: '#4a7530', t: '#2f5f2a', t2: '#42813a', w: '#2f6fa8', w2: '#6aa8d8' },
  snow: { n: 'Dataran Salju', g: '#dfe8ee', a: '#f4f8fb', d: '#b9c8d4', t: '#2c4a3f', t2: '#3f6657', w: '#6fa3c4', w2: '#bfe0f0' },
  desert: { n: 'Gurun Berbatu', g: '#d1b36a', a: '#e0c680', d: '#b8994f', t: '#6b7a3a', t2: '#8a9a4a', w: '#3f8f9f', w2: '#7fc4cf' },
  swamp: { n: 'Rawa Berkabut', g: '#4b6b3f', a: '#5d7f4c', d: '#3b5632', t: '#2a4a33', t2: '#386045', w: '#3d5a4a', w2: '#6f9680' },
};
function mkTiles(k) {
  const b = BIO[k]; TL.width = 176; const g = TL.getContext('2d'), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, gr = o => P(o, 0, 16, 16, b.g);
  for (let v = 0; v < 3; v++) { const r = rnd(v + 9), o = v * 16; gr(o); for (let i = 0; i < 16; i++) P(o + (r() * 15 | 0), r() * 15 | 0, 1 + (r() * 2 | 0), 1, r() < .5 ? b.a : b.d); if (v === 2) { P(o + 4, 10, 1, 1, '#e8d36a'); P(o + 11, 5, 1, 1, '#e8d36a'); } }
  gr(48); P(55, 10, 2, 5, '#5b3a1e'); P(51, 3, 10, 8, b.t); P(53, 1, 6, 3, b.t); P(52, 4, 3, 3, b.t2); P(57, 7, 3, 2, b.t2);
  gr(64); P(67, 6, 10, 8, '#7b7f86'); P(69, 4, 6, 3, '#8f939a'); P(67, 12, 10, 2, '#585c62');
  for (let v = 0; v < 2; v++) { const o = 80 + v * 16; P(o, 0, 16, 16, b.w); for (let i = 0; i < 3; i++) P(o + 2 + ((i * 5 + v * 4) % 9), 3 + i * 5, 5, 1, b.w2); }
  gr(112); P(114, 4, 12, 11, '#8b8f98'); [114, 120, 124].forEach(x => P(x, 2, 3, 3, '#8b8f98')); P(118, 9, 4, 6, '#3a2a1c'); P(114, 14, 12, 1, '#585c62');
  gr(128); P(132, 6, 8, 9, '#a08a64'); P(131, 4, 10, 3, '#a08a64'); P(134, 10, 3, 5, '#3a2a1c'); P(131, 6, 10, 1, '#6b5a3c');
  const r = rnd(5); P(144, 0, 16, 16, '#a58a5a'); for (let i = 0; i < 12; i++) P(144 + (r() * 15 | 0), r() * 15 | 0, 2, 1, r() < .5 ? '#8d7448' : '#bda073');
  gr(160); P(163, 8, 10, 7, '#d9c89a'); P(162, 5, 12, 3, '#8a3b2c'); P(164, 3, 8, 2, '#8a3b2c'); P(167, 10, 3, 5, '#3a2a1c'); P(171, 2, 2, 3, '#585c62');
}

/* ===== Peta, medan, kritis, benteng menyembuhkan ===== */
function startBattle() {
  if (!pick.length) return toast('Pilih minimal 1 komandan');
  const ks = Object.keys(BIO); BIOME = ks[Math.random() * ks.length | 0]; mkTiles(BIOME);
  isPVP = mode === 'PVP'; turn = 'P1'; coins = { P1: 10, P2: 10 }; over = false; units = []; blds = []; fx = [];
  sel = selB = null; reach = []; targets = []; tpMode = false; $('#log').innerHTML = ''; $('#endm').hidden = true;
  map = []; fog = []; FOR = []; ROAD = [];
  for (let x = 0; x < COLS; x++) { map[x] = []; fog[x] = []; FOR[x] = []; ROAD[x] = []; for (let y = 0; y < ROWS; y++) { const r = Math.random(); map[x][y] = r < .04 ? 4 : r < .08 ? 5 : Math.random() * 3 | 0; FOR[x][y] = map[x][y] < 3 && Math.random() < .17; ROAD[x][y] = false; fog[x][y] = 0; } }
  const clear = (x, y) => { map[x][y] = 0; FOR[x][y] = false; };
  const mkBase = (fac, x) => { const y = 2 + (Math.random() * (ROWS - 4) | 0); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) clear(x + i, y + j); blds.push({ type: 'Base', fac, x, y, maxHp: 1000, hp: 1000, inc: 5 }); };
  mkBase('P1', 1); mkBase('P2', COLS - 2);
  const b1 = blds[0], b2 = blds[1]; let ry = b1.y;
  for (let x = b1.x; x <= b2.x; x++) { clear(x, ry); ROAD[x][ry] = true; if (Math.random() < .4) { ry += ry !== b2.y && Math.random() < .6 ? Math.sign(b2.y - ry) : Math.random() < .5 ? -1 : 1; ry = Math.max(0, Math.min(ROWS - 1, ry)); clear(x, ry); ROAD[x][ry] = true; } }
  for (let y = Math.min(ry, b2.y); y <= Math.max(ry, b2.y); y++) { clear(b2.x - 1, y); ROAD[b2.x - 1][y] = true; }
  for (let i = 0; i < 6; i++) { let x, y; do { x = 4 + (Math.random() * (COLS - 8) | 0); y = Math.random() * ROWS | 0; } while (map[x][y] >= 3 || bldAt(x, y) || FOR[x][y]); blds.push(i < 3 ? { type: 'Benteng', fac: 'Neu', x, y, maxHp: 300, hp: 300, inc: 3 } : { type: 'Desa', fac: 'Neu', x, y, maxHp: 200, hp: 200, inc: 2 }); }
  pick.forEach(id => { const f = free(b1.x, b1.y); units.push(mk('P1', f.x, f.y, char(id), 10)); });
  const pool = DB.chars.filter(c => !pick.includes(c.id)), src = pool.length >= 3 ? pool : DB.chars;
  [...src].sort(() => Math.random() - .5).slice(0, 3).forEach(c => { const f = free(b2.x, b2.y); units.push(mk('P2', f.x, f.y, c, 10)); });
  see(); hud(); info(); say(`Medan: ${BIO[BIOME].n}. Hutan memperlambat (2 AP) dan mengurangi damage 20%.`, 1); go('battle');
  if (!looping) { looping = true; loop(); }
}

function paths(u) {
  reach = []; targets = []; if (u.ap <= 0) return;
  const best = { [u.x + ',' + u.y]: 0 }, q = [[u.x, u.y, 0]];
  while (q.length) {
    q.sort((a, b) => a[2] - b[2]); const [x, y, c] = q.shift(); if (c > best[x + ',' + y]) continue; if (c) reach.push({ x, y, c });
    for (const [dx, dy] of D) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || map[nx][ny] >= 3) continue;
      const nc = c + (FOR[nx][ny] ? 2 : 1); if (nc > u.ap || nc >= (best[k] ?? 99)) continue;
      const o = unitAt(nx, ny), b = bldAt(nx, ny);
      if (o) { if (o.fac === u.fac && !u.c) { best[k] = nc; reach.push({ x: nx, y: ny, c: nc, merge: o }); } continue; }
      if (b && b.fac !== u.fac) continue;
      best[k] = nc; q.push([nx, ny, nc]);
    }
  }
  const ok = (x, y, un) => u.fac === 'P2' || fog[x][y] >= (un ? 2 : 1);
  for (const [dx, dy] of D) {
    const nx = u.x + dx, ny = u.y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    const o = unitAt(nx, ny), b = bldAt(nx, ny);
    if (o && o.fac !== u.fac && ok(nx, ny, 1)) targets.push({ e: o, u: 1 });
    else if (!o && b && b.fac !== u.fac && ok(nx, ny, 0)) targets.push({ e: b });
  }
}

function attack(a, t) {
  const e = t.e, crit = Math.random() < .15; let d = atk(a); if (crit) d = Math.floor(d * 1.5);
  if (t.u && FOR[e.x][e.y]) d = Math.floor(d * .8);
  fxText(e.x, e.y, (crit ? 'KRITIS -' : '-') + d, crit ? '#ffd34d' : '#fff');
  if (t.u) {
    hurt(e, d); say(`${a.name} menyerang ${e.name} (${d}${crit ? ', kritis' : ''})`);
    if (e.hp > 0) { const c = Math.floor(atk(e) / 2); hurt(a, c); fxText(a.x, a.y, '-' + c, '#f99'); say(`${e.name} membalas (${c})`); }
  } else {
    e.hp -= d; say(`${a.name} menyerang ${e.type} (${d})`);
    if (e.hp <= 0) { e.fac = a.fac; e.hp = e.maxHp / 2; say(`${FN[a.fac]} merebut ${e.type}!`, 1); if (e.type === 'Base') return win(a.fac); }
  }
  a.ap = 0; units = units.filter(u => u.hp > 0);
  if (sel && !units.includes(sel)) sel = null;
  see(); if (sel) paths(sel); info();
}

function endTurn() {
  if (over) return;
  turn = turn === 'P1' ? 'P2' : 'P1'; tpMode = false;
  blds.filter(b => b.fac === turn).forEach(b => coins[turn] += b.inc);
  units.filter(u => u.fac === turn).forEach(u => {
    u.ap = u.mAp; const b = bldAt(u.x, u.y);
    if (b && b.fac === turn && u.hp < u.mHp) { heal(u, Math.floor(u.mHp * .15)); fxText(u.x, u.y, '+HP', '#8f8'); }
  });
  sel = selB = null; reach = []; targets = []; see(); hud(); info(); say(`Giliran ${FN[turn]}`, 1);
  if (turn === 'P2' && !isPVP) setTimeout(ai, 700);
}

boot();
