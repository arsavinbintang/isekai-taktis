/* ============================================================
   ISEKAI TACTICS — mesin pertempuran
   peta & dekorasi (jembatan, reruntuhan, panji), senjata + pasif,
   giliran, dan AI yang makin pintar seiring kesulitan / peringkat
   ============================================================ */

/* ---------- medan ---------- */
const COLS = 16, ROWS = 12, TS = 48;
const D = [[0, 1], [1, 0], [0, -1], [-1, 0]], NB = [...D, [1, 1], [-1, -1], [1, -1], [-1, 1]];
/* kode petak: 0-2 rumput, 3 batu, 4 air, 5 jembatan, 6 reruntuhan */
const T2T = [0, 1, 2, 4, 5, 11, 12];
const walkable = (x, y) => { const c = map[x][y]; return c <= 2 || c === 5 || c === 6; };

let map, fog, blds, props, units, turn, coins, sel, selB, reach, targets, over, fx, isPVP, tpMode;
const cv = $('#cv'), cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false;

const unitAt = (x, y) => units.find(u => u.x === x && u.y === y);
const bldAt = (x, y) => blds.find(b => b.x === x && b.y === y);
const vis = (x, y) => isPVP || fog[x][y] === 2;
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const hasP = (u, k) => !!(u.psv && u.psv.includes(k));

function calc(u) {
  u.mHp = u.c ? u.bHp + (u.lv - 1) * 50 + u.trps * 10 : u.trps * u.bHp;
  if (hasP(u, 'vigor')) u.mHp = Math.round(u.mHp * 1.2);      /* Nadi Tegap */
}
function atk(u) {
  let a = u.c ? u.bAtk + (u.lv - 1) * 10 + u.trps : u.trps * u.bAtk;
  if (hasP(u, 'fury') && u.hp < u.mHp * .5) a = Math.round(a * 1.6);
  return a;
}
const syncT = u => {
  if (!u.c) { u.trps = Math.ceil(u.hp / u.bHp); return; }
  /* Nadi Tegap membesarankan HP maks — ruang pasukan ikut diskalakan supaya
     pasukan tidak mendadak bertambah saat penuh darah */
  const base = u.bHp + (u.lv - 1) * 50;
  u.trps = Math.max(0, hasP(u, 'vigor')
    ? Math.round((u.hp / 1.2 - base) / 10)
    : Math.ceil((u.hp - base) / 10));
};
const hurt = (u, d) => {
  if (u.shield > 0) d = Math.max(1, Math.round(d * .6));   /* Tameng Taat: -40% */
  const hidup = u.hp > 0;
  u.hp = Math.max(0, u.hp - d); syncT(u);
  if (hidup && u.hp === 0) sfx('die');                     /* tumbang → suara kematian */
  return d;                                                /* damage yang benar-benar masuk */
};
const heal = (u, n) => { u.hp = Math.min(u.mHp, u.hp + n); syncT(u); };
const rc = f => 1 + Math.floor(units.filter(u => u.fac === f).reduce((s, u) => s + u.trps, 0) / 20);
function free(x, y) {
  for (const [dx, dy] of NB) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && walkable(nx, ny) && map[nx][ny] !== 6 && !unitAt(nx, ny) && !bldAt(nx, ny)) return { x: nx, y: ny };
  }
  return null;
}
function say(m, imp, cls) { const l = $('#log'); l.insertAdjacentHTML('beforeend', `<div class="${imp ? 'imp' : ''} ${cls || ''}">${m}</div>`); l.scrollTop = l.scrollHeight; }
function fxText(x, y, t, c) { fx.push({ x, y, t, c, born: Date.now() }); }

/* ---------- pasukan ---------- */
function mk(fac, x, y, c, trps, scale) {
  const m = scale || 1;
  const u = { fac, x, y, c, lv: 1, trps, psv: [], crit: .15, burn: null, firstUsed: false, skCd: 0, shield: 0 };
  if (c) {
    const lo = loadoutFor(c.id, fac === 'P1' ? S.eq : foeEq);
    u.name = c.name;
    /* pasif bawaan karakter selalu ikut; pasif senjata sejati menyusul */
    u.passive = c.passive || '';
    u.skill = c.skill || '';
    u.psv = u.passive ? [u.passive, ...lo.passives] : lo.passives.slice();
    u.bHp = Math.round((c.hp + lo.hp) * m);
    u.bAtk = Math.round((c.atk + lo.atk) * m);
    u.mAp = c.ap + (u.psv.includes('haste') ? 1 : 0);
    u.ult = c.ult;
    u.crit = Math.min(.75, .15 + lo.crit / 100);
    u.gear = lo.weaps.map(w => w.name);
  } else {
    u.name = 'Pasukan'; u.bHp = Math.max(4, Math.round(10 * m)); u.bAtk = Math.max(1, Math.round(m)); u.mAp = 3;
  }
  u.ap = u.mAp; calc(u); u.hp = u.mHp; return u;
}
let foeEq = {};

/* ============================================================
   GENERATOR PETA + DEKORASI ABAD PERMULIAHAN
   ============================================================ */
/* ---------- alat bantu menyusun medan ---------- */
const inM = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
function pset(x, y, v) { if (inM(x, y)) map[x][y] = v; }
function pdisc(cx, cy, r, v) {
  for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++)
    if (x * x + y * y <= r * r) pset(cx + x, cy + y, v);
}
function prect(x0, y0, x1, y1, v) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) pset(x, y, v);
}
/* sungai bergelombang: dir 'h' = mengalir ke samping, 'v' = ke bawah */
function priver(dir, at, wid, seed) {
  const r = rnd(seed); let p = at;
  const n = dir === 'h' ? COLS : ROWS;
  for (let i = 0; i < n; i++) {
    if (r() < .3) p += r() < .5 ? -1 : 1;
    p = clamp(p, 2, (dir === 'h' ? ROWS : COLS) - 3);
    for (let d = 0; d < wid; d++) dir === 'h' ? pset(i, p + d, 4) : pset(p + d, i, 4);
  }
}
/* punggung bukit / tebing diagonal */
function pridge(x0, y0, x1, y1, th) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pdisc(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), th, 3);
  }
}
function procks(n, lo, hi, v) {
  for (let i = 0; i < n; i++) {
    const cx0 = 2 + (Math.random() * (COLS - 4) | 0), cy0 = Math.random() * ROWS | 0;
    const r = lo + (Math.random() * (hi - lo + 1) | 0);
    for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) {
      if (x * x + y * y > r * r) continue;
      const nx = cx0 + x, ny = cy0 + y;
      /* batu tidak boleh menimpa air/jembatan — sungai harus tetap utuh */
      if (inM(nx, ny) && map[nx][ny] !== 4 && map[nx][ny] !== 5) map[nx][ny] = v;
    }
  }
}

/* ============================================================
   20 MEDAN — tiap peta punya susunan geografi yang benar-benar
   berbeda: ada yang hutan lebat, sungai, danau, lembah, kaldera,
   delta, jaring batu, sampai arena simetris
   ============================================================ */
const MAPS = [
  { n: 'Padang Perdamaian', bio: 'meadow', g() { procks(4, 1, 2, 3); } },
  { n: 'Rimba Dalam', bio: 'autumn', g() { procks(11, 1, 3, 3); } },
  { n: 'Sungai Bengkok', bio: 'meadow', g() { priver('h', 4, 2, 11); priver('v', COLS - 5, 1, 23); } },
  { n: 'Kolam Raksasa', bio: 'coast', g() { pdisc(COLS / 2 | 0, ROWS / 2 | 0, 4, 4); procks(3, 1, 2, 3); } },
  { n: 'Punggung Naga', bio: 'snow', g() { pridge(0, 1, COLS - 1, ROWS - 2, 1); procks(6, 1, 2, 3); } },
  { n: 'Lembah Sempit', bio: 'ash', g() { prect(0, 1, COLS - 1, 2, 3); prect(0, ROWS - 3, COLS - 1, ROWS - 2, 3); procks(4, 1, 1, 3); } },
  { n: 'Gurun Emas', bio: 'desert', g() { for (let x = 3; x < COLS - 2; x += 4) for (let y = 0; y < ROWS; y++) if ((x + y) % 7) pset(x, y, 3); } },
  { n: 'Oasis Terpencil', bio: 'desert', g() { for (let i = 0; i < 6; i++) pdisc(3 + (Math.random() * (COLS - 6) | 0), 2 + (Math.random() * (ROWS - 4) | 0), 2, 4); procks(3, 1, 1, 3); } },
  { n: 'Danau Bulan', bio: 'coast', g() { pdisc(4, 3, 3, 4); pdisc(11, 8, 3, 4); pdisc(9, 3, 2, 4); } },
  { n: 'Rawah Kelam', bio: 'swamp', g() { procks(7, 1, 3, 4); procks(6, 1, 2, 3); } },
  { n: 'Kota Reruntuhan', bio: 'ash', g() { for (let i = 0; i < 26; i++) { const x = 1 + (Math.random() * (COLS - 2) | 0), y = Math.random() * ROWS | 0; pset(x, y, 6); if (Math.random() < .5) pset(x + 1, y, 6); } procks(3, 1, 2, 3); } },
  { n: 'Benteng Purba', bio: 'meadow', g() { const cx = COLS / 2 | 0, cy = ROWS / 2 | 0; for (let a = 0; a < 360; a += 4) pset(Math.round(cx + Math.cos(a * Math.PI / 180) * 6), Math.round(cy + Math.sin(a * Math.PI / 180) * 4), 3); } },
  { n: 'Jembatan Sembilan', bio: 'meadow', g() { priver('h', 3, 1, 5); priver('h', 6, 1, 17); priver('h', 9, 1, 29); } },
  { n: 'Salju Abadi', bio: 'snow', g() { priver('v', 6, 2, 41); procks(9, 1, 3, 3); } },
  { n: 'Kaldera Bara', bio: 'volcanic', g() { const cx = COLS / 2 | 0, cy = ROWS / 2 | 0; for (let a = 0; a < 360; a += 3) { const r = 4 + (a % 9 > 4 ? 1 : 0); pset(Math.round(cx + Math.cos(a * Math.PI / 180) * (r + 1)), Math.round(cy + Math.sin(a * Math.PI / 180) * (r - 1)), 4); } pdisc(cx, cy, 2, 4); } },
  { n: 'Tebing Terbelah', bio: 'volcanic', g() { for (let y = 0; y < ROWS; y++) { if (y === 5 || y === 6) continue; prect(6, y, 7, y, 3); prect(9, y, 10, y, 3); } } },
  { n: 'Delta Seribu', bio: 'swamp', g() { priver('v', 4, 1, 61); priver('v', 11, 1, 71); priver('h', 6, 1, 83); } },
  { n: 'Puncak Angin', bio: 'snow', g() { pridge(COLS - 1, 0, 0, ROWS - 1, 1); procks(8, 1, 2, 3); } },
  { n: 'Ladang Jaring', bio: 'meadow', g() { for (let x = 2; x < COLS - 2; x += 4) for (let y = 1; y < ROWS - 1; y += 3) if ((x + y) % 8) { pset(x, y, 3); pset(x, y + 1, 3); } } },
  { n: 'Arena Ksatria', bio: 'autumn', g() { const cx = COLS / 2 | 0, cy = ROWS / 2 | 0; [[-5, -3], [5, -3], [-5, 3], [5, 3], [0, -4], [0, 4]].forEach(([dx, dy]) => pdisc(cx + dx, cy + dy, 1, 3)); prect(cx - 8, 0, cx - 8, ROWS - 1, 6); prect(cx + 8, 0, cx + 8, ROWS - 1, 6); } },
];

function genMap(force) {
  const idx = force == null ? (mapPick != null ? mapPick : Math.random() * MAPS.length | 0) : force;
  const M = MAPS[idx % MAPS.length];
  BIOME = M.bio; MAPNAME = M.n;
  map = []; fog = []; FOR = []; ROAD = []; props = [];
  for (let x = 0; x < COLS; x++) {
    map[x] = []; fog[x] = []; FOR[x] = []; ROAD[x] = [];
    for (let y = 0; y < ROWS; y++) {
      map[x][y] = Math.random() < .05 ? 3 : Math.random() * 3 | 0;
      FOR[x][y] = false; ROAD[x][y] = false; fog[x][y] = 0;
    }
  }
  M.g();
  /* hutan hanya boleh di petak yang bisa diinjak */
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++)
    if (map[x][y] <= 2) FOR[x][y] = Math.random() < .14;
}
function carve(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
  FOR[x][y] = false;
  if (map[x][y] === 4) map[x][y] = 5;            /* lewat air → jembatan */
  else if (map[x][y] === 3 || map[x][y] === 6) map[x][y] = 0;
}
function mkBase(fac, x) {
  const y = 2 + (Math.random() * (ROWS - 4) | 0);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const nx = x + i, ny = y + j;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    FOR[nx][ny] = false; map[nx][ny] = 0;
  }
  blds.push({ type: 'Markas', fac, x, y, maxHp: 1000, hp: 1000, inc: 5, lv: 1 });
  return { x, y };
}
function buildRoad(b1, b2) {
  let ry = b1.y;
  for (let x = b1.x; x <= b2.x; x++) {
    carve(x, ry); ROAD[x][ry] = true;
    if (Math.random() < .4) {
      ry += ry !== b2.y && Math.random() < .6 ? Math.sign(b2.y - ry) : (Math.random() < .5 ? -1 : 1);
      ry = clamp(ry, 0, ROWS - 1);
      carve(x, ry); ROAD[x][ry] = true;
    }
  }
  for (let y = Math.min(ry, b2.y); y <= Math.max(ry, b2.y); y++) { carve(b2.x - 1, y); ROAD[b2.x - 1][y] = true; }
}
/* Sungai tak selalu kebetulan memotong jalan. Kalau peta punya air tapi
   tidak satu pun jembatan, paksa satu penyeberangan di titik jalan terdekat. */
function hasBridgeTile() {
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (map[x][y] === 5) return true;
  return false;
}
/* Jalan tak selalu kebetulan memotong sungai. Kalau peta berair tapi tidak
   satu pun jembatan terbentuk, paksa satu penyeberangan supaya medan tetap
   bisa dilalui dan ciri khas sungai-jembatan tetap terlihat. */
function ensureBridge() {
  if (hasBridgeTile()) return;
  let water = null;
  for (let x = 0; x < COLS && !water; x++) for (let y = 0; y < ROWS && !water; y++)
    if (map[x][y] === 4) water = { x, y };
  if (!water) return;

  const cross = (sx, sy, dx, dy) => {          /* seberangi air dari titik awal */
    let nx = sx + dx, ny = sy + dy, made = false;
    for (let k = 0; k < 6 && inM(nx, ny) && map[nx][ny] === 4; k++) {
      map[nx][ny] = 5; FOR[nx][ny] = false; made = true; nx += dx; ny += dy;
    }
    return made;
  };

  /* tahap 1: petak jalan yang bersebelahan dengan air */
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
    if (!ROAD[x][y]) continue;
    for (const [dx, dy] of D) if (inM(x + dx, y + dy) && map[x + dx][y + dy] === 4) {
      if (cross(x, y, dx, dy) && hasBridgeTile()) return;
    }
  }
  /* tahap 2: petak jalan terdekat mana pun — langkah menuju air lalu seberangi */
  let best = null;
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
    if (!ROAD[x][y]) continue;
    const d = Math.abs(x - water.x) + Math.abs(y - water.y);
    if (!best || d < best.d) best = { x, y, d };
  }
  if (!best) return;
  const dxs = water.x - best.x, dys = water.y - best.y;
  const dir = Math.abs(dxs) >= Math.abs(dys)
    ? [Math.sign(dxs) || 1, 0] : [0, Math.sign(dys) || 1];
  cross(best.x, best.y, dir[0], dir[1]);
}
function scatterRuins() {
  let placed = 0, guard = 120;
  while (placed < 5 && guard-- > 0) {
    let x = 3 + (Math.random() * (COLS - 6) | 0), y = 1 + (Math.random() * (ROWS - 2) | 0);
    let hit = false;
    [[0, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (nx > 1 && nx < COLS - 2 && ny >= 0 && ny < ROWS && !ROAD[nx][ny] && !bldAt(nx, ny)
        && !unitAt(nx, ny) && map[nx][ny] <= 3) { map[nx][ny] = 6; FOR[nx][ny] = false; hit = true; }
    });
    if (hit) placed++;
  }
}
function scatterBanners(b1, b2) {
  props.push({ x: b1.x + 1, y: Math.max(0, b1.y - 2), fac: 'P1' });
  props.push({ x: b1.x, y: Math.min(ROWS - 1, b1.y + 2), fac: 'P1' });
  props.push({ x: b2.x - 1, y: Math.max(0, b2.y - 2), fac: 'P2' });
  props.push({ x: b2.x, y: Math.min(ROWS - 1, b2.y + 2), fac: 'P2' });
  let placed = 0, guard = 60;
  while (placed < 5 && guard-- > 0) {
    const x = 3 + (Math.random() * (COLS - 6) | 0), y = Math.random() * ROWS | 0;
    if (ROAD[x][y] || map[x][y] > 6 || bldAt(x, y) || unitAt(x, y) || props.some(p => p.x === x && p.y === y)) continue;
    props.push({ x, y, fac: 'Neu' }); placed++;
  }
}

/* ============================================================
   JALUR & TARGET
   ============================================================ */
function calcPaths(u) {
  const reach = [], targets = [];
  if (u.ap <= 0) return { reach, targets };
  const best = { [u.x + ',' + u.y]: 0 }, q = [[u.x, u.y, 0]];
  while (q.length) {
    q.sort((a, b) => a[2] - b[2]);
    const [x, y, c] = q.shift();
    if (c > (best[x + ',' + y] ?? 99)) continue;
    if (c) reach.push({ x, y, c });
    for (const [dx, dy] of D) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || !walkable(nx, ny)) continue;
      const nc = c + (FOR[nx][ny] ? 2 : 1);
      if (nc > u.ap || nc >= (best[k] ?? 99)) continue;
      const o = unitAt(nx, ny), b = bldAt(nx, ny);
      if (o) { if (o.fac === u.fac && !u.c) { best[k] = nc; reach.push({ x: nx, y: ny, c: nc, merge: o }); } continue; }
      if (b && b.fac !== u.fac) continue;
      best[k] = nc; q.push([nx, ny, nc]);
    }
  }
  const ok = (x, y, un) => u.fac === 'P2' || fog[x][y] >= (un ? 2 : 1);
  for (const [dx, dy] of D) {
    const nx = u.x + dx, ny = u.y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
    const o = unitAt(nx, ny), b = bldAt(nx, ny);
    if (o && o.fac !== u.fac && ok(nx, ny, 1)) targets.push({ e: o, u: 1 });
    else if (!o && b && b.fac !== u.fac && ok(nx, ny, 0)) targets.push({ e: b });
  }
  return { reach, targets };
}
function paths(u) { const r = calcPaths(u); reach = r.reach; targets = r.targets; }

/* ============================================================
   SERANGAN, PASIF, ULTIMATE
   ============================================================ */
function attack(a, t) {
  const e = t.e;
  let d = atk(a), crit = false, opened = false;
  if (hasP(a, 'first') && !a.firstUsed) { d = Math.round(d * 1.6); a.firstUsed = true; opened = true; }
  if (Math.random() < (a.crit || .15)) { d = Math.round(d * 1.5); crit = true; }
  if (t.u && FOR[e.x][e.y]) d = Math.floor(d * .8);
  if (t.u && hasP(e, 'guard')) { d = Math.max(1, Math.floor(d * .75)); say(`${e.name} menahan serangan [${PASSIVES.guard.n}]`, 0, 'psv'); }
  if (!t.u && map[e.x][e.y] === 6) d = Math.floor(d * .85);

  if (t.u) {
    const dealt = hurt(e, d);
    sfx(crit ? 'crit' : 'hit');
    fxText(e.x, e.y, (crit ? 'KRITIS -' : '-') + dealt, crit ? '#ffd34d' : (e.shield > 0 ? '#8fd0ff' : '#fff'));
    say(`${a.name} menyerang ${e.name} (${dealt}${crit ? ', kritis' : ''}${opened ? ', pembuka' : ''}${e.shield > 0 ? ', ditahan perisai' : ''})`);
    if (hasP(a, 'lifesteal')) { const h = Math.max(1, Math.round(dealt * .25)); heal(a, h); fxText(a.x, a.y, '+' + h, '#8f8'); say(`${a.name} memulihkan ${h} HP [${PASSIVES.lifesteal.n}]`, 0, 'psv'); }
    if (hasP(a, 'burn') && e.hp > 0) { e.burn = { d: Math.max(4, Math.round(atk(a) * .1)), t: 2 }; say(`${e.name} terbakar [${PASSIVES.burn.n}]`, 0, 'psv'); }
    if (e.hp > 0) { const c = Math.floor(atk(e) / 2); if (c > 0) { hurt(a, c); fxText(a.x, a.y, '-' + c, '#f99'); say(`${e.name} membalas (${c})`); } }
    else say(`${e.name} tumbang!`, 1);
  } else {
    let d2 = d;
    if (e.armor) d2 = Math.max(1, Math.round(d * (1 - e.armor / 100)));
    e.hp -= d2;
    sfx('hit');
    say(`${a.name} menyerang ${e.type} (${d2}${e.armor ? ', berlapis' : ''})`);
    if (hasP(a, 'lifesteal')) { const h = Math.max(1, Math.round(d * .25)); heal(a, h); fxText(a.x, a.y, '+' + h, '#8f8'); }
    if (e.hp <= 0) {
      e.fac = a.fac; e.hp = e.maxHp / 2;
      sfx('capture');
      say(`${FN[a.fac]} merebut ${e.type}!`, 1);
      if (e.type === 'Markas') { a.ap = 0; return win(a.fac); }
    }
  }
  a.ap = 0;
  units = units.filter(u => u.hp > 0);
  if (sel && !units.includes(sel)) sel = null;
  see(); if (sel) paths(sel); info();
}
function ult() {
  const u = sel; if (!u || !u.c || u.fac !== turn || u.ap < ULT_AP) return;
  if (u.ult === 'Teleport') { tpMode = true; return toast('Pilih petak kosong yang terlihat (radius 6)'); }
  const near = (f, r) => units.filter(o => f(o) && dist(o, u) <= r);
  u.ap -= ULT_AP;
  sfx('ult');
  if (u.ult === 'AoE Heal') near(o => o.fac === u.fac, 3).forEach(o => { heal(o, Math.floor(o.mHp * .4)); fxText(o.x, o.y, '+HP', '#8f8'); });
  else if (u.ult === 'AoE Dmg') near(o => o.fac !== u.fac, 2).forEach(o => { hurt(o, 100); fxText(o.x, o.y, '-100', '#fc6'); });
  else near(o => o.fac === u.fac, 2).forEach(o => { o.ap += 2; fxText(o.x, o.y, '+AP', '#ff8'); });
  units = units.filter(o => o.hp > 0);
  say(`${u.name} memakai Ultimate!`, 1); paths(u); info();
}

/* ============================================================
   SKILL AKTIF — berbeda dari Ultimate: biaya AP lebih kecil,
   punya jeda (cooldown) beberapa giliran, dan tiap karakter
   punya satu skill miliknya sendiri
   ============================================================ */
const nearOf = (u, f, r) => units.filter(o => o.hp > 0 && f(o) && dist(o, u) <= r);
function canUseSkill(u) {
  if (!u || !u.c || !u.skill || !SKILLS[u.skill]) return false;
  const s = SKILLS[u.skill];
  return u.fac === turn && u.hp > 0 && u.skCd <= 0 && u.ap >= s.ap;
}
function useSkill() {
  const u = sel;
  if (!u || !u.c || !u.skill || !SKILLS[u.skill]) return toast('Tidak punya skill aktif');
  if (u.fac !== turn) return;
  const s = SKILLS[u.skill];
  if (u.skCd > 0) return toast(`Skill masih jeda ${u.skCd} giliran`);
  if (u.ap < s.ap) return toast(`AP kurang (${s.ap})`);

  const all = (f, r) => nearOf(u, f, r);
  switch (u.skill) {
    case 'mend': {
      const hit = all(o => o.fac === u.fac, 2);
      if (!hit.length) return toast('Tidak ada sekutu di radius 2');
      u.ap -= s.ap;
      hit.forEach(o => { const h = Math.round(o.mHp * .4); heal(o, h); fxText(o.x, o.y, '+' + h, '#8f8'); });
      say(`${u.name} memakai ${s.n} — ${hit.length} sekutu pulih 40% HP`, 1);
      break;
    }
    case 'pierce': {
      const foes = all(o => o.fac !== u.fac, 3);
      if (!foes.length) return toast('Tidak ada musuh dalam jarak 3');
      const e = foes.sort((a, b) => dist(a, u) - dist(b, u))[0];
      u.ap -= s.ap;
      attack(u, { e, u: 1 });
      say(`${u.name} menembus barisan dengan ${s.n}`, 1);
      units = units.filter(o => o.hp > 0);
      break;
    }
    case 'dash': {
      u.ap -= s.ap; u.ap += 3;
      fxText(u.x, u.y, '+3 AP', '#ff8');
      say(`${u.name} melesat — dapat +3 AP [${s.n}]`, 1);
      break;
    }
    case 'warbanner': {
      const hit = all(o => o.fac === u.fac && o !== u, 2);
      u.ap -= s.ap;
      hit.forEach(o => { o.ap += 1; fxText(o.x, o.y, '+1 AP', '#ff8'); });
      say(`${u.name} mengangkat ${s.n} — ${hit.length} sekutu +1 AP`, 1);
      break;
    }
    case 'bulwark': {
      u.ap -= s.ap; u.shield = 3;
      fxText(u.x, u.y, 'PERISAI', '#8fd0ff');
      say(`${u.name} berlindung di balik ${s.n} — 40% damage ditahan selama 2 giliran`, 1);
      break;
    }
    case 'emberspark': {
      const hit = all(o => o.fac !== u.fac, 2);
      if (!hit.length) return toast('Tidak ada musuh di radius 2');
      u.ap -= s.ap;
      hit.forEach(o => {
        const dealt = hurt(o, 50); fxText(o.x, o.y, '-' + dealt, '#f96');
        if (o.hp > 0) o.burn = { d: Math.max(4, Math.round(atk(u) * .1)), t: 2 };
      });
      say(`${u.name} meledakkan ${s.n} — ${hit.length} musuh terbakar`, 1);
      units = units.filter(o => o.hp > 0);
      break;
    }
    default: return toast('Skill belum terpasang');
  }
  u.skCd = s.cd;                     /* jeda persis sejumlah giliran yang tertulis */
  if (sel && !units.includes(sel)) sel = null;
  see(); if (sel) paths(sel); hud(); info();
}
function upgradeUnit(u) {
  if (coins[turn] < 20) return toast('Koin kurang (20)');
  if (u.lv >= 10) return toast('Level maksimal');
  coins[turn] -= 20; u.lv++; calc(u); u.hp = u.mHp;
  sfx('level');
  say(`${u.name} naik ke Lv.${u.lv}`); hud(); info();
}
const upgrade = () => upgradeUnit(sel);
function split() {
  const u = sel, f = free(u.x, u.y);
  if (u.trps < 2) return toast('Pasukan terlalu sedikit');
  if (!f) return toast('Tidak ada ruang kosong');
  const n = u.trps >> 1, old = u.trps;
  u.trps -= n; calc(u);
  u.hp = u.c ? Math.max(1, u.hp - n * 10) : Math.ceil(u.hp * u.trps / old);
  const m = mk(turn, f.x, f.y, null, n, 1); m.ap = 0; units.push(m);
  say(`${n} pasukan dipisah`); paths(u); info();
}
function recruit(n) {
  const f0 = rc(turn), b = selB;
  if (n === 'max') n = Math.floor(coins[turn] / f0);
  if (n < 1 || coins[turn] < n * f0) return toast('Koin tidak cukup');
  const f = free(b.x, b.y); if (!f) return toast('Sekitar bangunan penuh');
  coins[turn] -= n * f0;
  const m = mk(turn, f.x, f.y, null, n, 1); m.ap = 0; units.push(m);
  say(`Merekrut ${n} pasukan`); hud(); info(b);
}
/* ---------- bangun / upgrade kerajaan & bangunan (pakai koin) ---------- */
const upgCost = b => 20 + (b.lv || 1) * 10;
const BLD_MAX = 5;
function upgBld() {
  const b = selB; if (!b || b.fac !== turn) return;
  if (b.lv >= BLD_MAX) return toast('Level sudah maksimal');
  const c = upgCost(b);
  if (coins[turn] < c) return toast('Koin kurang (' + c + ')');
  coins[turn] -= c;
  b.lv = (b.lv || 1) + 1;
  const hpUp = b.type === 'Markas' ? 300 : 120;
  b.maxHp += hpUp; b.hp = b.maxHp;
  b.inc += b.type === 'Markas' ? 3 : 2;
  if (b.type !== 'Markas' && b.lv >= 3) b.armor = 10;   /* level 3 ke atas jadi benteng berlapis */
  say(`${b.type} dinaikkan ke Lv.${b.lv} — pendapatan +${b.inc} koin`, 1);
  fxText(b.x, b.y, 'LV UP', '#e0a83a');
  hud(); info(b);
}

/* ============================================================
   MULAI PERTEMPURAN
   ============================================================ */
function startBattle() {
  if (!pick.length) return toast('Pilih minimal 1 komandan');
  isPVP = mode === 'PVP'; turn = 'P1'; coins = { P1: 10, P2: 10 }; over = false;
  units = []; blds = []; props = []; fx = []; foeEq = {};
  sel = selB = null; reach = []; targets = []; tpMode = false;
  $('#log').innerHTML = ''; $('#endm').hidden = true;

  genMap();            /* pilih 1 dari 20 medan — biome ikut terisi di sini */
  mkTiles(BIOME);      /* lalu susun tile sesuai biome */
  const b1 = mkBase('P1', 1), b2 = mkBase('P2', COLS - 2);
  buildRoad(b1, b2);
  ensureBridge();
  scatterRuins();
  /* kumpulkan petak layak YANG TERJANGKAU dari markas kita, supaya tak ada
     bangunan terkurung di pulau terpisah; saring bertahap biar tetap dapat 6 */
  const seen = new Set([b1.x + ',' + b1.y]), q = [[b1.x, b1.y]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of D) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen.has(k)) continue;
      const c = map[nx][ny];
      if (c <= 2 || c === 5 || c === 6) { seen.add(k); q.push([nx, ny]); }
    }
  }
  const pool = [];
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++)
    if (map[x][y] <= 2 && !bldAt(x, y) && seen.has(x + ',' + y)) pool.push({ x, y });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.random() * (i + 1) | 0;[pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const far = (s, min) => Math.abs(s.y - b1.y) + Math.abs(s.x - b1.x) > min
    && Math.abs(s.y - b2.y) + Math.abs(s.x - b2.x) > min;
  const taken = [];
  const grab = pred => {
    for (let i = 0; i < pool.length; i++) {
      const s = pool[i]; if (!s || taken.includes(s)) continue;
      if (pred(s)) { taken.push(s); pool[i] = null; return s; }
    }
    return null;
  };
  for (let i = 0; i < 6; i++) {
    const s = grab(v => far(v, 3)) || grab(v => far(v, 2)) || grab(() => true);
    if (!s) break;
    FOR[s.x][s.y] = false; ROAD[s.x][s.y] = false;
    blds.push(i < 3
      ? { type: 'Benteng', fac: 'Neu', x: s.x, y: s.y, maxHp: 300, hp: 300, inc: 3, lv: 1 }
      : { type: 'Desa', fac: 'Neu', x: s.x, y: s.y, maxHp: 200, hp: 200, inc: 2, lv: 1 });
  }
  scatterBanners(b1, b2);

  /* pasukan pemain — memakai senjata yang terpasang di halaman Pasukan */
  pick.forEach(id => { const f = free(b1.x, b1.y) || { x: b1.x + 1, y: b1.y }; units.push(mk('P1', f.x, f.y, charById(id), 10, 1)); });
  /* pasukan lawan — senjata & pasif lawan ikut aktif */
  const team = foes.length ? foes : randomTeam(3, pick);
  team.forEach(id => {
    const c = charById(id); if (!c) return;
    foeEq[id] = foeLoadout(id);
    const f = free(b2.x, b2.y) || { x: b2.x - 1, y: b2.y };
    units.push(mk('P2', f.x, f.y, c, 10, foeScale));
  });

  see(); hud(); info();
  say(`Medan: ${MAPNAME} — ${BIO[BIOME].n}. Hutan & reruntuhan memberi perlindungan, sungai hanya bisa dilewati lewat jembatan.`, 1);
  if (mode === 'STORY' && curCh && +curCh.sort_order === 1) {
    say('TUTORIAL — klik pasukanmu, petak putih = bisa digeser (pakai AP).', 1, 'psv');
    say('TUTORIAL — pilih bangunan milikmu untuk Rekrut pasukan dengan koin.', 1, 'psv');
    say('TUTORIAL — komandan: Naik level (20 koin) dan Ultimate (3 AP).', 1, 'psv');
    say('TUTORIAL — rebut Markas musuh atau habisi semua pasukannya untuk menang.', 1, 'psv');
  }
  if (mode === 'RANKED') say(`Peringkat ${S.rankPts} — AI ${Math.round(aiLevel * 100)}%, statistik lawan x${foeScale.toFixed(2)}.`, 1);
  go('battle');
  setZoom(window.matchMedia('(max-width:760px)').matches);
  focusMap(b1.x, b1.y);
  if (!looping) { looping = true; loop(); }
}
/* senjata lawan: senjata sejatinya selalu dipakai, sisanya senjata biasa */
function foeLoadout(cid) {
  const sig = DB.weapons.filter(w => +w.true_for === +cid);
  const common = DB.weapons.filter(w => !+w.true_for);
  const slots = [];
  if (sig.length) slots.push(+sig[0].id);
  if (aiLevel > .55 || mode === 'RANKED') {
    const shuffled = [...common].sort(() => Math.random() - .5);
    while (slots.length < 3 && shuffled.length) slots.push(+shuffled.shift().id);
  }
  return slots;
}
function loop() { if (!inBattle) { looping = false; return; } draw(); requestAnimationFrame(loop); }

/* ---------- kabut perang ---------- */
function see() {
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) fog[x][y] = isPVP ? 2 : (fog[x][y] === 2 ? 1 : fog[x][y]);
  if (isPVP) return;
  const rv = (a, b, r) => {
    for (let x = Math.max(0, a - r); x <= Math.min(COLS - 1, a + r); x++)
      for (let y = Math.max(0, b - r); y <= Math.min(ROWS - 1, b + r); y++)
        if (Math.abs(a - x) + Math.abs(b - y) <= r) fog[x][y] = 2;
  };
  blds.filter(b => b.fac === 'P1').forEach(b => rv(b.x, b.y, 3));
  units.filter(u => u.fac === 'P1').forEach(u => rv(u.x, u.y, u.c ? 4 : 3));
}

/* ============================================================
   KLIK PETA
   ============================================================ */
cv.onclick = e => {
  if (over || (turn === 'P2' && !isPVP)) return;
  const r = cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) * COLS / r.width), y = Math.floor((e.clientY - r.top) * ROWS / r.height);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
  if (tpMode && sel) {
    tpMode = false;
    if (!unitAt(x, y) && !bldAt(x, y) && walkable(x, y) && map[x][y] !== 6 && dist({ x, y }, sel) <= 6 && vis(x, y)) {
      sel.ap -= ULT_AP; sel.x = x; sel.y = y;
      say(`${sel.name} berteleportasi!`, 1); see(); paths(sel); info();
    }
    return;
  }
  if (sel && sel.fac === turn) {
    const t = targets.find(t => t.e.x === x && t.e.y === y);
    if (t) return attack(sel, t);
    const m = reach.find(r => r.x === x && r.y === y);
    if (m) {
      if (m.merge) {
        const o = m.merge;
        o.trps += sel.trps; calc(o); heal(o, sel.hp);
        units = units.filter(q => q !== sel); say(`${sel.name} bergabung ke ${o.name}`); sel = o;
      } else { sel.x = x; sel.y = y; sel.ap -= m.c; }
      see(); paths(sel); return info();
    }
  }
  const u = unitAt(x, y), b = bldAt(x, y); selB = null;
  if (u && vis(x, y)) { sfx('unit'); sel = u; if (u.fac === turn) paths(u); else { reach = []; targets = []; } info(); focusMap(u.x, u.y); }
  else if (b && fog[x][y] >= 1) { sel = null; selB = b; reach = []; targets = []; info(b); focusMap(b.x, b.y); }
  else { sel = null; reach = []; targets = []; info(); }
};

/* ============================================================
   PANEL INFO
   ============================================================ */
function info(b) {
  const el = $('#info'), u = sel;
  if (u) {
    const mine = u.fac === turn, act = [];
    if (mine && u.c) {
      act.push(`<button class="btn" onclick="upgrade()">Naik level (20 koin)</button>`);
      const s = u.skill && SKILLS[u.skill];
      if (s) {
        const cd = u.skCd > 0, noAp = u.ap < s.ap;
        act.push(`<button class="btn alt" onclick="useSkill()" ${cd || noAp ? 'disabled' : ''}>` +
          `${s.n} (${s.ap} AP${cd ? ' · jeda ' + u.skCd : ''})</button>`);
      }
      act.push(`<button class="btn" onclick="ult()" ${u.ap < ULT_AP ? 'disabled' : ''}>Ultimate: ${u.ult} (${ULT_AP} AP)</button>`);
    }
    if (mine && u.trps > 1) act.push(`<button class="btn alt" onclick="split()">Pisah pasukan</button>`);
    const psv = (u.psv || []).map(k => `<div class="passive on" style="margin-top:4px"><b>${PASSIVES[k].n}${k === u.passive ? ' (pasif bawaan)' : ' (pasif senjata sejati)'}</b><br>${PASSIVES[k].d}</div>`).join('');
    const gear = u.gear && u.gear.length ? `<small>Senjata: ${u.gear.map(esc).join(', ')}</small>` : '';
    const sk = u.skill && SKILLS[u.skill]
      ? `<small>Skill aktif: ${SKILLS[u.skill].n} — ${SKILLS[u.skill].d} (jeda ${u.skCd > 0 ? u.skCd + ' giliran' : 'siap'})</small>` : '';
    el.innerHTML = `<div class="row">${face(u.c, 56, 'P')}<div><h3>${esc(u.name)}</h3><small>${u.c ? 'Komandan Lv.' + u.lv : 'Pasukan'} - ${FN[u.fac]}</small></div></div>
    <dl class="st"><dt>HP</dt><dd>${u.hp}/${u.mHp}</dd><dt>ATK</dt><dd>${atk(u)}</dd>
      <dt>AP</dt><dd>${u.ap}/${u.mAp}</dd><dt>Kritis</dt><dd>${Math.round((u.crit || .15) * 100)}%</dd>
      <dt>Pasukan</dt><dd>${u.trps}</dd></dl>
    ${gear}${u.c ? `<small>Ultimate: ${u.ult} — ${ULTS[u.ult]}</small>` : ''}${sk}${psv}
    ${u.shield > 0 ? `<div class="passive on" style="margin-top:4px"><b>Tameng Taat aktif</b><br>40% damage ditahan, sisa ${u.shield} giliran.</div>` : ''}
    ${u.burn ? `<div class="passive off"><b>Terbakar</b><br>-${u.burn.d} HP selama ${u.burn.t} giliran.</div>` : ''}
    <div class="acts">${act.join('')}</div>`;
  } else if (b) {
    const mine = b.fac === turn;
    const uc = upgCost(b), maxL = 5;
    el.innerHTML = `<h3>${b.type} <small>Lv.${b.lv || 1}</small></h3><small>${FN[b.fac]}</small>
    <dl class="st"><dt>HP</dt><dd>${b.hp}/${b.maxHp}</dd><dt>Pendapatan</dt><dd>+${b.inc} koin/giliran</dd>
      <dt>Diperkuat</dt><dd>${b.armor ? '-' + b.armor + '% dmg' : '—'}</dd></dl>
    ${mine ? `<small>Biaya rekrut: ${rc(turn)} koin/pasukan</small>` : ''}
    ${mine ? `<div class="acts">
      <button class="btn" onclick="recruit(1)">Rekrut 1</button>
      <button class="btn" onclick="recruit(5)">Rekrut 5</button>
      <button class="btn alt" onclick="recruit('max')">Rekrut semampunya</button>
      <button class="btn red" onclick="upgBld()" ${b.lv >= maxL || coins[turn] < uc ? 'disabled' : ''}>
        ${b.lv >= maxL ? 'Level maksimal' : `Bangun / upgrade (${uc} koin)`}</button></div>`
      : `<small>Bangunan ini memberi koin bagi pemiliknya. Rebut untuk mengambil alih pendapatannya.</small>`}`;
  } else el.innerHTML = '<small>Klik unit atau bangunan di petak. Gerak memakai AP, serang memakai sisa AP. Reruntuhan &amp; hutan memberi perlindungan.</small>';
}
function hud() {
  $('#c1').textContent = coins.P1; $('#c2').textContent = isPVP ? coins.P2 : '?';
  const t = $('#turn');
  t.textContent = turn === 'P1' ? 'Giliran Kerajaan' : 'Giliran Kekaisaran';
  t.className = turn;
  $('#end').disabled = turn === 'P2' && !isPVP;
}

/* ============================================================
   GILIRAN
   ============================================================ */
function startTurn(fac) {
  units.filter(u => u.fac === fac).forEach(u => {
    u.ap = u.mAp;
    if (u.skCd > 0) u.skCd--;                       /* jeda skill aktif berkurang */
    if (u.shield > 0) { u.shield--; if (u.shield === 0) say(`${u.name} kehilangan perlindungan Tameng Taat`, 0, 'psv'); }
    /* bara menyala */
    if (u.burn) {
      if (u.burn.t > 0) { hurt(u, u.burn.d); fxText(u.x, u.y, '-' + u.burn.d, '#e8791f'); u.burn.t--; say(`${u.name} terbakar (-${u.burn.d})`, 0, 'psv'); }
      if (u.burn.t <= 0) u.burn = null;
    }
    /* pulih perlahan */
    if (hasP(u, 'regen') && u.hp > 0 && u.hp < u.mHp) {
      const h = Math.max(1, Math.round(u.mHp * .08)); heal(u, h); fxText(u.x, u.y, '+' + h, '#8f8');
      say(`${u.name} memulihkan diri [${PASSIVES.regen.n}]`, 0, 'psv');
    }
    /* paduan suara menyembuhkan sekutu di sekitar */
    if (hasP(u, 'inspire') && u.hp > 0) {
      units.filter(o => o.fac === fac && dist(o, u) <= 2).forEach(o => { const h = Math.round(o.mHp * .1); heal(o, h); fxText(o.x, o.y, '+' + h, '#8f8'); });
      say(`${u.name} membangkitkan semangat [${PASSIVES.inspire.n}]`, 0, 'psv');
    }
    /* markas memulihkan */
    const b = bldAt(u.x, u.y);
    if (b && b.fac === fac && u.hp < u.mHp) { heal(u, Math.floor(u.mHp * .15)); fxText(u.x, u.y, '+HP', '#8f8'); }
  });
  units = units.filter(u => u.hp > 0);
}
function endTurn() {
  if (over) return;
  turn = turn === 'P1' ? 'P2' : 'P1'; tpMode = false;
  blds.filter(b => b.fac === turn).forEach(b => coins[turn] += b.inc);
  startTurn(turn);
  sel = selB = null; reach = []; targets = []; see(); hud(); info();
  say(`Giliran ${FN[turn]}`, 1);
  if (turn === 'P2' && !isPVP) setTimeout(aiTurn, 500);
}

/* ============================================================
   AI — makin tinggi aiLevel, makin banyak taktik yang dipakai:
   menilai serangan (bunuh vs terluka), mencari posisi berlindung,
   memakai ultimate, mundur ke markas, rekrut & naik level
   ============================================================ */
const noise = () => (Math.random() - .5) * (1 - aiLevel) * 90;
const enemiesOf = u => units.filter(o => o.fac !== u.fac);
function dangerAt(x, y, fac) {
  let d = 0;
  units.forEach(o => {
    if (o.fac === fac) return;
    const dd = Math.abs(o.x - x) + Math.abs(o.y - y);
    if (dd <= 3) d += (4 - dd) * (o.c ? 22 : 12) * Math.min(1, o.hp / Math.max(1, o.mHp));
  });
  return d;
}
function scoreTarget(a, e, t) {
  let s = 0;
  const d = Math.max(1, Math.round(atk(a) * (t.u && hasP(e, 'guard') ? .75 : 1)));
  if (t.u) {
    const killed = d >= e.hp;
    s += killed ? 900 + atk(e) * 1.6 : d * .9;
    s += e.c ? 140 : Math.min(70, e.trps * 3);
    s += (1 - e.hp / Math.max(1, e.mHp)) * 90;
    if (!killed) s -= Math.floor(atk(e) / 2) * (a.hp < a.mHp * .45 ? 1.5 : .7);
    if (killed && e.c) s += 200;
    if (hasP(a, 'lifesteal')) s += d * .25;
  } else {
    s += d;
    if (e.type === 'Markas') s += aiLevel > .6 ? 260 : 120;
    else if (e.fac === 'Neu') s += 70;               /* rebut pendapatan */
    if (map[e.x][e.y] === 6) s -= 12;
  }
  return s;
}
function scorePos(u, x, y) {
  let s = 0;
  const foes = enemiesOf(u);
  if (foes.length) {
    const nd = Math.min(...foes.map(f => Math.abs(f.x - x) + Math.abs(f.y - y)));
    s += (13 - nd) * 7;
  }
  if (map[x][y] === 6) s += 26;                       /* reruntuhan = perlindungan */
  else if (FOR[x][y]) s += 14;
  s -= dangerAt(x, y, u.fac) * (aiLevel > .5 ? .9 : .45);
  if (u.hp < u.mHp * .45) {
    const home = blds.find(b => b.type === 'Markas' && b.fac === u.fac);
    if (home) s += (14 - (Math.abs(home.x - x) + Math.abs(home.y - y))) * 6;
    s -= 30;
  }
  if (u.c && u.ap <= 1) s -= 8;
  return s + noise() * .3;
}
function aiSkillIfUseful(u) {
  if (!canUseSkill(u)) return false;
  const s = SKILLS[u.skill];
  const foes = units.filter(o => o.fac !== u.fac && o.hp > 0);
  const allies = units.filter(o => o.fac === u.fac && o.hp > 0);
  const nearF = foes.filter(f => dist(f, u) <= 3), nearA = allies.filter(o => dist(o, u) <= 2);
  const hurt30 = allies.filter(o => o.hp < o.mHp * .7).length;

  switch (u.skill) {
    case 'mend':
      if (hurt30 && u.ap >= s.ap + 1) {
        u.ap -= s.ap;
        nearA.forEach(o => { const h = Math.round(o.mHp * .4); heal(o, h); fxText(o.x, o.y, '+' + h, '#8f8'); });
        say(`${u.name} memakai ${s.n}`, 1); u.skCd = s.cd; return true;
      }
      return false;
    case 'pierce':
      if (nearF.length && u.ap >= s.ap + 1) {
        const e = nearF.sort((a, b) => (a.hp / Math.max(1, a.mHp)) - (b.hp / Math.max(1, b.mHp)))[0];
        u.ap -= s.ap; attack(u, { e, u: 1 });
        say(`${u.name} menembus barisan [${s.n}]`, 1);
        units = units.filter(o => o.hp > 0); u.skCd = s.cd; return true;
      }
      return false;
    case 'dash':
      /* hanya bila masih ada target tapi AP habis */
      if (u.ap <= s.ap && targets.length) {
        u.ap -= s.ap; u.ap += 3; fxText(u.x, u.y, '+3 AP', '#ff8');
        say(`${u.name} melesat [${s.n}]`, 1); u.skCd = s.cd; return true;
      }
      return false;
    case 'warbanner':
      if (nearA.filter(o => o !== u).length >= 1 && u.ap >= s.ap + 1) {
        u.ap -= s.ap;
        nearA.filter(o => o !== u).forEach(o => { o.ap += 1; fxText(o.x, o.y, '+1 AP', '#ff8'); });
        say(`${u.name} mengangkat ${s.n}`, 1); u.skCd = s.cd; return true;
      }
      return false;
    case 'bulwark':
      if (u.shield <= 0 && u.hp < u.mHp * .55 && u.ap >= s.ap) {
        u.ap -= s.ap; u.shield = 3; fxText(u.x, u.y, 'PERISAI', '#8fd0ff');
        say(`${u.name} berlindung [${s.n}]`, 1); u.skCd = s.cd; return true;
      }
      return false;
    case 'emberspark':
      if (nearF.filter(f => dist(f, u) <= 2).length && u.ap >= s.ap + 1) {
        u.ap -= s.ap;
        nearF.filter(f => dist(f, u) <= 2).forEach(o => {
          const dealt = hurt(o, 50); fxText(o.x, o.y, '-' + dealt, '#f96');
          if (o.hp > 0) o.burn = { d: Math.max(4, Math.round(atk(u) * .1)), t: 2 };
        });
        say(`${u.name} meledakkan ${s.n}`, 1);
        units = units.filter(o => o.hp > 0); u.skCd = s.cd; return true;
      }
      return false;
  }
  return false;
}
function aiUltIfUseful(u) {
  if (!u.c || u.ap < ULT_AP) return false;
  const foes = units.filter(o => o.fac !== u.fac), allies = units.filter(o => o.fac === u.fac);
  const nearF = foes.filter(f => dist(f, u) <= 2), nearA = allies.filter(o => dist(o, u) <= 3);
  if (u.ult === 'AoE Dmg' && (nearF.length >= 2 || (nearF.length && Math.min(...nearF.map(f => f.hp)) < 130))) {
    u.ap -= ULT_AP;
    nearF.forEach(o => { hurt(o, 100); fxText(o.x, o.y, '-100', '#fc6'); });
    units = units.filter(o => o.hp > 0); sfx('ult'); say(`${u.name} meledakkan Ultimate!`, 1); return true;
  }
  if (u.ult === 'AoE Heal' && nearA.filter(o => o.hp < o.mHp * .6).length >= 1 && u.hp < u.mHp * .9) {
    u.ap -= ULT_AP;
    nearA.forEach(o => { heal(o, Math.floor(o.mHp * .4)); fxText(o.x, o.y, '+HP', '#8f8'); });
    sfx('ult'); say(`${u.name} memulihkan barisan [Ultimate]`, 1); return true;
  }
  if (u.ult === 'Warcry' && nearA.length >= 2) {
    u.ap -= ULT_AP;
    nearA.forEach(o => { o.ap += 2; fxText(o.x, o.y, '+AP', '#ff8'); });
    sfx('ult'); say(`${u.name} meniupkan pekikan perang!`, 1); return true;
  }
  if (u.ult === 'Teleport') {
    const home = blds.find(b => b.type === 'Markas' && b.fac === u.fac);
    const far = home ? dist(u, home) > 6 : false;
    if (u.hp < u.mHp * .3 && far) {                  /* kabur bila sekarat */
      const spot = [[-2, 0], [2, 0], [0, -2], [0, 2]].map(([dx, dy]) => ({ x: u.x + dx, y: u.y + dy }))
        .find(p => p.x > 0 && p.y >= 0 && p.x < COLS && p.y < ROWS && walkable(p.x, p.y) && !unitAt(p.x, p.y) && !bldAt(p.x, p.y));
      if (spot) { u.ap -= ULT_AP; u.x = spot.x; u.y = spot.y; say(`${u.name} melompat menjauh!`, 1); see(); return true; }
    }
  }
  return false;
}
function aiUnit(u) {
  if (over || !units.includes(u) || u.hp <= 0) return;
  paths(u);
  if (targets.length && u.ap <= 1) {                  /* habiskan AP untuk menyerang */
    const best = targets.map(t => ({ t, s: scoreTarget(u, t.e, t) + noise() })).sort((a, b) => b.s - a.s)[0];
    if (best && best.s > -50) return attack(u, best.t);
  }
  if (aiSkillIfUseful(u) && units.includes(u)) paths(u);
  if (aiUltIfUseful(u) && units.includes(u)) paths(u);

  /* telusuri posisi yang bisa dicapai, lalu pilih kombinasi jalan + serangan terbaik */
  const opts = reach.filter(r => !r.merge);
  let best = null;
  const limit = aiLevel > .6 ? opts : opts.slice(0, 26);
  limit.forEach(m => {
    const ox = u.x, oy = u.y, oap = u.ap;
    u.x = m.x; u.y = m.y; u.ap = oap - m.c;
    const after = calcPaths(u);
    let s = scorePos(u, m.x, m.y);
    if (after.targets.length) {
      const bs = Math.max(...after.targets.map(t => scoreTarget(u, t.e, t)));
      s += bs;
    }
    u.x = ox; u.y = oy; u.ap = oap;
    s += noise();
    if (!best || s > best.s) best = { m, s };
  });
  if (best && (!targets.length || best.s > 40)) {
    u.x = best.m.x; u.y = best.m.y; u.ap = Math.max(0, u.ap - best.m.c);
    see(); paths(u);
  }
  if (targets.length) {
    const at = targets.map(t => ({ t, s: scoreTarget(u, t.e, t) + noise() })).sort((a, b) => b.s - a.s)[0];
    if (at && at.s > 30) return attack(u, at.t);
  }
}
function aiTurn() {
  const mine = units.filter(u => u.fac === 'P2');
  let i = 0;
  const step = () => {
    if (over) return;
    if (i >= mine.length) { aiBuy(); return setTimeout(endTurn, 450); }
    const u = mine[i++];
    if (u.hp > 0 && units.includes(u)) { aiUnit(u); setTimeout(step, 420 - aiLevel * 250); }
    else step();
  };
  step();
}
function aiBuy() {
  if (over) return;
  const mine = blds.filter(b => b.fac === 'P2');
  const home = mine.find(b => b.type === 'Markas');
  if (home) {
    const cost = rc('P2'), n = Math.floor(coins.P2 / cost), f = free(home.x, home.y);
    if (n > 0 && f) { coins.P2 -= n * cost; const m = mk('P2', f.x, f.y, null, n, foeScale); m.ap = 0; units.push(m); say('Kekaisaran merekrut pasukan', 1); }
  }
  if (aiLevel > .45) {
    const cmd = units.filter(u => u.fac === 'P2' && u.c).sort((a, b) => a.lv - b.lv)[0];
    while (cmd && coins.P2 >= 40 && cmd.lv < 10) { coins.P2 -= 20; cmd.lv++; calc(cmd); cmd.hp = cmd.mHp; }
    if (cmd && cmd.lv > 1) say(`${cmd.name} naik ke Lv.${cmd.lv}`, 1);
  }
  /* AI membangun: upgrade bangunan yang paling menguntungkan selama sisanya cukup */
  if (aiLevel > .4) {
    for (let guard = 4; guard-- > 0;) {
      const cands = mine.filter(b => b.lv < BLD_MAX).sort((a, b) => upgCost(a) - upgCost(b));
      const b = cands[0]; if (!b) break;
      const c = upgCost(b);
      if (coins.P2 < c + 40) break;
      coins.P2 -= c; b.lv++;
      const hpUp = b.type === 'Markas' ? 300 : 120;
      b.maxHp += hpUp; b.hp = b.maxHp;
      b.inc += b.type === 'Markas' ? 3 : 2;
      if (b.type !== 'Markas' && b.lv >= 3) b.armor = 10;
      say(`Kekaisaran membangun ${b.type} Lv.${b.lv}`, 1);
    }
  }
  hud();
}

/* ============================================================
   AKHIR PERMAINAN
   ============================================================ */
async function win(f) {
  over = true;
  const p1 = f === 'P1';
  sfx(isPVP || p1 ? 'win' : 'lose');        /* fanfare menang / nada berat kalah */
  const r = await battleResult(p1);
  $('#endT').textContent = isPVP ? FN[f] + ' menang' : (p1 ? 'Kemenangan' : 'Kekalahan');
  let txt = r.msg || '';
  if (r.pts) txt += `  (${r.pts > 0 ? '+' : ''}${r.pts} poin peringkat)`;
  if (r.gems) txt += `  (+${r.gems} permata)`;
  $('#endR').textContent = txt;
  $('#endm').hidden = false;
}
function endBattle() { go(mode === 'STORY' ? 'story' : 'menu'); }

/* ---------- keluar dari perang (tombol X di pojok kanan atas) ---------- */
function exitWar() {
  if (!over && !confirm('Keluar dari pertempuran sekarang? Progres perang ini tidak disimpan.')) return;
  over = true; looping = false; tpMode = false;
  go('menu');
}
/* ---------- zoom peta (penting di HP supaya petak tidak terlalu kecil) ---------- */
let mapZoom = window.matchMedia('(max-width:760px)').matches;
function toggleZoom() { setZoom(!mapZoom, 1); }
function setZoom(v, tell) {
  mapZoom = v;
  cv.classList.toggle('zoom', v);
  const b = $('#bzoom'); if (b) b.classList.toggle('on', v);
  if (tell) toast(v ? 'Peta diperbesar. Geser untuk melihat sisi lain.' : 'Peta dikembalikan ke ukuran normal.');
}
/* geser peta agar unit yang dipilih terlihat */
function focusMap(x, y) {
  const w = cv.parentElement; if (!w || w === cv) return;
  if (!mapZoom) return;
  const sx = (x + .5) / COLS * cv.offsetWidth - w.clientWidth / 2;
  const sy = (y + .5) / ROWS * cv.offsetHeight - w.clientHeight / 2;
  w.scrollTo({ left: Math.max(0, sx), top: Math.max(0, sy), behavior: 'smooth' });
}

/* ============================================================
   TILESET + GAMBAR
   ============================================================ */
const BIO = {
  meadow: { n: 'Padang Rumput', g: '#58863a', a: '#6b9b47', d: '#4a7530', t: '#2f5f2a', t2: '#42813a', w: '#2f6fa8', w2: '#6aa8d8' },
  snow: { n: 'Dataran Salju', g: '#dfe8ee', a: '#f4f8fb', d: '#b9c8d4', t: '#2c4a3f', t2: '#3f6657', w: '#6fa3c4', w2: '#bfe0f0' },
  desert: { n: 'Gurun Berbatu', g: '#d1b36a', a: '#e0c680', d: '#b8994f', t: '#6b7a3a', t2: '#8a9a4a', w: '#3f8f9f', w2: '#7fc4cf' },
  swamp: { n: 'Rawa Berkabut', g: '#4b6b3f', a: '#5d7f4c', d: '#3b5632', t: '#2a4a33', t2: '#386045', w: '#3d5a4a', w2: '#6f9680' },
  autumn: { n: 'Hutan Gugur', g: '#7a7a3a', a: '#8d8d47', d: '#63632e', t: '#a35a1e', t2: '#c47a2c', w: '#3a70a0', w2: '#7fb0da' },
  coast: { n: 'Pantai Karang', g: '#c8c07a', a: '#d8d18f', d: '#b0a866', t: '#2f6b52', t2: '#42866a', w: '#2a7fb8', w2: '#79c2e8' },
  ash: { n: 'Dataran Abu', g: '#6f6a66', a: '#807b76', d: '#57524e', t: '#3a3632', t2: '#4a4540', w: '#4a6a7a', w2: '#8ab0c0' },
  volcanic: { n: 'Kaldera Magma', g: '#4a3a36', a: '#5c4844', d: '#3a2c29', t: '#241c19', t2: '#332825', w: '#d4501e', w2: '#f5a03a' },
};
let BIOME = 'meadow', MAPNAME = '', mapPick = null, FOR = [], ROAD = [];
function rnd(s) { return () => (s = s * 16807 % 2147483647) / 2147483647; }
const TL = document.createElement('canvas'); TL.width = 208; TL.height = 16;
function mkTiles(k) {
  const b = BIO[k]; TL.width = 208;
  const g = TL.getContext('2d'), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, gr = o => P(o, 0, 16, 16, b.g);
  for (let v = 0; v < 3; v++) {
    const r = rnd(v + 9), o = v * 16; gr(o);
    for (let i = 0; i < 16; i++) P(o + (r() * 15 | 0), r() * 15 | 0, 1 + (r() * 2 | 0), 1, r() < .5 ? b.a : b.d);
    if (v === 2) { P(o + 4, 10, 1, 1, '#e8d36a'); P(o + 11, 5, 1, 1, '#e8d36a'); }
  }
  /* 3: pohon/hutan */
  gr(48); P(55, 10, 2, 5, '#5b3a1e'); P(51, 3, 10, 8, b.t); P(53, 1, 6, 3, b.t); P(52, 4, 3, 3, b.t2); P(57, 7, 3, 2, b.t2);
  /* 4: batu */
  gr(64); P(67, 6, 10, 8, '#7b7f86'); P(69, 4, 6, 3, '#8f939a'); P(67, 12, 10, 2, '#585c62');
  /* 5,6: air */
  for (let v = 0; v < 2; v++) { const o = 80 + v * 16; P(o, 0, 16, 16, b.w); for (let i = 0; i < 3; i++) P(o + 2 + ((i * 5 + v * 4) % 9), 3 + i * 5, 5, 1, b.w2); }
  /* 7: markas */
  gr(112); P(114, 4, 12, 11, '#8b8f98'); [114, 120, 124].forEach(x => P(x, 2, 3, 3, '#8b8f98')); P(118, 9, 4, 6, '#3a2a1c'); P(114, 14, 12, 1, '#585c62');
  /* 8: benteng */
  gr(128); P(132, 6, 8, 9, '#a08a64'); P(131, 4, 10, 3, '#a08a64'); P(134, 10, 3, 5, '#3a2a1c'); P(131, 6, 10, 1, '#6b5a3c');
  /* 9: jalan */
  const r9 = rnd(5); P(144, 0, 16, 16, '#a58a5a'); for (let i = 0; i < 12; i++) P(144 + (r9() * 15 | 0), r9() * 15 | 0, 2, 1, r9() < .5 ? '#8d7448' : '#bda073');
  /* 10: desa */
  gr(160); P(163, 8, 10, 7, '#d9c89a'); P(162, 5, 12, 3, '#8a3b2c'); P(164, 3, 8, 2, '#8a3b2c'); P(167, 10, 3, 5, '#3a2a1c'); P(171, 2, 2, 3, '#585c62');
  /* 11: JEMBATAN di atas sungai */
  P(176, 0, 16, 16, b.w);
  P(176, 3, 16, 10, '#8a6a44');
  for (let i = 0; i < 4; i++) P(177 + i * 4, 3, 1, 10, '#5b4225');
  P(176, 1, 16, 2, '#6b4a2a'); P(176, 13, 16, 2, '#6b4a2a');
  P(178, 0, 2, 3, '#6b4a2a'); P(188, 0, 2, 3, '#6b4a2a');
  P(178, 13, 2, 3, '#6b4a2a'); P(188, 13, 2, 3, '#6b4a2a');
  /* 12: RERUNTUHAN */
  gr(192);
  P(194, 6, 4, 10, '#8b8f98'); P(194, 4, 4, 2, '#a4a8af');
  P(203, 3, 4, 13, '#8b8f98'); P(203, 1, 4, 2, '#a4a8af');
  P(199, 10, 4, 6, '#7f838a');
  P(194, 15, 13, 1, '#585c62'); P(198, 13, 5, 2, '#9aa0a7');
  P(201, 7, 3, 1, '#6d7178');
}
mkTiles(BIOME);

const tile = (t, x, y) => cx.drawImage(TL, t * 16, 0, 16, 16, x, y, TS, TS);
function faceImg(img, x, y, w, h) {
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  cx.imageSmoothingEnabled = true;
  cx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, x, y, w, h);
  cx.imageSmoothingEnabled = false;
}
function bar(x, y, p, c) {
  cx.fillStyle = '#1c1410'; cx.fillRect(x + 2, y + TS - 6, TS - 4, 5);
  cx.fillStyle = c; cx.fillRect(x + 3, y + TS - 5, Math.max(0, (TS - 6) * p), 3);
}
function drawBanner(p, now) {
  const px = p.x * TS, py = p.y * TS;
  cx.fillStyle = '#1c1410'; cx.fillRect(px + TS / 2 - 2, py + 6, 4, TS - 8);
  cx.fillStyle = FC[p.fac]; cx.strokeStyle = '#1c1410'; cx.lineWidth = 2;
  const w = 22, wave = Math.sin(now / 320 + p.x) * 3;
  cx.beginPath();
  cx.moveTo(px + TS / 2 + 1, py + 8);
  cx.lineTo(px + TS / 2 + 1 + w, py + 11 + wave);
  cx.lineTo(px + TS / 2 + 1 + w - 7, py + 18);
  cx.lineTo(px + TS / 2 + 1, py + 21);
  cx.closePath(); cx.fill(); cx.stroke();
  cx.fillStyle = '#e0a83a'; cx.fillRect(px + TS / 2 - 4, py + 3, 8, 5);
}
function draw() {
  cx.clearRect(0, 0, 768, 576);
  const now = Date.now();
  for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
    const px = x * TS, py = y * TS, f = fog[x][y];
    if (!f) { cx.fillStyle = '#0b0805'; cx.fillRect(px, py, TS, TS); continue; }
    let t = T2T[map[x][y]];
    if (map[x][y] === 4) t = 5 + (now / 600 & 1);
    tile(t, px, py);
    if (ROAD[x][y] && map[x][y] !== 5) tile(9, px, py);
    else if (FOR[x][y] && map[x][y] <= 2) tile(3, px, py);
    const b = bldAt(x, y);
    if (b) {
      tile(({ Markas: 7, Benteng: 8, Desa: 10 })[b.type], px, py);
      cx.fillStyle = '#1c1410'; cx.fillRect(px + TS - 17, py + 2, 3, 20);
      cx.fillStyle = FC[b.fac]; cx.fillRect(px + TS - 14, py + 3, 11, 9);
      bar(px, py, b.hp / b.maxHp, FC[b.fac]);
      if (b.lv > 1) {                       /* penanda level hasil upgrade */
        cx.fillStyle = '#e0a83a'; cx.fillRect(px + 2, py + 2, 15, 11);
        cx.fillStyle = '#1c1410'; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
        cx.fillText('L' + b.lv, px + 9.5, py + 11); cx.textAlign = 'left';
      }
    }
    if (f === 1) { cx.fillStyle = 'rgba(8,6,4,.55)'; cx.fillRect(px, py, TS, TS); }
  }
  /* panji (dekorasi) */
  props.forEach(p => { if (fog[p.x][p.y] > 0) drawBanner(p, now); });

  if (sel && sel.fac === turn) {
    reach.forEach(r => {
      /* kotak gerak: hitam pekat supaya jelas terlihat di HP maupun desktop */
      cx.fillStyle = r.merge ? 'rgba(120,40,190,.75)' : 'rgba(4,3,2,.82)';
      cx.fillRect(r.x * TS, r.y * TS, TS, TS);
      cx.strokeStyle = 'rgba(224,168,58,.85)'; cx.lineWidth = 2;
      cx.strokeRect(r.x * TS + 1, r.y * TS + 1, TS - 2, TS - 2);
    });
    const a = .5 + .5 * Math.sin(now / 150);
    cx.strokeStyle = `rgba(255,${60 + a * 80 | 0},60,1)`; cx.lineWidth = 3;
    targets.forEach(t => cx.strokeRect(t.e.x * TS + 2, t.e.y * TS + 2, TS - 4, TS - 4));
  }
  if (selB) { cx.strokeStyle = '#e0a83a'; cx.lineWidth = 3; cx.strokeRect(selB.x * TS + 2, selB.y * TS + 2, TS - 4, TS - 4); }
  if (tpMode && sel) {
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++)
      if (walkable(x, y) && map[x][y] !== 6 && !unitAt(x, y) && !bldAt(x, y) && dist({ x, y }, sel) <= 6 && vis(x, y)) {
        cx.fillStyle = 'rgba(120,200,255,.3)'; cx.fillRect(x * TS, y * TS, TS, TS);
      }
  }
  units.forEach(u => {
    if (u.fac === 'P2' && !isPVP && fog[u.x][u.y] !== 2) return;
    const px = u.x * TS, py = u.y * TS;
    if (u === sel) { cx.fillStyle = 'rgba(255,230,120,.4)'; cx.fillRect(px, py, TS, TS); }
    cx.fillStyle = u.c ? '#e0a83a' : '#1c1410'; cx.fillRect(px + 4, py + 3, 40, 38);
    cx.fillStyle = FC[u.fac]; cx.fillRect(px + 6, py + 5, 36, 34);
    const im = u.c && IMG[u.c.id];
    if (im && im.complete && im.naturalWidth) faceImg(im, px + 9, py + 8, 30, 28);
    else {
      cx.fillStyle = '#e6d3a3'; cx.font = '700 20px "Pixelify Sans",sans-serif'; cx.textAlign = 'center';
      cx.fillText(u.c ? u.name[0] : 'P', px + TS / 2, py + 30);
    }
    cx.fillStyle = '#1c1410'; cx.fillRect(px + TS - 21, py + 25, 19, 14);
    cx.fillStyle = '#e6d3a3'; cx.font = '700 12px "Pixelify Sans",sans-serif'; cx.textAlign = 'center';
    cx.fillText(u.trps, px + TS - 11.5, py + 36);
    bar(px, py, u.hp / u.mHp, u.fac === 'P1' ? '#4fbf4f' : '#d25a4a');
    cx.fillStyle = '#ffd34d';
    for (let i = 0; i < Math.min(u.ap, 8); i++) cx.fillRect(px + 3 + i * 5, py, 4, 3);
    if (u.burn) { cx.fillStyle = '#e8791f'; cx.fillRect(px + 4, py + TS - 12, 6, 6); }
    if (u.psv && u.psv.length && u.c) { cx.fillStyle = '#8fd6ff'; cx.fillRect(px + 12, py + TS - 12, 6, 6); }
  });
  fx = fx.filter(f => now - f.born < 900);
  cx.font = '700 18px "Pixelify Sans",sans-serif'; cx.textAlign = 'center';
  cx.lineWidth = 4; cx.strokeStyle = '#1c1410';
  fx.forEach(f => {
    const y = f.y * TS + 12 - (now - f.born) / 28;
    cx.strokeText(f.t, f.x * TS + TS / 2, y);
    cx.fillStyle = f.c; cx.fillText(f.t, f.x * TS + TS / 2, y);
  });
}
