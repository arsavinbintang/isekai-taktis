/* ============================================================
   ISEKAI TACTICS — inti permainan
   bagian: dasar/akun, navigasi, cerita, gacha, pasukan (senjata),
           gudang senjata, peringkat, persiapan, hadiah pertempuran
   ============================================================ */

const API = 'api.php', $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ULTS = { 'AoE Heal': 'Pulihkan 40% HP sekutu radius 3', 'AoE Dmg': '100 damage ke musuh radius 2', 'Warcry': 'Sekutu radius 2 dapat +2 AP', 'Teleport': 'Pindah ke petak kosong radius 6' };
const ULT_AP = 3;
const FN = { P1: 'Kerajaan Surgawi', P2: 'Kekaisaran Matahari', Neu: 'Netral' };
const FC = { P1: '#2f5f9e', P2: '#a33b2c', Neu: '#c9a23a' };

/* Skill pasif senjata — hanya aktif bila senjata itu SENJATA SEJATI milik karakter yang memakainya */
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

/* Skill AKTIF komandan — punya biaya AP dan waktu tunggu (cooldown).
   Berbeda dari Ultimate (butuh 3 AP) dan berbeda dari pasif. */
const SKILLS = {
  mend: { n: 'Sinar Penyembuh', d: 'Pulihkan 40% HP diri & sekutu radius 2.', ap: 2, cd: 3 },
  pierce: { n: 'Tembus Baja', d: 'Serang musuh terdekat hingga jarak 3 tanpa bergerak.', ap: 2, cd: 2 },
  dash: { n: 'Langkah Kilat', d: 'Dapat +3 AP seketika.', ap: 1, cd: 3 },
  warbanner: { n: 'Panji Perang', d: 'Sekutu radius 2 mendapat +1 AP.', ap: 2, cd: 3 },
  bulwark: { n: 'Tameng Taat', d: 'Terima 40% damage lebih sedikit selama 2 giliran.', ap: 2, cd: 3 },
  emberspark: { n: 'Percik Bara', d: '50 damage + bakar ke semua musuh radius 2.', ap: 2, cd: 3 },
};
const WKIND = { sword: 'Pedang', dagger: 'Belati', axe: 'Kapak', spear: 'Tombak', bow: 'Busur', staff: 'Staf', hammer: 'Palu', harp: 'Harpa' };
const TIERS = [
  { min: 2000, n: 'Raja', c: '#e0a83a' }, { min: 1750, n: 'Mutiara', c: '#7fd8e8' },
  { min: 1500, n: 'Permata', c: '#67d6a0' }, { min: 1300, n: 'Emas', c: '#f0c04a' },
  { min: 1150, n: 'Perak', c: '#c9ccd4' }, { min: 0, n: 'Perunggu', c: '#c08a52' },
];
const tierOf = p => TIERS.find(t => p >= t.min) || TIERS[TIERS.length - 1];

/* ---------- data cadangan bila server mati ---------- */
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

let DB = { chars: [], weapons: [], story: [], banners: [], settings: {} };
let IMG = {}, IMGW = {};
let ME = { admin: false, user: null, profile: null };

/* ---------- progres ----------
   Online : semua angka penting berasal dari akun (server).
   Offline: disimpan di browser supaya tetap bisa dicoba.       */
const DEFAULTS = () => ({
  online: false, gem: 1200, pityChar: 0, pityWeap: 0, rankPts: 1000,
  wins: 0, losses: 0, storyDone: 0, own: [], ownW: [], eq: {},
});
let S = Object.assign(DEFAULTS(), JSON.parse(localStorage.getItem('it_save') || '{}'));

const charById = id => DB.chars.find(c => +c.id === +id);
const weaponById = id => DB.weapons.find(w => +w.id === +id);

/* ============================================================
   MUSIK — dua jalur sesuai permintaan admin:
   'gen'  = lagu dibangkitkan langsung lewat WebAudio (tanpa berkas)
   'file' = memutar berkas musik yang diunggah admin (MP3/OGG/WAV)
   'off'  = senyap
   Lagu generated disusun dari kumpulan nada pentatonik ala abad
   permuliaan, dijadwalkan ringan supaya tetap lancar di ponsel.
   ============================================================ */
const MUSIC = {
  ctx: null, master: null, timer: 0, step: 0, nextT: 0,
  file: null, mode: 'gen', track: 'fajar', vol: 55, muted: false, started: false,
  battle: false,        /* true selama pertempuran → lagu berganti ke pola WAR */
};
/* frekuensi dasar tiap nada (dipakai untuk melodinya sendiri) */
const N = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  /* nada bertepi tumpul — peninggalan pentatonik dipakai lagu perang */
  Eb3: 155.56, Ab3: 207.65, Bb3: 233.08,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  Eb4: 311.13, Ab4: 415.30, Bb4: 466.16,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};
/* pola per lagu: bass (nada dasar tiap ketuk), melodi, dan tempo (ketuk/detik) */
/* nama tampil untuk tiap lagu generated */
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
/* ---------------------------------------------------------------
   MEDAN PERANG — pola cadangan yang diaktifkan otomatis begitu
   pertempuran dimulai. Tempo jauh lebih cepat, bertangga minor,
   digedor genderang: terasa menegangkan, bukan lagu santai.
   --------------------------------------------------------------- */
const WAR = {
  tempo: .60, wave: 'sawtooth', drum: true, gain: .13,
  bass:  [N.C3, N.C3, N.G3 / 2, N.C3, N.A3 / 2, N.A3 / 2, N.F3 / 2, N.G3 / 2],
  melody: [N.C4, N.Eb4, N.G4, N.Eb4, N.C4, 0, N.Bb3, N.C4,
           N.Ab3, N.C4, N.Eb4, N.C4, N.Ab3, 0, N.G3, N.G3,
           N.C4, N.D4, N.Eb4, N.F4, N.G4, 0, N.F4, N.Eb4,
           N.D4, N.C4, N.Bb3, N.C4, N.G3, 0, N.C4, N.C4],
};
/* bauran derau putih sekali pakai — dipakai genderang & efek tebasan */
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
/* kendang: genderang rendah (kick) & kentongan (snare) */
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
  /* kanal terpisah untuk efek suara — tetap terdengar walau musik dimatikan */
  MUSIC.sfxGain = MUSIC.ctx.createGain();
  MUSIC.sfxGain.gain.value = 0.6;
  MUSIC.sfxGain.connect(MUSIC.ctx.destination);
  return MUSIC.ctx;
}

/* ============================================================
   EFEK SUARA — bunyi pendek tiap kali pengguna menekan sesuatu
   (tombol, kartu, karakter, senjata, keluar, salah). Dibangkitkan
   langsung dari AudioContext, jadi tanpa berkas dan ringan.
   ============================================================ */
const SFX = { on: true, vol: 60, wired: false };
function sfx(kind) {
  if (!SFX.on || SFX.vol <= 0) return;
  const ctx = musicCtx(); if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  MUSIC.sfxGain.gain.value = SFX.vol / 100;
  const t = ctx.currentTime;
  /* satu nada: frekuensi, durasi, jeda, bentuk gelombang, kekuatan, frekuensi tujuan */
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
  /* tebasan — derau putih yang frekuensinya melorot cepat seperti bilah menyapu */
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
    case 'pick':   /* memilih karakter / senjata — naik, hangat */
      note(523, .12, 0, 'triangle', .30); note(784, .16, .06, 'triangle', .26); break;
    case 'back':   /* keluar / tombol X — turun */
      note(392, .14, 0, 'triangle', .24, 262); break;
    case 'err':    /* ditolak, misal permata kurang */
      note(150, .16, 0, 'sawtooth', .20, 110); break;
    case 'open':   /* layar / panel terbuka */
      note(392, .10, 0, 'triangle', .22); note(523, .13, .05, 'triangle', .22); break;

    /* ---- medan perang ---- */
    case 'unit':   /* pasukan ditekan di peta — kayu & tali tegang */
      note(300, .055, 0, 'square', .18); note(452, .09, .03, 'triangle', .17); break;
    case 'hit':    /* pedang menebas */
      slash(.14, 0, 1500, .30); note(330, .10, 0, 'square', .13, 155); break;
    case 'crit':   /* pukulan kritis — lebih tajam, lebih tinggi, gema panjang */
      slash(.19, 0, 2800, .40); note(760, .13, 0, 'square', .18, 230);
      note(1046, .22, .07, 'triangle', .14); break;
    case 'die':    /* pasukan tumbang — nada jatuh lalu dengung rendah */
      note(360, .32, 0, 'sawtooth', .22, 72); note(170, .46, .06, 'triangle', .17, 52); break;
    case 'capture':/* bangunan / markas direbut — tiga nada menanjak */
      note(196, .11, 0, 'square', .19); note(294, .11, .09, 'square', .19);
      note(392, .24, .18, 'triangle', .23); break;
    case 'level':  /* naik level */
      note(523, .10, 0, 'triangle', .25); note(659, .10, .08, 'triangle', .25);
      note(784, .20, .16, 'triangle', .27); break;
    case 'ult':    /* ultimate — dengung naik mendadak */
      note(175, .30, 0, 'sawtooth', .23, 940); note(440, .24, .24, 'square', .19, 1320); break;
    case 'horn':   /* sangkakala perang saat pertempuran dimulai */
      note(147, .60, 0, 'sawtooth', .27); note(220, .58, .05, 'sawtooth', .21);
      note(294, .50, .52, 'triangle', .17); break;
    case 'win':    /* fanfare kemenangan — tangga mayor menanjak lalu bertahan */
      [[392, 0], [523, .13], [659, .26], [784, .39], [1046, .52], [784, .74], [1046, .84]]
        .forEach(([f, d]) => note(f, .40, d, 'triangle', .27));
      drum(t + .52, 'k'); drum(t + .74, 's'); break;
    case 'lose':   /* kekalahan — dua nada berat melorot pelan */
      note(294, .55, 0, 'sawtooth', .23, 214); note(196, .95, .46, 'sawtooth', .23, 104); break;

    default:       /* klik tombol biasa — pendek dan tegas */
      note(660, .05, 0, 'square', .16); break;
  }
}
/* satu penyambung untuk semua elemen yang bisa ditekan */
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
/* satu nada lembut dengan serangan & pelepasan pelan */
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
  /* selama perang lagu berganti ke pola WAR (lebih cepat & minor) */
  const tr = MUSIC.battle ? WAR : (TRACKS[MUSIC.track] || TRACKS.fajar);
  const spb = tr.tempo / 2;                 /* nada ke-2 dari pola tiap separuh ketuk */
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
/* nyalakan / matikan nuansa perang — dipanggil tiap layar berubah */
function musicBattle(on) {
  on = !!on;
  if (MUSIC.battle === on) return;
  MUSIC.battle = on;
  MUSIC.step = 0;
  if (MUSIC.ctx) MUSIC.nextT = MUSIC.ctx.currentTime + .06;   /* mulai rapi dari ketukan pertama */
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
  MUSIC.file.play().catch(() => {});        /* autoplay baru boleh setelah interaksi */
  MUSIC.started = true;
}
/* tarik pengaturan dari server lalu terapkan */
function musicApplySettings() {
  const s = DB.settings || {};
  const prevMode = MUSIC.mode, prevTrack = MUSIC.track, prevVol = MUSIC.vol;
  MUSIC.mode = ['off', 'gen', 'file'].includes(s.music_mode) ? s.music_mode : 'gen';
  MUSIC.track = TRACKS[s.music_track] ? s.music_track : 'fajar';
  MUSIC.vol = clamp(+s.music_vol || 55, 0, 100);

  /* volume langsung berlaku tanpa perlu mulai ulang */
  if (MUSIC.master && MUSIC.ctx) MUSIC.master.gain.value = (MUSIC.vol / 100) * 0.5;
  if (MUSIC.file) MUSIC.file.volume = MUSIC.vol / 100;
  /* lagu berganti → mulai dari ketukan pertama supaya tidak nyambung asal-asalan */
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
/* browser melarang audio sebelum interaksi pengguna — nyalakan di sentuhan pertama */
function musicUnlock() {
  if (MUSIC.muted) return;
  musicPlay();
  document.removeEventListener('pointerdown', musicUnlock);
  document.removeEventListener('keydown', musicUnlock);
}
const hasChar = id => S.own.some(x => +x === +id);
const hasWeap = id => S.ownW.some(x => +x === +id);

function save() {
  localStorage.setItem('it_save', JSON.stringify(S));
  $('#gem').textContent = S.gem;
  $('#pts').textContent = S.rankPts;
  const t = tierOf(S.rankPts);
  $('#tier').textContent = t.n; $('#tier').style.color = t.c;
}
function applyProfile(p) {
  if (!p) return;
  S.online = true;
  S.gem = +p.gems; S.pityChar = +p.pity_char; S.pityWeap = +p.pity_weap;
  S.rankPts = +p.rank_pts; S.wins = +p.wins; S.losses = +p.losses; S.storyDone = +p.story_done;
  S.own = (p.owned || []).map(Number); S.ownW = (p.weapons || []).map(Number);
  S.eq = {};
  Object.keys(p.equips || {}).forEach(k => { S.eq[k] = (p.equips[k] || []).map(Number); });
  save();
}
/* Alasan terakhir server tidak terhubung — ditampilkan di banner offline
   supaya pengguna langsung tahu PENYEBAB, bukan sekadar "tidak terhubung". */
let API_ERR = '';
function why() {
  if (API_ERR) return API_ERR;
  return 'api.php merespons tetapi daftar karakter kosong — database belum diimpor? Jalankan db.sql.';
}
async function api(a, body) {
  const url = API + '?a=' + a;
  let r;
  try {
    r = await fetch(url, body ? { method: 'POST', body } : {});
  } catch (e) {
    if (location.protocol === 'file:')
      API_ERR = 'Halaman dibuka lewat <b>file://</b> — browser memblokir koneksi ke api.php. Buka lewat XAMPP: <code>http://localhost/isekai-tactics/index.html</code>.';
    else
      API_ERR = `Tidak bisa menghubungi <code>${url}</code> (${e.message}). Pastikan Apache XAMPP berjalan dan folder proyek ada di <code>htdocs</code>.`;
    return { error: API_ERR };
  }
  const txt = await r.text();
  let j;
  try { j = JSON.parse(txt); }
  catch (e) {
    const head = txt.trim().replace(/\s+/g, ' ').slice(0, 200);
    API_ERR = `api.php membalas <b>HTTP ${r.status}</b> tetapi bukan JSON` +
      (head ? ` — kemungkinan error PHP/SQL: <code>${head}</code>` : ' (balasan kosong).');
    return { error: API_ERR };
  }
  if (!r.ok) { API_ERR = `HTTP ${r.status}${j.error ? ' — ' + j.error : ''}`; return j; }
  API_ERR = '';
  return j;
}
/* aksi yang mengubah progres → minta server, lalu pakai profil terbaru */
async function act(a, fd) {
  const r = await api(a, fd || new FormData());
  if (r.error) { toast(r.error); return null; }
  if (r.profile) applyProfile(r.profile);
  save(); return r;
}

async function loadAll() {
  const [c, w, s, b, st] = await Promise.all([api('chars'), api('weapons'), api('story'), api('banners'), api('settings')]);
  if (!Array.isArray(c) || !c.length) throw 0;
  DB.chars = c; DB.weapons = w; DB.story = s; DB.banners = b;
  DB.settings = (st && typeof st === 'object' && !st.error) ? st : {};
  DB.chars.forEach(x => { x.id = +x.id; x.hp = +x.hp; x.atk = +x.atk; x.ap = +x.ap; x.rarity = +x.rarity || 3; if (x.image) { const i = new Image(); i.src = x.image; IMG[x.id] = i; } });
  DB.weapons.forEach(x => { x.id = +x.id; x.rarity = +x.rarity || 3; x.true_for = +x.true_for || 0; if (x.image) { const i = new Image(); i.src = x.image; IMGW[x.id] = i; } });
  DB.banners.forEach(x => { x.id = +x.id; x.kind = x.kind === 'weapon' ? 'weapon' : 'char'; });
  DB.story.forEach(x => { x.id = +x.id; x.sort_order = +x.sort_order; x.difficulty = +x.difficulty || 1; x.reward = +x.reward || 0; });
  musicApplySettings();
}
function fallbackData() {
  DB.chars = FALLBACK_CHARS; DB.weapons = FALLBACK_WEAPONS; DB.story = FALLBACK_STORY;
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
  /* musik menyala pada interaksi pertama (aturan autoplay browser) */
  musicUI();
  document.addEventListener('pointerdown', musicUnlock);
  document.addEventListener('keydown', musicUnlock);
  splashShow();
  sfxWire(); sfxUI();
  const wb = $('#whyBtn');
  if (wb) wb.onclick = () => { const d = $('#why'); d.hidden = !d.hidden; wb.textContent = d.hidden ? 'Lihat penyebab' : 'Sembunyikan'; };
}

/* ---------- splash art: layar pembuka, bisa dimatikan admin ---------- */
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

/* ---------- gambar ---------- */
const starSVG = '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.8 5.5 21l2-7.5L2 9h7z" fill="#e0a83a" stroke="#1c1410" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const stars = n => `<span class="stars">${starSVG.repeat(clamp(+n || 3, 1, 5))}</span>`;
function face(c, size, fb) {
  const st = `width:${size}px;height:${size}px`;
  return c && c.image ? `<img class="face" src="${esc(c.image)}" style="${st}" alt="">`
    : `<div class="face" style="${st}">${esc(fb || (c && c.name ? c.name[0] : '?'))}</div>`;
}
/* ilustrasi SVG buatan sendiri sebagai cadangan senjata tanpa gambar */
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
/* hasil gacha bisa berupa objek senjata/snapshot */
function artOf(r, size) {
  if (r.weapon) return wface({ image: r.image, kind: (r.kind || 'sword') }, size);
  return face({ image: r.image, name: r.name }, size, r.name ? r.name[0] : '?');
}

/* ---------- navigasi ---------- */
const R = {}; let inBattle = false, looping = false, curTab = 'story';
function go(s) {
  $$('.screen').forEach(e => e.classList.toggle('on', e.id === s));
  $('#hud').hidden = s === 'battle'; $('#back').hidden = s === 'menu';
  inBattle = s === 'battle';
  musicBattle(inBattle);            /* masuk perang → lagu berganti jadi menegangkan */
  if (R[s]) R[s]();
  if (inBattle) sfx('horn');        /* sangkakala perang */
  else sfx('open');
}
let tt; const toast = m => {
  const t = $('#toast'); t.textContent = m; t.hidden = false;
  clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 2400);
  /* pesan galat atau latar belakang dapat nada khas supaya langsung terasa */
  const bad = /kurang|tidak|gagal|salah|belum|khusus|terlalu|penuh|habis|war|batal/i.test(String(m));
  sfx(bad ? 'err' : 'pick');
};

/* ---------- 3 tab menu utama ---------- */
function mtab(p) {
  curTab = p;
  $$('#tabbar .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === p));
  $$('#menuPanels .mpanel').forEach(e => e.hidden = e.dataset.p !== p);
}
/* ---------- top bar kilat: koleksi yang sudah terbuka (mobile) ---------- */
function quickOpen(kind, id) {
  go(kind === 'c' ? 'roster' : 'armory');
  setTimeout(() => kind === 'c' ? rdet(id) : wdet(id), 0);
}
function renderQuick() {
  const box = $('#qinner'), bar = $('#quickbar'); if (!box || !bar) return;
  const items = [];
  S.own.forEach(id => { const c = charById(id); if (c) items.push({ i: c.image, n: (c.name || '?')[0], k: 'c', id: c.id, t: c.name }); });
  S.ownW.forEach(id => { const w = weaponById(id); if (w) items.push({ i: w.image, n: 'S', k: 'w', id: w.id, t: w.name }); });
  if (!items.length) { bar.hidden = true; box.innerHTML = ''; return; }
  bar.hidden = false;
  box.innerHTML = items.map(t => `<button class="qi" onclick="quickOpen('${t.k}',${t.id})" title="${esc(t.t)}">${t.i ? `<img src="${esc(t.i)}" alt="">` : ''}<b>${t.n}</b></button>`).join('');
}
R.menu = () => { mtab(curTab); renderQuick(); };

/* ---------- akun ---------- */
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

/* ============================================================
   CERITA (visual novel)
   ============================================================ */
let LN = [], li = 0, curCh = null, typing, slot = { L: null, R: null }, lastSide = 'R';
R.story = () => {
  const list = DB.story;
  $('#chapters').innerHTML = list.length ? list.map((c, i) => {
    const locked = c.sort_order > S.storyDone + 1;
    const foes = (c.enemies || '').split(',').map(Number).filter(id => charById(id));
    return `<button class="btn chap ${locked ? 'locked' : ''}" ${locked ? 'disabled' : ''} onclick="play(${i})">
      <span>${esc(c.title)}<br><small class="chapmeta">Lawan: ${foes.length ? foes.map(id => esc(charById(id).name)).join(', ') : 'acak'} · AI ${c.difficulty} · +${c.reward} permata</small></span>
      <span class="foes">${foes.map(id => face(charById(id), 34)).join('')}</span></button>`;
  }).join('') : '<p>Belum ada bab. Buat di Studio.</p>';
};
function play(i) {
  curCh = DB.story[i];
  LN = curCh.script.split('\n').map(s => s.trim()).filter(s => s && s[0] !== '#').map(s => {
    if (/^@bg\s/i.test(s)) return { bg: s.slice(3).trim().toLowerCase() };
    const k = s.indexOf(':'); return k > 0 ? { who: s.slice(0, k).trim(), txt: s.slice(k + 1).trim() } : { who: '', txt: s };
  });
  li = 0; slot = { L: null, R: null }; $('#scene').dataset.bg = 'field';
  go('scene'); $('#dlg').hidden = false; line();
}
function line() {
  clearInterval(typing);
  while (LN[li] && LN[li].bg !== undefined) { $('#scene').dataset.bg = LN[li].bg; li++; }
  if (li >= LN.length) { $('#dlg').hidden = true; return +curCh.battle ? setup('STORY') : go('story'); }
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
function nextLine() {
  const l = LN[li]; if (!l) return;
  if ($('#txt').textContent.length < l.txt.length) { clearInterval(typing); $('#txt').textContent = l.txt; return; }
  li++; line();
}

/* ============================================================
   GACHA — dua jenis: karakter dan senjata
   ============================================================ */
let bsel = 0;
const poolIds = b => (b.pool || '').split(',').map(Number).filter(Boolean);
R.gacha = () => {
  $('#pityC').textContent = S.pityChar; $('#pityW').textContent = S.pityWeap;
  $('#pulls').innerHTML = '';
  if (bsel >= DB.banners.length) bsel = 0;
  $('#banners').innerHTML = DB.banners.length ? DB.banners.map((b, i) => {
    const ids = poolIds(b);
    const items = b.kind === 'weapon' ? ids.map(weaponById).filter(Boolean) : ids.map(charById).filter(Boolean);
    const art = b.image
      ? `<img class="bnart" src="${esc(b.image)}" alt="">`
      : `<div class="bnart bnartFallback" data-kind="${b.kind}"></div>`;
    return `<div class="card bnCard ${i === bsel ? 'sel' : ''} ${b.kind === 'weapon' ? 'r4' : 'r5'}" onclick="bsel=${i};R.gacha()">
      <span class="bnkind ${b.kind}">${b.kind === 'weapon' ? 'PANJI SENJATA' : 'PANJI KARAKTER'}</span>
      ${art}
      <b>${esc(b.name)}</b><small>${esc(b.description || '')}</small>
      <div class="row">${items.slice(0, 6).map(it => b.kind === 'weapon' ? wface(it, 44) : face(it, 44)).join('')}</div>
      <small>${items.length} isi · ${ids.length ? '' : 'pakai seluruh koleksi'}</small></div>`;
  }).join('') : '<div class="panel">Belum ada banner. Admin bisa membuatnya di Studio.</div>';
  const b = DB.banners[bsel];
  $('#gachaWho').textContent = (ME.user ? 'Progres tersimpan di akun ' + ME.user + '.' : 'Masuk agar hasil pemanggilan tersimpan di akun.')
    + (b ? ' Sedang memilih: ' + b.name + '.' : '');
};
/* gulung nasib — aturan sama dengan server */
const DUP_REFUND = { 3: 30, 4: 80, 5: 200 };   // pengganti kembar, sengaja < biaya tarikan (100)
function rollRarity(pity) {
  if (pity >= 30) return { rar: 5, guaranteed: true };
  const r = Math.random();
  return { rar: r < .04 ? 5 : (r < .16 ? 4 : 3), guaranteed: false };
}
function pickLocal(pool, rar, owned, preferNew) {
  const items = pool && pool.length ? pool : DB.chars;
  if (!items.length) return null;
  let cand = items.filter(x => +x.rarity === rar);
  if (!cand.length) {
    let best = items[0].rarity, bd = 99;
    items.forEach(x => { const d = Math.abs(+x.rarity - rar); if (d < bd) { bd = d; best = +x.rarity; } });
    cand = items.filter(x => +x.rarity === best);
  }
  if (preferNew) { const f = cand.filter(x => !owned.includes(+x.id)); if (f.length) cand = f; }
  return cand[Math.random() * cand.length | 0];
}
async function pull(n) {
  const b = DB.banners[bsel];
  if (!b) return toast('Belum ada banner');
  if (S.gem < n * 100) return toast('Permata tidak cukup');

  if (S.online) {
    const fd = new FormData(); fd.append('banner_id', b.id); fd.append('n', n);
    const r = await act('pull', fd);
    if (!r) return;
    $('#pityC').textContent = S.pityChar; $('#pityW').textContent = S.pityWeap;
    await playGacha(b, r.results);
    return;
  }

  /* mode tamu: RNG di browser, aturannya sama */
  S.gem -= n * 100;
  const weapon = b.kind === 'weapon';
  const pool = poolIds(b).map(weapon ? weaponById : charById).filter(Boolean);
  const all = weapon ? DB.weapons : DB.chars;
  const owned = weapon ? S.ownW : S.own;
  const key = weapon ? 'pityWeap' : 'pityChar';
  const out = [];
  for (let i = 0; i < n; i++) {
    S[key]++;
    const { rar, guaranteed } = rollRarity(S[key] - 1);
    if (guaranteed) S[key] = 0;
    const src = pickLocal(pool.length ? pool : all, rar, owned, guaranteed);
    if (!src) continue;
    const dup = owned.includes(+src.id);
    if (dup) S.gem += DUP_REFUND[+src.rarity] ?? 30; else owned.push(+src.id);
    out.push({
      id: +src.id, name: src.name, rarity: +src.rarity, dup: dup ? 1 : 0, image: src.image || '',
      weapon: weapon ? 1 : 0, kind: src.kind || '', guaranteed: guaranteed ? 1 : 0,
      sub: weapon ? `${WKIND[src.kind] || src.kind} +ATK ${src.w_atk} +HP ${src.w_hp}` : (src.title || ''),
    });
  }
  save(); $('#pityC').textContent = S.pityChar; $('#pityW').textContent = S.pityWeap;
  await playGacha(b, out);
}

/* ============================================================
   ANIMASI PIRAMIDA
   Piramida terisi dari 0% sampai 100% — puncaknya menyala tepat
   saat hasil terungkap. Bisa dilewati, dan tetap jalan walau
   permata tidak cukup (animasi dipanggil SETELAH tarikan sukses).
   ============================================================ */
const GA_STAGES = [
  [0, 'Mengumpulkan nyawa…'], [18, 'Bara di puncak mulai menyala…'],
  [40, 'Piramida bergetar…'], [62, 'Segel hampir pecah…'],
  [84, 'Cahaya menembus puncak!'], [100, 'Terungkap!'],
];
function playGacha(b, results) {
  return new Promise(resolve => {
    const ov = $('#gachaAnim'); if (!ov || !results) { showPulls(results || []); return resolve(); }
    const best = results.reduce((m, r) => Math.max(m, +r.rarity || 0), 0);
    const fill = $('#pyrFill'), pct = $('#gaPct'), stage = $('#gaStage'),
      bar = $('#gaBar'), nameEl = $('#gaName');
    /* puncak diberi warna sesuai bintang tertinggi yang didapat */
    nameEl.textContent = (b ? b.name : 'Pemanggilan') + (best ? ` · ${'★'.repeat(best)}` : '');
    let skip = false, raf = 0, t0 = 0;
    const DUR = 1500;

    /* puncak piramida di y=8, dasar di y=162 — tinggi isi = (162-8)*p */
    const setP = p => {
      const top = 162 - (162 - 8) * p;
      fill.setAttribute('y', top); fill.setAttribute('height', 170 - top);
      pct.textContent = Math.round(p * 100) + '%';
      bar.style.width = (p * 100) + '%';
      let s = GA_STAGES[0][1];
      for (const [at, txt] of GA_STAGES) if (p * 100 >= at) s = txt;
      stage.textContent = s;
    };

    ov.hidden = false; ov.classList.remove('pulse', 'done');
    setP(0);
    $('#gaSkip').onclick = () => { skip = true; };

    const finish = () => {
      cancelAnimationFrame(raf);
      setP(1);
      ov.classList.add('pulse', 'done');
      /* puncak menyala — baru hasil muncul */
      setTimeout(() => {
        ov.hidden = true;
        showPulls(results);
        resolve();
      }, 420);
    };

    const step = ts => {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / DUR);
      /* naik melandai, lalu mendesak di 10% terakhir */
      const eased = p < .85 ? p * .92 : .782 + (p - .85) * 1.45;
      setP(Math.min(1, eased));
      if (skip || p >= 1) return finish();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
}
function showPulls(out) {
  $('#pulls').innerHTML = out.map(r => `<div class="card pullcard r${r.rarity}">
    ${artOf(r, 72)}<b>${esc(r.name)}</b>${stars(r.rarity)}
    <small>${r.dup ? 'Kembar +' + (DUP_REFUND[+r.rarity] ?? 30) + ' permata' : (r.guaranteed ? 'Jaminan bintang 5!' : esc(r.sub || 'Baru!'))}</small></div>`).join('');
}

/* ============================================================
   PASUKAN — latar belakang karakter + perataan senjata (maks 3)
   ============================================================ */
R.roster = () => {
  $('#rlist').innerHTML = DB.chars.map(c => {
    const o = hasChar(c.id);
    return `<div class="card r${c.rarity} ${o ? '' : 'off'}" ${o ? `onclick="rdet(${c.id})"` : ''}>
      ${face(c, 64)}<b>${esc(c.name)}</b>${stars(c.rarity)}<small>${o ? esc(c.title) : 'Terkunci — dapatkan di Pemanggilan'}</small></div>`;
  }).join('');
  const first = S.own.find(id => charById(id));
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
  const o = { atk: 0, hp: 0, crit: 0, passives: [], weaps: [] };
  slots.forEach(wid => {
    const w = weaponById(wid); if (!w) return;
    o.weaps.push(w);
    o.atk += +w.w_atk || 0; o.hp += +w.w_hp || 0; o.crit += +w.w_crit || 0;
    if (w.passive && +w.true_for === +cid) o.passives.push(w.passive);
  });
  return o;
}
/* kartu kemampuan: ketuk untuk menampilkan penjelasannya di satu kotak */
function abl(el) {
  $$('#rdet .ab').forEach(b => b.classList.toggle('sel', b === el));
  const box = $('#ablBox'); if (box) box.innerHTML = `<b>${el.querySelector('b').textContent}</b><br>${el.dataset.d}`;
  sfx('pick');
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
  /* daftar penjelasan disimpan sebagai data, ditampilkan satu per satu saat diketuk */
  const CARDS = [
    ab('Ultimate · ' + ULT_AP + ' AP', c.ult, ULTS[c.ult], 'on'),
    ab('Skill aktif' + (sk ? ` · ${sk.ap} AP` : ''), sk ? sk.n : '', sk ? `${sk.d} Jeda ${sk.cd} giliran.` : '', sk ? 'on' : 'off'),
    ab('Pasif bawaan', inna ? inna.n : '', inna ? inna.d : '', inna ? 'on' : 'off'),
    ab('Pasif senjata sejati', passList.map(p => p.n).join(', '), passList.map(p => p.n + ': ' + p.d).join(' ') || (lockedW.length ? 'Butuh senjata sejati ' + lockedW.map(w => w.name).join(', ') + ' — belum dimiliki.' : 'Belum ada senjata sejati terpasang.'), passList.length ? 'on' : (lockedW.length ? 'off' : 'off')),
  ].join('');
  $('#rdet').innerHTML = `
    <div class="row">${face(c, 92)}<div><h2>${esc(c.name)}</h2><small>${esc(c.title)} · ${esc(c.faction || '-')}</small>${stars(c.rarity)}</div></div>
    <dl class="st"><dt>HP</dt><dd>${c.hp} ${lo.hp ? `<span class="chapmeta">(+${lo.hp})</span>` : ''}</dd>
      <dt>ATK</dt><dd>${c.atk} ${lo.atk ? `<span class="chapmeta">(+${lo.atk})</span>` : ''}</dd>
      <dt>AP</dt><dd>${c.ap}</dd></dl>
    <b>Kemampuan <small style="font-weight:400;opacity:.75">— ketuk untuk penjelasan</small></b>
    <div class="abil">${CARDS}</div>
    <div class="passive on" id="ablBox">${inna ? `<b>${inna.n}</b><br>${inna.d}` : 'Ketuk salah satu kemampuan di atas.'}</div>
    <b>Senjata (${eq.filter(Boolean).length}/3)</b>
    <div class="eqrow">${slots}</div>
    ${lockedW.length ? `<div class="passive off"><b>Terkunci</b><br>Butuh senjata sejati ${lockedW.map(w => esc(w.name)).join(', ')}.</div>` : ''}
    ${c.backstory ? `<details class="det"><summary>Latar belakang</summary><div class="backstory">${esc(c.backstory)}</div></details>` : ''}`;
}
function openSlot(cid, i) {
  slotOpen = slotOpen === i ? -1 : i;
  if (slotOpen < 0) return rdet(cid);
  const cur = S.eq[cid] || [0, 0, 0];
  const list = DB.weapons.filter(w => hasWeap(w.id)).map(w => {
    const u = usedBy(w.id);
    const busy = u && u.cid !== cid;
    const on = cur[i] === +w.id;
    return `<button class="wbtn ${busy ? 'used' : ''} ${on ? 'on' : ''}" ${busy ? 'disabled' : ''} onclick="pickWeapon(${cid},${i},${w.id})">
      ${wface(w, 36)}<span><b>${esc(w.name)}</b><br><small>${WKIND[w.kind] || ''} · +ATK ${w.w_atk} +HP ${w.w_hp}${w.passive ? ' · pasif' : ''}</small></span></button>`;
  }).join('');
  const det = $('#rdet');
  const box = document.createElement('div');
  box.innerHTML = `<b>Pilih senjata untuk slot ${i + 1} (maks 3 per karakter)</b>
    <div class="picker">${list || '<p class="hint">Belum punya senjata. Dapatkan lewat Pemanggilan.</p>'}</div>
    <button class="btn alt" onclick="slotOpen=-1;rdet(${cid})">Tutup</button>`;
  det.appendChild(box);
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

/* ============================================================
   GUDANG SENJATA
   ============================================================ */
R.armory = () => {
  $('#wlist').innerHTML = DB.weapons.map(w => {
    const o = hasWeap(w.id);
    return `<div class="card r${w.rarity} ${o ? '' : 'off'}" ${o ? `onclick="wdet(${w.id})"` : ''}>
      ${wface(w, 64)}<b>${esc(w.name)}</b>${stars(w.rarity)}<small>${o ? (WKIND[w.kind] || '') : 'Terkunci'}</small></div>`;
  }).join('');
  const first = DB.weapons.find(w => hasWeap(w.id));
  if (first) wdet(first.id); else $('#wdet').innerHTML = 'Belum punya senjata. Coba Pemanggilan.';
};
function wdet(id) {
  const w = weaponById(id); if (!w) return;
  const owner = w.true_for ? charById(w.true_for) : null;
  const u = usedBy(w.id);
  const p = w.passive ? PASSIVES[w.passive] : null;
  $('#wdet').innerHTML = `
    <div class="row">${wface(w, 110)}<div><h2>${esc(w.name)}</h2><small>${WKIND[w.kind] || w.kind}</small>${stars(w.rarity)}</div></div>
    <dl class="st"><dt>ATK</dt><dd>+${w.w_atk}</dd><dt>HP</dt><dd>+${w.w_hp}</dd><dt>Kritis</dt><dd>+${w.w_crit}%</dd></dl>
    ${owner ? `<p><small>Senjata sejati milik <b>${esc(owner.name)}</b>. Pasif hanya aktif saat dipakai ${esc(owner.name)}.</small></p>`
            : `<p><small>Bukan senjata sejati siapa pun — hanya menambah statistik.</small></p>`}
    ${p ? `<div class="passive ${w.passive && +w.true_for && S.own.includes(+w.true_for) ? 'on' : 'off'}"><b>${p.n}</b><br>${p.d}</div>` : '<div class="passive off">Tanpa skill pasif.</div>'}
    <p><small>${u ? 'Sedang dipakai: ' + esc(charById(u.cid) ? charById(u.cid).name : '-') : 'Tidak dipakai.'}</small></p>`;
}

/* ============================================================
   PERINGKAT
   ============================================================ */
R.ranked = () => {
  const t = tierOf(S.rankPts);
  $('#myrank').innerHTML = `<div class="mycard"><span class="tierbadge" style="background:${t.c}">${t.n}</span>
    <b>${S.rankPts} poin</b><span>${S.wins} menang / ${S.losses} kalah</span></div>`;
  $('#lb').innerHTML = '<p class="hint">Memuat peringkat...</p>';
  api('leaderboard').then(r => {
    if (r.error || !r.list) return $('#lb').innerHTML = '<p class="hint">' + esc(r.error || 'Gagal memuat') + '</p>';
    $('#lb').innerHTML = r.list.map((x, i) => {
      const tt = tierOf(x.pts);
      const me = r.me && x.name === r.me.name && !x.npc;
      return `<div class="lbrow ${me ? 'me' : ''} ${x.npc ? 'npc' : ''}">
        <span class="rk">${i + 1}</span>
        <span>${esc(x.name)}${x.npc ? ' <small>(saingan)</small>' : ''}<br><small class="tierbadge" style="background:${tt.c};color:#1c1410">${tt.n}</small></span>
        <span>${x.pts} poin</span>
        <span class="loss">${x.wins}M / ${x.losses}K</span></div>`;
    }).join('') + `<p class="hint">Total ${r.total} pesaing. Peringkatmu: ${r.me && r.me.rank ? r.me.rank : '-'}</p>`;
  });
};

/* ============================================================
   PERSIAPAN PERTEMPURAN
   ============================================================ */
let mode = '', pick = [], foes = [], aiLevel = .5, foeScale = 1;
const aiOfRank = p => clamp(.35 + (p - 1000) / 1400, .3, .98);
function randomTeam(n, exclude) {
  let pool = DB.chars.filter(c => !exclude.includes(+c.id));
  if (pool.length < n) pool = DB.chars;
  return [...pool].sort(() => Math.random() - .5).slice(0, n).map(c => +c.id);
}
function setup(m) {
  mode = m; pick = S.own.filter(id => charById(id)).slice(0, 3);
  $('#setupT').textContent = { STORY: 'Pertempuran bab', CLASSIC: 'Duel biasa', RANKED: 'Duel ranked', PVP: 'Dua pemain' }[m];
  if (m === 'STORY') {
    foes = (curCh.enemies || '').split(',').map(Number).filter(id => charById(id));
    if (!foes.length) foes = randomTeam(3, pick);
    aiLevel = .35 + (+curCh.difficulty || 1) * .2;
    foeScale = 1 + ((+curCh.difficulty || 1) - 1) * .18;
    $('#setupHint').textContent = `Lawan ditentukan admin pada bab ini. Tingkat kecerdasan AI: ${curCh.difficulty}/3. Menang memberi ${curCh.reward} permata.`
      + (+curCh.sort_order === 1 ? ' Bab 1 adalah tutorial: ikuti petunjuk di kotak abu bawah saat perang dimulai.' : '');
  } else if (m === 'RANKED') {
    foes = randomTeam(3, []);
    aiLevel = aiOfRank(S.rankPts);
    foeScale = clamp(1 + (S.rankPts - 1000) / 1000 * .55, .9, 2.2);
    $('#setupHint').textContent = `Lawan dipilih acak sesuai peringkatmu (${S.rankPts} poin). Semakin tinggi peringkat, semakin cerdas AI dan semakin besar statistik mereka.`;
  } else if (m === 'CLASSIC') {
    foes = randomTeam(3, []);
    aiLevel = .5; foeScale = 1;
    $('#setupHint').textContent = 'Duel latihan tanpa poin peringkat.';
  } else {
    foes = randomTeam(3, pick); aiLevel = .5; foeScale = 1;
    $('#setupHint').textContent = 'Dua pemain berbagi satu perangkat. Pemain 1 memegang Kerajaan Surgawi, Pemain 2 memegang Kekaisaran Matahari.';
  }
  go('setup'); drawPick(); drawFoes();
}
function drawFoes() {
  const box = $('#foeBox');
  if (mode === 'PVP') { box.innerHTML = '<span class="aiTag">Pemain 2 di perangkat yang sama</span>'; return; }
  if (mode === 'RANKED') { box.innerHTML = '<b>Lawan acak:</b> <span class="aiTag">' + tierOf(S.rankPts).n + ' · AI ' + Math.round(aiLevel * 100) + '% · statistik x' + foeScale.toFixed(2) + '</span>'; return; }
  box.innerHTML = '<b>Lawan:</b>' + foes.map(id => { const c = charById(id); return `<span class="foe">${face(c, 36)} ${esc(c.name)}</span>`; }).join('')
    + `<span class="aiTag">AI ${Math.round(aiLevel * 100)}% · statistik x${foeScale.toFixed(2)}</span>`;
}
function drawPick() {
  $('#pickList').innerHTML = S.own.map(id => {
    const c = charById(id); if (!c) return '';
    const lo = loadoutFor(id, S.eq);
    return `<div class="card r${c.rarity} ${pick.includes(id) ? 'sel' : ''}" onclick="tp(${id})">${face(c, 64)}<b>${esc(c.name)}</b>
      <small>HP ${c.hp + lo.hp} / ATK ${c.atk + lo.atk}</small>
      <small>${(S.eq[id] || [0, 0, 0]).filter(Boolean).length} senjata</small></div>`;
  }).join('');
}
function tp(id) {
  pick = pick.includes(id) ? pick.filter(x => x !== id) : (pick.length < 3 ? [...pick, id] : pick);
  drawPick();
}

/* ============================================================
   HADIAH PERTEMPURAN → disimpan di akun
   ============================================================ */
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
  /* mode tamu */
  let msg = '';
  if (mode === 'STORY') {
    if (win) { S.gem += curCh.reward; S.storyDone = Math.max(S.storyDone, +curCh.sort_order); msg = 'Bab selesai. Hadiah ' + curCh.reward + ' permata.'; }
    else { S.gem += 50; msg = 'Kekalahan. Hiburan 50 permata.'; }
  } else if (mode === 'CLASSIC') {
    S.gem += win ? 200 : 60; msg = win ? 'Kemenangan! +200 permata.' : 'Kalah. +60 permata hiburan.';
  } else if (mode === 'RANKED') {
    const bonus = S.rankPts >= 1750 ? 15 : S.rankPts >= 1500 ? 12 : S.rankPts >= 1300 ? 9 : S.rankPts >= 1150 ? 6 : 4;
    const d = win ? 20 + bonus : -18;
    S.rankPts = clamp(S.rankPts + d, 500, 3000);
    S.wins += win ? 1 : 0; S.losses += win ? 0 : 1;
    S.gem += win ? 250 : 80;
    msg = (win ? 'Menang ranked! +' + d + ' poin, +250 permata.' : 'Kalah ranked. ' + d + ' poin, +80 permata.');
  }
  save();
  return { msg, gems: 0, pts: 0 };
}

boot();
