

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ULTS = { 'AoE Heal': 'Pulihkan 40% HP sekutu radius 3', 'AoE Dmg': '100 damage ke musuh radius 2', 'Warcry': 'Sekutu radius 2 dapat +2 AP', 'Teleport': 'Pindah ke petak kosong radius 6' };
const ULT_AP = 3;
const FN = { P1: 'Kerajaan Surgawi', P2: 'Kekaisaran Matahari', Neu: 'Netral' };
const FC = { P1: '#2f5f9e', P2: '#a33b2c', Neu: '#c9a23a' };


const PASSIVES = {
  lifesteal: { n: 'Serapan Jiwa', d: 'Pulihkan 25% dari damage yang dihasilkan ke musuh.' },
  burn: { n: 'Bara Abadi', d: 'Serangan membakar musuh: 10% ATK selama 2 giliran.' },
  guard: { n: 'Besi Tebal', d: 'Menerima 25% damage lebih sedikit.' },
  crit_up: { n: 'Ujung Tajam', d: 'Peluang serangan kritis +20%.' },
  inspire: { n: 'Paduan Suara', d: 'Sekutu radius 2 pulih 10% HP setiap awal giliran.' },
  fury: { n: 'Murka', d: 'ATK +60% saat HP di bawah 50%.' },
  haste: { n: 'Langkah Ringan', d: 'Dapat +1 AP setiap giliran.' },
  first: { n: 'Serangan Pembuka', d: 'Serangan pertama per pertempuran +60% damage.' },
  vigor: { n: 'Nadi Tegap', d: 'HP maksimal +20%.' },
  regen: { n: 'Pulih Perlahan', d: 'Pulih 8% HP pada awal giliran sendiri.' },
};


const TIPESKILL = ['serang', 'sembuh', 'bangkit', 'buff', 'debuff', 'ap_tambah', 'ap_kurang', 'curi_hp', 'bersih'];
const SASARANSKILL = ['musuh', 'musuh_terlemah', 'semua_musuh', 'sekutu', 'sekutu_terkuat', 'semua_sekutu', 'diri', 'sekutu_mati'];
const NAMA_TIPESKILL = {
  serang: 'Serang (damage)', sembuh: 'Sembuh (pulihkan HP)', bangkit: 'Bangkitkan (hidup kembali)',
  buff: 'Buff sekutu', debuff: 'Debuff musuh', ap_tambah: 'Tambah AP', ap_kurang: 'Debuff AP (dicuri)',
  curi_hp: 'Serap HP (damage + pulih)', bersih: 'Bersihkan / lepas buff'
};
const NAMA_SASARAN = {
  musuh: 'Musuh terdekat', musuh_terlemah: 'Musuh paling lemah', semua_musuh: 'Semua musuh dalam radius',
  sekutu: 'Sekutu terluka terdekat', sekutu_terkuat: 'Sekutu paling kuat', semua_sekutu: 'Semua sekutu dalam radius',
  diri: 'Diri sendiri', sekutu_mati: 'Sekutu yang gugur'
};
const KATEGORI_SKILL = ['ultimate', 'aktif', 'pasif'];
const NAMA_KATEGORI = { ultimate: 'Ultimate', aktif: 'Aktif', pasif: 'Pasif' };
let SKILLS = {};
function bacaSkills(arr) {
  const src = (Array.isArray(arr) && arr.length)
    ? arr
    : (typeof SKILLS_DB !== 'undefined' ? SKILLS_DB : (globalThis.SKILLS_DB || []));
  const out = {};
  src.forEach(s => {
    if (!s || !s.id) return;
    out[String(s.id)] = {
      id: String(s.id),
      n: s.name || s.n || String(s.id),
      d: s.desc || s.d || '',
      tipe: TIPESKILL.indexOf(s.tipe) >= 0 ? s.tipe : 'serang',
      sasaran: SASARANSKILL.indexOf(s.sasaran) >= 0 ? s.sasaran : 'musuh',
      jangkau: +s.jangkau || 0,
      ap: +s.ap || 1,
      cd: +s.cd || 1,
      rumus: String(s.rumus == null ? 'atk' : s.rumus),
      status: s.status || '',
      kategori: s.kategori || '',
      durasi: +s.durasi || 0,
      apNilai: +s.apNilai || 0
    };
  });
  SKILLS = out;
}
bacaSkills();
const WKIND = GACHA.WKIND;
const TIERS = [
  { min: 2000, n: 'Raja', c: '#e0a83a' }, { min: 1750, n: 'Mutiara', c: '#7fd8e8' },
  { min: 1500, n: 'Permata', c: '#67d6a0' }, { min: 1300, n: 'Emas', c: '#f0c04a' },
  { min: 1150, n: 'Perak', c: '#c9ccd4' }, { min: 0, n: 'Perunggu', c: '#c08a52' },
];
const tierOf = p => TIERS.find(t => p >= t.min) || TIERS[TIERS.length - 1];


const FALLBACK_CHARS = [
  { id: 1, name: 'Valerius', title: 'Sang Fajar', faction: 'Kerajaan Solaria', rarity: 5, hp: 350, atk: 45, ap: 5, ult: 'AoE Heal', lore: 'Ksatria agung Solaria.', backstory: 'Bersumpah di atas puing desanya untuk tak pernah lagi lambat melindungi.', image: '' },
  { id: 2, name: 'Elysia', title: 'Penenun Hampa', faction: 'Menara Kaca', rarity: 5, hp: 200, atk: 65, ap: 4, ult: 'Teleport', lore: 'Penyihir pengembara.', backstory: 'Melipat ruang, membayar dengan sepotong ingatan setiap kali.', image: '' },
  { id: 3, name: 'Kael', title: 'Taring Bayangan', faction: 'Klan Malam', rarity: 4, hp: 250, atk: 60, ap: 6, ult: 'Teleport', lore: 'Pembunuh klan malam.', backstory: 'Membalikkan pisaunya sendiri pada malam pesanan terakhir.', image: '' },
  { id: 4, name: 'Aria', title: 'Nyanyian Keberanian', faction: 'Gereja Fajar', rarity: 3, hp: 220, atk: 30, ap: 5, ult: 'AoE Heal', lore: 'Penyanyi suci.', backstory: 'Nadanya membuat orang menolak mati.', image: '' },
  { id: 5, name: 'Draken', title: 'Benteng Besi', faction: 'Legiun Besi', rarity: 4, hp: 450, atk: 35, ap: 4, ult: 'Warcry', lore: 'Jenderal lapis baja.', backstory: 'Berdiri tiga hari di Gerbang Utara tanpa siapa pun.', image: '' },
  { id: 6, name: 'Sylas', title: 'Pemanggil Api', faction: 'Peneka Api', rarity: 4, hp: 210, atk: 70, ap: 4, ult: 'AoE Dmg', lore: 'Mengubah medan jadi abu.', backstory: 'Belajar api dari gunung yang tak pernah tidur.', image: '' },
];
const FALLBACK_WEAPONS = [
  { id: 1, name: 'Bilah Fajar', kind: 'sword', rarity: 5, w_atk: 35, w_hp: 80, w_crit: 8, passive: 'lifesteal', true_for: 1, image: '' },
  { id: 2, name: 'Tusuk Ruang', kind: 'staff', rarity: 5, w_atk: 40, w_hp: 40, w_crit: 6, passive: 'haste', true_for: 2, image: '' },
  { id: 3, name: 'Taring Malam', kind: 'dagger', rarity: 5, w_atk: 32, w_hp: 30, w_crit: 20, passive: 'crit_up', true_for: 3, image: '' },
  { id: 7, name: 'Bilah Perajam', kind: 'sword', rarity: 3, w_atk: 18, w_hp: 30, w_crit: 5, passive: '', true_for: 0, image: '' },
  { id: 8, name: 'Kapak Rimba', kind: 'axe', rarity: 3, w_atk: 22, w_hp: 45, w_crit: 3, passive: '', true_for: 0, image: '' },
];
const FALLBACK_STORY = [{
  id: 0, title: 'Bab contoh', sort_order: 1, battle: 1, difficulty: 1, reward: 200, enemies: '3,6',
  script: '@bg field\nNarator: Server belum aktif, ini bab contoh.\nValerius: Ayo bertempur, tamu.'
}];

let DB = { chars: [], weapons: [], story: [], banners: [], events: [], skills: [], coins: [], settings: {} };
let IMG = {}, IMGW = {};
let ME = { admin: false, user: null, profile: null };


const DEFAULTS = () => ({
  online: false, gem: 1200, dust: 0, glit: 0, pityChar: 0, pityWeap: 0, pity4: 0, wishLog: [], coins: {},
  gold: 5000, charLv: {}, charStar: {},
  rankPts: 1000,
  wins: 0, losses: 0, storyDone: 0, sideDone: 0, eventsDone: [], own: [], ownW: [], eq: {},
  dupC: {}, dupW: {}, bio: '', photo: 0, lastUsed: [], skipWish: 0,
});
let S = Object.assign(DEFAULTS(), JSON.parse(localStorage.getItem('it_save') || '{}'));

const TIPE_NAMA = { serang: 'serang', sembuh: 'sembuh', bangkit: 'bangkitkan', buff: 'buff', debuff: 'debuff', ap_tambah: 'tambah AP', ap_kurang: 'kurangi AP', curi_hp: 'serap HP', bersih: 'bersihkan' };
const SASARAN_NAMA = { musuh: '1 musuh terdekat', musuh_terlemah: 'musuh terlemah', semua_musuh: 'semua musuh di jangkau', sekutu: 'sekutu terluka', sekutu_terkuat: 'sekutu terkuat', semua_sekutu: 'semua sekutu', diri: 'diri sendiri', sekutu_mati: 'sekutu yang gugur' };
const STATUS_NAMA = { bakar: 'Bakar', racun: 'Racun', perisai: 'Perisai', marah: 'Marah (+ATK)', tahan: 'Tahan baja (-30% damage)', lambat: 'Lambat (AP dibagi 2)', lemah: 'Lemah (-30% ATK)', beku: 'Beku' };
const KATEGORI_PENDEK = { ultimate: 'ULT', aktif: 'AKTIF', pasif: 'PASIF' };
const JENIS_STATUSOPT = ['', 'bakar', 'racun', 'perisai', 'marah', 'tahan', 'lambat', 'lemah', 'beku'];
const NAMA_STATUS = {
  bakar: 'Bakar (damage tiap giliran)', racun: 'Racun (damage menembus pertahanan)',
  perisai: 'Perisai (kurangi 40% damage)', marah: 'Marah (ATK naik)', tahan: 'Tahan (damage diterima turun)',
  lambat: 'Lambat (AP dipulihkan separuh)', lemah: 'Lemah (ATK turun 30%)',
  beku: 'Beku (tidak bisa bertindak)'
};
const charById = id => DB.chars.find(c => +c.id === +id);
const dupKali = id => 1 + ((S.dupC && S.dupC[+id]) || 0) / 100;
const nDup = id => (S.dupC && S.dupC[+id]) || 0;
const nDupW = id => (S.dupW && S.dupW[+id]) || 0;
const juta = n => {
  const v = Math.round(+n || 0);
  if (v >= 1000000) return (Math.round(v / 100000) / 10).toString().replace('.', ',') + ' juta';
  if (v >= 1000) return (Math.round(v / 100) / 10).toString().replace('.', ',') + ' rb';
  return String(v);
};
const profilStatS = () => profilStat({
  wins: S.wins, losses: S.losses, rank_pts: S.rankPts, story_done: S.storyDone,
  dup_c: S.dupC, equips: S.eq
});
const dbStat = () => ({ chars: DB.chars, weapons: DB.weapons });
function batasPasukan(c) { return c ? batasPasukanDari(c, profilStatS()) : 100; }
function cpKarakter(c) { return cpKarakterDari(dbStat(), c, profilStatS()); }
function cpTim() { return cpTimDari(dbStat(), S.lastUsed, profilStatS()); }
const levelAkun = () => levelDari(profilStatS());
function maxLvKarakter(c) { return clamp(+c.max_level || 100, 1, 100); }
function maxBintang(c) { return clamp(+c.max_star || 10, 1, 10); }
function bintangAwal(c) { return clamp(+c.star0 || (+c.rarity || 3), 1, maxBintang(c)); }
function lvKarakter(c) { return c ? clamp(+S.charLv[+c.id] || 1, 1, maxLvKarakter(c)) : 1; }
function bintangKarakter(c) { return c ? clamp(+S.charStar[+c.id] || bintangAwal(c), bintangAwal(c), maxBintang(c)) : 1; }
function multTumbuh(c) {
  if (!c) return 1;
  const g = clamp(+c.growth || 1, 0.1, 5);
  return 1 + g * (lvKarakter(c) - 1) / 10;
}
function multBintang(c) { return c ? 1 + 0.12 * (bintangKarakter(c) - bintangAwal(c)) : 1; }
const biayaLevel = (c, lv) => Math.round((60 + lv * 14) * (1 + Math.max(0, (+c.rarity || 3) - 3) * 0.4));
const biayaBintang = (c, st) => Math.round(400 * st * (1 + Math.max(0, (+c.rarity || 3) - 3) * 0.5));
function statChar(c) {
  const lo = loadoutFor(c.id, S.eq);
  const m = multTumbuh(c) * multBintang(c);
  const arr = {
    hp: Math.round((c.hp + lo.hp + lo.dupHp) * m),
    atk: Math.round((c.atk + lo.atk + lo.dupAtk) * m),
    ap: +c.ap || 0, crit: lo.crit, pasukan: batasPasukan(c)
  };
  arr.cp = Math.round((arr.hp + arr.atk + arr.ap + arr.crit + arr.pasukan) / 5);
  return arr;
}
function starRow(n, maks) {
  const m = clamp(+maks || 10, 1, 10);
  const k = clamp(+n || 1, 1, m);
  let s = '';
  for (let i = 1; i <= m; i++) s += i <= k ? starSVG : starOffSVG;
  return '<span class="stars sm">' + s + '</span>';
}
async function naikLevel(id) {
  const c = charById(id); if (!c) return;
  const lv = lvKarakter(c);
  if (lv >= maxLvKarakter(c)) return toast(c.name + ' sudah di level maksimal (' + maxLvKarakter(c) + ').');
  const cost = biayaLevel(c, lv);
  if (S.gold < cost) return toast('Gold tidak cukup. Butuh ' + uangTeks(cost) + ' gold.');
  if (S.online) {
    const fd = new FormData(); fd.append('id', id); fd.append('tipe', 'level');
    const r = await act('char_level', fd);
    if (!r) return;
    sfx('level'); rdet(+id); return;
  }
  S.gold -= cost; S.charLv[+id] = lv + 1; save();
  sfx('level');
  toast(c.name + ' naik ke level ' + (lv + 1) + '.');
  rdet(+id);
}
async function naikBintang(id) {
  const c = charById(id); if (!c) return;
  const st = bintangKarakter(c);
  if (st >= maxBintang(c)) return toast(c.name + ' sudah di bintang maksimal (' + maxBintang(c) + ').');
  const cost = biayaBintang(c, st);
  if (S.gold < cost) return toast('Gold tidak cukup. Butuh ' + uangTeks(cost) + ' gold.');
  if (S.online) {
    const fd = new FormData(); fd.append('id', id); fd.append('tipe', 'star');
    const r = await act('char_level', fd);
    if (!r) return;
    sfx('level'); rdet(+id); return;
  }
  S.gold -= cost; S.charStar[+id] = st + 1; save();
  sfx('level');
  toast(c.name + ' naik ke bintang ' + (st + 1) + '.');
  rdet(+id);
}
const weapById = id => DB.weapons.find(c => +c.id === +id);
const weaponById = id => DB.weapons.find(w => +w.id === +id);


const MUSIC = {
  ctx: null, master: null, timer: 0, step: 0, nextT: 0,
  file: null, mode: 'gen', track: 'fajar', vol: 55, muted: false, started: false,
  battle: false,        
};

const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  
  Eb3: 155.56, Ab3: 207.65, Bb3: 233.08,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  Eb4: 311.13, Ab4: 415.30, Bb4: 466.16,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};


const TRACK_NAME = { fajar: 'Fajar Perbatasan', perang: 'Genderang Perang', senja: 'Senja di Gerbang', menara: 'Menara Kaca' };
const TRACKS = {
  fajar: {
    tempo: 1.9, wave: 'triangle',
    bass: [N.C3, N.G3 / 2, N.A3, N.E3],
    melody: [N.E4, N.G4, N.A4, N.G4, N.E4, N.D4, N.E4, 0,
      N.G4, N.A4, N.C5, N.A4, N.G4, N.E4, N.D4, 0],
  },
  perang: {
    tempo: 1.05, wave: 'sawtooth',
    bass: [N.C3, N.C3, N.D3, N.C3],
    melody: [N.C4, 0, N.E4, N.G4, N.A4, N.G4, N.E4, N.C4,
      N.D4, 0, N.F4, N.A4, N.G4, N.F4, N.D4, 0],
  },
  senja: {
    tempo: 2.6, wave: 'sine',
    bass: [N.A3 / 2, N.E3, N.F3 / 2, N.C3],
    melody: [N.A4, N.G4, N.E4, N.D4, N.E4, 0, N.D4, N.C4,
      N.E4, N.D4, N.C4, N.A3, N.B3, 0, N.C4, 0],
  },
  menara: {
    tempo: 2.2, wave: 'triangle',
    bass: [N.D3, N.A3 / 2, N.G3, N.C3],
    melody: [N.D4, N.E4, N.G4, N.A4, N.G4, N.E4, N.D4, 0,
      N.F4, N.G4, N.A4, N.C5, N.A4, N.G4, N.E4, 0],
  },
};

const WAR = {
  tempo: .60, wave: 'sawtooth', drum: true, gain: .13,
  bass:  [N.C3, N.C3, N.G3 / 2, N.C3, N.A3 / 2, N.A3 / 2, N.F3 / 2, N.G3 / 2],
  melody: [N.C4, N.Eb4, N.G4, N.Eb4, N.C4, 0, N.Bb3, N.C4,
           N.Ab3, N.C4, N.Eb4, N.C4, N.Ab3, 0, N.G3, N.G3,
           N.C4, N.D4, N.Eb4, N.F4, N.G4, 0, N.F4, N.Eb4,
           N.D4, N.C4, N.Bb3, N.C4, N.G3, 0, N.C4, N.C4],
};

let NOISE = null;
function noiseBuf() {
  const ctx = MUSIC.ctx; if (!ctx) return null;
  if (NOISE && NOISE.sampleRate === ctx.sampleRate) return NOISE;
  const n = Math.floor(ctx.sampleRate * .5);
  NOISE = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = NOISE.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return NOISE;
}

function drum(when, kind) {
  const ctx = MUSIC.ctx; if (!ctx) return;
  if (kind === 'k') {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(44, when + .16);
    g.gain.setValueAtTime(.0001, when);
    g.gain.linearRampToValueAtTime(.60, when + .008);
    g.gain.exponentialRampToValueAtTime(.0001, when + .22);
    o.connect(g); g.connect(MUSIC.master);
    o.start(when); o.stop(when + .26);
  } else {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(); if (!src.buffer) return;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = .7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(.34, when);
    g.gain.exponentialRampToValueAtTime(.0001, when + .16);
    src.connect(bp); bp.connect(g); g.connect(MUSIC.master);
    src.start(when); src.stop(when + .2);
  }
}
function musicCtx() {
  if (MUSIC.ctx) return MUSIC.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  MUSIC.ctx = new AC();
  MUSIC.master = MUSIC.ctx.createGain();
  MUSIC.master.gain.value = (MUSIC.vol / 100) * 0.5;
  MUSIC.master.connect(MUSIC.ctx.destination);
  
  MUSIC.sfxGain = MUSIC.ctx.createGain();
  MUSIC.sfxGain.gain.value = 0.6;
  MUSIC.sfxGain.connect(MUSIC.ctx.destination);
  return MUSIC.ctx;
}


const SFX = { on: true, vol: 60, wired: false };
function sfx(kind) {
  if (!SFX.on || SFX.vol <= 0) return;
  const ctx = musicCtx(); if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  MUSIC.sfxGain.gain.value = SFX.vol / 100;
  const t = ctx.currentTime;
  
  const note = (f, d, delay, type, g, f2) => {
    const o = ctx.createOscillator(), gn = ctx.createGain(), s = t + (delay || 0);
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, s);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(40, f2), s + d);
    gn.gain.setValueAtTime(0.0001, s);
    gn.gain.linearRampToValueAtTime(g, s + 0.006);
    gn.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.connect(gn); gn.connect(MUSIC.sfxGain);
    o.start(s); o.stop(s + d + 0.02);
  };
  
  const slash = (d, delay, f, g) => {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(); if (!src.buffer) return;
    const bp = ctx.createBiquadFilter(), gn = ctx.createGain(), s = t + (delay || 0);
    bp.type = 'bandpass'; bp.Q.value = 1.3;
    bp.frequency.setValueAtTime(f, s);
    bp.frequency.exponentialRampToValueAtTime(Math.max(140, f * .16), s + d);
    gn.gain.setValueAtTime(0.0001, s);
    gn.gain.linearRampToValueAtTime(g, s + .01);
    gn.gain.exponentialRampToValueAtTime(0.0001, s + d);
    src.connect(bp); bp.connect(gn); gn.connect(MUSIC.sfxGain);
    src.start(s); src.stop(s + d + .02);
  };
  switch (kind) {
    case 'pick':   
      note(523, .12, 0, 'triangle', .30); note(784, .16, .06, 'triangle', .26); break;
    case 'back':   
      note(392, .14, 0, 'triangle', .24, 262); break;
    case 'err':    
      note(150, .16, 0, 'sawtooth', .20, 110); break;
    case 'open':   
      note(392, .10, 0, 'triangle', .22); note(523, .13, .05, 'triangle', .22); break;

    
    case 'unit':   
      note(300, .055, 0, 'square', .18); note(452, .09, .03, 'triangle', .17); break;
    case 'hit':    
      slash(.14, 0, 1500, .30); note(330, .10, 0, 'square', .13, 155); break;
    case 'crit':   
      slash(.19, 0, 2800, .40); note(760, .13, 0, 'square', .18, 230);
      note(1046, .22, .07, 'triangle', .14); break;
    case 'die':    
      note(360, .32, 0, 'sawtooth', .22, 72); note(170, .46, .06, 'triangle', .17, 52); break;
    case 'capture':
      note(196, .11, 0, 'square', .19); note(294, .11, .09, 'square', .19);
      note(392, .24, .18, 'triangle', .23); break;
    case 'level':  
      note(523, .10, 0, 'triangle', .25); note(659, .10, .08, 'triangle', .25);
      note(784, .20, .16, 'triangle', .27); break;
    case 'ult':    
      note(175, .30, 0, 'sawtooth', .23, 940); note(440, .24, .24, 'square', .19, 1320); break;
    case 'horn':   
      note(147, .60, 0, 'sawtooth', .27); note(220, .58, .05, 'sawtooth', .21);
      note(294, .50, .52, 'triangle', .17); break;
    case 'win':    
      [[392, 0], [523, .13], [659, .26], [784, .39], [1046, .52], [784, .74], [1046, .84]]
        .forEach(([f, d]) => note(f, .40, d, 'triangle', .27));
      drum(t + .52, 'k'); drum(t + .74, 's'); break;
    case 'lose':   
      note(294, .55, 0, 'sawtooth', .23, 214); note(196, .95, .46, 'sawtooth', .23, 104); break;

    case 'wish':
      [[523, 0], [659, .07], [784, .14], [1046, .21], [1318, .28]]
        .forEach(([f, d]) => note(f, .34, d, 'triangle', .17));
      note(2093, .78, .35, 'sine', .13); break;
    case 'wish3':
      note(784, .17, 0, 'triangle', .24); note(988, .21, .07, 'triangle', .22); break;
    case 'wish4':
      [[523, 0], [659, .06], [784, .12], [1046, .18]].forEach(([f, d]) => note(f, .34, d, 'triangle', .24));
      drum(t + .18, 's'); break;
    case 'wish5':
      [[523, 0], [659, .07], [784, .14], [1046, .21], [1318, .28], [1568, .35]]
        .forEach(([f, d]) => note(f, .52, d, 'triangle', .26));
      drum(t + .28, 'k'); drum(t + .35, 's'); break;

    default:       
      note(660, .05, 0, 'square', .16); break;
  }
}

function sfxWire() {
  if (SFX.wired) return; SFX.wired = true;
  document.addEventListener('pointerdown', e => {
    const t = e.target;
    if (!t || !t.closest) return;
    const el = t.closest('button, .card, .eslot, .slot, .chk, .xb, [onclick], a');
    if (!el || el.disabled) return;
    if (el.id === 'bexit' || el.id === 'back' || el.classList.contains('xb')) return sfx('back');
    if (el.classList.contains('eslot') || el.classList.contains('slot') ||
        el.classList.contains('face') || el.querySelector('.face, .passive')) return sfx('pick');
    if (el.classList.contains('card')) return sfx('pick');
    if (el.classList.contains('lnk')) return sfx('open');
    sfx('click');
  }, true);
}
function sfxToggle() {
  SFX.on = !SFX.on; sfxUI();
  if (SFX.on) sfx('pick');
}
function sfxUI() {
  const b = $('#sfxBtn'); if (!b) return;
  b.textContent = SFX.on ? '🔊 Suara: nyala' : '🔇 Suara: mati';
  b.setAttribute('aria-pressed', SFX.on ? 'true' : 'false');
}

function tone(freq, when, dur, wave, gain) {
  const ctx = MUSIC.ctx; if (!ctx || !freq) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = wave; o.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(MUSIC.master);
  o.start(when); o.stop(when + dur + 0.05);
}
function musicTick() {
  const ctx = MUSIC.ctx;
  if (!ctx) return;
  
  const tr = MUSIC.battle ? WAR : (TRACKS[MUSIC.track] || TRACKS.fajar);
  const spb = tr.tempo / 2;                 
  while (MUSIC.nextT < ctx.currentTime + 0.25) {
    const i = MUSIC.step % tr.melody.length;
    tone(tr.melody[i], MUSIC.nextT, spb * (tr.drum ? .9 : 1.7), tr.wave, tr.gain || 0.16);
    if (i % 4 === 0) tone(tr.bass[(i / 4) | 0] || tr.bass[0], MUSIC.nextT, spb * 3.2, 'sine', 0.2);
    if (tr.drum) {
      const b = i % 8;
      drum(MUSIC.nextT, (b === 0 || b === 3 || b === 4) ? 'k' : 's');
    }
    MUSIC.nextT += spb;
    MUSIC.step++;
  }
}

function musicBattle(on) {
  on = !!on;
  if (MUSIC.battle === on) return;
  MUSIC.battle = on;
  MUSIC.step = 0;
  if (MUSIC.ctx) MUSIC.nextT = MUSIC.ctx.currentTime + .06;   
}
function musicPlay() {
  if (MUSIC.mode === 'off' || MUSIC.muted) return;
  if (MUSIC.mode === 'file') return musicFilePlay();
  const ctx = musicCtx(); if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  MUSIC.master.gain.value = (MUSIC.vol / 100) * 0.5;
  if (MUSIC.timer) return;
  MUSIC.nextT = ctx.currentTime + 0.06;
  MUSIC.timer = setInterval(musicTick, 120);
  MUSIC.started = true;
}
function musicPause() {
  if (MUSIC.timer) { clearInterval(MUSIC.timer); MUSIC.timer = 0; }
  if (MUSIC.file) MUSIC.file.pause();
}
function musicFilePlay() {
  if (MUSIC.mode !== 'file' || MUSIC.muted) return;
  const src = DB.settings && DB.settings.music_file;
  if (!src) return;
  if (!MUSIC.file || MUSIC.file.src.indexOf(src) < 0) {
    if (MUSIC.file) MUSIC.file.pause();
    MUSIC.file = new Audio(src); MUSIC.file.loop = true;
  }
  MUSIC.file.volume = MUSIC.vol / 100;
  MUSIC.file.play().catch(() => {});        
  MUSIC.started = true;
}

function musicApplySettings() {
  const s = DB.settings || {};
  const prevMode = MUSIC.mode, prevTrack = MUSIC.track, prevVol = MUSIC.vol;
  MUSIC.mode = ['off', 'gen', 'file'].includes(s.music_mode) ? s.music_mode : 'gen';
  MUSIC.track = TRACKS[s.music_track] ? s.music_track : 'fajar';
  MUSIC.vol = clamp(+s.music_vol || 55, 0, 100);

  
  if (MUSIC.master && MUSIC.ctx) MUSIC.master.gain.value = (MUSIC.vol / 100) * 0.5;
  if (MUSIC.file) MUSIC.file.volume = MUSIC.vol / 100;
  
  if (prevTrack !== MUSIC.track) { MUSIC.step = 0; if (MUSIC.ctx) MUSIC.nextT = MUSIC.ctx.currentTime + 0.06; }

  if (prevMode !== MUSIC.mode || MUSIC.mode === 'file') { musicPause(); MUSIC.timer = 0; }
  musicUI();
  if (MUSIC.started && MUSIC.mode !== 'off') musicPlay();
}
function musicToggle() {
  if (MUSIC.started && (MUSIC.timer || (MUSIC.file && !MUSIC.file.paused))) {
    MUSIC.muted = true; musicPause(); musicUI();
  } else {
    MUSIC.muted = false; musicPlay(); musicUI();
  }
}
function musicUI() {
  const b = $('#musBtn'); if (!b) return;
  const on = MUSIC.mode !== 'off' && (MUSIC.timer || (MUSIC.file && !MUSIC.file.paused));
  b.textContent = on ? '♪ Musik: aktif' : '♪ Musik: mati';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function musicUnlock() {
  if (MUSIC.muted) return;
  musicPlay();
  document.removeEventListener('pointerdown', musicUnlock);
  document.removeEventListener('keydown', musicUnlock);
}
const hasChar = id => ME.admin || S.own.some(x => +x === +id);
const hasWeap = id => ME.admin || S.ownW.some(x => +x === +id);
const punyaChar = () => ME.admin ? DB.chars.map(c => +c.id) : S.own.filter(id => charById(id));
const punyaWeap = () => ME.admin ? DB.weapons.map(w => +w.id) : S.ownW.filter(id => weaponById(id));

function save() {
  localStorage.setItem('it_save', JSON.stringify(S));
  $('#gem').textContent = S.gem;
  const eg = $('#gold'); if (eg) eg.textContent = uangTeks(S.gold);
  $('#pts').textContent = S.rankPts;
  const t = tierOf(S.rankPts);
  $('#tier').textContent = t.n; $('#tier').style.color = t.c;
}
function toggleSkipWish(v) {
  S.skipWish = v ? 1 : 0;
  save();
  const cb = $('#skipWishIn'); if (cb) cb.checked = !!S.skipWish;
  toast(S.skipWish ? 'Animasi wish akan dilewati.' : 'Animasi wish ditampilkan kembali.');
}
function syncSkipWish() {
  const cb = $('#skipWishIn'); if (cb) cb.checked = !!S.skipWish;
}
function applyProfile(p) {
  if (!p) return;
  S.online = true;
  S.gem = +p.gems; S.pityChar = +p.pity_char; S.pityWeap = +p.pity_weap;
  S.dust = +p.stardust || 0; S.glit = +p.starglitter || 0; S.pity4 = +p.pity4 || 0;
  S.wishLog = Array.isArray(p.wish_log) ? p.wish_log : [];
  S.rankPts = +p.rank_pts; S.wins = +p.wins; S.losses = +p.losses; S.storyDone = +p.story_done || 0; S.sideDone = +p.side_done || 0; S.eventsDone = (p.events_done || []).map(Number);
  S.own = (p.owned || []).map(Number); S.ownW = (p.weapons || []).map(Number);
  S.dupC = p.dup_c && typeof p.dup_c === 'object' ? p.dup_c : {};
  S.dupW = p.dup_w && typeof p.dup_w === 'object' ? p.dup_w : {};
  S.bio = p.bio || ''; S.photo = +p.photo || 0;
  S.coins = (p.coins && typeof p.coins === 'object' && !Array.isArray(p.coins)) ? p.coins : {};
  S.gold = +p.gold || 0;
  S.charLv = (p.char_lv && typeof p.char_lv === 'object') ? p.char_lv : {};
  S.charStar = (p.char_star && typeof p.char_star === 'object') ? p.char_star : {};
  S.lastUsed = Array.isArray(p.last_used) ? p.last_used.map(Number) : [];
  S.eq = {};
  Object.keys(p.equips || {}).forEach(k => { S.eq[k] = (p.equips[k] || []).map(Number); });
  save();
}

let API_ERR = '';
function why() {
  if (API_ERR) return API_ERR;
  return 'Data lokal gagal dibaca — muat ulang halaman, atau bersihkan penyimpanan browser lewat menu bantuan peramban.' + tautanBantuan();
}
async function api(a, body) {
  try {
    const r = await SERVER(a, body);
    API_ERR = '';
    if (r && r.error) API_ERR = r.error;
    return r;
  } catch (e) {
    API_ERR = 'Gagal memproses data permainan (' + (e && e.message ? e.message : e) + ').' + tautanBantuan();
    return { error: API_ERR };
  }
}

async function act(a, fd) {
  const r = await api(a, fd || new FormData());
  if (r.error) { toast(r.error); return null; }
  if (r.profile) applyProfile(r.profile);
  save(); return r;
}

async function loadAll() {
  const [c, w, s, b, ev, sk, co, st] = await Promise.all([api('chars'), api('weapons'), api('story'), api('banners'), api('events'), api('skills'), api('coins'), api('settings')]);
  if (!Array.isArray(c) || !c.length) throw 0;
  DB.chars = c; DB.weapons = w; DB.story = s; DB.banners = b;
  DB.coins = Array.isArray(co) ? co : [];
  DB.events = Array.isArray(ev) ? ev : [];
  DB.skills = Array.isArray(sk) ? sk : [];
  bacaSkills(DB.skills);
  DB.settings = (st && typeof st === 'object' && !st.error) ? st : {};
  DB.chars.forEach(x => { x.id = +x.id; x.hp = +x.hp; x.atk = +x.atk; x.ap = +x.ap; x.rarity = +x.rarity || 3; if (x.image) { const i = new Image(); i.src = x.image; IMG[x.id] = i; } });
  DB.weapons.forEach(x => { x.id = +x.id; x.rarity = +x.rarity || 3; x.true_for = +x.true_for || 0; x.skill_buff = +x.skill_buff || 0; x.status = x.status || ''; if (x.image) { const i = new Image(); i.src = x.image; IMGW[x.id] = i; } });
  DB.banners.forEach(x => { x.id = +x.id; x.kind = x.kind === 'weapon' ? 'weapon' : 'char'; });
  DB.story.forEach(x => { x.id = +x.id; x.sort_order = +x.sort_order; x.difficulty = +x.difficulty || 1; x.reward = +x.reward || 0; });
  DB.events.forEach(x => { x.id = +x.id; x.syarat = +x.syarat || 0; });
  musicApplySettings();
}
function fallbackData() {
  DB.chars = FALLBACK_CHARS; DB.weapons = FALLBACK_WEAPONS; DB.story = FALLBACK_STORY;
  DB.events = [];
  DB.coins = [];
  bacaSkills(null);
  DB.banners = [{ id: 1, name: 'Panji Fajar', description: 'Karakter', kind: 'char', pool: '1,2,3,4,5,6' },
                { id: 2, name: 'Tangan Penempa', description: 'Senjata', kind: 'weapon', pool: '1,2,3,7,8' }];
  const el = $('#offline');
  el.hidden = false;
  $('#why').innerHTML = why();
  el.classList.add('show');
}
async function boot() {
  let live = true;
  try { await loadAll(); } catch (e) { live = false; fallbackData(); }
  if (live) {
    const me = await api('me');
    if (me && me.user) { ME = me; applyProfile(me.profile); }
  }
  if (!S.own.length) S.own = DB.chars.slice(0, 3).map(c => c.id);
  if (!S.ownW.length) S.ownW = DB.weapons.filter(w => !w.true_for).sort((a, b) => a.id - b.id).slice(0, 2).map(w => w.id);
  save(); authUI(); go('menu');
  
  musicUI();
  document.addEventListener('pointerdown', musicUnlock);
  document.addEventListener('keydown', musicUnlock);
  splashShow();
  sfxWire(); sfxUI();
  const wb = $('#whyBtn');
  if (wb) wb.onclick = () => { const d = $('#why'); d.hidden = !d.hidden; wb.textContent = d.hidden ? 'Lihat penyebab' : 'Sembunyikan'; };
}


function splashShow() {
  const s = DB.settings || {}, el = $('#splash');
  if (!el || s.splash_on !== '1') { if (el) el.hidden = true; return; }
  $('#splashTitle').textContent = s.splash_text || 'Isekai Tactics';
  $('#splashSub').textContent = s.splash_sub || '';
  $('#splashSub').hidden = !s.splash_sub;
  const art = $('#splashArt');
  if (s.splash_image) { art.style.backgroundImage = `url("${s.splash_image}")`; art.classList.remove('empty'); }
  else { art.style.backgroundImage = ''; art.classList.add('empty'); }
  el.hidden = false;
  $('#splashGo').onclick = () => { el.hidden = true; musicUnlock(); };
}
function splashHide() { const el = $('#splash'); if (el) el.hidden = true; }


const starSVG = '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7z" fill="#e0a83a" stroke="#1c1410" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const starOffSVG = '<svg class="off" viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7z" fill="#8b7a5c" stroke="#1c1410" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const stars = n => `<span class="stars">${starSVG.repeat(clamp(+n || 3, 1, 5))}</span>`;
function face(c, size, fb) {
  const st = `width:${size}px;height:${size}px`;
  return c && c.image ? `<img class="face" src="${esc(c.image)}" style="${st}" alt="">`
    : `<div class="face" style="${st}">${esc(fb || (c && c.name ? c.name[0] : '?'))}</div>`;
}

const WICON = {
  sword: '<path d="M31 6h6l3 34-6 6-6-6z" fill="#c9d2dd" stroke="#1c1410" stroke-width="3"/><path d="M20 44h24v5H20z" fill="#c9a23a" stroke="#1c1410" stroke-width="3"/><path d="M29 49h8v14h-8z" fill="#5b3a1e" stroke="#1c1410" stroke-width="3"/>',
  dagger: '<path d="M32 10h5l2 26-5 5-4-5z" fill="#c9d2dd" stroke="#1c1410" stroke-width="3"/><path d="M23 42h18v4H23z" fill="#8a6a3a" stroke="#1c1410" stroke-width="3"/><path d="M30 46h5v14h-5z" fill="#3a2a1c" stroke="#1c1410" stroke-width="3"/>',
  axe: '<path d="M34 8v52" stroke="#1c1410" stroke-width="9"/><path d="M34 10v48" stroke="#7a5a34" stroke-width="5"/><path d="M34 12c14 2 20 10 20 16s-8 12-20 12z" fill="#b9c2cd" stroke="#1c1410" stroke-width="3"/>',
  spear: '<path d="M34 4v56" stroke="#1c1410" stroke-width="8"/><path d="M34 6v54" stroke="#8a6a44" stroke-width="4"/><path d="M34 2l7 16H27z" fill="#d5dce6" stroke="#1c1410" stroke-width="3"/><path d="M30 20h8v6h-8z" fill="#a33b2c" stroke="#1c1410" stroke-width="2"/>',
  bow: '<path d="M18 8c22 6 22 42 0 48" fill="none" stroke="#7a5a34" stroke-width="7" stroke-linecap="round"/><path d="M18 8l0 48" stroke="#1c1410" stroke-width="2"/><path d="M18 32h30" stroke="#e6d3a3" stroke-width="3"/><path d="M46 32l-8-5v10z" fill="#c9d2dd" stroke="#1c1410" stroke-width="2"/>',
  staff: '<path d="M34 14v46" stroke="#1c1410" stroke-width="8"/><path d="M34 16v44" stroke="#4a3520" stroke-width="4"/><path d="M34 4l9 10-9 10-9-10z" fill="#8f6ad0" stroke="#1c1410" stroke-width="3"/>',
  hammer: '<path d="M34 16v44" stroke="#1c1410" stroke-width="9"/><path d="M34 18v42" stroke="#6b4a2a" stroke-width="5"/><path d="M18 6h32v18H18z" fill="#9aa3ae" stroke="#1c1410" stroke-width="3"/><path d="M24 10h6v10h-6z" fill="#7f8794"/>',
  harp: '<path d="M20 56c0-26 8-44 26-50v10c-12 6-18 20-18 40z" fill="#e0a83a" stroke="#1c1410" stroke-width="3"/><path d="M46 16v40h-6V18z" fill="#c9a23a" stroke="#1c1410" stroke-width="3"/><path d="M26 46V24M32 50V26M38 52V30" stroke="#f3e6bd" stroke-width="2"/>',
};
function wface(w, size) {
  const st = `width:${size}px;height:${size}px`;
  if (w && w.image) return `<img class="face" src="${esc(w.image)}" style="${st}" alt="">`;
  const k = w && w.kind ? w.kind : 'sword';
  return `<div class="face" style="${st};background:#2b2723;padding:2px"><svg viewBox="0 0 68 68" style="width:100%;height:100%">${WICON[k] || WICON.sword}</svg></div>`;
}

function artOf(r, size) {
  if (r.weapon) return wface({ image: r.image, kind: (r.kind || 'sword') }, size);
  return face({ image: r.image, name: r.name }, size, r.name ? r.name[0] : '?');
}


const R = {}; let inBattle = false, looping = false, curTab = 'story';
let pvpA = [], pvpB = [], pvpTurn = 1;
function go(s) {
  $$('.screen').forEach(e => e.classList.toggle('on', e.id === s));
  $('#hud').hidden = s === 'battle'; $('#back').hidden = s === 'menu';
  inBattle = s === 'battle';
  musicBattle(inBattle);            
  if (R[s]) R[s]();
  if (inBattle) sfx('horn');        
  else sfx('open');
}
let tt; const toast = m => {
  const t = $('#toast'); t.innerHTML = m; t.hidden = false;
  clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2400);
  
  const bad = /kurang|tidak|gagal|salah|belum|khusus|terlalu|penuh|habis|war|batal/i.test(String(m));
  sfx(bad ? 'err' : 'pick');
};

let konfResolve = null;
function konfirmasi(pesan, opsi) {
  const o = opsi || {};
  const box = $('#konf');
  if (!box) return Promise.resolve(typeof window !== 'undefined' && window.confirm ? confirm(pesan) : true);
  $('#konfT').textContent = o.judul || 'Konfirmasi';
  $('#konfP').textContent = pesan || '';
  $('#konfYes').textContent = o.ya || 'Ya, lanjutkan';
  $('#konfNo').textContent = o.tidak || 'Batal';
  box.hidden = false;
  sfx('click');
  $('#konfYes').focus();
  return new Promise(res => { konfResolve = res; });
}
function konfJawab(jawab) {
  const box = $('#konf');
  if (box) box.hidden = true;
  const r = konfResolve; konfResolve = null;
  sfx(jawab ? 'pick' : 'back');
  if (r) r(jawab);
}

const MOMEN_SUARA = {
  tekan: 'terpilih', gerak: 'bergerak', kena: 'terkena serangan', serang: 'menyerang',
  ult: 'menggunakan ultimate', skill: 'menggunakan skill', menang: 'menang', kalah: 'kalah'
};
const SUARA_FALLBACK = {
  tekan: 'Aku siap melangkah.', gerak: 'Bergerak sekarang.', kena: 'Ugh...!', serang: 'Rasakan ini!',
  ult: 'Inilah kekuatanku!', skill: 'Saatnya!', menang: 'Kita menang!', kalah: 'Maaf... aku belum kuat...'
};
function suaraTeks(cid, momen) {
  const c = charById(cid);
  if (c && c.voice && c.voice[momen]) return String(c.voice[momen]);
  return SUARA_FALLBACK[momen] || SUARA_FALLBACK.tekan;
}
let suaraT = 0, suaraTimer = null;
function suara(cid, momen) {
  const box = $('#suara'); if (!box) return;
  const c = charById(cid); if (!c) return;
  const now = Date.now();
  if (now - suaraT < 900) return;
  suaraT = now;
  $('#suaraFace').innerHTML = face(c, 54);
  $('#suaraN').textContent = c.name + ' · ' + (MOMEN_SUARA[momen] || 'berbicara');
  $('#suaraT').textContent = suaraTeks(cid, momen);
  box.hidden = false;
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  clearTimeout(suaraTimer);
  suaraTimer = setTimeout(() => { box.hidden = true; }, 2800);
}
function suaraMatikan() {
  const box = $('#suara'); if (box) box.hidden = true;
  clearTimeout(suaraTimer);
}


function mtab(p) {
  curTab = p;
  $$('#tabbar .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === p));
  $$('#menuPanels .mpanel').forEach(e => e.hidden = e.dataset.p !== p);
}

function quickOpen(kind, id) {
  go(kind === 'c' ? 'roster' : 'armory');
  setTimeout(() => kind === 'c' ? rdet(id) : wdet(id), 0);
}
function renderQuick() {
  const box = $('#qinner'), bar = $('#quickbar'); if (!box || !bar) return;
  const items = [];
  punyaChar().forEach(id => { const c = charById(id); if (c) items.push({ i: c.image, n: (c.name || '?')[0], k: 'c', id: c.id, t: c.name }); });
  punyaWeap().forEach(id => { const w = weaponById(id); if (w) items.push({ i: w.image, n: 'S', k: 'w', id: w.id, t: w.name }); });
  if (!items.length) { bar.hidden = true; box.innerHTML = ''; return; }
  bar.hidden = false;
  box.innerHTML = items.map(t => `<button class="qi" onclick="quickOpen('${t.k}',${t.id})" title="${esc(t.t)}">${t.i ? `<img src="${esc(t.i)}" alt="">` : ''}<b>${t.n}</b></button>`).join('');
}
R.menu = () => { mtab(curTab); renderQuick(); };


function authUI() {
  $$('.adm').forEach(e => e.hidden = !ME.admin);
  $('#authBtn').textContent = ME.user ? 'Keluar (' + ME.user + ')' : 'Masuk';
  $('#whoami').textContent = ME.user ? ME.user + (ME.admin ? ' — admin' : '') : 'Tamu (tersimpan di browser)';
  $('#gachaWho').textContent = ME.user
    ? 'Progres tersimpan di akun ' + ME.user + '.'
    : 'Masuk agar hasil pemanggilan, senjata, dan peringkat tersimpan di akun.';
}
async function doAuth(kind) {
  const fd = new FormData();
  fd.append('username', $('#lu').value.trim()); fd.append('password', $('#lp').value);
  if (kind === 'register') fd.append('guest', JSON.stringify({ own: S.own, ownW: S.ownW, eq: S.eq, gem: S.gem, storyDone: S.storyDone }));
  const r = await api(kind === 'register' ? 'register' : 'login', fd);
  if (r.error) return toast(r.error);
  ME = r; applyProfile(r.profile);
  S.own = S.own.filter(id => charById(id)); S.ownW = S.ownW.filter(id => weaponById(id));
  save(); authUI(); toast(ME.admin ? 'Masuk sebagai admin ' + ME.user : 'Selamat datang, ' + ME.user); go('menu');
}
async function authClick() {
  if (ME.user) {
    await api('logout', new FormData());
    ME = { admin: false, user: null, profile: null }; S.online = false;
    authUI(); save(); toast('Sudah keluar. Progres terakhir tetap tersimpan di browser.');
  } else go('login');
}


let LN = [], li = 0, curCh = null, curEv = null, typing, slot = { L: null, R: null }, lastSide = 'R';
const benderaTamu = on => `<svg class="bend" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1v14" stroke="#2a1c0c" stroke-width="1.6" fill="none"/><path d="M4 2h8l-2 3 2 3H4z" fill="${on ? '#ffd75e' : '#8a7a5a'}" stroke="#2a1c0c" stroke-width="1"/></svg>`;
let storyType = 'utama', stBab = 0;
function stType(t) {
  storyType = t;
  stBab = 0;
  const a = $('#stUtama'), b = $('#stSamping');
  if (a) a.classList.toggle('on', t === 'utama');
  if (b) b.classList.toggle('on', t === 'samping');
  sfx('pick');
  R.story();
}
function babDari(tipe) {
  const arr = DB.story.filter(c => (c.tipe || 'utama') === tipe).slice()
    .sort((x, y) => (+x.sort_order || 0) - (+y.sort_order || 0) || (+x.id || 0) - (+y.id || 0));
  const sudah = tipe === 'utama' ? (+S.storyDone || 0) : (+S.sideDone || 0);
  return arr.map((c, i) => ({
    c: c, pos: i + 1, idx: DB.story.indexOf(c),
    rampung: i + 1 <= sudah,
    terkunci: !ME.admin && i + 1 > sudah + 1
  }));
}
function posBab(c) {
  const tipe = (c && c.tipe) || 'utama';
  const arr = DB.story.filter(x => (x.tipe || 'utama') === tipe)
    .sort((x, y) => (+x.sort_order || 0) - (+y.sort_order || 0) || (+x.id || 0) - (+y.id || 0));
  return arr.findIndex(x => +x.id === +c.id) + 1;
}
function noBab(c, pos, tipe) {
  return tipe === 'samping' ? pos : Math.floor((pos - 1) / 40) + 1;
}
function babGrup(tipe) {
  const arr = babDari(tipe);
  const g = [];
  arr.forEach(x => {
    const n = noBab(x.c, x.pos, tipe);
    let b = g.find(z => z.no === n);
    if (!b) { b = { no: n, anggota: [], selesai: 0 }; g.push(b); }
    b.anggota.push(x);
    if (x.rampung) b.selesai++;
  });
  const meta = (globalThis.ARCS || []);
  return g.map(b => {
    const m = meta.find(a => a.tipe === tipe && +a.no === b.no) || {};
    const first = b.anggota.length ? b.anggota[0].c : {};
    const teks = String(first.script || '').split('\n').filter(l => l && l[0] !== '@').join(' ').trim();
    b.nama = m.nama || first.title || ('Bab ' + b.no);
    b.desc = m.desc || (teks ? (teks.length > 150 ? teks.slice(0, 147) + '...' : teks) : 'Belum ada deskripsi untuk bab ini.');
    b.image = m.image || first.image || 'art/banner_fajar.svg';
    b.total = b.anggota.length;
    b.terkunci = b.anggota.every(x => x.terkunci);
    b.berikut = b.anggota.some(x => !x.rampung && !x.terkunci);
    b.rampungSemua = b.anggota.every(x => x.rampung);
    return b;
  });
}
function bukaBab(n) {
  stBab = n;
  sfx(n ? 'pick' : 'back');
  R.story();
  const sc = document.querySelector('#story');
  if (sc) sc.scrollTop = 0;
}
R.story = () => {
  const kotak = $('#chapters');
  const judul = $('#stHint');
  const daftar = $('#babList'), kepala = $('#babHead'), legenda = $('#stLegend');
  const arr = babDari(storyType);
  if (!arr.length) {
    if (daftar) { daftar.hidden = false; daftar.innerHTML = '<p class="hint">Belum ada bab di bagian ini. Tambahkan lewat Studio, tab Cerita.</p>'; }
    if (kotak) kotak.hidden = true;
    if (kepala) kepala.hidden = true;
    if (legenda) legenda.hidden = true;
    if (judul) judul.textContent = 'Belum ada isi untuk bagian ini.';
    return;
  }
  const grup = babGrup(storyType);
  if (stBab && !grup.some(g => g.no === stBab)) stBab = 0;
  const selesaiN = arr.filter(x => x.rampung).length;
  const pct = arr.length ? Math.round(selesaiN / arr.length * 100) : 0;
  const prog = $('#stProg');
  const g = stBab ? grup.find(z => z.no === stBab) : null;
  if (prog) prog.innerHTML = g
    ? `<b>Bab ${g.no} &middot; ${esc(g.nama)}</b>
       <span>${g.selesai} / ${g.total} stage selesai</span>
       <i class="stbar"><u style="width:${g.total ? Math.round(g.selesai / g.total * 100) : 0}%"></u></i>`
    : `<b>${storyType === 'utama' ? 'Story Utama' : 'Side Story'} &middot; ${grup.length} Bab</b>
       <span>${selesaiN} / ${arr.length} stage selesai</span>
       <i class="stbar"><u style="width:${pct}%"></u></i>`;
  if (judul) judul.textContent = g
    ? 'Stage di dalam bab ini. Taklukkan stage untuk membuka stage berikutnya.'
    : 'Pilih bab untuk membuka daftar stage-nya. Bab yang belum terbuka tidak ditampilkan.';

  if (!g) {
    if (daftar) daftar.hidden = false;
    if (kotak) kotak.hidden = true;
    if (kepala) kepala.hidden = true;
    if (legenda) legenda.hidden = true;
    const tampil = grup.filter(z => !z.terkunci);
    if (daftar) daftar.innerHTML = tampil.length ? tampil.map(z => `
      <button type="button" class="babcard" onclick="bukaBab(${z.no})" aria-label="${esc(z.nama)}">
        <span class="babArt"><img src="${z.image}" alt=""><i class="babNo">BAB ${z.no}</i></span>
        <span class="babBody">
          <b class="babT">${esc(z.nama)}</b>
          <span class="babDesc">${esc(z.desc)}</span>
          <span class="babMeta">${z.selesai}/${z.total} stage selesai${z.rampungSemua ? ' &middot; SELESAI' : (z.berikut ? ' &middot; siap dimainkan' : '')}</span>
        </span>
      </button>`).join('') : '<p class="hint">Belum ada bab terbuka di bagian ini.</p>';
    return;
  }

  if (daftar) daftar.hidden = true;
  if (kotak) kotak.hidden = false;
  if (kepala) kepala.hidden = false;
  if (legenda) legenda.hidden = false;
  kepala.innerHTML = `
    <button type="button" class="btn alt sm bhBack" onclick="bukaBab(0)">&larr; Kembali ke daftar Bab</button>
    <div class="bhRow">
      <img class="bhArt" src="${g.image}" alt="">
      <div class="bhBody">
        <b>Bab ${g.no} &middot; ${esc(g.nama)}</b>
        <p>${esc(g.desc)}</p>
        <span class="bhMeta">${g.selesai} / ${g.total} stage selesai</span>
      </div>
    </div>`;

  const tampil = g.anggota.filter(x => !x.terkunci);
  if (!tampil.length) {
    kotak.innerHTML = '<p class="hint">Belum ada stage terbuka di bab ini.</p>';
    return;
  }
  kotak.innerHTML = tampil.map(x => {
    const c = x.c;
    const foes = String(c.enemies || '').split(',').map(Number).filter(id => charById(id));
    const meta = [
      foes.length ? 'Lawan: ' + foes.map(id => charById(id).name).join(', ') : 'Adegan tanpa pertempuran',
      'AI ' + (+c.difficulty || 1),
      '+' + (+c.reward || 0) + ' permata',
      x.rampung ? 'SUDAH DITAKLUKKAN' : 'BERIKUTNYA'
    ].join(' · ');
    const tanda = x.rampung
      ? `<i class="chapFlag">${benderaTamu(1)}</i>`
      : '<i class="chapDot"></i>';
    return `<button class="btn chap${x.rampung ? ' done' : ' now'}" onclick="play(${x.idx})"
      title="${esc(c.title)}" aria-label="${esc(c.title)}">
      <span class="chapNo"><b>${x.pos}</b>${tanda}</span>
      <span class="chapBody"><b class="chapT">${esc(c.title)}</b><span class="chapmeta">${esc(meta)}</span></span>
      <span class="foes">${foes.slice(0, 5).map(id => face(charById(id), 34)).join('')}</span>
    </button>`;
  }).join('');
};
const coinById = id => (DB.coins || []).find(c => +c.id === +id);
const coinNama = id => { const c = coinById(id); return c ? c.nama : ('Mata uang #' + id); };
const coinSaldo = id => (+S.coins[id] || 0);
const uangTeks = n => String((+n || 0).toLocaleString('id-ID'));
const hadiahTeks = h => {
  if (h.tipe === 'uang') return '<span class="hchip uang">' + (+h.jumlah || 0) + ' Permata</span>';
  if (h.tipe === 'matauang') return '<span class="hchip mata">' + (+h.jumlah || 0) + ' ' + esc(coinNama(h.id)) + '</span>';
  if (h.tipe === 'hero') { const c = charById(h.id); return '<span class="hchip hero">' + (c ? esc(c.name) : 'Hero #' + h.id) + '</span>'; }
  const w = weapById(h.id);
  return '<span class="hchip senjata">' + (w ? esc(w.name) : 'Senjata #' + h.id) + '</span>';
};
function evMataDipakai(ev) {
  const out = [];
  ev.forEach(e => {
    (e.hadiah || []).forEach(h => {
      const id = h.tipe === 'matauang' ? +h.id : 0;
      if (id && out.indexOf(id) < 0) out.push(id);
    });
    const m = e.shop && +e.shop.aktif === 1 ? +e.shop.mata : 0;
    if (m && out.indexOf(m) < 0) out.push(m);
  });
  return out.filter(id => !!coinById(id));
}
function evShopAda(e) { return !!(e.shop && +e.shop.aktif === 1 && Array.isArray(e.shop.item) && e.shop.item.length); }
function evCoinBar() {
  const el = $('#evCoin');
  if (!el) return;
  const ev = (DB.events || []).filter(e => +e.aktif === 1);
  const idm = evMataDipakai(ev);
  el.hidden = !idm.length;
  if (!idm.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<span class="evcoinLbl">Mata uang event</span>' + idm.map(id =>
    '<span class="mchip"><i class="mcDot"></i>' + esc(coinNama(id)) + ' <b>' + uangTeks(coinSaldo(id)) + '</b></span>').join('');
}
function bukaShop(id) {
  const ev = (DB.events || []).find(e => +e.id === +id);
  const box = $('#shopBox');
  if (!box) return;
  if (!ev || !evShopAda(ev)) { box.hidden = true; return toast('Event ini tidak punya Shop.'); }
  const mata = +ev.shop.mata || 0;
  const namaMata = coinNama(mata);
  const sisa = coinSaldo(mata);
  const item = ev.shop.item;
  const isi = item.map((it, i) => {
    const harga = +it.harga || 0;
    let ket = '', punya = false;
    if (it.tipe === 'hero') { const c = charById(it.id); ket = c ? c.name + ' · ' + c.rarity + ' bintang' : 'Hero #' + it.id; punya = !!(c && S.own.includes(+c.id)); }
    else if (it.tipe === 'senjata') { const w = weapById(it.id); ket = w ? w.name + ' · ' + w.rarity + ' bintang' : 'Senjata #' + it.id; punya = !!(w && S.ownW.includes(+w.id)); }
    else if (it.tipe === 'matauang') ket = '+' + uangTeks(it.jumlah) + ' ' + coinNama(it.id);
    else ket = '+' + uangTeks(it.jumlah) + ' Permata';
    const muat = sisa >= harga && !punya;
    const label = punya ? 'Dimiliki' : (sisa < harga ? 'Kurang' : 'Beli');
    return '<div class="shopItem' + (muat ? '' : ' off') + '">'
      + '<span class="siBody"><b>' + esc(it.judul || ket) + '</b><small>' + esc(ket) + '</small></span>'
      + '<span class="siPrice">' + uangTeks(harga) + ' ' + esc(namaMata) + '</span>'
      + '<button class="btn sm" ' + (muat ? '' : 'disabled ') + 'onclick="beliShop(' + ev.id + ',' + i + ')">' + label + '</button>'
      + '</div>';
  }).join('');
  box.innerHTML = '<div class="shopBoxIn">'
    + '<div class="shopHead"><b>Shop &middot; ' + esc(ev.name) + '</b>'
    + '<button class="btn alt sm" onclick="tutupShop()">Tutup</button></div>'
    + '<p class="shopSaldo">Saldo ' + esc(namaMata) + ': <b>' + uangTeks(sisa) + '</b></p>'
    + '<div class="shopList">' + (isi || '<p class="hint">Belum ada item di Shop ini.</p>') + '</div>'
    + '</div>';
  box.hidden = false;
}
function tutupShop() { const b = $('#shopBox'); if (b) b.hidden = true; }
async function beliShop(id, i) {
  const ev = (DB.events || []).find(e => +e.id === +id);
  if (!ev || !evShopAda(ev)) return toast('Event ini tidak punya Shop.');
  const it = (ev.shop.item || [])[i];
  if (!it) return toast('Item Shop tidak ditemukan.');
  const mata = +ev.shop.mata || 0;
  const namaMata = coinNama(mata);
  if (coinSaldo(mata) < (+it.harga || 0)) return toast(namaMata + ' tidak cukup untuk membeli item ini.');
  if (S.online) {
    const fd = new FormData();
    fd.append('id', id); fd.append('i', i);
    const r = await act('eshop_buy', fd);
    if (r) { toast(r.msg); evCoinBar(); bukaShop(id); }
    return;
  }
  const rincian = [];
  if (it.tipe === 'hero') {
    const c = charById(it.id);
    if (!c) return toast('Karakter untuk item ini tidak ditemukan.');
    if (S.own.includes(+c.id)) return toast('Karakter itu sudah kamu miliki.');
    S.own.push(+c.id); rincian.push(c.name);
  } else if (it.tipe === 'senjata') {
    const w = weapById(it.id);
    if (!w) return toast('Senjata untuk item ini tidak ditemukan.');
    if (S.ownW.includes(+w.id)) return toast('Senjata itu sudah kamu miliki.');
    S.ownW.push(+w.id); rincian.push(w.name);
  } else if (it.tipe === 'matauang') {
    if (!coinById(it.id)) return toast('Mata uang tujuan tidak ditemukan.');
    const n = +it.jumlah || 0;
    S.coins[+it.id] = Math.max(0, coinSaldo(it.id) + n);
    rincian.push(n + ' ' + coinNama(it.id));
  } else if (it.tipe === 'uang') {
    const n = +it.jumlah || 0;
    S.gem += n; rincian.push(n + ' permata');
  } else return toast('Jenis item Shop tidak dikenal.');
  S.coins[mata] = Math.max(0, coinSaldo(mata) - (+it.harga || 0));
  save();
  toast('Berhasil membeli ' + (it.judul || rincian.join(', ')) + ': ' + rincian.join(', ') + '.');
  evCoinBar(); bukaShop(id);
}
R.event = () => {
  const kotak = $('#evlist');
  const ev = (DB.events || []).filter(e => +e.aktif === 1);
  evCoinBar();
  if (!ev.length) {
    kotak.innerHTML = '<p class="hint">Belum ada event aktif. Tambahkan lewat Studio, tab Event.</p>';
    return;
  }
  kotak.innerHTML = ev.map(e => {
    const terbuka = ME.admin || (+e.syarat || 0) <= S.storyDone;
    const sudah = S.eventsDone.includes(+e.id);
    const tombol = sudah
      ? '<span class="hchip selesai">Sudah diklaim</span>'
      : terbuka
        ? '<button class="btn evMulai" onclick="playEvent(' + e.id + ')">Mulai Event</button>'
        : '<button class="btn evMulai" disabled>Bab ' + (+e.syarat || 0) + ' dulu</button>';
    const toko = terbuka && evShopAda(e)
      ? '<button class="btn alt evShop" onclick="bukaShop(' + e.id + ')">Shop</button>' : '';
    const par = terbuka && !sudah
      ? '<p class="hint">Skenario ' + String(e.skenario || '').split('\n').filter(Boolean).length + ' baris. Klaim hadiah setelah skenario selesai.</p>'
      : '';
    const adaMata = (e.hadiah || []).some(h => h.tipe === 'matauang');
    const infoMata = adaMata
      ? '<p class="evmata">Event ini mengeluarkan <b>' + esc(coinNama((e.hadiah.find(h => h.tipe === 'matauang') || {}).id)) + '</b> sebagai mata uang baru.</p>'
      : '';
    return '<div class="evcard' + (sudah ? ' fin' : terbuka ? ' open' : ' shut') + '">'
      + '<div class="evhead"><b>' + esc(e.name) + '</b>'
      + '<span class="evchip">' + (sudah ? 'SELESAI' : terbuka ? 'AKTIF' : 'TERKUNCI') + '</span></div>'
      + '<p class="chapmeta">' + esc(e.desc) + '</p>'
      + '<p class="evneed">Syarat: selesaikan bab utama ke-' + (+e.syarat || 0) + '</p>'
      + '<div class="evreward"><small>Hadiah</small>' + (e.hadiah || []).map(hadiahTeks).join('') + '</div>'
      + infoMata + par
      + '<div class="evfoot">' + toko + tombol + '</div>'
      + '</div>';
  }).join('');
};

function muatNaskah(str) {
  return String(str || '').split('\n').map(s => s.trim()).filter(s => s && s[0] !== '#').map(s => {
    if (/^@bg\s/i.test(s)) return { bg: s.slice(3).trim().toLowerCase() };
    const k = s.indexOf(':'); return k > 0 ? { who: s.slice(0, k).trim(), txt: s.slice(k + 1).trim() } : { who: '', txt: s };
  });
}
function bukaSkenario() {
  li = 0; slot = { L: null, R: null }; $('#scene').dataset.bg = 'field';
  go('scene'); $('#dlg').hidden = false; line();
}
function play(i) {
  curCh = DB.story[i];
  curEv = null;
  LN = muatNaskah(curCh.script);
  bukaSkenario();
}
function playEvent(id) {
  const ev = (DB.events || []).find(e => +e.id === +id);
  if (!ev) return toast('Event tidak ditemukan.');
  if (ev.aktif !== 1) return toast('Event ini sudah berakhir.');
  const terbuka = ME.admin || (+ev.syarat || 0) <= S.storyDone;
  if (!terbuka) return toast('Selesaikan bab cerita utama ke-' + (+ev.syarat || 0) + ' dulu untuk membuka event ini.');
  if (S.eventsDone.includes(+ev.id)) return toast('Hadiah event ini sudah pernah kamu klaim.');
  curEv = +ev.id;
  curCh = { id: 0, title: ev.name, battle: 0, script: ev.skenario };
  LN = muatNaskah(curCh.script);
  bukaSkenario();
}
function selesaiEvent() {
  const id = curEv; curEv = null;
  if (id == null) return;
  if (S.online) {
    const fd = new FormData();
    fd.append('id', id);
    act('event_claim', fd).then(r => {
      go('event');
      if (r && r.msg) toast(r.msg);
    });
    return;
  }
  const ev = (DB.events || []).find(e => +e.id === +id);
  if (!ev) { go('event'); return; }
  const rincian = [];
  (ev.hadiah || []).forEach(h => {
    if (h.tipe === 'uang') { const n = +h.jumlah || 0; S.gem += n; rincian.push(n + ' permata'); }
    else if (h.tipe === 'hero') { const c = charById(h.id); if (c && !S.own.includes(+c.id)) { S.own.push(+c.id); rincian.push(c.name); } }
    else if (h.tipe === 'senjata') { const w = weapById(h.id); if (w && !S.ownW.includes(+w.id)) { S.ownW.push(+w.id); rincian.push(w.name); } }
    else if (h.tipe === 'matauang') { if (coinById(h.id)) { const n = +h.jumlah || 0; S.coins[+h.id] = Math.max(0, coinSaldo(h.id) + n); rincian.push(n + ' ' + coinNama(h.id)); } }
  });
  S.eventsDone.push(+ev.id);
  save();
  go('event');
  toast('Event selesai. Hadiah: ' + (rincian.join(', ') || 'tanpa tambahan') + '.');
}
function line() {
  clearInterval(typing);
  while (LN[li] && LN[li].bg !== undefined) { $('#scene').dataset.bg = LN[li].bg; li++; }
  if (li >= LN.length) { $('#dlg').hidden = true; if (curEv != null) return selesaiEvent(); return +curCh.battle ? setup('STORY') : selesaiBab(); }
  const l = LN[li], c = DB.chars.find(x => x.name.toLowerCase() === l.who.toLowerCase());
  if (c && slot.L !== c.id && slot.R !== c.id) { const s = !slot.L ? 'L' : !slot.R ? 'R' : lastSide === 'L' ? 'R' : 'L'; slot[s] = c.id; }
  if (c) lastSide = slot.L === c.id ? 'L' : 'R';
  $('#stand').innerHTML = ['L', 'R'].map(s => {
    const ch = charById(slot[s]);
    return `<div class="slot ${s} ${ch && c && ch.id === c.id ? 'on' : 'dim'}">${ch ? face(ch, 220) : ''}</div>`;
  }).join('');
  $('#who').textContent = l.who; $('#who').hidden = !l.who;
  let n = 0; $('#txt').textContent = '';
  typing = setInterval(() => { $('#txt').textContent = l.txt.slice(0, ++n); if (n >= l.txt.length) clearInterval(typing); }, 22);
}
async function selesaiBab() {
  const ch = curCh, tipe = (ch.tipe || 'utama');
  const kunci = tipe === 'utama' ? 'storyDone' : 'sideDone';
  const pos = posBab(ch);
  if (S.online) {
    const fd = new FormData();
    fd.append('chapter_id', ch.id);
    const r = await act('chapter_done', fd);
    go('story');
    if (r && r.msg) toast(r.msg);
    return;
  }
  const sudah = +S[kunci] || 0;
  const hadiah = pos > sudah ? (+ch.reward || 0) : 0;
  const emas = Math.round(hadiah / 2);
  S[kunci] = Math.max(sudah, pos);
  S.gem += hadiah;
  S.gold += emas;
  save();
  toast(hadiah ? 'Bab selesai. Hadiah ' + hadiah + ' permata' + (emas ? ' dan ' + emas + ' gold' : '') + '.' : 'Bab sudah dibaca sebelumnya.');
  go('story');
}

function nextLine() {
  const l = LN[li]; if (!l) return;
  if ($('#txt').textContent.length < l.txt.length) { clearInterval(typing); $('#txt').textContent = l.txt; return; }
  li++; line();
}



R.roster = () => {
  $('#rlist').innerHTML = DB.chars.map(c => {
    const o = hasChar(c.id);
    const d = nDup(c.id);
    return `<div class="card r${c.rarity} ${o ? '' : 'off'}" ${o ? `onclick="rdet(${c.id})"` : ''}>
      ${face(c, 64)}<b>${esc(c.name)}${d ? `<i class="dupx">(${d})</i>` : ''}</b>${stars(c.rarity)}<small>${o ? esc(c.title) + (d ? ' · duplikat +' + d + '% stat' : '') : 'Terkunci — dapatkan di Pemanggilan'}</small></div>`;
  }).join('');
  const first = punyaChar().find(id => charById(id));
  $('#rdet').innerHTML = first ? '' : 'Pilih karakter dari daftar.';
  if (first) rdet(first);
};
let slotOpen = -1;
function usedBy(wid) {
  for (const cid in S.eq) { const i = S.eq[cid].indexOf(+wid); if (i >= 0) return { cid: +cid, slot: i }; }
  return null;
}
function loadoutFor(cid, eq) {
  const slots = (eq && eq[cid]) || [];
  const o = { atk: 0, hp: 0, crit: 0, passives: [], weaps: [], dupHp: 0, dupAtk: 0, skillBuff: 0, skillStatus: '' };
  slots.forEach(wid => {
    const w = weaponById(wid); if (!w) return;
    o.weaps.push(w);
    o.atk += +w.w_atk || 0; o.hp += +w.w_hp || 0; o.crit += +w.w_crit || 0;
    if (w.passive && +w.true_for === +cid) o.passives.push(w.passive);
    if (+w.true_for === +cid) {
      o.skillBuff += +w.skill_buff || 0;
      if (w.status && !o.skillStatus) o.skillStatus = w.status;
    }
  });
  const c = charById(cid);
  if (c) {
    const k = dupKali(cid);
    o.dupHp = Math.round(c.hp * (k - 1));
    o.dupAtk = Math.round(c.atk * (k - 1));
  }
  return o;
}

function abl(el) {
  $$('#rdet .ab').forEach(b => b.classList.toggle('sel', b === el));
  const box = $('#ablBox'); if (box) box.innerHTML = `<b>${el.querySelector('b').textContent}</b><br>${el.dataset.d}`;
  sfx('pick');
}
function keBawah(sel) {
  if (innerWidth > 900) return;
  const el = document.querySelector(sel);
  if (!el || !el.getBoundingClientRect) return;
  const sc = el.closest('.screen');
  if (!sc) return;
  const a = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
  sc.scrollTop += (a.top - b.top) - 58;
}

function rdet(id) {
  slotOpen = -1;
  const c = charById(id); if (!c) return;
  const eq = S.eq[c.id] || [0, 0, 0];
  const lo = loadoutFor(c.id, S.eq);
  const slots = eq.map((wid, i) => {
    const w = weaponById(wid);
    if (!w) return `<div class="eslot" onclick="openSlot(${c.id},${i})"><span class="empty">+</span><span>Slot ${i + 1} kosong</span></div>`;
    const trueW = +w.true_for === +c.id;
    return `<div class="eslot filled" title="Klik untuk melepas">${wface(w, 44)}<span>${esc(w.name)}</span>
      <small>${trueW ? 'SENJATA SEJATI' : '+ATK ' + w.w_atk + ' +HP ' + w.w_hp}</small>
      <button class="btn alt" style="padding:2px 6px;font-size:12px" onclick="event.stopPropagation();unequip(${c.id},${i})">Lepas</button></div>`;
  }).join('');
  const passList = lo.passives.map(k => PASSIVES[k]);
  const inna = PASSIVES[c.passive] || null;
  const sk = SKILLS[c.skill] || null;
  const trueW = DB.weapons.filter(w => w.passive && +w.true_for === c.id && hasWeap(w.id));
  const lockedW = DB.weapons.filter(w => w.passive && +w.true_for === c.id && !hasWeap(w.id));
  const ab = (tag, name, desc, cls) =>
    `<button type="button" class="ab ${cls}" data-d="${esc(desc || 'Belum diatur admin.')}" onclick="abl(this)">
       <small>${tag}</small><b>${esc(name || '—')}</b></button>`;
  
  const CARDS = [
    ab('Ultimate · ' + ULT_AP + ' AP', c.ult, ultDesk(c.ult), 'on'),
    ab('Skill aktif' + (sk ? ` · ${sk.ap} AP` : ''), sk ? sk.n : '', sk ? `${sk.d} Jeda ${sk.cd} giliran.` : '', sk ? 'on' : 'off'),
    ab('Pasif bawaan', inna ? inna.n : '', inna ? inna.d : '', inna ? 'on' : 'off'),
    ab('Pasif senjata sejati', passList.map(p => p.n).join(', '), passList.map(p => p.n + ': ' + p.d).join(' ') || (lockedW.length ? 'Butuh senjata sejati ' + lockedW.map(w => w.name).join(', ') + ' — belum dimiliki.' : 'Belum ada senjata sejati terpasang.'), passList.length ? 'on' : (lockedW.length ? 'off' : 'off')),
  ].join('');
  const lv = lvKarakter(c), maksLv = maxLvKarakter(c);
  const st = bintangKarakter(c), maksSt = maxBintang(c);
  const biLv = biayaLevel(c, lv), biSt = biayaBintang(c, st);
  const penuhLv = lv >= maksLv, penuhSt = st >= maksSt;
  const ss = statChar(c);
  $('#rdet').innerHTML = `
    <div class="row">${face(c, 92)}<div><h2>${esc(c.name)}</h2><small>${esc(c.title)} · ${esc(c.faction || '-')}</small>${starRow(st, maksSt)}</div></div>
    <div class="lvbox">
      <div class="lvTop"><b>Level ${lv}<small> / ${maksLv}</small></b><span class="lvGold">Gold <em>${uangTeks(S.gold)}</em></span></div>
      <i class="lvbar"><u class="${penuhLv ? 'full' : ''}" style="width:${Math.max(2, Math.round(lv / maksLv * 100))}%"></u></i>
      <div class="lvActs">
        <button type="button" class="btn sm" ${penuhLv ? 'disabled' : ''} onclick="naikLevel(${c.id})">${penuhLv ? 'Level penuh' : 'Naik Level · ' + uangTeks(biLv) + ' gold'}</button>
        <button type="button" class="btn alt sm" ${penuhSt ? 'disabled' : ''} onclick="naikBintang(${c.id})">${penuhSt ? 'Bintang penuh' : 'Naik Bintang · ' + uangTeks(biSt) + ' gold'}</button>
      </div>
    </div>
    <dl class="st"><dt>HP</dt><dd>${uangTeks(ss.hp)} ${lo.hp ? `<span class="chapmeta">(+${lo.hp})</span>` : ''}${lo.dupHp ? `<span class="chapmeta">dup +${lo.dupHp}</span>` : ''}</dd>
      <dt>ATK</dt><dd>${uangTeks(ss.atk)} ${lo.atk ? `<span class="chapmeta">(+${lo.atk})</span>` : ''}${lo.dupAtk ? `<span class="chapmeta">dup +${lo.dupAtk}</span>` : ''}</dd>
      <dt>AP</dt><dd>${c.ap}</dd>
      <dt>Batas pasukan</dt><dd>${juta(batasPasukan(c))} <span class="chapmeta">(maks ${uangTeks(+c.trps1 || 1000000)})</span></dd>
      <dt>CP</dt><dd>${juta(ss.cp)}</dd></dl>
    <b>Kemampuan <small style="font-weight:400;opacity:.75">— ketuk untuk penjelasan</small></b>
    <div class="abil">${CARDS}</div>
    <div class="passive on" id="ablBox">${inna ? `<b>${inna.n}</b><br>${inna.d}` : 'Ketuk salah satu kemampuan di atas.'}</div>
    <b>Senjata (${eq.filter(Boolean).length}/3)</b>
    <div class="eqrow">${slots}</div>
    ${lockedW.length ? `<div class="passive off"><b>Terkunci</b><br>Butuh senjata sejati ${lockedW.map(w => esc(w.name)).join(', ')}.</div>` : ''}
    ${c.backstory ? `<details class="det"><summary>Latar belakang</summary><div class="backstory">${esc(c.backstory)}</div></details>` : ''}`;
  keBawah('#rdet');
}
function openSlot(cid, i) {
  slotOpen = slotOpen === i ? -1 : i;
  if (slotOpen < 0) return rdet(cid);
  const det = $('#rdet');
  const box = document.createElement('div');
  box.id = 'slotBox';
  box.innerHTML = `<b>Pilih senjata untuk slot ${i + 1} (maks 3 per karakter)</b>
    <div class="pickbar">
      <input type="search" id="slotQ" placeholder="Cari senjata..." aria-label="Cari senjata untuk slot ini" autocomplete="off" spellcheck="false" oninput="slotList(${cid},${i})">
    </div>
    <div class="picker" id="slotList"></div>
    <button class="btn alt" onclick="slotOpen=-1;rdet(${cid})">Tutup</button>`;
  det.appendChild(box);
  slotList(cid, i);
  const q = $('#slotQ'); if (q) q.focus();
}
function slotList(cid, i) {
  const box = $('#slotList'); if (!box) return;
  const cur = S.eq[cid] || [0, 0, 0];
  const q = String(($('#slotQ') && $('#slotQ').value) || '').trim().toLowerCase();
  const semua = DB.weapons.filter(w => hasWeap(w.id));
  const cocok = semua.filter(w => !q || (w.name || '').toLowerCase().includes(q)
    || (WKIND[w.kind] || '').toLowerCase().includes(q));
  const sejati = +((charById(cid) || {}).id) || 0;
  const skor = w => {
    let s = 0;
    if (+w.true_for === sejati) s += 1000;
    if (+w.true_for) s += 100;
    s += (+w.rarity || 0) * 10;
    s += (+w.w_atk || 0) / 100;
    return -s;
  };
  const urut = cocok.slice().sort((a, b) => skor(a) - skor(b));
  if (!urut.length) {
    box.innerHTML = '<p class="hint kosongpencarian">Tidak ada senjata yang cocok dengan pencarian ini.</p>';
    return;
  }
  const punyaSejati = urut.filter(w => +w.true_for === sejati).length;
  const kepala = punyaSejati
    ? `<p class="hint rekom">★ <b>${punyaSejati} senjata sejati</b> untuk ${esc((charById(cid) || {}).name || '')} ada di urutan paling atas — pasif & statusnya hanya aktif untuknya.</p>`
    : '<p class="hint rekom">Tidak ada senjata sejati untuk karakter ini. Semua senjata tetap menambah statistik.</p>';
  box.innerHTML = kepala + urut.map(w => {
    const u = usedBy(w.id);
    const busy = u && u.cid !== cid;
    const on = cur[i] === +w.id;
    const trueUntuk = +w.true_for === sejati;
    return `<button class="wbtn ${busy ? 'used' : ''} ${on ? 'on' : ''}" ${busy ? 'disabled' : ''} onclick="pickWeapon(${cid},${i},${w.id})">
      ${wface(w, 36)}<span><b>${esc(w.name)}</b>${trueUntuk ? ' <i class="trueme">sejati</i>' : ''}<br><small>${WKIND[w.kind] || ''} · +ATK ${w.w_atk} +HP ${w.w_hp}${w.passive ? ' · pasif' : ''}</small></span></button>`;
  }).join('');
}
function pickWeapon(cid, i, wid) {
  const cur = [...(S.eq[cid] || [0, 0, 0])];
  const at = cur.indexOf(wid);
  if (at >= 0) cur[at] = 0;
  cur[i] = wid;
  doEquip(cid, cur);
}
async function unequip(cid, i) {
  const cur = [...(S.eq[cid] || [0, 0, 0])]; cur[i] = 0;
  doEquip(cid, cur);
}
async function doEquip(cid, slots) {
  if (S.online) {
    const fd = new FormData();
    fd.append('char_id', cid); fd.append('s1', slots[0]); fd.append('s2', slots[1]); fd.append('s3', slots[2]);
    const r = await act('equip', fd);
    if (!r) return;
    S.eq[cid] = slots.map(Number); save();
  } else {
    S.eq[cid] = slots.map(Number); save();
    toast('Senjata dipasang (tersimpan di browser)');
  }
  slotOpen = -1; rdet(cid);
}


function wFilter(el) {
  const box = $('#wChips');
  if (!box) return;
  [...box.querySelectorAll('.fchip')].forEach(b => b.classList.toggle('on', b === el));
  const f = $('#wF'); if (f) f.value = el.dataset.f || '';
  R.armory();
}
R.armory = () => {
  const q = String(($('#wQ') && $('#wQ').value) || '').trim().toLowerCase();
  const f = String(($('#wF') && $('#wF').value) || '');
  const daftar = DB.weapons.filter(w => {
    if (q && !(w.name || '').toLowerCase().includes(q) && !(WKIND[w.kind] || '').toLowerCase().includes(q)) return false;
    if (f === 'own') return hasWeap(w.id);
    if (f === 'true') return +w.true_for > 0;
    if (f === '5' || f === '4' || f === '3') return +w.rarity === +f;
    return true;
  });
  const hitung = $('#wCount');
  const punya = daftar.filter(w => hasWeap(w.id)).length;
  if (hitung) hitung.textContent = daftar.length
    ? daftar.length + ' senjata ditemukan · ' + punya + ' sudah kamu punya'
    : '';
  if (!daftar.length) {
    $('#wlist').innerHTML = '<p class="hint kosongpencarian">Tidak ada senjata yang cocok. Ubah kata kunci atau penyaringnya.</p>';
    $('#wdet').innerHTML = 'Tidak ada senjata untuk ditampilkan.';
    return;
  }
  $('#wlist').innerHTML = daftar.map(w => {
    const o = hasWeap(w.id);
    const d = nDupW(w.id);
    return `<div class="card r${w.rarity} ${o ? '' : 'off'}" ${o ? `onclick="wdet(${w.id})"` : ''}>
      ${wface(w, 64)}<b>${esc(w.name)}${d ? `<i class="dupx">(${d})</i>` : ''}</b>${stars(w.rarity)}<small>${o ? (WKIND[w.kind] || '') + (d ? ' · duplikat +' + d + '%' : '') : 'Terkunci'}</small></div>`;
  }).join('');
  const first = daftar.find(w => hasWeap(w.id)) || daftar[0];
  if (first && hasWeap(first.id)) wdet(first.id);
  else if (first) $('#wdet').innerHTML = 'Senjata ini belum kamu punya. Buka lewat Pemanggilan.';
};
function wdet(id) {
  const w = weaponById(id); if (!w) return;
  const owner = w.true_for ? charById(w.true_for) : null;
  const u = usedBy(w.id);
  const p = w.passive ? PASSIVES[w.passive] : null;
  $('#wdet').innerHTML = `
    <div class="row">${wface(w, 110)}<div><h2>${esc(w.name)}</h2><small>${WKIND[w.kind] || w.kind}</small>${stars(w.rarity)}</div></div>
    <dl class="st"><dt>ATK</dt><dd>+${w.w_atk}</dd><dt>HP</dt><dd>+${w.w_hp}</dd><dt>Kritis</dt><dd>+${w.w_crit}%</dd></dl>
    ${w.skill_buff || w.status ? `<dl class="st"><dt>Buff skill</dt><dd>+${w.skill_buff || 0}%</dd><dt>Status saat skill</dt><dd>${w.status ? esc(w.status) : '—'}</dd></dl>` : ''}
    ${owner ? `<p><small>Senjata sejati milik <b>${esc(owner.name)}</b>. Pasif, buff skill, dan status hanya aktif saat dipakai ${esc(owner.name)}. Satu karakter boleh punya maksimal 3 senjata sejati.</small></p>`
            : `<p><small>Bukan senjata sejati siapa pun — hanya menambah statistik.</small></p>`}
    ${p ? `<div class="passive ${w.passive && +w.true_for && hasChar(+w.true_for) ? 'on' : 'off'}"><b>${p.n}</b><br>${p.d}</div>` : '<div class="passive off">Tanpa skill pasif.</div>'}
    <p><small>${u ? 'Sedang dipakai: ' + esc(charById(u.cid) ? charById(u.cid).name : '-') : 'Tidak dipakai.'}</small></p>`;
  keBawah('#wdet');
}


let LB_TOP = [];

R.profil = () => {
  const pilih = S.photo && hasChar(S.photo) ? S.photo : (punyaChar()[0] || 0);
  const c = charById(pilih);
  $('#pfPhoto').innerHTML = c ? face(c, 96) : '<div class="face">?</div>';
  $('#pfName').textContent = ME.user || 'Pemain Tamu';
  $('#pfBio').textContent = S.bio || 'Belum ada deskripsi.';
  const bio = $('#pfBioIn'); if (bio) bio.value = S.bio || '';
  const s = profilStatS();
  const terakhir = S.lastUsed.map(id => (charById(id) || {}).name).filter(Boolean);
  const rows = [
    ['Username', ME.user || 'Pemain Tamu'],
    ['Level akun', levelAkun()],
    ['Poin peringkat', S.rankPts + ' (' + tierOf(S.rankPts).n + ')'],
    ['Menang / kalah', S.wins + ' / ' + S.losses],
    ['Bab utama / samping', S.storyDone + ' / ' + S.sideDone],
    ['Koleksi (karakter / senjata)', S.own.length + ' / ' + S.ownW.length],
    ['Karakter dipakai terakhir', terakhir.length ? terakhir.join(', ') : '—'],
    ['CP tim', juta(cpTim())],
    ['Foto profil', c ? c.name : '—']
  ];
  $('#pfInfo').innerHTML = rows.map(r => `<dt>${r[0]}</dt><dd>${esc(String(r[1]))}</dd>`).join('');
  const punya = punyaChar().map(id => charById(id)).filter(Boolean);
  $('#pfPick').innerHTML = punya.length ? punya.map(ch => `
    <button type="button" class="wbtn ${+S.photo === +ch.id ? 'on' : ''}" onclick="pilihFoto(${ch.id})">
      ${face(ch, 44)}<span><b>${esc(ch.name)}</b><br><small>CP ${juta(cpKarakter(ch))}</small></span></button>`).join('')
    : '<p class="hint">Belum punya karakter untuk dijadikan foto.</p>';
};

function pilihFoto(id) {
  if (!hasChar(id)) return toast('Kamu belum memiliki karakter itu');
  S.photo = +id; save();
  if (S.online) {
    const f = new FormData();
    f.append('photo', id);
    SERVER('profile_save', f).then(() => {}).catch(() => {});
  }
  R.profil();
  toast('Foto profil diganti');
}
async function simpanProfil() {
  const teks = ($('#pfBioIn').value || '').slice(0, 160);
  S.bio = teks; save();
  if (S.online) {
    const f = new FormData();
    f.append('bio', teks);
    const r = await SERVER('profile_save', f);
    if (r && r.error) return;
  }
  R.profil();
  toast('Profil disimpan');
}

async function lihatProfil(i) {
  const nama = LB_TOP[i];
  if (!nama) return;
  const box = $('#lbInfo');
  box.hidden = false;
  box.innerHTML = '<p class="hint">Memuat profil ' + esc(nama) + '...</p>';
  const fp = new FormData();
  fp.append('name', nama);
  const r = await SERVER('profil', fp);
  if (r && r.error) { box.hidden = true; return toast(r.error); }
  const c = charById(r.photo);
  const tim = (r.last_used || []).map(id => charById(id)).filter(Boolean);
  box.innerHTML = `
    <div class="pfTop"><button class="btn alt sm" onclick="$('#lbInfo').hidden=true">Tutup</button></div>
    <div class="pfHead">${c ? face(c, 76) : '<div class="face">?</div>'}
      <div class="pfName"><h3>${esc(r.name)}</h3>
        <small>Peringkat #${r.rank} · level ${r.level} · ${r.pts} poin</small>
        <small>${r.wins} menang / ${r.losses} kalah${r.npc ? ' · AI' : ''}</small></div></div>
    ${r.bio ? `<p class="hint">“${esc(r.bio)}”</p>` : ''}
    <dl class="st"><dt>CP tim</dt><dd>${juta(r.cp)}</dd><dt>Jumlah karakter</dt><dd>${tim.length}</dd></dl>
    <b>10 karakter terakhir dipakai</b>
    <div class="pfTim">${tim.length ? tim.map(ch => `<div class="pfCh">${face(ch, 46)}<span>${esc(ch.name)}<br><small>CP ${juta(cpKarakterDiData(ch, r))}</small></span></div>`).join('') : '<p class="hint">Belum ada catatan.</p>'}</div>`;
}
function cpKarakterDiData(ch, r) {
  const stat = profilStat({ wins: r.wins, losses: r.losses, rank_pts: r.pts, story_done: 0 });
  return cpKarakterDari(dbStat(), ch, stat);
}

R.ranked = () => {
  const t = tierOf(S.rankPts);
  $('#myrank').innerHTML = `<div class="mycard"><span class="tierbadge" style="background:${t.c}">${t.n}</span>
    <b>${S.rankPts} poin</b><span>${S.wins} menang / ${S.losses} kalah</span></div>`;
  $('#lb').innerHTML = '<p class="hint">Memuat peringkat...</p>';
  api('leaderboard').then(r => {
    if (r.error || !r.list) return $('#lb').innerHTML = '<p class="hint">' + esc(r.error || 'Gagal memuat') + '</p>';
    LB_TOP = r.list.slice(0, 10).map(x => x.name);
    $('#lb').innerHTML = r.list.map((x, i) => {
      const tt = tierOf(x.pts);
      const me = r.me && x.name === r.me.name && !x.npc;
      const buka = i < 10;
      return `<div class="lbrow ${me ? 'me' : ''} ${buka ? 'clk' : ''}" ${buka ? `onclick="lihatProfil(${i})" title="Lihat profil ${esc(x.name)}"` : ''}>
        <span class="rk">${i + 1}</span>
        <span>${esc(x.name)}<br><small class="tierbadge" style="background:${tt.c};color:#1c1410">${tt.n}</small></span>
        <span>${x.pts} poin</span>
        <span class="loss">${x.wins}M / ${x.losses}K</span></div>`;
    }).join('') + `<p class="hint">Ketuk peringkat 1-10 untuk melihat profil dan CP timnya. Total ${r.total} pesaing. Peringkatmu: ${r.me && r.me.rank ? r.me.rank : '-'}</p>`;
  });
};


let mode = '', pick = [], foes = [], aiLevel = .5, foeScale = 1;
const aiOfRank = p => clamp(.35 + (p - 1000) / 1400, .3, .98);
function randomTeam(n, exclude) {
  let pool = DB.chars.filter(c => !exclude.includes(+c.id));
  if (pool.length < n) pool = DB.chars;
  return [...pool].sort(() => Math.random() - .5).slice(0, n).map(c => +c.id);
}
function setup(m) {
  mode = m; pick = punyaChar().slice(0, 10);
  pickReset();
  isiTahapan(null);
  $('#setupT').textContent = { STORY: 'Pertempuran bab', CLASSIC: 'Duel biasa', RANKED: 'Duel ranked', PVP: 'Dua pemain' }[m];
  const jumlahTim = () => Math.max(3, Math.min(10, pick.length || 3));
  if (m === 'STORY') {
    foes = (curCh.enemies || '').split(',').map(Number).filter(id => charById(id));
    if (!foes.length) foes = randomTeam(jumlahTim(), pick);
    aiLevel = clamp(.45 + (+curCh.difficulty || 1) * .2, .4, .98);
    foeScale = 1 + ((+curCh.difficulty || 1) - 1) * .26;
    if (+curCh.sort_order === 200) foeScale *= 1.25;
    $('#setupHint').textContent = `Lawan ditentukan admin pada bab ini. Tingkat kecerdasan AI: ${curCh.difficulty}/5. Menang memberi ${curCh.reward} permata.`
      + (+curCh.sort_order === 200 ? ' Peta pertempuran terakhir jauh lebih besar — pasukanmu tersebar luas di medan raksasa.' : '')
      + (+curCh.sort_order === 1 ? ' Bab 1 adalah tutorial: ikuti petunjuk di kotak abu bawah saat perang dimulai.' : '');
    isiTahapan(curCh);
  } else if (m === 'RANKED') {
    foes = randomTeam(jumlahTim(), []);
    aiLevel = aiOfRank(S.rankPts);
    foeScale = clamp(1 + (S.rankPts - 1000) / 1000 * .55, .9, 2.2);
    $('#setupHint').textContent = `Lawan dipilih acak sesuai peringkatmu (${S.rankPts} poin). Semakin tinggi peringkat, semakin cerdas AI dan semakin besar statistik mereka.`;
  } else if (m === 'CLASSIC') {
    foes = randomTeam(jumlahTim(), []);
    aiLevel = .5; foeScale = 1;
    $('#setupHint').textContent = 'Duel latihan tanpa poin peringkat.';
  } else {
    pvpA = []; pvpB = []; pvpTurn = 1; pick = pvpA; foes = pvpB;
    aiLevel = .5; foeScale = 1;
    $('#setupHint').textContent = 'Dua pemain berbagi satu perangkat. Pemain 1 memegang Kerajaan Surgawi, Pemain 2 memegang Kekaisaran Matahari. Pilih bergantian pada kotak hitam di bawah.';
  }
  go('setup'); drawPick(); drawFoes();
}
function isiTahapan(c) {
  const box = $('#setupCat');
  if (!box) return;
  const catatan = String((c && c.catatan) || '').trim();
  const petaIdx = +((c && c.peta) || 0);
  const namaPeta = petaIdx > 0 && typeof MAP_NAMA !== 'undefined' ? MAP_NAMA[petaIdx - 1] : null;
  if (!catatan && !namaPeta) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  box.innerHTML = '<h4><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>'
    + 'Aturan pertempuran bab ini'
    + (namaPeta ? `<span class="petaNama">Peta: ${esc(namaPeta)}</span>` : '<span class="petaNama">Peta: acak</span>')
    + '</h4>'
    + (catatan ? `<p>${esc(catatan)}</p>` : '');
}
function slotHitam(daftar, pemain) {
  const isi = Array.from({ length: 10 }, (_, i) => {
    const id = daftar[i];
    const c = id ? charById(id) : null;
    const lo = c ? loadoutFor(c.id, S.eq) : null;
    return `<span class="pvpSlot${c ? ' filled' : ''}${c ? ' r' + c.rarity : ''}">`
      + (c
        ? `${face(c, 36)}<b>${esc(c.name)}</b><small>HP ${c.hp + (lo ? lo.hp : 0)}<br>ATK ${c.atk + (lo ? lo.atk : 0)}</small>`
        : `<i>${i + 1}</i>`)
      + '</span>';
  }).join('');
  return `<div class="pvpRow${pvpTurn === pemain ? ' on' : ''}">
      <span class="pvpTag p${pemain}">Pemain ${pemain}<small>${pemain === 1 ? 'Kerajaan Surgawi' : 'Kekaisaran Matahari'} · ${daftar.length}/10</small></span>
      <div class="pvpSlots">${isi}</div>
    </div>`;
}
function drawFoes() {
  const box = $('#foeBox');
  if (mode === 'PVP') {
    const penuh = pvpA.length >= 3 && pvpB.length >= 3;
    box.innerHTML = '<div class="pvpWrap">' + slotHitam(pvpA, 1) + slotHitam(pvpB, 2)
      + `<div class="pvpBar"><span class="pvpNow">Giliran memilih: <b>Pemain ${pvpTurn}</b></span>`
      + `<button class="btn alt" onclick="pvpGanti()">Selesai — giliran Pemain ${pvpTurn === 1 ? 2 : 1}</button>`
      + `<span class="aiTag">Minimal 3 tiap pemain${penuh ? ' · siap bertempur' : ''}</span></div></div>`;
    return;
  }
  if (mode === 'RANKED') { box.innerHTML = '<b>Lawan acak:</b> <span class="aiTag">' + tierOf(S.rankPts).n + ' · AI ' + Math.round(aiLevel * 100) + '% · statistik x' + foeScale.toFixed(2) + '</span>'; return; }
  box.innerHTML = '<b>Lawan:</b>' + foes.map(id => { const c = charById(id); return `<span class="foe">${face(c, 36)} ${esc(c.name)}</span>`; }).join('')
    + `<span class="aiTag">AI ${Math.round(aiLevel * 100)}% · statistik x${foeScale.toFixed(2)}</span>`;
}
function drawPick() {
  const pvp = mode === 'PVP';
  const box = $('#pickList');
  box.className = 'cards' + (pvp ? ' pvpP' + pvpTurn : '');
  const q = String(($('#pickQ') && $('#pickQ').value) || '').trim().toLowerCase();
  const urut = punyaChar().slice().sort((a, b) => {
    const ia = S.lastUsed.indexOf(a), ib = S.lastUsed.indexOf(b);
    const wa = ia < 0 ? 99 : ia, wb = ib < 0 ? 99 : ib;
    if (wa !== wb) return wa - wb;
    const ca = charById(a), cb = charById(b);
    const pa = S.lastUsed.includes(a) ? 1 : 0, pb = S.lastUsed.includes(b) ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ra = +(ca && ca.rarity) || 0, rb = +(cb && cb.rarity) || 0;
    if (ra !== rb) return rb - ra;
    const sa = ca ? statChar(ca).cp : 0, sb = cb ? statChar(cb).cp : 0;
    if (sa !== sb) return sb - sa;
    return String((ca && ca.name) || '').localeCompare(String((cb && cb.name) || ''));
  }).filter(id => {
    const c = charById(id); if (!c) return false;
    if (!q) return true;
    return (c.name || '').toLowerCase().includes(q)
      || (c.title || '').toLowerCase().includes(q)
      || (c.faction || '').toLowerCase().includes(q);
  });
  const cnt = $('#pickCount');
  if (cnt) {
    cnt.textContent = pick.length + ' / 10';
    cnt.classList.toggle('full', pick.length >= 10);
  }
  if (!urut.length) {
    box.innerHTML = '<p class="hint kosongpencarian">Tidak ada komandan yang cocok dengan pencarian ini. Coba kata kunci lain.</p>';
    return;
  }
  box.innerHTML = urut.map(id => {
    const c = charById(id); if (!c) return '';
    const lo = loadoutFor(id, S.eq);
    const a = pvp && pvpA.includes(id), b = pvp && pvpB.includes(id);
    const terpilih = pick.includes(id);
    const no = S.lastUsed.indexOf(id);
    return `<div class="card r${c.rarity}${terpilih ? ' sel' : ''}${a ? ' pvp1' : ''}${b ? ' pvp2' : ''}" onclick="tp(${id})">`
      + '<span class="pickmk" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>'
      + face(c, 64) + `<b>${esc(c.name)}</b>`
      + (a ? '<span class="pvpmk m1">P1</span>' : '') + (b ? '<span class="pvpmk m2">P2</span>' : '')
      + (no >= 0 ? `<span class="sering">sering dipakai</span>` : '')
      + `<small>HP ${c.hp + lo.hp} / ATK ${c.atk + lo.atk}</small>
      <small>${(S.eq[id] || [0, 0, 0]).filter(Boolean).length} senjata</small></div>`;
  }).join('');
}
function pickReset() {
  const q = $('#pickQ'); if (q) q.value = '';
  drawPick();
}
function pvpGanti() {
  pvpTurn = pvpTurn === 1 ? 2 : 1;
  pick = pvpTurn === 1 ? pvpA : pvpB;
  sfx('pick'); drawPick(); drawFoes();
}
function tp(id) {
  if (mode === 'PVP') {
    const lain = pvpTurn === 1 ? pvpB : pvpA;
    if (lain.includes(id)) return toast('Karakter ini sudah dipilih pemain lain');
    const kini = pvpTurn === 1 ? pvpA : pvpB;
    if (kini.includes(id)) kini.splice(kini.indexOf(id), 1);
    else if (kini.length < 10) kini.push(id);
    else return toast('Sudah penuh 10 karakter');
    pick = kini;
    drawPick(); drawFoes();
    return;
  }
  pick = pick.includes(id) ? pick.filter(x => x !== id) : (pick.length < 10 ? [...pick, id] : pick);
  drawPick();
}


async function battleResult(win) {
  if (mode === 'PVP') return { msg: 'Tidak ada hadiah pada mode dua pemain.', gems: 0, pts: 0 };
  if (S.online) {
    const fd = new FormData();
    fd.append('mode', mode); fd.append('win', win ? 1 : 0);
    if (mode === 'STORY' && curCh) fd.append('chapter_id', curCh.id);
    const r = await act('battle_end', fd);
    if (r) return { msg: r.msg, gems: r.gems_delta || 0, pts: r.pts_delta || 0 };
    return { msg: 'Gagal menyimpan hasil ke akun.', gems: 0, pts: 0 };
  }
  
  let msg = '';
  if (mode === 'STORY') {
    if (win) {
      const kunci = (curCh.tipe || 'utama') === 'samping' ? 'sideDone' : 'storyDone';
      const pos = posBab(curCh);
      if (pos > (+S[kunci] || 0)) S[kunci] = pos;
      S.gem += curCh.reward; msg = 'Bab selesai. Hadiah ' + curCh.reward + ' permata.';
    }
    else { S.gem += 50; msg = 'Kekalahan. Hiburan 50 permata.'; }
  } else if (mode === 'CLASSIC') {
    S.gem += win ? 500 : 150; msg = win ? 'Kemenangan! +500 permata.' : 'Kalah. +150 permata hiburan.';
  } else if (mode === 'RANKED') {
    const bonus = S.rankPts >= 1750 ? 15 : S.rankPts >= 1500 ? 12 : S.rankPts >= 1300 ? 9 : S.rankPts >= 1150 ? 6 : 4;
    const d = win ? 20 + bonus : -18;
    S.rankPts = clamp(S.rankPts + d, 500, 3000);
    S.wins += win ? 1 : 0; S.losses += win ? 0 : 1;
    S.gem += win ? 250 : 80;
    msg = (win ? 'Menang ranked! +' + d + ' poin, +250 permata.' : 'Kalah ranked. ' + d + ' poin, +80 permata.');
  }
  const emas = mode === 'PVP' ? 0 : (win ? 120 + Math.round(S.gem / 5) : 40 + Math.round(S.gem / 8));
  S.gold += emas;
  if (emas) msg += ' + ' + emas + ' gold.';
  save();
  return { msg, gems: 0, pts: 0 };
}

boot();
