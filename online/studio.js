/* ============================================================
   ISEKAI TACTICS — Studio (khusus admin)
   kelola karakter + latar belakang, senjata + pasif, bab cerita
   (termasuk siapa yang jadi lawan), dan banner gacha
   ============================================================ */

let tab = 'char';
async function send(a, fd) {
  const r = await api(a, fd);
  if (r.error) { toast(r.error); return null; }
  return r;
}
const fill = (f, o, keys) => keys.forEach(k => { f.elements[k].value = o[k] ?? ''; });
const resetFile = input => { try { input.value = ''; } catch (e) {} };
/* Nama input checkbox memakai tanda kurung ("pool[]", "enemies[]"); FormData
   menyimpannya persis dengan tanda itu. Periksa kedua bentuk kuncinya supaya
   validasi tidak pernah menolak isi yang sebenarnya sudah dipilih. */
const adaIsi = (fd, k) => fd.getAll(k + '[]').length + fd.getAll(k).length;

/* --------------------------------------------------------------------------
   KECILKAN GAMBAR SEBELUM DIKIRIM.
   Batas PHP (upload_max_filesize, sering 2 MB) menolak foto asli dari ponsel
   tanpa suara — hasilnya "Simpan" terlihat berhasil tetapi gambarnya kosong.
   Di sini berkas dilewatkan kanvas dulu: sisi terpanjang dibatasi 1024 px dan
   hasilnya disimpan sebagai JPEG, sehingga hampir selalu jauh di bawah batas.
   -------------------------------------------------------------------------- */
async function shrinkImage(file, maxDim = 1024, quality = .86) {
  if (!file || !file.size || !/^image\//.test(file.type || '')) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
    const s = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * s));
    c.height = Math.max(1, Math.round(img.height * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    /* PNG kecil biarkan apa adanya (transparansi); sisanya jadi JPEG */
    const type = (file.type === 'image/png' && file.size < 400 * 1024) ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(r => c.toBlob(r, type, quality));
    if (!blob || blob.size >= file.size) return file;
    const base = (file.name || 'gbr').replace(/\.[^.]+$/, '');
    return new File([blob], base + (type === 'image/png' ? '.png' : '.jpg'),
      { type, lastModified: Date.now() });
  } catch (e) { return file; }
}
/* ganti isi FormData[kunci] dengan hasil perkecilan — dipakai tiap form Studio */
async function prepImg(fd, kunci = 'image') {
  const f = fd.get(kunci);
  if (f instanceof File && f.size) fd.set(kunci, await shrinkImage(f));
  return fd;
}
/* beri tahu admin lebih dulu bila berkas musik melewati batas umum */
function checkAudio(fd) {
  const m = fd.get('music_file');
  if (m instanceof File && m.size > 8 * 1024 * 1024)
    return 'Berkas musik ' + Math.round(m.size / 1048576) + ' MB — batasnya 8 MB. Kompres dulu audionya.';
  return null;
}

R.studio = () => {
  if (!ME.admin) { toast('Studio khusus admin. Silakan masuk dengan akun admin.'); return go('login'); }
  $('#tabChar').hidden = tab !== 'char';
  $('#tabWeapon').hidden = tab !== 'weapon';
  $('#tabStory').hidden = tab !== 'story';
  $('#tabBanner').hidden = tab !== 'banner';
  $('#tabSet').hidden = tab !== 'set';
  const nw = (fn, t) => `<button class="btn" style="width:100%;margin-bottom:10px" onclick="${fn}(0)">${t}</button>`;
  $('#clist').innerHTML = nw('editChar', 'Karakter baru') + DB.chars.map(c =>
    `<div class="card panel row" onclick="editChar(${c.id})">${face(c, 40)}<span>${esc(c.name)}<br><small>${c.rarity} bintang</small></span></div>`).join('');
  $('#wcol').innerHTML = nw('editWeapon', 'Senjata baru') + DB.weapons.map(w =>
    `<div class="card panel row" onclick="editWeapon(${w.id})">${wface(w, 40)}<span>${esc(w.name)}<br><small>${w.rarity} bintang${w.passive ? ' · pasif' : ''}</small></span></div>`).join('');
  $('#slist').innerHTML = nw('editChap', 'Bab baru') + DB.story.map(c =>
    `<div class="card panel row" onclick="editChap(${c.id})"><span>${esc(c.title)}<br><small>lawan: ${esc(c.enemies || '-')}</small></span></div>`).join('');
  $('#blist').innerHTML = nw('editBanner', 'Banner baru') + DB.banners.map(b =>
    `<div class="card panel row" onclick="editBanner(${b.id})"><span>${esc(b.name)}<br><small>${b.kind === 'weapon' ? 'senjata' : 'karakter'}</small></span></div>`).join('');
  ({ char: editChar, weapon: editWeapon, story: editChap, banner: editBanner, set: fillSettings })[tab](0);
};
const tabTo = t => { tab = t; R.studio(); };

/* ---------- pengaturan: musik & splash art ---------- */
function fillSettings() {
  const s = DB.settings || {}, f = $('#setf');
  if (!f) return;
  $('#musicTrack').innerHTML = Object.keys(TRACKS).map(k =>
    `<option value="${k}">${TRACK_NAME[k] || k}</option>`).join('');
  f.elements.music_mode.value = s.music_mode || 'gen';
  f.elements.music_track.value = TRACKS[s.music_track] ? s.music_track : 'fajar';
  f.elements.music_vol.value = clamp(+s.music_vol || 55, 0, 100);
  $('#musicVolOut').textContent = f.elements.music_vol.value + '%';
  f.elements.old_music.value = s.music_file || '';
  $('#sMusicPrev').innerHTML = s.music_file
    ? `<audio controls src="${esc(s.music_file)}" style="width:100%"></audio>` : '';
  f.elements.splash_on.checked = s.splash_on === '1';
  f.elements.splash_text.value = s.splash_text || 'Isekai Tactics';
  f.elements.splash_sub.value = s.splash_sub || '';
  f.elements.old_splash.value = s.splash_image || '';
  $('#sSplashPrev').innerHTML = s.splash_image
    ? `<img class="face" src="${esc(s.splash_image)}" style="width:90px;height:90px" alt="">` : '';
  $('#musicNow').textContent = musicLabel();
}
/* pratinjau sebelum disimpan */
$('#musicFileIn').onchange = e => {
  const t = e.target.files[0];
  $('#sMusicPrev').innerHTML = t ? `<audio controls src="${URL.createObjectURL(t)}" style="width:100%"></audio>` : '';
};
$('#splashIn').onchange = e => {
  const t = e.target.files[0];
  $('#sSplashPrev').innerHTML = t ? `<img class="face" src="${URL.createObjectURL(t)}" style="width:90px;height:90px" alt="">` : '';
};
function musicLabel() {
  if (MUSIC.mode === 'off') return 'Musik mati';
  if (MUSIC.mode === 'file') return DB.settings.music_file ? 'Berkas unggahan' : 'Berkas belum diunggah — jatuh ke lagu generated';
  return 'Lagu generated: ' + (TRACK_NAME[MUSIC.track] || MUSIC.track);
}
async function saveSettings(e) {
  e.preventDefault();
  const f = e.target, fd = new FormData(f);
  fd.append('splash_on', f.elements.splash_on.checked ? '1' : '0');
  const berat = checkAudio(fd); if (berat) return toast(berat);
  const r = await send('settings_save', await prepImg(fd, 'splash_image'));
  if (!r) return;
  DB.settings = r.settings || {};
  musicApplySettings();
  fillSettings(); splashShow(); R.studio();
  toast('Pengaturan disimpan');
}

/* ---------- pilihan bantu ---------- */
function fillKindSel() {
  const k = $('#wk'); if (k.options.length) return;
  k.innerHTML = Object.keys(WKIND).map(v => `<option value="${v}">${WKIND[v]}</option>`).join('');
  const p = $('#wpass');
  p.innerHTML = '<option value="">— tanpa skill pasif —</option>' +
    Object.keys(PASSIVES).map(v => `<option value="${v}">${PASSIVES[v].n}</option>`).join('');
  p.onchange = () => {
    const k2 = p.value;
    $('#wpassHint').textContent = k2
      ? PASSIVES[k2].d + (k2 && !$('#wtrue').value ? ' Pilih pemilik senjata sejati agar pasif ini bisa aktif.' : '')
      : 'Senjata tanpa pasif hanya menambah statistik.';
  };
  $('#wtrue').onchange = fillKindSel.hint || (() => $('#wpass').onchange());
}
function refreshTrueFor(sel) {
  $('#wtrue').innerHTML = '<option value="0">— bukan senjata sejati siapa pun —</option>' +
    DB.chars.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.title)})</option>`).join('');
  $('#wtrue').value = String(sel || 0);
}

/* ---------- karakter ---------- */
function editChar(id) {
  const f = $('#cf'), c = charById(id) || { hp: 250, atk: 50, ap: 4, ult: 'AoE Dmg', passive: '', skill: '', rarity: 3, image: '' };
  $('#cfpass').innerHTML = [''].concat(Object.keys(PASSIVES)).map(k =>
    `<option value="${k}">${k ? PASSIVES[k].n : '— tanpa pasif —'}</option>`).join('');
  $('#cfskill').innerHTML = [''].concat(Object.keys(SKILLS)).map(k =>
    `<option value="${k}">${k ? SKILLS[k].n : '— tanpa skill —'}</option>`).join('');
  fill(f, Object.assign({ id }, c), ['id', 'name', 'title', 'faction', 'rarity', 'hp', 'atk', 'ap', 'ult', 'passive', 'skill', 'lore', 'backstory']);
  f.elements.id.value = id;
  f.elements.old_image.value = c.image || '';
  resetFile(f.elements.image);
  $('#prev').innerHTML = face(c.name ? c : null, 90);
}
$('#imgf').onchange = e => {
  const f = e.target.files[0];
  if (f) $('#prev').innerHTML = `<img class="face" src="${URL.createObjectURL(f)}" style="width:90px;height:90px" alt="">`;
};
async function saveChar(e) {
  e.preventDefault();
  const r = await send('char_save', await prepImg(new FormData(e.target)));
  if (!r) return;
  await loadAll(); R.studio(); editChar(r.id); toast('Karakter disimpan');
}
async function delChar() {
  const id = $('#cf').elements.id.value;
  if (!+id || !confirm('Hapus karakter ini? Pemilik & perataannya ikut dihapus.')) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('char_del', fd)) {
    S.own = S.own.filter(x => +x !== +id); delete S.eq[id];
    save(); await loadAll(); R.studio(); toast('Karakter dihapus');
  }
}

/* ---------- senjata ---------- */
function editWeapon(id) {
  fillKindSel();
  const f = $('#wf'), w = weaponById(id) || { kind: 'sword', rarity: 3, w_atk: 10, w_hp: 20, w_crit: 0, passive: '', true_for: 0, image: '' };
  refreshTrueFor(w.true_for);
  fill(f, Object.assign({ id }, w), ['id', 'name', 'kind', 'rarity', 'w_atk', 'w_hp', 'w_crit', 'passive', 'true_for']);
  f.elements.id.value = id;
  f.elements.old_image.value = w.image || '';
  resetFile(f.elements.image);
  $('#wpass').value = w.passive || '';
  $('#wpass').onchange();
  $('#wprev').innerHTML = wface(w.name ? w : { kind: 'sword' }, 90);
}
$('#wimgf').onchange = e => {
  const f = e.target.files[0];
  if (f) $('#wprev').innerHTML = `<img class="face" src="${URL.createObjectURL(f)}" style="width:90px;height:90px" alt="">`;
};
async function saveWeapon(e) {
  e.preventDefault();
  const fd = await prepImg(new FormData(e.target));
  if (!fd.get('passive') && !fd.get('true_for')) { /* tanpa pasif: boleh */ }
  const r = await send('weapon_save', fd);
  if (!r) return;
  await loadAll(); R.studio(); editWeapon(r.id); toast('Senjata disimpan');
}
async function delWeapon() {
  const id = $('#wf').elements.id.value;
  if (!+id || !confirm('Hapus senjata ini?')) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('weapon_del', fd)) {
    S.ownW = S.ownW.filter(x => +x !== +id);
    Object.keys(S.eq).forEach(k => { S.eq[k] = S.eq[k].map(w => +w === +id ? 0 : w); });
    save(); await loadAll(); R.studio(); toast('Senjata dihapus');
  }
}

/* ---------- bab cerita + pemilihan lawan ---------- */
function editChap(id) {
  const f = $('#sf');
  const c = DB.story.find(x => +x.id === id) || { sort_order: DB.story.length + 1, battle: 1, difficulty: 1, reward: 300, title: '', script: '', enemies: '' };
  const foes = (c.enemies || '').split(',').map(Number);
  fill(f, Object.assign({ id }, c), ['id', 'title', 'sort_order', 'difficulty', 'reward', 'script']);
  f.elements.id.value = id;
  f.elements.battle.checked = +c.battle === 1;
  $('#senemies').innerHTML = DB.chars.map(ch =>
    `<label class="chk"><input type="checkbox" name="enemies[]" value="${ch.id}" ${foes.includes(+ch.id) ? 'checked' : ''}>${face(ch, 26)} ${esc(ch.name)}</label>`).join('')
    || '<p class="hint">Belum ada karakter.</p>';
}
async function saveChap(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!adaIsi(fd, 'enemies')) return toast('Pilih minimal satu lawan untuk bab ini');
  const r = await send('chapter_save', fd);
  if (!r) return;
  await loadAll(); R.studio(); editChap(r.id); toast('Bab disimpan');
}
async function delChap() {
  const id = $('#sf').elements.id.value;
  if (!+id || !confirm('Hapus bab ini?')) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('chapter_del', fd)) { await loadAll(); R.studio(); toast('Bab dihapus'); }
}

/* ---------- banner (karakter / senjata) ---------- */
function editBanner(id) {
  const f = $('#bf'), b = DB.banners.find(x => +x.id === id) || { name: '', description: '', kind: 'char', pool: '', image: '' };
  f.elements.id.value = id;
  f.elements.name.value = b.name;
  f.elements.description.value = b.description;
  f.elements.kind.value = b.kind === 'weapon' ? 'weapon' : 'char';
  f.elements.old_image.value = b.image || '';
  resetFile(f.elements.image);
  $('#bprev').innerHTML = b.image ? `<img class="face" src="${esc(b.image)}" style="width:90px;height:90px" alt="">` : '';
  renderBannerPool();
}
$('#bimgf').onchange = e => {
  const f = e.target.files[0];
  if (f) $('#bprev').innerHTML = `<img class="face" src="${URL.createObjectURL(f)}" style="width:90px;height:90px" alt="">`;
};
function renderBannerPool() {
  const kind = $('#bkind').value;
  const cur = (DB.banners.find(x => +x.id === +$('#bf').elements.id.value) || { pool: '' });
  const on = (cur.pool || '').split(',').map(Number);
  const src = kind === 'weapon' ? DB.weapons : DB.chars;
  $('#bchars').innerHTML = src.map(it =>
    `<label class="chk"><input type="checkbox" name="pool[]" value="${it.id}" ${on.includes(+it.id) ? 'checked' : ''}>` +
    (kind === 'weapon' ? wface(it, 26) : face(it, 26)) + ` ${esc(it.name)}</label>`).join('');
}
async function saveBanner(e) {
  e.preventDefault();
  const fd = await prepImg(new FormData(e.target));
  /* Nama input memakai tanda kurung ("pool[]") — lihat catatan adaIsi di atas */
  if (!adaIsi(fd, 'pool')) return toast('Pilih minimal satu isi banner');
  const r = await send('banner_save', fd);
  if (!r) return;
  await loadAll(); R.studio(); editBanner(r.id); toast('Banner disimpan');
}
async function delBanner() {
  const id = $('#bf').elements.id.value;
  if (!+id || !confirm('Hapus banner ini?')) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('banner_del', fd)) { bsel = 0; await loadAll(); R.studio(); toast('Banner dihapus'); }
}
