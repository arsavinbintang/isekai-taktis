let bsel = 0;

const COIN_SVG = {
  gem: '<path d="M14 2 26 14 14 26 2 14z" fill="#5fd0e8" stroke="#12101a" stroke-width="3" stroke-linejoin="round"/><path d="M7 14h14" stroke="#ffffff" stroke-width="2" opacity=".7"/>',
  dust: '<g fill="#bfe4ff" stroke="#12101a" stroke-width="2" stroke-linejoin="round"><path d="M9 3l2.2 5.4 5.4 2.2-5.4 2.2L9 18.2 6.8 12.8 1.4 10.6 6.8 8.4z"/><path d="M21 15l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/></g>',
  glit: '<path d="M14 1.5 17.6 10 26 14 17.6 18 14 26.5 10.4 18 2 14 10.4 10z" fill="#ffcc44" stroke="#12101a" stroke-width="2.5" stroke-linejoin="round"/>'
};

const ELEM_SVG = {
  api: '<path d="M32 6c4 13 16 17 16 30a16 16 0 0 1-32 0c0-9 6-13 8-19 1 6 4 9 4 9 0-9-4-14 4-20z" fill="currentColor" stroke="#12101a" stroke-width="3" stroke-linejoin="round"/>',
  air: '<path d="M32 6C20 22 15 30 15 39a17 17 0 0 0 34 0c0-9-5-17-17-33z" fill="currentColor" stroke="#12101a" stroke-width="3" stroke-linejoin="round"/>',
  angin: '<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M8 22h24a8 8 0 1 0-8-8"/><path d="M8 34h32a8 8 0 1 1-8 8"/><path d="M8 46h18a7 7 0 1 0-7-7"/></g>',
  petir: '<path d="M40 4 14 36h13l-5 24 26-34H30z" fill="currentColor" stroke="#12101a" stroke-width="3" stroke-linejoin="round"/>',
  rimba: '<g fill="currentColor" stroke="#12101a" stroke-width="3" stroke-linejoin="round"><path d="M32 4 47 26h-8l13 18H12l13-18h-8z"/><path d="M27 46h10v13H27z"/></g>',
  es: '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M32 6v52"/><path d="M10 19l44 26"/><path d="M54 19 10 45"/><path d="M32 6l-6 7M32 6l6 7M32 58l-6-7M32 58l6-7"/></g>',
  bumi: '<path d="M4 54 24 20l11 16 9-13 16 31z" fill="currentColor" stroke="#12101a" stroke-width="3" stroke-linejoin="round"/><path d="M24 20l6 10-9 6z" fill="#f2f6ff" stroke="none"/>',
  netral: '<circle cx="32" cy="32" r="21" fill="currentColor" stroke="#12101a" stroke-width="3"/>'
};

const ELEM_COLOR = {
  api: '#ff7a45', air: '#4aa3ff', angin: '#79e2cf', petir: '#ffd75e',
  rimba: '#7ed957', es: '#a8e6ff', bumi: '#d8a86a', netral: '#cfc6e6'
};

const coinSvg = (k, size) =>
  `<svg viewBox="0 0 28 28" style="width:${size}px;height:${size}px" aria-hidden="true">${COIN_SVG[k] || COIN_SVG.gem}</svg>`;

const elemSvg = (kode, size, label) => {
  const k = ELEM_SVG[kode] ? kode : 'netral';
  return `<span class="elemBadge" style="width:${size}px;height:${size}px" title="${esc(GACHA.ELEMEN[k] || 'Netral')}">`
    + `<svg viewBox="0 0 64 64" style="width:${Math.max(6, size - 8)}px;height:${Math.max(6, size - 8)}px;color:${ELEM_COLOR[k]}" aria-hidden="true">${ELEM_SVG[k]}</svg></span>`
    + (label ? `<span class="elemNama">${esc(GACHA.ELEMEN[k] || '')}</span>` : '');
};

const WISH = {
  aktif() {
    const arr = (typeof DB !== 'undefined' && DB.banners) || [];
    return arr.filter(x => !GACHA.kadaluarsa(x));
  },

  banner() {
    const list = WISH.aktif();
    if (!list.length) { bsel = 0; return null; }
    if (bsel < 0 || bsel >= list.length) bsel = 0;
    return list[bsel];
  },

  pilih(i) {
    bsel = i;
    WISH.tutupHasil();
    WISH.gambar();
    sfx('pick');
  },

  gambar() {
    const daftar = WISH.aktif();
    const b = WISH.banner();
    $('#curGem').textContent = S.gem;
    $('#curDust').textContent = S.dust;
    $('#curGlit').textContent = S.glit;
    $('#banners').innerHTML = daftar.length ? daftar.map((x, i) =>
      `<button type="button" class="bnCard ${i === bsel ? 'sel' : ''}" onclick="WISH.pilih(${i})">`
      + (x.image ? `<img class="bnart" src="${esc(x.image)}" alt="">` : '<span class="bnartPh"></span>')
      + `<span class="bnLabel">${esc(x.name)}</span>`
      + `<span class="bnKind ${x.kind === 'weapon' ? 'w' : 'c'}">${x.kind === 'weapon' ? 'SENJATA' : 'KARAKTER'}</span>`
      + '</button>').join('') : '<p class="hint">Tidak ada panji yang sedang aktif. Admin bisa membuatnya di Studio.</p>';

    $('#pityC').textContent = S.pityChar + '/' + GACHA.PITY5;
    $('#pityW').textContent = S.pityWeap + '/' + GACHA.PITY5;
    $('#pity4').textContent = S.pity4 + '/' + GACHA.PITY4;
    $('#wishX1').disabled = !b || S.gem < GACHA.BIAYA;
    $('#wishX10').disabled = !b || S.gem < GACHA.BIAYA * 10;

    $('#gachaWho').textContent = (ME.user
      ? 'Progres tersimpan di akun ' + ME.user + '.'
      : 'Masuk agar hasil pemanggilan tersimpan di akun.')
      + (b ? ' Sedang memilih: ' + b.name + '.' : '');

    if (!b) {
      $('#wishKind').textContent = 'TIDAK ADA PANJI';
      $('#wishName').textContent = '—';
      $('#wishDesc').textContent = '';
      $('#wishTime').textContent = '—';
      const labKosong = $('#wishTimeLabel'); if (labKosong) labKosong.textContent = 'Sisa waktu';
      const bd0 = $('#pityBadge'); if (bd0) bd0.hidden = true;
      $('#wishArtBox').innerHTML = '<span class="wishPlate"><b>Tidak ada panji</b></span>';
      $('#wishFeat').hidden = true;
      $('#wishFeatElem').innerHTML = '';
      return;
    }

    const senjata = b.kind === 'weapon';
    $('#wishKind').textContent = senjata ? 'PANJI SENJATA' : 'PANJI KARAKTER';
    $('#wishName').textContent = b.name;
    $('#wishDesc').textContent = b.description || '';
    $('#wishTime').textContent = GACHA.formatSisa(GACHA.sisaWaktu(b));
    const lab = $('#wishTimeLabel');
    if (lab) lab.textContent = (b.time_text && String(b.time_text).trim()) || 'Sisa waktu';
    const tgl = $('#wishEnd');
    if (tgl) {
      const akhir = GACHA.akhirMs(b);
      const pakaiTanggal = String(b.end_at || '').trim().length > 0;
      tgl.hidden = !pakaiTanggal;
      tgl.textContent = pakaiTanggal
        ? 'Panji ini berakhir pada ' + new Date(akhir).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB.'
        : '';
    }
    WISH.pityBadge(b);

    $('#wishArtBox').innerHTML = b.image
      ? `<img class="wishBg" src="${esc(b.image)}" alt="">`
        + `<img class="wishStrip" src="${esc(b.image)}" alt="${esc(b.name)}">`
      : `<span class="wishPlate"><b>${esc(b.name)}</b></span>`;

    const u = GACHA.utama(b, DB.chars, DB.weapons);
    $('#wishFeat').hidden = !u;
    if (!u) return;
    $('#wfArt').innerHTML = senjata ? wface(u, 52) : face(u, 52);
    $('#wfName').textContent = u.name;
    $('#wfStars').innerHTML = stars(u.rarity);
    if (senjata) {
      $('#wishFeatElem').innerHTML = '';
      $('#wishFeatElem').hidden = true;
    } else {
      const k = GACHA.elemenKode(u);
      $('#wishFeatElem').innerHTML = elemSvg(k, 22, true);
      $('#wishFeatElem').hidden = false;
    }
  },

  tutupHasil() {
    const p = $('#pulls');
    if (p) p.hidden = true;
  },

  hasil(out) {
    const list = out || [];
    const box = $('#pullCards');
    box.className = 'wishRow' + (list.length === 1 ? ' one' : '');
    box.style.gridTemplateColumns = list.length > 1 ? `repeat(${list.length},minmax(0,1fr))` : '';
    box.innerHTML = list.map((r, i) => {
      const e = r.weapon ? '' : elemSvg(r.elemen, 22, false);
      return `<div class="card pullcard wc r${r.rarity}" style="--d:${i * 55}ms">`
        + (r.dup ? '' : '<span class="wnew">New</span>')
        + `<span class="wart">${artOf(r, 96)}</span>`
        + `<b class="wname">${esc(r.name)}</b>`
        + (r.guaranteed ? '<span class="wtag">Jaminan bintang 5</span>' : '')
        + e
        + `<span class="wr">${stars(r.rarity)}</span>`
        + '</div>';
    }).join('');
    $('#pulls').hidden = false;
    const terbaik = list.some(r => +r.rarity >= 5) ? 'wish5' : list.some(r => +r.rarity >= 4) ? 'wish4' : 'wish3';
    sfx(list.length ? terbaik : 'open');
  },

  pityBadge(b) {
    const el = $('#pityBadge'); if (!el) return;
    const art = $('#wishArt');
    const aktif = !!(b && +b.pity !== 0);
    if (!aktif) { el.hidden = true; if (art) art.classList.remove('hasPity'); return; }
    const senjata = b.kind === 'weapon';
    const kini = senjata ? S.pityWeap : S.pityChar;
    const sisa = Math.max(0, GACHA.PITY5 - kini);
    el.hidden = false;
    if (art) art.classList.add('hasPity');
    el.innerHTML = '<b>Pity 5★</b><span>' + (sisa ? 'lagi ' + sisa + ' tarikan' : 'siap jalan!') + '</span>';
  },

  transisi(b, out) {
    const ov = $('#wishAnim');
    if (!ov) { WISH.hasil(out); return Promise.resolve(); }
    if (S.skipWish) { WISH.hasil(out); return Promise.resolve(); }
    ov.hidden = false;
    ov.classList.remove('run');
    void ov.offsetWidth;
    ov.classList.add('run');
    sfx('wish');
    $('#wanimText').textContent = b ? b.name : 'Pemanggilan';
    let batal = false;
    $('#waSkip').onclick = () => { batal = true; };
    const t0 = Date.now();
    const DUR = 1000;
    return new Promise(resolve => {
      const cek = () => {
        if (batal || Date.now() - t0 >= DUR) {
          ov.hidden = true;
          ov.classList.remove('run');
          WISH.hasil(out);
          return resolve();
        }
        setTimeout(cek, 50);
      };
      setTimeout(cek, 50);
    });
  },

  tutupModal() {
    const m = $('#wishModal');
    m.hidden = true;
    m.innerHTML = '';
  },

  modal(judul, isi) {
    const m = $('#wishModal');
    m.innerHTML = `<div class="wmodalBox"><div class="wmodalTop"><h3>${esc(judul)}</h3>`
      + '<button type="button" class="wbtn sm" onclick="WISH.tutupModal()">Tutup</button></div>'
      + `<div class="wmodalBody">${isi}</div></div>`;
    m.hidden = false;
  },

  detail() {
    const b = WISH.banner();
    if (!b) return toast('Belum ada banner');
    const senjata = b.kind === 'weapon';
    const ids = GACHA.poolIds(b);
    const semua = senjata ? DB.weapons : DB.chars;
    const isi = ids.length ? semua.filter(x => ids.indexOf(+x.id) >= 0) : semua;
    const aturan = [
      'Peluang bintang 5 = 4%, bintang 4 = 12%, sisanya bintang 3.',
      'Bintang 5 dijamin setelah ' + GACHA.PITY5 + ' tarikan pada jenis panji yang sama.',
      'Setiap ' + GACHA.PITY4 + ' tarikan dijamin minimal satu bintang 4 atau lebih tinggi.',
      'Kartu kembar berubah jadi ' + GACHA.REFUND[3] + ' Debu Bintang (bintang 3), '
        + GACHA.REFUND[4] + ' Bintang Takdir (bintang 4), dan ' + GACHA.REFUND[5] + ' Bintang Takdir (bintang 5).',
      'Satu tarikan biaya ' + GACHA.BIAYA + ' Permata. Sepuluh tarikan sekaligus biaya ' + (GACHA.BIAYA * 10) + ' Permata.',
      'Kartu baru langsung masuk koleksi. Admin melihat seluruh koleksi terbuka.'
    ];
    const utama = GACHA.utama(b, DB.chars, DB.weapons);
    let kepala = '';
    if (b.image) kepala += `<div class="wbnstrip"><img src="${esc(b.image)}" alt="${esc(b.name)}"></div>`;
    if (utama) {
      const k = senjata ? '' : GACHA.elemenKode(utama);
      kepala += `<div class="whead r${+utama.rarity || 3}">`
        + `<span class="wheadArt">${senjata ? wface(utama, 96) : face(utama, 96)}</span>`
        + '<span class="wheadTxt">'
        + `<b>${esc(utama.name)}</b>`
        + (utama.title ? `<small>${esc(utama.title)}</small>` : '')
        + `<span class="wheadMeta">${senjata ? `<small>${esc(GACHA.WKIND[utama.kind] || '')} +ATK ${+utama.w_atk || 0} +HP ${+utama.w_hp || 0}</small>` : ''}`
        + `${senjata ? '' : elemSvg(k, 24, true)}`
        + `<span class="wr">${stars(utama.rarity)}</span></span></span></div>`;
    }
    const baris = isi.length ? isi.map(it =>
      `<div class="wrow r${+it.rarity || 3}">${senjata ? wface(it, 34) : face(it, 34)}`
      + `<span class="wrowName">${esc(it.name)}</span>`
      + (senjata ? `<span class="wrowSub">${esc(GACHA.WKIND[it.kind] || '')}</span>` : `<span class="wrowSub">${esc(it.title || '')}</span>`)
      + `<span class="wr">${stars(it.rarity)}</span></div>`).join('')
      : '<p class="hint">Panji ini memakai seluruh koleksi.</p>';
    WISH.modal('Details',
      kepala
      + `<div class="wrules">${aturan.map(t => `<p>${esc(t)}</p>`).join('')}</div>`
      + `<h4>Isi panji (${isi.length})</h4><div class="wlist">${baris}</div>`);
  },

  riwayat() {
    const log = S.wishLog || [];
    const isi = log.length
      ? '<div class="wlist">' + log.map(e =>
        `<div class="wrow r${+e.rarity || 3}">${e.weapon ? wface({ image: e.image, kind: e.kind }, 34) : face({ image: e.image, name: e.name }, 34, '?')}`
        + `<span class="wrowName">${esc(e.name)}${e.dup ? ' (kembar)' : ''}</span>`
        + `<span class="wrowSub">${esc(e.b || '')}</span>`
        + `<span class="wr">${stars(e.rarity)}</span>`
        + `<span class="wrowTime">${WISH.tgl(e.t)}</span></div>`).join('') + '</div>'
      : '<p class="hint">Belum ada riwayat pemanggilan.</p>';
    WISH.modal('History', isi + `<p class="hint">Menyimpan ${log.length} tarikan terakhir.</p>`);
  },

  toko() {
    const baris = ['dust', 'glit'].map(k => {
      const t = GACHA.TUKAR[k];
      const sal = k === 'dust' ? S.dust : S.glit;
      const paket = Math.floor(sal / t.per);
      return `<div class="wshopRow">${coinSvg(k, 30)}`
        + `<span class="wshopTxt"><b>${esc(t.nama)}</b>`
        + `<small>${sal} tersedia · ${t.per} jadi ${t.hasil} Permata</small></span>`
        + `<button type="button" class="wbtn sm" ${paket < 1 ? 'disabled' : ''} onclick="WISH.tukar('${k}')">Tukar ${paket * t.per || t.per}</button></div>`;
    }).join('');
    WISH.modal('Shop',
      '<p class="hint">Debu Bintang didapat dari kartu kembar bintang 3. Bintang Takdir didapat dari kartu kembar bintang 4 dan 5. Keduanya bisa ditukar jadi Permata untuk memanggil lagi.</p>'
      + `<div class="wshop">${baris}</div>`);
  },

  async tukar(jenis) {
    const t = GACHA.TUKAR[jenis];
    if (!t) return;
    const sal = jenis === 'dust' ? S.dust : S.glit;
    const paket = Math.floor(sal / t.per);
    if (paket < 1) return toast(t.nama + ' tidak cukup');
    const n = paket * t.per;
    if (S.online) {
      const f = new FormData();
      f.append('jenis', jenis); f.append('n', n);
      const r = await act('shop', f);
      if (!r) return;
    } else {
      if (jenis === 'dust') S.dust -= n; else S.glit -= n;
      S.gem += paket * t.hasil;
      save();
    }
    WISH.gambar();
    WISH.toko();
    toast('Tukar ' + n + ' ' + t.nama + ' jadi ' + (paket * t.hasil) + ' Permata.');
  },

  tgl(t) {
    const d = new Date(+t || 0);
    const p = v => String(v).padStart(2, '0');
    return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
};

R.gacha = () => {
  syncSkipWish();
  WISH.tutupHasil();
  WISH.gambar();
};

async function pull(n) {
  const b = WISH.banner();
  if (!b) return toast('Belum ada panji');
  const jumlah = Math.max(1, Math.min(10, parseInt(n, 10) || 1));
  const cost = GACHA.biaya(jumlah);
  if (S.gem < cost) return toast('Permata tidak cukup');

  let hasil = null;
  if (S.online) {
    const f = new FormData();
    f.append('banner_id', b.id); f.append('n', jumlah);
    const r = await act('pull', f);
    if (!r) return;
    hasil = r.results;
    WISH.gambar();
  } else {
    const senjata = b.kind === 'weapon';
    S.gem -= cost;
    const r = GACHA.tarik({
      banner: b,
      items: senjata ? DB.weapons : DB.chars,
      n: jumlah,
      milik: senjata ? S.ownW : S.own,
      pity5: senjata ? S.pityWeap : S.pityChar,
      pity4: S.pity4
    });
    if (senjata) S.pityWeap = r.pity5; else S.pityChar = r.pity5;
    S.pity4 = r.pity4;
    S.dust += r.dust;
    S.glit += r.glit;
    S.wishLog = GACHA.catat(r.riwayat, S.wishLog);
    r.results.forEach(x => {
      if (!x.dup) return;
      const bag = senjata ? (S.dupW = S.dupW || {}) : (S.dupC = S.dupC || {});
      bag[x.id] = (bag[x.id] || 0) + 1;
    });
    save();
    hasil = r.results;
    WISH.gambar();
  }
  if (!hasil) return;
  await WISH.transisi(b, hasil);
}

let wishTerakhir = null;
setInterval(() => {
  const g = $('#gacha'), el = $('#wishTime');
  if (!g || !g.classList.contains('on') || !el) return;
  const b = WISH.banner();
  const id = b ? String(b.id) : '';
  if (wishTerakhir !== null && wishTerakhir !== id) {
    wishTerakhir = id;
    WISH.gambar();
    return;
  }
  wishTerakhir = id;
  el.textContent = b ? GACHA.formatSisa(GACHA.sisaWaktu(b)) : '—';
}, 1000);
