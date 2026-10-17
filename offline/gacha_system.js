const GACHA = {
  BIAYA: 100,
  PITY5: 300,
  PITY4: 10,
  RATE5: 0.04,
  RATE4: 0.16,
  MAKS_LOG: 60,
  SIKLUS_MS: 21 * 864e5,
  DASAR_MS: Date.UTC(2026, 0, 1),
  REFUND: { 3: 30, 4: 80, 5: 200 },
  WKIND: {
    sword: 'Pedang', dagger: 'Belati', axe: 'Kapak', spear: 'Tombak',
    bow: 'Busur', staff: 'Staf', hammer: 'Palu', harp: 'Harpa'
  },
  TUKAR: {
    dust: { per: 100, hasil: 30, nama: 'Debu Bintang' },
    glit: { per: 10, hasil: 10, nama: 'Bintang Takdir' }
  },
  ELEMEN: {
    api: 'Api', air: 'Air', angin: 'Angin', petir: 'Petir',
    rimba: 'Rimba', es: 'Es', bumi: 'Bumi', netral: 'Netral'
  },

  biaya(n) {
    const j = Math.max(1, Math.min(10, parseInt(n, 10) || 1));
    return GACHA.BIAYA * j;
  },

  poolIds(b) {
    return String((b && b.pool) || '').split(',').map(Number).filter(Boolean);
  },

  gulung(pity5, pity4) {
    const p5 = (parseInt(pity5, 10) || 0) + 1;
    const p4 = (parseInt(pity4, 10) || 0) + 1;
    const j5 = p5 >= GACHA.PITY5;
    const r = Math.random();
    let rar = j5 ? 5 : (r < GACHA.RATE5 ? 5 : (r < GACHA.RATE4 ? 4 : 3));
    const j4 = !j5 && p4 >= GACHA.PITY4 && rar < 4;
    if (j4) rar = 4;
    return { rar, jaminan5: j5 ? 1 : 0, jaminan4: j4 ? 1 : 0, p5: j5 ? 0 : p5, p4: rar >= 4 ? 0 : p4 };
  },

  pilih(items, pool, rar, milik, preferNew) {
    if (!items || !items.length) return null;
    const punya = milik || [];
    const dalam = pool && pool.length ? items.filter(x => pool.indexOf(+x.id) >= 0) : items;
    const src = dalam.length ? dalam : items;
    let cand = src.filter(x => +x.rarity === rar);
    if (!cand.length) {
      let terbaik = +src[0].rarity, jarak = 99;
      src.forEach(x => {
        const d = Math.abs(+x.rarity - rar);
        if (d < jarak) { jarak = d; terbaik = +x.rarity; }
      });
      cand = src.filter(x => +x.rarity === terbaik);
    }
    if (preferNew) {
      const baru = cand.filter(x => punya.indexOf(+x.id) < 0);
      if (baru.length) cand = baru;
    }
    return cand[(Math.random() * cand.length) | 0] || null;
  },

  elemenKode(c) {
    if (!c) return 'netral';
    const dariSkill = { emberspark: 'api', mend: 'air', dash: 'angin', bulwark: 'bumi', pierce: 'petir', warbanner: 'rimba' };
    if (dariSkill[c.skill]) return dariSkill[c.skill];
    const dariPasif = { burn: 'api', fury: 'api', regen: 'air', haste: 'angin', guard: 'bumi', vigor: 'bumi', crit_up: 'petir', inspire: 'rimba', lifesteal: 'es', first: 'es' };
    if (dariPasif[c.passive]) return dariPasif[c.passive];
    const dariFraksi = {
      'Kerajaan Solaria': 'api', 'Kekaisaran Matahari': 'api', 'Peneka Api': 'api',
      'Gereja Fajar': 'rimba', 'Kultus Senja Abadi': 'es', 'Klan Malam': 'es',
      'Menara Kaca': 'angin', 'Legiun Besi': 'bumi', 'Netral': 'petir'
    };
    if (dariFraksi[c.faction]) return dariFraksi[c.faction];
    const putaran = ['api', 'air', 'angin', 'petir', 'rimba', 'es', 'bumi'];
    return putaran[(parseInt(c.id, 10) || 0) % 7];
  },

  utama(b, chars, weapons) {
    const senjata = b && b.kind === 'weapon';
    const items = senjata ? (weapons || []) : (chars || []);
    if (!items.length) return null;
    const ids = GACHA.poolIds(b);
    const dalam = ids.length ? items.filter(x => ids.indexOf(+x.id) >= 0) : items;
    const src = dalam.length ? dalam : items;
    return src.slice().sort((x, y) => ((+y.rarity || 0) - (+x.rarity || 0)) || ((+x.id || 0) - (+y.id || 0)))[0] || null;
  },

  tarik(cfg) {
    const o = cfg || {};
    const b = o.banner || {};
    const n = Math.max(1, Math.min(10, parseInt(o.n, 10) || 1));
    const senjata = b.kind === 'weapon';
    const items = o.items || [];
    const pool = GACHA.poolIds(b);
    const milik = o.milik || [];
    let p5 = parseInt(o.pity5, 10) || 0;
    let p4 = parseInt(o.pity4, 10) || 0;
    const results = [], riwayat = [];
    let dust = 0, glit = 0, baru = 0;
    for (let i = 0; i < n; i++) {
      const g = GACHA.gulung(p5, p4);
      p5 = g.p5; p4 = g.p4;
      const it = GACHA.pilih(items, pool, g.rar, milik, g.jaminan5);
      if (!it) continue;
      const id = +it.id;
      const kembar = milik.indexOf(id) >= 0;
      const rr = +it.rarity || 3;
      if (kembar) {
        const v = GACHA.REFUND[rr] || 30;
        if (rr >= 4) glit += v; else dust += v;
      } else {
        milik.push(id); baru++;
      }
      const ent = {
        id: id,
        name: it.name,
        rarity: rr,
        dup: kembar ? 1 : 0,
        image: it.image || '',
        weapon: senjata ? 1 : 0,
        kind: it.kind || '',
        guaranteed: g.jaminan5,
        g4: g.jaminan4,
        elemen: senjata ? '' : GACHA.elemenKode(it),
        sub: senjata
          ? (GACHA.WKIND[it.kind] || it.kind || '') + ' +ATK ' + (+it.w_atk || 0) + ' +HP ' + (+it.w_hp || 0)
          : (it.title || '')
      };
      results.push(ent);
      riwayat.push({
        id: id, name: it.name, rarity: rr, weapon: senjata ? 1 : 0,
        dup: kembar ? 1 : 0, image: it.image || '', kind: it.kind || '',
        b: b.name || '', t: Date.now()
      });
    }
    return {
      results: results, riwayat: riwayat,
      pity5: p5, pity4: p4,
      dust: dust, glit: glit, refund: dust + glit, baru: baru
    };
  },

  catat(entri, lama, maks) {
    const batas = maks || GACHA.MAKS_LOG;
    const l = Array.isArray(lama) ? lama : [];
    const e = Array.isArray(entri) ? entri : [entri];
    return e.filter(Boolean).concat(l).slice(0, batas);
  },

  tukar(jenis, n) {
    const t = GACHA.TUKAR[jenis];
    if (!t) return null;
    const paket = Math.floor((parseInt(n, 10) || 0) / t.per);
    if (paket < 1) return null;
    return { jenis: jenis, nama: t.nama, sumber: paket * t.per, hasil: paket * t.hasil };
  },

  akhirMs(b) {
    if (!b) return 0;
    const raw = String(b.end_at == null ? '' : b.end_at).trim();
    if (raw) {
      const ms = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
      if (ms > 0) return ms;
    }
    const k = parseInt(b.id, 10) || 1;
    let t = GACHA.DASAR_MS + ((k - 1) % 3) * 2 * 864e5;
    while (t <= Date.now()) t += GACHA.SIKLUS_MS;
    return t;
  },

  bannerDari(id) {
    const arr = (typeof DB !== 'undefined' && DB.banners) || [];
    return arr.find(b => +b.id === +id) || null;
  },

  kadaluarsa(b, now) {
    return !!b && GACHA.sisaWaktu(b, now) <= 0;
  },

  sisaWaktu(bannerId, now) {
    const b = (bannerId && typeof bannerId === 'object') ? bannerId : GACHA.bannerDari(bannerId);
    return Math.max(0, GACHA.akhirMs(b) - (now || Date.now()));
  },

  formatSisa(ms) {
    const s = Math.max(0, Math.floor((+ms || 0) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const x = s % 60;
    const p = v => String(v).padStart(2, '0');
    return d + 'h ' + p(h) + ':' + p(m) + ':' + p(x);
  }
};
