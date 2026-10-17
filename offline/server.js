const TAUTAN_BANTUAN = '';

const K_DATA = 'it_off_data_v1', K_ACC = 'it_off_acc_v1', K_SES = 'it_off_ses_v1';
const VER_DATA = 1;
const BATAS_MUSIK = 2.5 * 1048576, BATAS_GAMBAR = 400 * 1024;

const jEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const klem = (v, a, b) => Math.max(a, Math.min(b, v));
const bersih = s => String(s == null ? '' : s).trim();
const MOMEN_SUARA_SRV = ['tekan', 'gerak', 'kena', 'serang', 'ult', 'skill', 'menang', 'kalah'];
function suaraDari(fd) {
  const o = {};
  MOMEN_SUARA_SRV.forEach(m => { o[m] = String(fd.get('voice_' + m) || '').trim().slice(0, 120); });
  return o;
}
function hashSandi(s) {
  let h = 0x811c9dc5;
  const t = 'iekai-tactics-' + s;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16) + '-' + t.length;
}
const tautanBantuan = () => {
  const t = TAUTAN_BANTUAN || (typeof window !== 'undefined' && window.KONFIG_PHP
    ? String(window.KONFIG_PHP.tautan_bantuan || '') : '');
  return t
    ? ' <a href="' + jEsc(t) + '" target="_blank" rel="noopener">Laporkan masalah di sini</a>'
    : '';
};
const galat = pesan => ({ error: pesan + tautanBantuan() });

function lsBaca(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function lsTulis(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return ''; }
  catch (e) { return 'Penyimpanan browser penuh — hapus unggahan lama di Studio atau pakai berkas yang lebih kecil.'; }
}

function dataAwal() {
  const cerita = (typeof STORY !== 'undefined' ? STORY : globalThis.STORY) || [];
  const acara = (typeof EVENTS !== 'undefined' ? EVENTS : globalThis.EVENTS) || [];
  const skill = (typeof SKILLS_DB !== 'undefined' ? SKILLS_DB : globalThis.SKILLS_DB) || [];
  return {
    v: VER_DATA,
    chars: ALL_CHARS.map(c => Object.assign({}, c)),
    weapons: WEAPONS.map(w => Object.assign({}, w)),
    story: cerita.map(c => Object.assign({}, c)),
    banners: BANNERS.map(b => Object.assign({}, b)),
    events: acara.map(e => Object.assign({}, e)),
    skills: skill.map(x => Object.assign({}, x)),
    coins: [
      { id: 1, nama: 'Kristal', desc: 'Mata uang khusus event. Dikumpulkan dari event, lalu ditukar di Shop event.' }
    ],
    set: {
      music_mode: 'gen', music_track: 'fajar', music_vol: '55', music_file: '',
      splash_on: '0', splash_text: 'Isekai Tactics', splash_sub: 'Perang taktik di tanah para raja', splash_image: ''
    }
  };
}
function db() {
  let d = lsBaca(K_DATA, null);
  if (!d || d.v !== VER_DATA || !Array.isArray(d.chars) || !d.chars.length) {
    d = dataAwal();
    lsTulis(K_DATA, d);
  }
  if (!Array.isArray(d.events)) {
    d.events = ((typeof EVENTS !== 'undefined' ? EVENTS : globalThis.EVENTS) || []).map(e => Object.assign({}, e));
    lsTulis(K_DATA, d);
  }
  if (!Array.isArray(d.coins)) {
    d.coins = (dataAwal().coins || []).map(c => Object.assign({}, c));
    lsTulis(K_DATA, d);
  }
  if (!Array.isArray(d.skills) || !d.skills.length) {
    d.skills = ((typeof SKILLS_DB !== 'undefined' ? SKILLS_DB : globalThis.SKILLS_DB) || []).map(x => Object.assign({}, x));
    lsTulis(K_DATA, d);
  }
  let wUbah = false;
  (d.weapons || []).forEach(w => {
    if (!('skill_buff' in w)) { w.skill_buff = 0; wUbah = true; }
    if (typeof w.status !== 'string') { w.status = ''; wUbah = true; }
    if (!('true_for' in w)) { w.true_for = 0; wUbah = true; }
  });
  (d.skills || []).forEach(s => {
    if (typeof s.kategori !== 'string') { s.kategori = ''; wUbah = true; }
    if (typeof s.status !== 'string') { s.status = ''; wUbah = true; }
  });
  (d.banners || []).forEach(b => {
    if (typeof b.time_text !== 'string') { b.time_text = ''; wUbah = true; }
    if (!('pity' in b)) { b.pity = 1; wUbah = true; }
    if (typeof b.end_at !== 'string') { b.end_at = ''; wUbah = true; }
  });
  if (wUbah) lsTulis(K_DATA, d);
  return d;
}
const dbSimpan = d => lsTulis(K_DATA, d);

function daftarAkun() { return lsBaca(K_ACC, null) || {}; }
const akunSimpan = a => lsTulis(K_ACC, a);
const sesi = () => String(lsBaca(K_SES, '') || '');
const sesiSet = u => lsTulis(K_SES, u || '');

function profilBaru(extra) {
  return Object.assign({
    gems: 1000, pity_char: 0, pity_weap: 0, pity4: 0, stardust: 0, starglitter: 0,
    wish_log: [], rank_pts: 1000, wins: 0, losses: 0,
    story_done: 0, side_done: 0, events_done: [], owned: [], weapons: [], equips: {},
    dup_c: {}, dup_w: {}, bio: '', photo: 0, last_used: [], coins: {},
    gold: 5000, char_lv: {}, char_star: {}
  }, extra || {});
}
function normProfil(p) {
  if (!p || typeof p !== 'object') return false;
  let ubah = false;
  if (typeof p.stardust !== 'number') { p.stardust = 0; ubah = true; }
  if (typeof p.starglitter !== 'number') { p.starglitter = 0; ubah = true; }
  if (typeof p.pity4 !== 'number') { p.pity4 = 0; ubah = true; }
  if (typeof p.side_done !== 'number') { p.side_done = 0; ubah = true; }
  if (!Array.isArray(p.events_done)) { p.events_done = []; ubah = true; }
  if (!Array.isArray(p.wish_log)) { p.wish_log = []; ubah = true; }
  if (!Array.isArray(p.last_used)) { p.last_used = []; ubah = true; }
  if (!p.dup_c || typeof p.dup_c !== 'object') { p.dup_c = {}; ubah = true; }
  if (!p.dup_w || typeof p.dup_w !== 'object') { p.dup_w = {}; ubah = true; }
  if (!p.coins || typeof p.coins !== 'object' || Array.isArray(p.coins)) { p.coins = {}; ubah = true; }
  if (typeof p.gold !== 'number') { p.gold = 5000; ubah = true; }
  if (!p.char_lv || typeof p.char_lv !== 'object' || Array.isArray(p.char_lv)) { p.char_lv = {}; ubah = true; }
  if (!p.char_star || typeof p.char_star !== 'object' || Array.isArray(p.char_star)) { p.char_star = {}; ubah = true; }
  return ubah;
}
function siapkanAkun() {
  const a = daftarAkun();
  let ubah = false;
  if (!a.admin) {
    a.admin = { pass: hashSandi('admin'), role: 'admin', p: profilBaru({ gems: 1200, owned: [1, 2, 3], weapons: [7, 8] }) };
    ubah = true;
  }
  Object.keys(a).forEach(k => { if (a[k] && normProfil(a[k].p)) ubah = true; });
  if (ubah) akunSimpan(a);
  return a;
}
function me() {
  const a = siapkanAkun(), u = sesi();
  if (!u || !a[u]) return { admin: false, user: null, profile: null };
  return { admin: a[u].role === 'admin', user: u, profile: a[u].p };
}
function idBarikut(arr) { return arr.reduce((m, x) => Math.max(m, +x.id || 0), 0) + 1; }
function namaItem(arr, id) { const x = (arr || []).find(y => +y.id === +id); return x ? x.name : ('item #' + id); }
function posBabData(d, ch) {
  const tipe = ch.tipe === 'samping' ? 'samping' : 'utama';
  const arr = d.story.filter(x => (x.tipe || 'utama') === tipe).slice()
    .sort((x, y) => (+x.sort_order || 0) - (+y.sort_order || 0) || (+x.id || 0) - (+y.id || 0));
  return arr.findIndex(x => +x.id === +ch.id) + 1;
}
const urut = (arr, k) => arr.slice().sort((x, y) => (+x[k] || 0) - (+y[k] || 0) || (+x.id || 0) - (+y.id || 0));
const coinCari = (d, id) => (d.coins || []).find(c => +c.id === +id);
const namaKoin = (d, id) => { const c = coinCari(d, id); return c ? String(c.nama || 'Mata uang') : ('Mata uang #' + id); };

function acakBiji(biji) {
  return function () {
    biji = biji + 0x6D2B79F5 | 0;
    let t = Math.imul(biji ^ biji >>> 15, 1 | biji);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const NAMA_DEPAN = ['Raden', 'Sutan', 'Ki', 'Baskara', 'Widuri', 'Grimbold', 'Hana', 'Rendra', 'Oden', 'Kirana', 'Bagas', 'Dewi', 'Fajar', 'Guntur', 'Hilman', 'Indri', 'Jaka', 'Kusuma', 'Luhur', 'Mahesa', 'Nala', 'Padma', 'Ratih', 'Samar', 'Tirta', 'Udan', 'Vino', 'Wulan', 'Yuda', 'Zahra', 'Aldi', 'Bayu', 'Citra', 'Danang', 'Elang', 'Fitri', 'Galih', 'Hendra', 'Intan', 'Jayus', 'Kala', 'Laras', 'Mega', 'Nyx', 'Oscar', 'Prabu', 'Raka', 'Sekar', 'Teguh', 'Wisnu'];
const NAMA_BELAKANG = ['Sang Penakluk', 'Tangan Besi', 'Penjaga Menara', 'Penjelajah Rimba', 'Pemanah Muda', 'Sersan Luhur', 'Bayangan Senja', 'Mahkota Bara', 'Taring Naga', 'Perisai Kota', 'Penyihir Tua', 'Kilat Rimba', 'Bintang Utara', 'Serigala Malam', 'Panah Emas', 'Juru Baja', 'Sang Diam', 'Anak Sungai', 'Duke Muda', 'Pendekar Sunyi'];
const SAINGAN_TETAP = [
  ['Ravik Agung Sang Penakluk', 2410, 71, 12], ['Widuri Mahkota Bara', 2260, 64, 14],
  ['Grimbold Tangan Besi', 2120, 58, 15], ['Sersan Luhur Agung', 1985, 51, 16],
  ['Mira Penjaga Menara', 1842, 45, 17], ['Bayangan Senja', 1700, 40, 18],
  ['Oden Penjelajah Rimba', 1568, 34, 19], ['Kapten Rendra', 1430, 29, 20],
  ['Pemanah Muda Hana', 1295, 23, 21], ['Rekrut Baru Baskara', 1160, 15, 22]
];
function sainganAcak(jumlah) {
  const r = acakBiji(20261010), out = [], pakai = {};
  while (out.length < jumlah) {
    const n = NAMA_DEPAN[(r() * NAMA_DEPAN.length) | 0] + ' ' + NAMA_BELAKANG[(r() * NAMA_BELAKANG.length) | 0];
    if (pakai[n]) continue;
    pakai[n] = 1;
    const pts = Math.round(520 + r() * 620);
    const menang = Math.max(0, Math.round((pts - 500) / 30 + r() * 6));
    out.push({ name: n, pts, wins: menang, losses: Math.max(1, Math.round(menang * .6 + r() * 4)), npc: 1 });
  }
  return out;
}
const BIO_NPC = [
  'Selalu siap menutup celah pertahanan.',
  'Mengumpulkan bintang dari langit tanah asal.',
  'Suka menantang siapa pun di duel biasa.',
  'Taktik lambat tapi pasti menghabisi markas.',
  'Mengumpulkan senjata sejati untuk pahlawan favoritnya.',
  'Hanya muncul saat peringkat mulai panas.',
  'Percaya satu komandan yang tepat mengubah perang.'
];
function profilStat(p) { return {
  wins: +p.wins || 0, losses: +p.losses || 0, rank_pts: +p.rank_pts || 1000,
  story_done: +p.story_done || 0, dup_c: p.dup_c || {}, equips: p.equips || {}
  }; }
function levelDari(s) { return 1 + Math.floor((s.wins + s.losses) / 3) + Math.floor(s.rank_pts / 400) + Math.floor(s.story_done / 3); }
function batasPasukanDari(c, s) {
  const t = +c && +c.rarity >= 5 ? 3 : +c && +c.rarity === 4 ? 2 : 1;
  const awal = c && +c.trps0 > 0 ? klem(Math.round(+c.trps0), 100, 1000000) : 100 * Math.pow(10, t - 1);
  const akhir = c && +c.trps1 > 0 ? klem(Math.round(+c.trps1), awal, 1000000) : 1000000;
  const lvl = Math.max(1, levelDari(s));
  const r = Math.min(1, (lvl - 1) / 100);
  return Math.max(awal, Math.min(akhir, Math.round(awal + (akhir - awal) * r)));
}
function biayaLvKarakter(c, lv) {
  return Math.round((60 + lv * 14) * (1 + Math.max(0, (+c.rarity || 3) - 3) * 0.4));
}
function biayaBintangSrv(c, st) {
  return Math.round(400 * st * (1 + Math.max(0, (+c.rarity || 3) - 3) * 0.5));
}
const bintangAwalSrv = c => klem(+c.star0 || (+c.rarity || 3), 1, klem(+c.max_star || 10, 1, 10));
const levelMaks = c => klem(+c.max_level || 100, 1, 100);
const bintangMaks = c => klem(+c.max_star || 10, 1, 10);
function cpKarakterDari(d, c, s) {
  const k = 1 + ((s.dup_c && s.dup_c[+c.id]) || 0) / 100;
  const eq = (s.equips && s.equips[+c.id]) || [];
  let hp = Math.round((+c.hp || 0) * k), atk = Math.round((+c.atk || 0) * k), crit = 0;
  (Array.isArray(eq) ? eq : []).forEach(wid => {
    const w = (d.weapons || []).find(x => +x.id === +wid);
    if (!w) return;
    hp += +w.w_hp || 0; atk += +w.w_atk || 0; crit += +w.w_crit || 0;
  });
  return Math.round((hp + atk + (+c.ap || 0) + crit + batasPasukanDari(c, s)) / 5);
}
function cpTimDari(d, ids, s) {
  return (ids || []).reduce((n, id) => {
    const c = (d.chars || []).find(x => +x.id === +id);
    return n + (c ? cpKarakterDari(d, c, s) : 0);
  }, 0);
}
function hashNama(n) {
  let h = 2166136261;
  for (let i = 0; i < n.length; i++) { h ^= n.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function lcg(biji) { let s = biji >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
function npcProfil(d, nama) {
  const r = lcg(hashNama(nama));
  const ids = (d.chars || []).map(c => +c.id);
  const n = Math.min(10, Math.max(3, 3 + Math.floor(r() * 8)));
  const dipakai = [];
  for (let i = 0; i < n && ids.length; i++) dipakai.push(ids.splice(Math.floor(r() * ids.length), 1)[0]);
  return {
    bio: BIO_NPC[Math.floor(r() * BIO_NPC.length)],
    photo: dipakai[0] || 0,
    last_used: dipakai
  };
}
function daftarPeringkat(d) {
  const a = siapkanAkun();
  const list = [];
  SAINGAN_TETAP.forEach(t => list.push({ name: t[0], pts: t[1], wins: t[2], losses: t[3], npc: 1 }));
  Object.keys(a).forEach(u => list.push({ name: u, pts: +a[u].p.rank_pts || 0, wins: +a[u].p.wins || 0, losses: +a[u].p.losses || 0, npc: 0 }));
  const sisa = Math.max(0, 1000 - list.length);
  sainganAcak(sisa).forEach(d => list.push(d));
  list.sort((x, y) => y.pts - x.pts || y.wins - x.wins);
  return list;
}
function leaderboard() {
  const nama = sesi();
  const list = daftarPeringkat(db());
  let peringkat = 0;
  for (let i = 0; i < list.length; i++) if (list[i].name === nama && !list[i].npc) { peringkat = i + 1; break; }
  return { list: list.slice(0, 10), me: nama ? { name: nama, rank: peringkat } : null, total: list.length };
}
function profilPublik(d, ent) {
  const a = siapkanAkun();
  const akun = a[ent.name];
  if (akun && akun.role) {
    const p = akun.p || {};
    let last = Array.isArray(p.last_used) ? p.last_used.map(Number).filter(id => d.chars.some(c => +c.id === id)) : [];
    if (!last.length) last = (p.owned || []).map(Number).filter(id => d.chars.some(c => +c.id === id)).slice(0, 10);
    return {
      bio: String(p.bio || ''), photo: +p.photo || 0, last_used: last.slice(0, 10),
      stat: profilStat(p), pemilik: 1
    };
  }
  const n = npcProfil(d, ent.name);
  return {
    bio: n.bio, photo: n.photo, last_used: n.last_used,
    stat: profilStat({ wins: ent.wins, losses: ent.losses, rank_pts: ent.pts, story_done: 0 }),
    pemilik: 0
  };
}

function keDataUrl(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('Gagal membaca berkas.'));
    r.readAsDataURL(f);
  });
}
async function mediaDari(fd, kunci, lama, batas, label) {
  const f = fd.get(kunci);
  if (!(f instanceof File) || !f.size) return lama || '';
  if (f.size > batas) throw new Error(label + ' sekitar ' + (Math.round(f.size / 1048576 * 10) / 10) +
    ' MB — batas mode offline ' + (Math.round(batas / 1048576 * 10) / 10) +
    ' MB karena disimpan langsung di browser. Kompres dulu berkasnya.');
  return keDataUrl(f);
}
const gambarDari = (fd, kunci, lama) => mediaDari(fd, kunci, lama, BATAS_GAMBAR, 'Gambar');

const JENIS_ULT = ['AoE Heal', 'AoE Dmg', 'Warcry', 'Teleport'];
const JENIS_PASSIVE = ['', 'lifesteal', 'burn', 'guard', 'crit_up', 'inspire', 'fury', 'haste', 'first', 'vigor', 'regen'];
const JENIS_WKIND = ['sword', 'dagger', 'axe', 'spear', 'bow', 'staff', 'hammer', 'harp'];
const JENIS_WPASSIVE = ['', 'lifesteal', 'burn', 'guard', 'crit_up', 'inspire', 'fury', 'haste', 'first'];
const JENIS_STATUS = ['', 'bakar', 'racun', 'perisai', 'marah', 'tahan', 'lambat', 'lemah', 'beku'];
const JENIS_STATUS_MULTI = JENIS_STATUS.slice(1);
const JENIS_KATEGORI = ['ultimate', 'aktif', 'pasif'];
const MAKS_TRUE = 3;
const jenis = (arr, v, def) => arr.indexOf(v) >= 0 ? v : def;
const daftarId = (fd, k) => (fd.getAll(k + '[]').length ? fd.getAll(k + '[]') : fd.getAll(k)).map(Number).filter(Boolean);
const daftarTeks = (fd, k, arr) => {
  const semua = fd.getAll(k + '[]').length ? fd.getAll(k + '[]') : fd.getAll(k);
  const bersih = [];
  semua.forEach(v => String(v || '').split(',').forEach(x => {
    const t = String(x).trim();
    if (t && arr.indexOf(t) >= 0 && bersih.indexOf(t) < 0) bersih.push(t);
  }));
  return bersih;
};

function bacaShop(fd) {
  const amb = k => (fd.getAll(k + '[]').length ? fd.getAll(k + '[]') : fd.getAll(k));
  const jud = amb('shop_judul').map(String);
  const tipe = amb('shop_tipe').map(String);
  const jml = amb('shop_jumlah').map(v => parseInt(v, 10) || 0);
  const itm = amb('shop_item').map(v => parseInt(v, 10) || 0);
  const hrg = amb('shop_harga').map(v => parseInt(v, 10) || 0);
  const item = [];
  for (let i = 0; i < tipe.length && item.length < 20; i++) {
    const t = tipe[i], judul = bersih(jud[i]).slice(0, 60), harga = klem(hrg[i] || 0, 0, 99999999);
    if (t === 'hero' || t === 'senjata') {
      if (!itm[i]) continue;
      item.push({ judul: judul, tipe: t, id: klem(itm[i], 1, 999999), jumlah: 0, harga: harga });
    } else if (t === 'matauang') {
      if (!itm[i] || !jml[i]) continue;
      item.push({ judul: judul, tipe: t, id: klem(itm[i], 1, 999999), jumlah: klem(jml[i], 0, 9999999), harga: harga });
    } else if (t === 'uang') {
      if (!jml[i]) continue;
      item.push({ judul: judul, tipe: 'uang', id: 0, jumlah: klem(jml[i], 0, 9999999), harga: harga });
    }
  }
  return { aktif: fd.get('shop_aktif') ? 1 : 0, mata: parseInt(fd.get('shop_mata'), 10) || 0, item: item };
}

async function SERVER(a, body) {
  const d = db();
  const fd = body instanceof FormData ? body : new FormData();

  if (a === 'chars') return urut(d.chars, 'id');
  if (a === 'weapons') return urut(d.weapons, 'rarity');
  if (a === 'story') return urut(d.story, 'sort_order');
  if (a === 'skills') return (d.skills || []).map(x => ({
    id: x.id, name: x.name, desc: x.desc, tipe: x.tipe, sasaran: x.sasaran,
    jangkau: +x.jangkau || 0, ap: +x.ap || 1, cd: +x.cd || 1, kategori: x.kategori || '',
    rumus: x.rumus || '', status: x.status || '', durasi: +x.durasi || 0, apNilai: +x.apNilai || 0
  }));
  if (a === 'events') return (d.events || []).map(e => ({
    id: +e.id, name: e.name, desc: e.desc, syarat: +e.syarat || 0,
    aktif: +e.aktif === 1 ? 1 : 0, skenario: e.skenario, hadiah: e.hadiah || [],
    shop: e.shop && typeof e.shop === 'object' ? e.shop : { aktif: 0, mata: 0, item: [] }
  }));
  if (a === 'coins') return (d.coins || []).map(c => ({ id: +c.id, nama: c.nama, desc: c.desc || '' }));
  if (a === 'banners') return urut(d.banners, 'id');
  if (a === 'settings') return Object.assign({}, d.set);
  if (a === 'me') return me();
  if (a === 'leaderboard') return leaderboard();

  if (a === 'profil') {
    const nama = bersih(fd.get('name') || '');
    if (!nama) return galat('Nama pemain wajib diisi.');
    const semu = daftarPeringkat(d);
    const idx = semu.findIndex(x => x.name === nama);
    if (idx < 0) return galat('Pemain tidak ditemukan.');
    const ent = semu[idx];
    const pr = profilPublik(d, ent);
    return {
      name: ent.name, rank: idx + 1, pts: ent.pts, wins: ent.wins, losses: ent.losses,
      npc: ent.npc ? 1 : 0, bio: pr.bio, photo: pr.photo, last_used: pr.last_used,
      level: levelDari(pr.stat), cp: cpTimDari(d, pr.last_used, pr.stat),
      pemilik: pr.pemilik
    };
  }

  if (a === 'register') {
    const nama = bersih(fd.get('username')), sandi = String(fd.get('password') || '');
    if (!/^[A-Za-z0-9_]{3,30}$/.test(nama)) return galat('Username 3-30 huruf/angka/underscore.');
    if (sandi.length < 6) return galat('Sandi minimal 6 karakter.');
    const akun = siapkanAkun();
    if (akun[nama]) return galat('Username sudah dipakai.');
    const adaAdmin = Object.keys(akun).some(k => akun[k].role === 'admin');
    const p = profilBaru();
    urut(d.chars, 'id').slice(0, 3).forEach(c => p.owned.push(+c.id));
    d.weapons.filter(w => !+w.true_for).sort((x, y) => x.id - y.id).slice(0, 2).forEach(w => p.weapons.push(+w.id));
    let tamu = null;
    try { tamu = JSON.parse(String(fd.get('guest') || '')); } catch (e) { tamu = null; }
    if (tamu && typeof tamu === 'object') {
      (tamu.own || []).slice(0, 200).forEach(id => {
        id = +id;
        if (d.chars.some(c => +c.id === id) && p.owned.indexOf(id) < 0) p.owned.push(id);
      });
      (tamu.ownW || []).slice(0, 200).forEach(id => {
        id = +id;
        if (d.weapons.some(w => +w.id === id) && p.weapons.indexOf(id) < 0) p.weapons.push(id);
      });
      Object.keys(tamu.eq || {}).forEach(cid => {
        (tamu.eq[cid] || []).forEach((wid, i) => {
          wid = +wid;
          if (!wid || p.weapons.indexOf(wid) < 0) return;
          const dipakai = Object.keys(p.equips).some(k => (p.equips[k] || []).indexOf(wid) >= 0);
          if (dipakai) return;
          p.equips[cid] = p.equips[cid] || [0, 0, 0];
          p.equips[cid][klem(i, 0, 2)] = wid;
        });
      });
      if (tamu.gem != null) p.gems = klem(parseInt(tamu.gem, 10) || 0, 0, 999999);
      if (tamu.storyDone != null) p.story_done = parseInt(tamu.storyDone, 10) || 0;
    }
    akun[nama] = { pass: hashSandi(sandi), role: adaAdmin ? 'player' : 'admin', p };
    const e1 = akunSimpan(akun); if (e1) return galat(e1);
    const e2 = sesiSet(nama); if (e2) return galat(e2);
    return me();
  }
  if (a === 'login') {
    const nama = bersih(fd.get('username')), sandi = String(fd.get('password') || '');
    const akun = siapkanAkun();
    if (!akun[nama] || akun[nama].pass !== hashSandi(sandi)) return galat('Username atau sandi salah.');
    const e = sesiSet(nama); if (e) return galat(e);
    return me();
  }
  if (a === 'logout') { const e = sesiSet(''); return e ? galat(e) : { ok: 1 }; }

  const akun = siapkanAkun();
  const u = akun[sesi()];
  if (!u) return galat('Silakan masuk dulu agar progres tersimpan di akun.');

  if (a === 'event_claim') {
    const ev = (d.events || []).find(x => +x.id === +fd.get('id'));
    if (!ev) return galat('Event tidak ditemukan.');
    if (+ev.aktif !== 1) return galat('Event ini sudah berakhir.');
    if (u.role !== 'admin' && (+ev.syarat || 0) > (+u.p.story_done || 0))
      return galat('Selesaikan bab cerita utama ke-' + (+ev.syarat || 0) + ' dulu untuk membuka event ini.');
    const p = u.p;
    p.events_done = Array.isArray(p.events_done) ? p.events_done : [];
    if (p.events_done.map(Number).includes(+ev.id)) return galat('Hadiah event ini sudah pernah kamu klaim.');
    const daftar = ev.hadiah || [];
    const rincian = [];
    daftar.forEach(h => {
      const t = h.tipe;
      if (t === 'uang') {
        const n = klem(+h.jumlah || 0, 0, 9999999);
        p.gems = Math.max(0, (+p.gems || 0) + n);
        rincian.push(n + ' permata');
      } else if (t === 'matauang') {
        const cid = +h.id || 0;
        if (cid && coinCari(d, cid)) {
          const n = klem(+h.jumlah || 0, 0, 9999999);
          p.coins = p.coins || {};
          p.coins[cid] = Math.max(0, (+p.coins[cid] || 0) + n);
          rincian.push(n + ' ' + namaKoin(d, cid));
        }
      } else if (t === 'hero') {
        const id = +h.id || 0;
        if (id && !p.owned.map(Number).includes(id)) { p.owned.push(id); rincian.push(namaItem(d.chars, id)); }
      } else if (t === 'senjata') {
        const id = +h.id || 0;
        if (id && !p.weapons.map(Number).includes(id)) { p.weapons.push(id); rincian.push(namaItem(d.weapons, id)); }
      }
    });
    p.events_done.push(+ev.id);
    const e = akunSimpan(akun); if (e) return galat(e);
    return { msg: 'Event selesai. Hadiah: ' + (rincian.join(', ') || 'tanpa tambahan') + '.', profile: p };
  }

  if (a === 'char_level') {
    const cid = +fd.get('id') || 0;
    const tipe = fd.get('tipe') === 'star' ? 'star' : 'level';
    const c = d.chars.find(x => +x.id === cid);
    if (!c) return galat('Karakter tidak ditemukan.');
    if (u.role !== 'admin' && !u.p.owned.map(Number).includes(cid)) return galat('Karakter itu belum kamu miliki.');
    u.p.char_lv = u.p.char_lv || {};
    u.p.char_star = u.p.char_star || {};
    const maksLv = levelMaks(c), maksSt = bintangMaks(c), st0 = bintangAwalSrv(c);
    if (tipe === 'star') {
      const st = klem(+u.p.char_star[cid] || st0, st0, maksSt);
      if (st >= maksSt) return galat('Bintang sudah mencapai batas maksimal (' + maksSt + ').');
      const cost = biayaBintangSrv(c, st);
      if ((+u.p.gold || 0) < cost) return galat('Gold tidak cukup untuk menaikkan bintang. Butuh ' + cost + ' gold.');
      u.p.gold = (+u.p.gold || 0) - cost;
      u.p.char_star[cid] = st + 1;
      const e1 = akunSimpan(akun); if (e1) return galat(e1);
      return { msg: c.name + ' naik ke bintang ' + (st + 1) + '.', level: +u.p.char_lv[cid] || 1, star: st + 1, profile: u.p };
    }
    const lv = klem(+u.p.char_lv[cid] || 1, 1, maksLv);
    if (lv >= maksLv) return galat('Sudah mencapai level maksimal (' + maksLv + ').');
    const cost = biayaLvKarakter(c, lv);
    if ((+u.p.gold || 0) < cost) return galat('Gold tidak cukup untuk naik level. Butuh ' + cost + ' gold.');
    u.p.gold = (+u.p.gold || 0) - cost;
    u.p.char_lv[cid] = lv + 1;
    const e2 = akunSimpan(akun); if (e2) return galat(e2);
    return { msg: c.name + ' naik ke level ' + (lv + 1) + '.', level: lv + 1, star: +u.p.char_star[cid] || st0, profile: u.p };
  }

  if (a === 'profile_save') {
    const p = u.p;
    if (fd.has('bio')) p.bio = String(fd.get('bio') || '').slice(0, 160);
    if (fd.has('photo')) {
      const foto = +fd.get('photo') || 0;
      if (foto && !d.chars.some(c => +c.id === foto)) return galat('Karakter untuk foto profil tidak ditemukan.');
      if (foto && u.role !== 'admin' && p.owned.indexOf(foto) < 0) return galat('Kamu belum memiliki karakter itu.');
      p.photo = foto;
    }
    if (fd.has('last_used')) {
      const ids = String(fd.get('last_used') || '').split(',').map(Number).filter(id => d.chars.some(c => +c.id === id));
      p.last_used = ids.slice(0, 10);
    }
    const e = akunSimpan(akun); if (e) return galat(e);
    return { ok: 1, profile: p };
  }

  if (a === 'pull') {
    const n = klem(parseInt(fd.get('n'), 10) || 1, 1, 10);
    const b = d.banners.find(x => +x.id === +fd.get('banner_id'));
    if (!b) return galat('Banner tidak ditemukan.');
    const cost = GACHA.biaya(n);
    if ((+u.p.gems || 0) < cost) return galat('Permata tidak cukup.');
    const senjata = b.kind === 'weapon';
    const items = senjata ? d.weapons : d.chars;
    const kunciMilik = senjata ? 'weapons' : 'owned';
    const kunciPity = senjata ? 'pity_weap' : 'pity_char';
    if (!items.length) return galat('Belum ada ' + (senjata ? 'senjata' : 'karakter') + ' di data.');
    const r = GACHA.tarik({
      banner: b, items: items, n: n,
      milik: u.p[kunciMilik],
      pity5: u.p[kunciPity], pity4: u.p.pity4
    });
    if (!r.results.length) return galat('Pemanggilan gagal, coba lagi.');
    u.p[kunciPity] = r.pity5;
    u.p.pity4 = r.pity4;
    u.p.gems = (+u.p.gems || 0) - cost;
    u.p.stardust = (+u.p.stardust || 0) + r.dust;
    u.p.starglitter = (+u.p.starglitter || 0) + r.glit;
    u.p.wish_log = GACHA.catat(r.riwayat, u.p.wish_log);
    r.results.forEach(x => {
      if (!x.dup) return;
      const bag = x.weapon ? (u.p.dup_w = u.p.dup_w || {}) : (u.p.dup_c = u.p.dup_c || {});
      bag[x.id] = (bag[x.id] || 0) + 1;
    });
    const e = akunSimpan(akun); if (e) return galat(e);
    return { results: r.results, cost: cost, refund: r.refund, dust: r.dust, glit: r.glit, profile: u.p };
  }

  if (a === 'shop') {
    const t = GACHA.tukar(String(fd.get('jenis') || ''), parseInt(fd.get('n'), 10) || 0);
    if (!t) return galat('Jumlah penukaran tidak valid.');
    const kunci = t.jenis === 'glit' ? 'starglitter' : 'stardust';
    if ((+u.p[kunci] || 0) < t.sumber) return galat(t.nama + ' tidak cukup.');
    u.p[kunci] = (+u.p[kunci] || 0) - t.sumber;
    u.p.gems = (+u.p.gems || 0) + t.hasil;
    const e = akunSimpan(akun); if (e) return galat(e);
    return { ok: 1, tukar: t, profile: u.p };
  }

  if (a === 'equip') {
    const cid = +fd.get('char_id');
    const boss = u.role === 'admin';
    if (!boss && u.p.owned.indexOf(cid) < 0) return galat('Karakter itu belum kamu miliki.');
    const slots = [1, 2, 3].map(i => +fd.get('s' + i) || 0);
    const sudah = {};
    for (const w of slots) {
      if (!w) continue;
      if (sudah[w]) return galat('Senjata yang sama tidak boleh dipasang dua kali.');
      sudah[w] = 1;
      if (!boss && u.p.weapons.indexOf(w) < 0) return galat('Kamu belum memiliki senjata itu.');
      const lain = Object.keys(u.p.equips).find(k => +k !== cid && (u.p.equips[k] || []).indexOf(w) >= 0);
      if (lain) return galat('Senjata itu sedang dipakai karakter lain. Lepas dulu di karakter tersebut.');
    }
    u.p.equips[cid] = slots;
    const e = akunSimpan(akun); if (e) return galat(e);
    return { ok: 1, equips: u.p.equips, profile: u.p };
  }

  if (a === 'battle_end') {
    const mode = jenis(['STORY', 'CLASSIC', 'RANKED', 'PVP'], fd.get('mode'), 'CLASSIC');
    const menang = +fd.get('win') ? 1 : 0;
    const p = u.p;
    if (mode === 'PVP') return { msg: 'Tidak ada hadiah pada mode dua pemain.', gems_delta: 0, pts_delta: 0, profile: p };
    let g = 0, delta = 0, msg = '';
    if (mode === 'STORY') {
      const ch = d.story.find(x => +x.id === +fd.get('chapter_id'));
      if (!ch) return galat('Bab cerita tidak ditemukan.');
      if (menang) {
        g = +ch.reward || 0;
        msg = 'Bab selesai. Hadiah ' + g + ' permata.';
        const kunci = ch.tipe === 'samping' ? 'side_done' : 'story_done';
        const pos = posBabData(d, ch);
        if (pos > (+p[kunci] || 0)) p[kunci] = pos;
      } else { g = 50; msg = 'Kekalahan. Hiburan ' + g + ' permata.'; }
    } else if (mode === 'CLASSIC') {
      g = menang ? 500 : 150;
      msg = menang ? 'Kemenangan! +500 permata.' : 'Kalah. +150 permata hiburan.';
    } else {
      const lama = +p.rank_pts || 0;
      let np = lama;
      const bonus = np >= 1750 ? 15 : np >= 1500 ? 12 : np >= 1300 ? 9 : np >= 1150 ? 6 : 4;
      if (menang) { g = 600; np += 20 + bonus; msg = 'Menang ranked! +' + (20 + bonus) + ' poin, +600 permata.'; }
      else { g = 200; np -= 18; msg = 'Kalah ranked. Poin menjadi ' + np + ', +200 permata.'; }
      p.rank_pts = klem(np, 500, 3000);
      if (menang) p.wins = (+p.wins || 0) + 1; else p.losses = (+p.losses || 0) + 1;
      delta = p.rank_pts - lama;
    }
    p.gems = Math.max(0, (+p.gems || 0) + g);
    const gold = mode === 'PVP' ? 0 : (menang ? 120 + Math.round(g / 5) : 40 + Math.round(g / 8));
    p.gold = Math.max(0, (+p.gold || 0) + gold);
    if (gold) msg += ' + ' + gold + ' gold.';
    const e = akunSimpan(akun); if (e) return galat(e);
    return { msg, gems_delta: g, gold_delta: gold, pts_delta: mode === 'RANKED' ? delta : 0, profile: p };
  }

  if (a === 'chapter_done') {
    const ch = d.story.find(x => +x.id === +fd.get('chapter_id'));
    if (!ch) return galat('Bab cerita tidak ditemukan.');
    const p = u.p;
    const kunci = ch.tipe === 'samping' ? 'side_done' : 'story_done';
    const pos = posBabData(d, ch);
    let g = 0, gold = 0;
    if (pos > (+p[kunci] || 0)) {
      g = +ch.reward || 0;
      gold = Math.round(g / 2);
      p[kunci] = pos;
      p.gems = Math.max(0, (+p.gems || 0) + g);
      p.gold = Math.max(0, (+p.gold || 0) + gold);
    }
    const e = akunSimpan(akun); if (e) return galat(e);
    return { msg: g ? 'Bab selesai. Hadiah ' + g + ' permata' + (gold ? ' dan ' + gold + ' gold' : '') + '.' : 'Bab sudah dibaca sebelumnya.', gems_delta: g, gold_delta: gold, profile: p };
  }

  if (u.role !== 'admin') return galat('Khusus admin. Silakan masuk dengan akun admin.');
  const id = +fd.get('id') || 0;

  if (a === 'char_save') {
    const rar = klem(+fd.get('rarity') || 3, 1, 5);
    const maksBintang = klem(+fd.get('max_star') || 10, 1, 10);
    const maksLv = klem(+fd.get('max_level') || 100, 1, 100);
    const trpsAwal = klem(Math.round(+fd.get('trps0') || 0), 0, 1000000);
    const trpsAkhir = Math.max(trpsAwal, klem(Math.round(+fd.get('trps1') || 0), 0, 1000000));
    const v = {
      name: bersih(fd.get('name')), title: bersih(fd.get('title')), faction: bersih(fd.get('faction')),
      rarity: rar,
      max_level: maksLv, max_star: maksBintang,
      star0: klem(+fd.get('star0') || rar, 1, maksBintang),
      growth: klem(+fd.get('growth') || 1, 0.1, 5),
      trps0: trpsAwal, trps1: trpsAkhir,
      hp: klem(+fd.get('hp') || 250, 50, 3000), atk: klem(+fd.get('atk') || 50, 1, 400), ap: klem(+fd.get('ap') || 4, 3, 20),
      ult: jenis(JENIS_ULT, fd.get('ult'), 'AoE Dmg'),
      passive: jenis(JENIS_PASSIVE, fd.get('passive'), ''),
      skill: (d.skills || []).some(x => String(x.id) === String(fd.get('skill'))) ? String(fd.get('skill')) : '',
      lore: bersih(fd.get('lore')), backstory: String(fd.get('backstory') || ''),
      voice: suaraDari(fd)
    };
    if (!v.name) return galat('Nama wajib diisi.');
    try { v.image = await gambarDari(fd, 'image', bersih(fd.get('old_image'))); }
    catch (e) { return galat(e.message); }
    let idSimpan = id;
    if (id) {
      const c = d.chars.find(x => +x.id === id);
      if (!c) return galat('Karakter tidak ditemukan.');
      Object.assign(c, v);
    } else {
      idSimpan = idBarikut(d.chars);
      d.chars.push(Object.assign({ id: idSimpan }, v));
    }
    const e = dbSimpan(d); if (e) return galat(e);
    return { id: idSimpan };
  }
  if (a === 'char_del') {
    d.chars = d.chars.filter(x => +x.id !== id);
    d.weapons.forEach(w => { if (+w.true_for === id) w.true_for = 0; });
    d.banners.forEach(b => { b.pool = String(b.pool || '').split(',').map(Number).filter(x => x && x !== id).join(','); });
    d.story.forEach(c => { c.enemies = String(c.enemies || '').split(',').map(Number).filter(x => x && x !== id).join(','); });
    Object.keys(akun).forEach(k => {
      const p = akun[k].p;
      p.owned = p.owned.filter(x => +x !== id);
      delete p.equips[id];
    });
    const e1 = dbSimpan(d); if (e1) return galat(e1);
    const e2 = akunSimpan(akun); if (e2) return galat(e2);
    return { ok: 1 };
  }

  if (a === 'weapon_save') {
    const v = {
      name: bersih(fd.get('name')),
      kind: jenis(JENIS_WKIND, fd.get('kind'), 'sword'),
      rarity: klem(+fd.get('rarity') || 3, 1, 5),
      w_atk: klem(+fd.get('w_atk') || 0, 0, 200), w_hp: klem(+fd.get('w_hp') || 0, 0, 800), w_crit: klem(+fd.get('w_crit') || 0, 0, 60),
      passive: jenis(JENIS_WPASSIVE, fd.get('passive'), ''),
      true_for: klem(+fd.get('true_for') || 0, 0, 999999),
      skill_buff: klem(+fd.get('skill_buff') || 0, 0, 100),
      status: jenis(JENIS_STATUS, fd.get('status'), '')
    };
    if (!v.name) return galat('Nama senjata wajib diisi.');
    if (v.passive && !v.true_for) return galat('Senjata dengan pasif harus punya pemilik senjata sejati (karakter).');
    if ((v.skill_buff || v.status) && !v.true_for) return galat('Buff skill dan status hanya boleh dipasang pada senjata sejati milik karakter.');
    if (v.true_for && !d.chars.some(c => +c.id === v.true_for)) return galat('Karakter pemilik senjata sejati tidak ditemukan.');
    if (v.true_for) {
      const sejati = d.weapons.filter(x => +x.true_for === v.true_for && +x.id !== id);
      if (sejati.length >= MAKS_TRUE) {
        const pemilik = d.chars.find(c => +c.id === v.true_for);
        return galat((pemilik ? pemilik.name : 'Karakter itu') + ' sudah punya ' + MAKS_TRUE + ' senjata sejati. Lepas salah satu dulu.');
      }
    }
    try { v.image = await gambarDari(fd, 'image', bersih(fd.get('old_image'))); }
    catch (e) { return galat(e.message); }
    let idSimpan = id;
    if (id) {
      const w = d.weapons.find(x => +x.id === id);
      if (!w) return galat('Senjata tidak ditemukan.');
      Object.assign(w, v);
    } else {
      idSimpan = idBarikut(d.weapons);
      d.weapons.push(Object.assign({ id: idSimpan }, v));
    }
    const e = dbSimpan(d); if (e) return galat(e);
    return { id: idSimpan };
  }
  if (a === 'weapon_del') {
    d.weapons = d.weapons.filter(x => +x.id !== id);
    Object.keys(akun).forEach(k => {
      const p = akun[k].p;
      p.weapons = p.weapons.filter(x => +x !== id);
      Object.keys(p.equips).forEach(c => { p.equips[c] = (p.equips[c] || []).map(w => +w === id ? 0 : w); });
    });
    const e1 = dbSimpan(d); if (e1) return galat(e1);
    const e2 = akunSimpan(akun); if (e2) return galat(e2);
    return { ok: 1 };
  }

  if (a === 'chapter_save') {
    const v = {
      title: bersih(fd.get('title')),
      sort_order: klem(+fd.get('sort_order') || 1, 0, 9999),
      battle: fd.get('battle') ? 1 : 0,
      difficulty: klem(+fd.get('difficulty') || 1, 1, 5),
      reward: klem(+fd.get('reward') || 0, 0, 99999),
      enemies: daftarId(fd, 'enemies').join(','),
      tipe: fd.get('tipe') === 'samping' ? 'samping' : 'utama',
      peta: klem(+fd.get('peta') || 0, 0, 99),
      catatan: String(fd.get('catatan') || '').slice(0, 900),
      script: String(fd.get('script') || '')
    };
    if (!v.title || !v.script) return galat('Judul dan naskah wajib diisi.');
    let idSimpan = id;
    if (id) {
      const c = d.story.find(x => +x.id === id);
      if (!c) return galat('Bab tidak ditemukan.');
      Object.assign(c, v);
    } else {
      idSimpan = idBarikut(d.story);
      d.story.push(Object.assign({ id: idSimpan }, v));
    }
    const e = dbSimpan(d); if (e) return galat(e);
    return { id: idSimpan };
  }
  if (a === 'chapter_del') {
    d.story = d.story.filter(x => +x.id !== id);
    const e = dbSimpan(d); if (e) return galat(e);
    return { ok: 1 };
  }

  if (a === 'skill_save') {
    const TIPESKILL = ['serang', 'sembuh', 'bangkit', 'buff', 'debuff', 'ap_tambah', 'ap_kurang', 'curi_hp', 'bersih'];
    const SASARANSKILL = ['musuh', 'musuh_terlemah', 'semua_musuh', 'sekutu', 'sekutu_terkuat', 'semua_sekutu', 'diri', 'sekutu_mati'];
    const idLama = bersih(fd.get('id'));
    const v = {
      id: bersih(fd.get('sid')),
      name: bersih(fd.get('name')),
      desc: bersih(fd.get('desc')),
      tipe: jenis(TIPESKILL, fd.get('tipe'), 'serang'),
      sasaran: jenis(SASARANSKILL, fd.get('sasaran'), 'musuh'),
      jangkau: klem(+fd.get('jangkau') || 0, 0, 9),
      ap: klem(+fd.get('ap') || 1, 1, 9),
      cd: klem(+fd.get('cd') || 1, 0, 9),
      rumus: String(fd.get('rumus') || '').trim(),
      status: daftarTeks(fd, 'status', JENIS_STATUS_MULTI).join(','),
      kategori: daftarTeks(fd, 'kategori', JENIS_KATEGORI).join(','),
      durasi: klem(+fd.get('durasi') || 0, 0, 9),
      apNilai: klem(+fd.get('apNilai') || 0, 0, 20)
    };
    if (!v.id) v.id = 's' + Date.now().toString(36);
    v.id = v.id.replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
    if (!v.id) return galat('ID skill wajib diisi.');
    if (!v.name) return galat('Nama skill wajib diisi.');
    if (typeof RUMUS !== 'undefined' && !RUMUS.sah(v.rumus)) return galat('Rumus tidak valid. Hanya boleh angka, tanda operasi, variabel, dan fungsi yang diizinkan.');
    const lama = idLama ? (d.skills || []).find(x => String(x.id) === idLama) : null;
    const bentrok = (d.skills || []).find(x => String(x.id) === v.id);
    if (lama) {
      if (v.id && v.id !== idLama) return galat('ID skill tidak bisa diubah setelah tersimpan.');
      v.id = idLama;
      Object.assign(lama, v);
    } else {
      if (bentrok) return galat('ID skill sudah dipakai.');
      d.skills = d.skills || []; d.skills.push(v);
    }
    const e = dbSimpan(d); if (e) return galat(e);
    return { id: v.id };
  }
  if (a === 'skill_del') {
    const idS = bersih(fd.get('id'));
    if ((d.skills || []).length <= 1) return galat('Harus ada minimal satu skill.');
    d.skills = d.skills.filter(x => String(x.id) !== idS);
    d.chars.forEach(c => { if (String(c.skill) === idS) c.skill = ''; });
    const e = dbSimpan(d); if (e) return galat(e);
    return { ok: 1 };
  }

  if (a === 'event_save') {
    const ambil = k => (fd.getAll(k + '[]').length ? fd.getAll(k + '[]') : fd.getAll(k));
    const tt = ambil('hadiah_tipe').map(String);
    const jj = ambil('hadiah_jumlah').map(Number);
    const ii = ambil('hadiah_item').map(Number);
    const hadiah = [];
    for (let i = 0; i < tt.length && hadiah.length < 6; i++) {
      const t = tt[i];
      if (t === 'uang') hadiah.push({ tipe: 'uang', jumlah: klem(jj[i] || 0, 0, 9999999) });
      else if (t === 'hero' && ii[i]) hadiah.push({ tipe: 'hero', id: klem(ii[i], 1, 9999) });
      else if (t === 'senjata' && ii[i]) hadiah.push({ tipe: 'senjata', id: klem(ii[i], 1, 9999) });
      else if (t === 'matauang' && ii[i] && jj[i]) hadiah.push({ tipe: 'matauang', id: klem(ii[i], 1, 999999), jumlah: klem(jj[i], 0, 9999999) });
    }
    const v = {
      name: bersih(fd.get('name')), desc: bersih(fd.get('desc')),
      syarat: klem(+fd.get('syarat') || 0, 0, 9999),
      aktif: fd.get('aktif') ? 1 : 0,
      skenario: String(fd.get('skenario') || ''),
      hadiah: hadiah,
      shop: bacaShop(fd)
    };
    if (!v.name || !v.skenario) return galat('Nama event dan skenario wajib diisi.');
    if (!hadiah.length) return galat('Pilih minimal satu jenis hadiah.');
    if (v.shop.aktif) {
      if (!v.shop.mata || !coinCari(d, v.shop.mata)) return galat('Pilih mata uang yang dipakai Shop event ini.');
      if (!v.shop.item.length) return galat('Tambahkan minimal satu item untuk Shop event ini.');
    }
    let idSimpan = id;
    if (id) {
      const e2 = (d.events || []).find(x => +x.id === id);
      if (!e2) return galat('Event tidak ditemukan.');
      Object.assign(e2, v);
    } else {
      idSimpan = idBarikut(d.events || []);
      d.events = d.events || [];
      d.events.push(Object.assign({ id: idSimpan }, v));
    }
    const e = dbSimpan(d); if (e) return galat(e);
    return { id: idSimpan };
  }
  if (a === 'event_del') {
    d.events = (d.events || []).filter(x => +x.id !== id);
    const e = dbSimpan(d); if (e) return galat(e);
    return { ok: 1 };
  }

  if (a === 'coin_save') {
    if (u.role !== 'admin') return galat('Hanya admin yang bisa mengatur mata uang event.');
    const nama = bersih(fd.get('nama')).slice(0, 60);
    if (!nama) return galat('Nama mata uang wajib diisi.');
    const desc = bersih(fd.get('desc')).slice(0, 160);
    let idk = parseInt(fd.get('id'), 10) || 0;
    d.coins = Array.isArray(d.coins) ? d.coins : [];
    if (idk) {
      const c = coinCari(d, idk);
      if (!c) return galat('Mata uang tidak ditemukan.');
      c.nama = nama; c.desc = desc;
    } else {
      idk = idBarikut(d.coins);
      d.coins.push({ id: idk, nama: nama, desc: desc });
    }
    const e2 = dbSimpan(d); if (e2) return galat(e2);
    return { id: idk };
  }
  if (a === 'coin_del') {
    if (u.role !== 'admin') return galat('Hanya admin yang bisa mengatur mata uang event.');
    const idk = parseInt(fd.get('id'), 10) || 0;
    d.coins = (d.coins || []).filter(x => +x.id !== idk);
    (d.events || []).forEach(ev => {
      if (ev.shop && +ev.shop.mata === idk) { ev.shop.aktif = 0; ev.shop.mata = 0; }
      (ev.hadiah || []).forEach(h => { if (h.tipe === 'matauang' && +h.id === idk) h.tipe = 'uang'; });
    });
    const e3 = dbSimpan(d); if (e3) return galat(e3);
    return { ok: 1 };
  }
  if (a === 'eshop_buy') {
    const ev = (d.events || []).find(x => +x.id === +fd.get('id'));
    if (!ev) return galat('Event tidak ditemukan.');
    if (+ev.aktif !== 1) return galat('Event ini sudah berakhir.');
    const shop = ev.shop;
    if (!shop || +shop.aktif !== 1) return galat('Event ini tidak punya Shop.');
    if (u.role !== 'admin' && (+ev.syarat || 0) > (+u.p.story_done || 0))
      return galat('Selesaikan bab cerita utama ke-' + (+ev.syarat || 0) + ' dulu untuk membuka event ini.');
    const idx = parseInt(fd.get('i'), 10);
    const it = isNaN(idx) || idx < 0 ? null : (shop.item || [])[idx];
    if (!it) return galat('Item Shop tidak ditemukan.');
    const cid = +shop.mata || 0;
    const namaMata = namaKoin(d, cid);
    u.p.coins = u.p.coins || {};
    if ((+u.p.coins[cid] || 0) < (+it.harga || 0)) return galat(namaMata + ' tidak cukup untuk membeli item ini.');
    const rincian = [];
    if (it.tipe === 'hero') {
      const cid2 = +it.id || 0;
      if (!cid2 || !d.chars.some(c => +c.id === cid2)) return galat('Karakter untuk item ini tidak ditemukan.');
      if (u.p.owned.map(Number).includes(cid2)) return galat('Karakter itu sudah kamu miliki.');
      u.p.owned.push(cid2); rincian.push(namaItem(d.chars, cid2));
    } else if (it.tipe === 'senjata') {
      const wid = +it.id || 0;
      if (!wid || !d.weapons.some(w => +w.id === wid)) return galat('Senjata untuk item ini tidak ditemukan.');
      if (u.p.weapons.map(Number).includes(wid)) return galat('Senjata itu sudah kamu miliki.');
      u.p.weapons.push(wid); rincian.push(namaItem(d.weapons, wid));
    } else if (it.tipe === 'matauang') {
      const tid = +it.id || 0;
      if (!coinCari(d, tid)) return galat('Mata uang tujuan tidak ditemukan.');
      const n = klem(+it.jumlah || 0, 0, 9999999);
      u.p.coins[tid] = Math.max(0, (+u.p.coins[tid] || 0) + n);
      rincian.push(n + ' ' + namaKoin(d, tid));
    } else if (it.tipe === 'uang') {
      const n = klem(+it.jumlah || 0, 0, 9999999);
      u.p.gems = Math.max(0, (+u.p.gems || 0) + n);
      rincian.push(n + ' permata');
    } else return galat('Jenis item Shop tidak dikenal.');
    u.p.coins[cid] = Math.max(0, (+u.p.coins[cid] || 0) - (+it.harga || 0));
    const e4 = akunSimpan(akun); if (e4) return galat(e4);
    return { msg: 'Berhasil membeli ' + (it.judul || rincian.join(', ')) + ': ' + rincian.join(', ') + '.', profile: u.p };
  }

  if (a === 'banner_save') {
    const v = {
      name: bersih(fd.get('name')), description: bersih(fd.get('description')),
      kind: fd.get('kind') === 'weapon' ? 'weapon' : 'char',
      pool: daftarId(fd, 'pool').join(','),
      time_text: String(fd.get('time_text') || '').slice(0, 60),
      end_at: String(fd.get('end_at') || '').slice(0, 32),
      pity: String(fd.get('pity') || '1') === '0' ? 0 : 1
    };
    if (!v.name || !v.pool) return galat('Nama dan minimal satu isi panji wajib diisi.');
    try { v.image = await gambarDari(fd, 'image', bersih(fd.get('old_image'))); }
    catch (e) { return galat(e.message); }
    let idSimpan = id;
    if (id) {
      const b = d.banners.find(x => +x.id === id);
      if (!b) return galat('Panji tidak ditemukan.');
      Object.assign(b, v);
    } else {
      idSimpan = idBarikut(d.banners);
      d.banners.push(Object.assign({ id: idSimpan }, v));
    }
    const e = dbSimpan(d); if (e) return galat(e);
    return { id: idSimpan };
  }
  if (a === 'banner_del') {
    d.banners = d.banners.filter(x => +x.id !== id);
    const e = dbSimpan(d); if (e) return galat(e);
    return { ok: 1 };
  }

  if (a === 'settings_save') {
    d.set.music_mode = jenis(['off', 'gen', 'file'], fd.get('music_mode'), 'gen');
    d.set.music_track = jenis(['fajar', 'perang', 'senja', 'menara'], fd.get('music_track'), 'fajar');
    d.set.music_vol = String(klem(+fd.get('music_vol') || 55, 0, 100));
    try {
      d.set.music_file = await mediaDari(fd, 'music_file', bersih(fd.get('old_music')), BATAS_MUSIK, 'Musik');
      d.set.splash_image = await gambarDari(fd, 'splash_image', bersih(fd.get('old_splash')));
    } catch (e) { return galat(e.message); }
    d.set.splash_text = String(fd.get('splash_text') || 'Isekai Tactics').slice(0, 70);
    d.set.splash_sub = String(fd.get('splash_sub') || '').slice(0, 120);
    d.set.splash_on = fd.get('splash_on') === '1' ? '1' : '0';
    const e = dbSimpan(d); if (e) return galat(e);
    return { ok: 1, settings: Object.assign({}, d.set) };
  }

  return galat('Aksi tidak dikenal.');
}
