const SKILLS_DB = [
  { id: 'mend', name: 'Sinar Penyembuh', desc: 'Pulihkan 40% HP maksimal untuk diri & sekutu radius 2.', tipe: 'sembuh', sasaran: 'semua_sekutu', jangkau: 2, ap: 2, cd: 3, rumus: 'maks_hp * 0.4', status: '', durasi: 0, apNilai: 0 },
  { id: 'pierce', name: 'Tembus Baja', desc: 'Serang musuh terdekat hingga jarak 3 tanpa bergerak.', tipe: 'serang', sasaran: 'musuh', jangkau: 3, ap: 2, cd: 2, rumus: 'atk * 2 + 60', status: '', durasi: 0, apNilai: 0 },
  { id: 'dash', name: 'Langkah Kilat', desc: 'Dapat +3 AP seketika.', tipe: 'ap_tambah', sasaran: 'diri', jangkau: 0, ap: 1, cd: 3, rumus: '3', status: '', durasi: 0, apNilai: 3 },
  { id: 'warbanner', name: 'Panji Perang', desc: 'Sekutu radius 2 mendapat +1 AP.', tipe: 'ap_tambah', sasaran: 'semua_sekutu', jangkau: 2, ap: 2, cd: 3, rumus: '1', status: '', durasi: 0, apNilai: 1 },
  { id: 'bulwark', name: 'Tameng Taat', desc: 'Terima 40% damage lebih sedikit selama 2 giliran.', tipe: 'buff', sasaran: 'diri', jangkau: 0, ap: 2, cd: 3, rumus: '0', status: 'perisai', durasi: 2, apNilai: 0 },
  { id: 'emberspark', name: 'Percik Bara', desc: 'Damage ke semua musuh radius 2 + efek bakar.', tipe: 'serang', sasaran: 'semua_musuh', jangkau: 2, ap: 2, cd: 3, rumus: '50', status: 'bakar', durasi: 2, apNilai: 0 },
  { id: 'bangkit', name: 'Nadi Kedua', desc: 'Bangkitkan satu sekutu yang gugur dengan HP sesuai rumus.', tipe: 'bangkit', sasaran: 'sekutu_mati', jangkau: 9, ap: 3, cd: 5, rumus: 'maks_hp * 0.45', status: '', durasi: 0, apNilai: 0 },
  { id: 'apkurang', name: 'Runtuhnya Nadi', desc: 'Curi AP dari semua musuh radius 3. Musuh yang sudah terkena skill ini kebal sampai efeknya habis.', tipe: 'ap_kurang', sasaran: 'semua_musuh', jangkau: 3, ap: 2, cd: 4, rumus: '2', status: '', durasi: 2, apNilai: 2 },
  { id: 'badai', name: 'Badai Petir', desc: 'Damage besar ke musuh terdekat + perlambatan.', tipe: 'serang', sasaran: 'musuh', jangkau: 3, ap: 3, cd: 4, rumus: 'atk * 1.4 + 60', status: 'lambat', durasi: 2, apNilai: 0 },
  { id: 'murka', name: 'Murka Abadi', desc: 'ATK semua sekutu radius 3 naik selama durasi giliran.', tipe: 'buff', sasaran: 'semua_sekutu', jangkau: 3, ap: 3, cd: 5, rumus: '0.4', status: 'marah', durasi: 3, apNilai: 0 },
  { id: 'tahanbaja', name: 'Kulit Baja', desc: 'Kurangi damage yang diterima sekutu radius 3 selama durasi giliran.', tipe: 'buff', sasaran: 'semua_sekutu', jangkau: 3, ap: 2, cd: 4, rumus: '0.3', status: 'tahan', durasi: 2, apNilai: 0 }
];
globalThis.SKILLS_DB = SKILLS_DB;

const RUMUS = (() => {
  const VARS = ['atk', 'def', 'hp', 'hp_maks', 'maks_hp', 'ap', 'level', 'bintang',
    'musuh_hp', 'musuh_atk', 'musuh_def', 'durasi', 'jumlah', 'senjata', 'krit'];
  const FN = { abs: Math.abs, min: Math.min, max: Math.max, floor: Math.floor, ceil: Math.ceil, round: Math.round, pow: Math.pow, sqrt: Math.sqrt, pi: Math.PI };
  const namaFn = Object.keys(FN);
  const cache = new Map();
  const contoh = {
    atk: 120, def: 60, hp: 800, hp_maks: 1500, maks_hp: 1500, ap: 6, level: 5,
    bintang: 5, musuh_hp: 900, musuh_atk: 90, musuh_def: 45, durasi: 2,
    jumlah: 3, senjata: 45, krit: 20
  };
  function susun(src) {
    const s = String(src == null ? '' : src).trim();
    if (!s) return null;
    if (cache.has(s)) return cache.get(s);
    let f = null;
    const bolehKarakter = /^[0-9a-zA-Z_.+\-*/%(),\s]*$/.test(s) && !/\.[A-Za-z_]/.test(s);
    if (bolehKarakter) {
      const id = s.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
      const set = new Set(VARS.concat(namaFn));
      if (id.every(x => set.has(x))) {
        try {
          f = new Function(VARS.concat(namaFn), '"use strict";return (' + s + ');');
        } catch (e) { f = null; }
      }
    }
    cache.set(s, f);
    return f;
  }
  return {
    sah(src) { return !!susun(src); },
    nilai(src, v) {
      const f = susun(src);
      if (!f) return 0;
      const arg = VARS.concat(namaFn).map(k => (k in FN ? FN[k] : (v && k in v ? v[k] : 0)));
      let r = 0;
      try { r = f.apply(null, arg); } catch (e) { r = 0; }
      return typeof r === 'number' && isFinite(r) ? r : 0;
    },
    uji(src) { return this.nilai(src, contoh); }
  };
})();
globalThis.RUMUS = RUMUS;
