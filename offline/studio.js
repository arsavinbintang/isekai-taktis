

let tab = 'char';
async function send(a, fd) {
  const r = await api(a, fd);
  if (r.error) { toast(r.error); return null; }
  return r;
}
const fill = (f, o, keys) => keys.forEach(k => { f.elements[k].value = o[k] ?? ''; });
const resetFile = input => { try { input.value = ''; } catch (e) {} };

const adaIsi = (fd, k) => fd.getAll(k + '[]').length + fd.getAll(k).length;


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
    
    const type = (file.type === 'image/png' && file.size < 400 * 1024) ? 'image/png' : 'image/jpeg';
    const blob = await new Promise(r => c.toBlob(r, type, quality));
    if (!blob || blob.size >= file.size) return file;
    const base = (file.name || 'gbr').replace(/\.[^.]+$/, '');
    return new File([blob], base + (type === 'image/png' ? '.png' : '.jpg'),
      { type, lastModified: Date.now() });
  } catch (e) { return file; }
}

async function prepImg(fd, kunci = 'image') {
  const f = fd.get(kunci);
  if (f instanceof File && f.size) fd.set(kunci, await shrinkImage(f));
  return fd;
}

function checkAudio(fd) {
  const m = fd.get('music_file');
  if (m instanceof File && m.size > 2.5 * 1024 * 1024)
    return 'Berkas musik ' + Math.round(m.size / 1048576 * 10) / 10 + ' MB — batas mode offline 2.5 MB karena disimpan di browser. Kompres dulu audionya.';
  return null;
}

R.studio = () => {
  if (!ME.admin) { toast('Studio khusus admin. Silakan masuk dengan akun admin.'); return go('login'); }
  $('#tabChar').hidden = tab !== 'char';
  $('#tabWeapon').hidden = tab !== 'weapon';
  $('#tabStory').hidden = tab !== 'story';
  $('#tabBanner').hidden = tab !== 'banner';
  $('#tabEvent').hidden = tab !== 'event';
  $('#tabSkill').hidden = tab !== 'skill';
  $('#tabSet').hidden = tab !== 'set';
  const nw = (fn, t) => `<button class="btn" style="width:100%;margin-bottom:10px" onclick="${fn}(0)">${t}</button>`;
  $('#clist').innerHTML = nw('editChar', 'Karakter baru') + DB.chars.map(c =>
    `<div class="card panel row" onclick="editChar(${c.id})">${face(c, 40)}<span>${esc(c.name)}<br><small>${c.rarity} bintang</small></span></div>`).join('');
  $('#wcol').innerHTML = nw('editWeapon', 'Senjata baru') + DB.weapons.map(w =>
    `<div class="card panel row" onclick="editWeapon(${w.id})">${wface(w, 40)}<span>${esc(w.name)}<br><small>${w.rarity} bintang${w.passive ? ' · pasif' : ''}</small></span></div>`).join('');
  sChipsRender();
  filterStory();
  $('#blist').innerHTML = nw('editBanner', 'Banner baru') + DB.banners.map(b =>
    `<div class="card panel row" onclick="editBanner(${b.id})"><span>${esc(b.name)}<br><small>${b.kind === 'weapon' ? 'senjata' : 'karakter'}</small></span></div>`).join('');
  $('#elist').innerHTML = nw('editEvent', 'Event baru') + (DB.events || []).map(e =>
    `<div class="card panel row" onclick="editEvent(${e.id})"><span>${esc(e.name)}<br><small>${e.aktif === 1 ? 'aktif' : 'nonaktif'} · bab ke-${+e.syarat || 0} · ${(e.hadiah || []).length} hadiah${e.shop && +e.shop.aktif === 1 ? ' · shop aktif' : ''}</small></span></div>`).join('');
  const kl = $('#coinList');
  if (kl) kl.innerHTML = (DB.coins || []).map(c =>
    `<div class="card panel row coinRow" onclick="editCoin(${c.id})"><span>${esc(c.nama)}<br><small>${esc(c.desc || 'tanpa keterangan')}</small></span><button type="button" class="btn red sm" onclick="event.stopPropagation();delCoin(${c.id})">Hapus</button></div>`).join('')
    || '<p class="hint">Belum ada mata uang. Buat satu lewat formulir di bawah.</p>';
  $('#klist').innerHTML = nw('editSkill', 'Skill baru') + (DB.skills || []).map(k => {
    const kat = String(k.kategori || '').split(',').filter(Boolean)
      .map(x => `<span class="katTag">${esc(KATEGORI_PENDEK[x] || x)}</span>`).join('');
    return `<div class="card panel row" onclick="editSkill('${esc(k.id)}')"><span>${esc(k.name)} ${kat}<br><small>${TIPE_NAMA[k.tipe] || k.tipe} · ${SASARAN_NAMA[k.sasaran] || k.sasaran} · ${k.ap} AP · jeda ${k.cd}${k.status ? ' · ' + esc(String(k.status).split(',').map(x => STATUS_NAMA[x.trim()] || x.trim()).join(' + ')) : ''}</small></span></div>`;
  }).join('');
  ({ char: editChar, weapon: editWeapon, story: editChap, banner: editBanner, event: editEvent, skill: editSkill, set: fillSettings })[tab](0);
};
const S_FILT = { q: '', tipe: '', bab: '' };

function sChipsRender() {
  const box = $('#sChips');
  if (!box) return;
  const arc = (globalThis.ARCS || []);
  const mk = (tipe, bab, label) =>
    `<button type="button" class="fchip${S_FILT.tipe === tipe && S_FILT.bab === bab ? ' on' : ''}" data-tipe="${tipe}" data-bab="${bab}" onclick="sFilterPick(this)">${label}</button>`;
  const utama = arc.filter(a => a.tipe === 'utama');
  const samping = arc.filter(a => a.tipe === 'samping');
  box.innerHTML = mk('', '', 'Semua')
    + mk('utama', '', 'Story Utama')
    + utama.map(a => mk('utama', String(a.no), 'Bab ' + a.no)).join('')
    + mk('samping', '', 'Side Story')
    + samping.map(a => mk('samping', String(a.no), 'Side ' + a.no)).join('');
}

function sFilterPick(el) {
  S_FILT.tipe = el.dataset.tipe || '';
  S_FILT.bab = el.dataset.bab || '';
  [...$('#sChips').querySelectorAll('.fchip')].forEach(b => b.classList.toggle('on', b === el));
  filterStory();
}

function posisiCerita(c) {
  const tipe = (c && c.tipe) || 'utama';
  const pos = posBab(c);
  const no = noBab(c, pos, tipe);
  return { pos: pos, no: no, tahap: tipe === 'samping' ? pos : pos - (no - 1) * 40, tipe: tipe };
}

function filterStory() {
  const box = $('#slist');
  if (!box) return;
  const q = String(($('#sQ') && $('#sQ').value) || '').trim().toLowerCase();
  S_FILT.q = q;
  const daftar = DB.story.filter(c => {
    const p = posisiCerita(c);
    if (S_FILT.tipe && p.tipe !== S_FILT.tipe) return false;
    if (S_FILT.bab && String(p.no) !== S_FILT.bab) return false;
    if (q) {
      const isi = [c.title, c.enemies, c.catatan, c.script].join(' ').toLowerCase();
      if (isi.indexOf(q) < 0) return false;
    }
    return true;
  });
  const hitung = $('#sCount');
  if (hitung) hitung.textContent = daftar.length + ' dari ' + DB.story.length + ' bab cocok'
    + (S_FILT.tipe ? ' · ' + (S_FILT.tipe === 'samping' ? 'side story' : 'story utama') : '')
    + (S_FILT.bab ? ' · Bab ' + S_FILT.bab : '')
    + (q ? ' · kata kunci "' + q + '"' : '');
  box.innerHTML = `<button class="btn" style="width:100%;margin-bottom:10px" onclick="editChap(0)">Bab baru</button>`
    + (daftar.length ? daftar.map(c => {
      const p = posisiCerita(c);
      const tag = p.tipe === 'samping' ? 'side story · bagian ' + p.pos : ('utama · Bab ' + p.no + ' · tahap ' + p.tahap);
      return `<div class="card panel row" onclick="editChap(${c.id})"><span>${esc(c.title)}<br><small>${tag} · lawan: ${esc(c.enemies || '-')}</small></span></div>`;
    }).join('') : '<p class="hint">Tidak ada bab yang cocok dengan saringan ini. Ubah kata kunci atau pilih saringan lain.</p>');
}

const tabTo = t => { tab = t; R.studio(); };


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


function fillKindSel() {
  const k = $('#wk'); if (k.options.length) return;
  k.innerHTML = Object.keys(WKIND).map(v => `<option value="${v}">${WKIND[v]}</option>`).join('');
  const p = $('#wpass');
  p.innerHTML = '<option value="">— tanpa skill pasif —</option>' +
    Object.keys(PASSIVES).map(v => `<option value="${v}">${PASSIVES[v].n}</option>`).join('');
  const st = $('#wstatus');
  st.innerHTML = JENIS_STATUSOPT.map(v => `<option value="${v}">${v ? STATUS_NAMA[v] : '— tanpa status —'}</option>`).join('');
  p.onchange = () => {
    const k2 = p.value;
    $('#wpassHint').textContent = k2
      ? PASSIVES[k2].d + (k2 && !$('#wtrue').value ? ' Pilih pemilik senjata sejati agar pasif ini bisa aktif.' : '')
      : 'Senjata tanpa pasif hanya menambah statistik.';
  };
  $('#wtrue').onchange = fillKindSel.hint || (() => $('#wpass').onchange());
}
function refreshTrueFor(sel) {
  const hit = {};
  DB.weapons.forEach(w => { if (+w.true_for) hit[+w.true_for] = (hit[+w.true_for] || 0) + 1; });
  $('#wtrue').innerHTML = '<option value="0">— bukan senjata sejati siapa pun —</option>' +
    DB.chars.map(c => {
      const n = hit[+c.id] || 0;
      const penuh = n >= 3 && +sel !== +c.id;
      return `<option value="${c.id}" ${penuh ? 'disabled' : ''}>${esc(c.name)} (${esc(c.title)}) — ${n}/3 senjata sejati${penuh ? ' · penuh' : ''}</option>`;
    }).join('');
  $('#wtrue').value = String(sel || 0);
}


function opsiSkill(kat, tambahan, kosong, nilai) {
  const pilih = String(nilai == null ? '' : nilai);
  const punya = new Set((tambahan || []).filter(Boolean).map(String));
  (DB.skills || []).forEach(k => {
    const kats = String(k.kategori || '').split(',').map(x => x.trim());
    if (kats.indexOf(kat) < 0) return;
    punya.add(String(k.id));
  });
  if (pilih) punya.add(pilih);
  const nama = v => (SKILLS[v] && SKILLS[v].n) || (PASSIVES[v] && PASSIVES[v].n) || (ULTS[v] ? v : v);
  const baris = [...punya].map(v => `<option value="${esc(v)}">${esc(nama(v))}</option>`);
  return `<option value="">${esc(kosong)}</option>` + baris.join('');
}
function editChar(id) {
  const f = $('#cf'), c = charById(id) || { hp: 250, atk: 50, ap: 4, ult: '', passive: '', skill: '', rarity: 3, image: '', max_level: 100, max_star: 10, star0: 3, growth: 1, trps0: 5000, trps1: 150000 };
  $('#cfult').innerHTML = opsiSkill('ultimate', Object.keys(ULTS), '— pilih ultimate —', c.ult);
  $('#cfpass').innerHTML = opsiSkill('pasif', Object.keys(PASSIVES), '— tanpa pasif —', c.passive);
  $('#cfskill').innerHTML = opsiSkill('aktif', [], '— tanpa skill aktif —', c.skill);
  const biaya = $('#cfUltBiaya'); if (biaya) biaya.textContent = typeof ULT_AP !== 'undefined' ? ULT_AP : 3;
  fill(f, Object.assign({ id }, c), ['id', 'name', 'title', 'faction', 'rarity', 'hp', 'atk', 'ap', 'ult', 'passive', 'skill', 'lore', 'backstory', 'max_level', 'star0', 'max_star', 'growth', 'trps0', 'trps1']);
  const v = c.voice || {};
  ['tekan', 'gerak', 'kena', 'serang', 'ult', 'skill', 'menang', 'kalah'].forEach(m => {
    const el = f.elements['voice_' + m]; if (el) el.value = v[m] || '';
  });
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
  if (!+id) return;
  if (!await konfirmasi('Hapus karakter ini? Pemilik & perataannya ikut dihapus.', { judul: 'Hapus karakter?', ya: 'Hapus', tidak: 'Batal' })) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('char_del', fd)) {
    S.own = S.own.filter(x => +x !== +id); delete S.eq[id];
    save(); await loadAll(); R.studio(); toast('Karakter dihapus');
  }
}


function editWeapon(id) {
  fillKindSel();
  const f = $('#wf'), w = weaponById(id) || { kind: 'sword', rarity: 3, w_atk: 10, w_hp: 20, w_crit: 0, passive: '', true_for: 0, skill_buff: 0, status: '', image: '' };
  refreshTrueFor(w.true_for);
  fill(f, Object.assign({ id }, w), ['id', 'name', 'kind', 'rarity', 'w_atk', 'w_hp', 'w_crit', 'passive', 'true_for', 'skill_buff', 'status']);
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
  if (!fd.get('passive') && !fd.get('true_for')) {  }
  const r = await send('weapon_save', fd);
  if (!r) return;
  await loadAll(); R.studio(); editWeapon(r.id); toast('Senjata disimpan');
}
async function delWeapon() {
  const id = $('#wf').elements.id.value;
  if (!+id) return;
  if (!await konfirmasi('Hapus senjata ini?', { judul: 'Hapus senjata?', ya: 'Hapus', tidak: 'Batal' })) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('weapon_del', fd)) {
    S.ownW = S.ownW.filter(x => +x !== +id);
    Object.keys(S.eq).forEach(k => { S.eq[k] = S.eq[k].map(w => +w === +id ? 0 : w); });
    save(); await loadAll(); R.studio(); toast('Senjata dihapus');
  }
}


function klemTahap(v) { return Math.max(1, Math.min(40, parseInt(v, 10) || 1)); }
function ceritaFormMode() {
  const f = $('#sf'); if (!f || !f.elements.tipe) return;
  const utama = f.elements.tipe.value !== 'samping';
  const u = $('#sfUtama'), s = $('#sfSamping');
  if (u) u.hidden = !utama;
  if (s) s.hidden = utama;
  const perang = !!(f.elements.battle && f.elements.battle.checked);
  const bb = $('#sfBattleBox'); if (bb) bb.hidden = !perang;
  const pos = $('#sfPos');
  if (pos) {
    pos.innerHTML = utama
      ? 'Nomor otomatis: tahap <b>' + klemTahap(f.elements.tahap.value) + '</b> di Bab ' + (+f.elements.bab.value || 1)
        + ' = urutan global <b>' + (((+f.elements.bab.value || 1) - 1) * 40 + klemTahap(f.elements.tahap.value)) + '</b> dari 200.'
      : 'Side Story tampil setelah 200 tahap utama. Urutan diisi manual, mulai <b>201</b>.';
  }
  const md = $('#sfMode');
  if (md) md.innerHTML = 'Isi bab ini: <b>' + (perang ? 'cerita + pertempuran' : 'cerita saja') + '</b> — '
    + (perang ? 'pemain membaca naskah lalu bertarung melawan lawan yang kamu pilih.' : 'pemain hanya membaca naskah lalu lanjut ke tahap berikutnya.');
}
function isiPetaCerita() {
  const sel = document.getElementById('sfPeta');
  if (!sel || sel.dataset.penuh === '1') return;
  sel.dataset.penuh = '1';
  sel.innerHTML = '<option value="0">Acak — peta diganti tiap kali dimainkan</option>'
    + (typeof MAP_NAMA !== 'undefined' ? MAP_NAMA.map((n, i) =>
      `<option value="${i + 1}">${i + 1}. ${esc(n)}${MAP_BIO_NAMA[MAPS[i].bio] ? ' — ' + MAP_BIO_NAMA[MAPS[i].bio] : ''}</option>`).join('') : '');
}
function petaInfo() {
  const sel = document.getElementById('sfPeta'), box = document.getElementById('sfPetaInfo');
  if (!sel || !box) return;
  const v = +sel.value || 0;
  if (!v) { box.innerHTML = 'Peta dipilih acak dari <b>' + (typeof MAP_NAMA !== 'undefined' ? MAP_NAMA.length : 0) + ' peta</b>. Pemain melihat nama peta yang berbeda tiap kali bab ini diulang.'; return; }
  const m = typeof MAPS !== 'undefined' ? MAPS[v - 1] : null;
  box.innerHTML = m ? 'Peta tetap: <b>' + esc(m.n) + '</b>' + (MAP_BIO_NAMA[m.bio] ? ' — latar ' + MAP_BIO_NAMA[m.bio] : '') + '. Semua pemain melawan di medan yang sama.' : '';
}
function editChap(id) {
  const f = $('#sf');
  const c = DB.story.find(x => +x.id === id) || { tipe: 'utama', sort_order: DB.story.length + 1, battle: 1, difficulty: 1, reward: 300, title: '', script: '', enemies: '' };
  const foes = (c.enemies || '').split(',').map(Number);
  fill(f, Object.assign({ id }, c), ['id', 'title', 'tipe', 'sort_order', 'difficulty', 'script', 'catatan']);
  isiPetaCerita();
  if (f.elements.peta) { f.elements.peta.value = String(Math.max(0, +c.peta || 0)); petaInfo(); }
  const so = Math.max(1, +c.sort_order || 1);
  const utama = c.tipe !== 'samping';
  if (f.elements.bab) f.elements.bab.value = String(utama ? Math.min(5, Math.floor((so - 1) / 40) + 1) : 1);
  if (f.elements.tahap) f.elements.tahap.value = String(utama ? ((so - 1) % 40) + 1 : 1);
  if (f.elements.reward) f.elements.reward.value = utama ? (+c.reward || 0) : '';
  if (f.elements.reward2) f.elements.reward2.value = utama ? '' : (+c.reward || 0);
  f.elements.id.value = id;
  f.elements.battle.checked = +c.battle === 1;
  $('#senemies').innerHTML = DB.chars.map(ch =>
    `<label class="chk"><input type="checkbox" name="enemies[]" value="${ch.id}" ${foes.includes(+ch.id) ? 'checked' : ''}>${face(ch, 26)} ${esc(ch.name)}</label>`).join('')
    || '<p class="hint">Belum ada karakter.</p>';
  ceritaFormMode();
}
async function saveChap(e) {
  e.preventDefault();
  const f = e.target;
  const utama = f.elements.tipe.value !== 'samping';
  const fd = new FormData(f);
  if (utama) {
    const bab = Math.max(1, Math.min(5, +f.elements.bab.value || 1));
    fd.set('sort_order', String((bab - 1) * 40 + klemTahap(f.elements.tahap.value)));
    fd.set('reward', String(+f.elements.reward.value || 0));
  } else {
    fd.set('sort_order', String(Math.max(201, parseInt(f.elements.sort_order.value, 10) || 201)));
    fd.set('reward', String(+f.elements.reward2.value || 0));
  }
  if (fd.get('battle') && !adaIsi(fd, 'enemies')) return toast('Pilih minimal satu lawan untuk bab yang punya pertempuran');
  const r = await send('chapter_save', fd);
  if (!r) return;
  await loadAll(); R.studio(); editChap(r.id); toast('Bab disimpan');
}
const TIPE_ITEM = ['uang', 'matauang', 'hero', 'senjata'];
const NAMA_TIPE = { uang: 'Uang (permata)', matauang: 'Mata uang', hero: 'Hero', senjata: 'Senjata' };
function opsiItem(t, sel) {
  if (t === 'hero') return DB.chars.map(c => `<option value="${c.id}"${+c.id === +sel ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  if (t === 'senjata') return DB.weapons.map(w => `<option value="${w.id}"${+w.id === +sel ? ' selected' : ''}>${esc(w.name)}</option>`).join('');
  if (t === 'matauang') {
    const c = (DB.coins || []);
    if (!c.length) return '<option value="0">— belum ada mata uang —</option>';
    return c.map(x => `<option value="${x.id}"${+x.id === +sel ? ' selected' : ''}>${esc(x.nama)}</option>`).join('');
  }
  return '<option value="0">—</option>';
}
function barisHadiah(h) {
  h = h || { tipe: 'uang', jumlah: 500, id: 0 };
  const t = TIPE_ITEM.includes(h.tipe) ? h.tipe : 'uang';
  const butuhJumlah = t === 'uang' || t === 'matauang';
  const butuhItem = t !== 'uang';
  return `<div class="hrow">
    <select name="hadiah_tipe[]" onchange="syncHadiah(this)">${TIPE_ITEM.map(o =>
      `<option value="${o}"${o === t ? ' selected' : ''}>${NAMA_TIPE[o]}</option>`).join('')}</select>
    <input type="number" name="hadiah_jumlah[]" min="0" max="9999999" value="${butuhJumlah ? (+h.jumlah || 0) : 0}"${butuhJumlah ? '' : ' hidden'}>
    <select name="hadiah_item[]"${butuhItem ? '' : ' hidden'}>${opsiItem(t, h.id)}</select>
    <button type="button" class="btn red sm" onclick="this.closest('.hrow').remove()">Hapus</button>
  </div>`;
}
function syncHadiah(sel) {
  const baris = sel.closest('.hrow'), t = sel.value;
  const butuhJumlah = t === 'uang' || t === 'matauang';
  baris.querySelector('input[name="hadiah_jumlah[]"]').hidden = !butuhJumlah;
  const itm = baris.querySelector('select[name="hadiah_item[]"]');
  itm.hidden = t === 'uang';
  itm.innerHTML = opsiItem(t, 0);
}
function tambahHadiah(h) { $('#evHadiah').insertAdjacentHTML('beforeend', barisHadiah(h)); }
function barisItem(it) {
  it = it || { judul: '', tipe: 'uang', jumlah: 100, id: 0, harga: 10 };
  const t = TIPE_ITEM.includes(it.tipe) ? it.tipe : 'uang';
  const butuhJumlah = t === 'uang' || t === 'matauang';
  const butuhItem = t !== 'uang';
  return `<div class="hrow irow">
    <input type="text" name="shop_judul[]" maxlength="60" placeholder="Nama item" value="${esc(it.judul || '')}">
    <select name="shop_tipe[]" onchange="syncItem(this)">${TIPE_ITEM.map(o =>
      `<option value="${o}"${o === t ? ' selected' : ''}>${NAMA_TIPE[o]}</option>`).join('')}</select>
    <input type="number" name="shop_jumlah[]" min="0" max="9999999" value="${butuhJumlah ? (+it.jumlah || 0) : 0}"${butuhJumlah ? '' : ' hidden'}>
    <select name="shop_item[]"${butuhItem ? '' : ' hidden'}>${opsiItem(t, it.id)}</select>
    <input type="number" name="shop_harga[]" min="0" max="99999999" placeholder="Harga" value="${+it.harga || 0}">
    <button type="button" class="btn red sm" onclick="this.closest('.irow').remove()">Hapus</button>
  </div>`;
}
function syncItem(sel) {
  const baris = sel.closest('.irow'), t = sel.value;
  const butuhJumlah = t === 'uang' || t === 'matauang';
  baris.querySelector('input[name="shop_jumlah[]"]').hidden = !butuhJumlah;
  const itm = baris.querySelector('select[name="shop_item[]"]');
  itm.hidden = t === 'uang';
  itm.innerHTML = opsiItem(t, 0);
}
function tambahItem(it) { const k = $('#evShop'); if (k) k.insertAdjacentHTML('beforeend', barisItem(it)); }
function fillEvMata(sel) {
  const el = $('#evMata');
  if (!el) return;
  const c = (DB.coins || []);
  let v = +sel || 0;
  if (!v && c.length) v = +c[0].id;
  el.innerHTML = '<option value="0">— pilih mata uang —</option>' + c.map(x =>
    `<option value="${x.id}"${+x.id === v ? ' selected' : ''}>${esc(x.nama)}</option>`).join('');
}
function saveCoin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  send('coin_save', fd).then(async r => {
    if (!r) return;
    await loadAll(); R.studio(); resetCoin(r.id); toast('Mata uang disimpan');
  });
  return false;
}
function editCoin(id) {
  const f = $('#coinf');
  if (!f) return;
  const c = (DB.coins || []).find(x => +x.id === +id);
  f.elements.id.value = c ? c.id : '';
  f.elements.nama.value = c ? c.nama : '';
  f.elements.desc.value = c ? (c.desc || '') : '';
  f.scrollIntoView({ block: 'nearest' });
}
function resetCoin() { editCoin(0); }
async function delCoin(id) {
  const c = (DB.coins || []).find(x => +x.id === +id);
  if (!c) return toast('Mata uang tidak ditemukan.');
  if (!await konfirmasi('Hapus mata uang "' + c.nama + '"? Event yang memakainya otomatis nonaktif Shop-nya.', { judul: 'Hapus mata uang?', ya: 'Hapus', tidak: 'Batal' })) return;
  const fd = new FormData(); fd.append('id', id);
  send('coin_del', fd).then(async r => {
    if (!r) return;
    await loadAll(); R.studio(); resetCoin(); toast('Mata uang dihapus');
  });
}
const skillById = k => (DB.skills || []).find(x => String(x.id) === String(k));
function ujiRumus() {
  const el = $('#kUji');
  if (!el) return;
  const v = typeof RUMUS !== 'undefined' ? RUMUS.uji($('#kRumus').value) : 0;
  el.textContent = RUMUS.sah($('#kRumus').value) ? String(Math.round(v * 100) / 100) : 'tidak valid';
}
function isiOpsiSkill(f) {
  f.elements.tipe.innerHTML = Object.keys(NAMA_TIPESKILL)
    .map(k => `<option value="${k}">${NAMA_TIPESKILL[k]}</option>`).join('');
  f.elements.sasaran.innerHTML = Object.keys(NAMA_SASARAN)
    .map(k => `<option value="${k}">${NAMA_SASARAN[k]}</option>`).join('');
}
function isiStatusSkill(f, dipilih) {
  const set = String(dipilih || '').split(',').map(x => x.trim()).filter(Boolean);
  $('#kStatus').innerHTML = JENIS_STATUSOPT.filter(x => x).map(k =>
    `<label class="chk"><input type="checkbox" name="status[]" value="${k}"${set.indexOf(k) >= 0 ? ' checked' : ''}> ${NAMA_STATUS[k] || k}</label>`).join('');
}
function editSkill(id) {
  const f = $('#kf');
  const k = skillById(id) || { id: '', name: '', desc: '', tipe: 'serang', sasaran: 'musuh', jangkau: 3, ap: 2, cd: 3, rumus: 'atk * 1.5 + 200', status: '', kategori: '', durasi: 2, apNilai: 0 };
  isiOpsiSkill(f);
  isiStatusSkill(f, k.status);
  fill(f, { sid: k.id, name: k.name, desc: k.desc, tipe: k.tipe, sasaran: k.sasaran, jangkau: k.jangkau, ap: k.ap, cd: k.cd, rumus: k.rumus, durasi: k.durasi, apNilai: k.apNilai }, ['sid', 'name', 'desc', 'tipe', 'sasaran', 'jangkau', 'ap', 'cd', 'rumus', 'durasi', 'apNilai']);
  const kat = String(k.kategori || '').split(',').map(x => x.trim()).filter(Boolean);
  [...f.querySelectorAll('input[name="kategori[]"]')].forEach(el => { el.checked = kat.indexOf(el.value) >= 0; });
  f.elements.id.value = (id && id !== 0) ? id : '';
  ujiRumus();
}
async function saveSkill(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const idLama = String(fd.get('id') || '') === '0' ? '' : String(fd.get('id') || '');
  const idBaru = String(fd.get('sid') || '');
  fd.set('id', idLama);
  if (!idLama && !idBaru) return toast('ID skill wajib diisi');
  if (idLama && idBaru && idLama !== idBaru) return toast('ID skill tidak bisa diubah setelah tersimpan');
  if (typeof RUMUS !== 'undefined' && !RUMUS.sah(String(fd.get('rumus') || ''))) return toast('Rumus tidak valid');
  const r = await send('skill_save', fd);
  if (!r) return;
  await loadAll();
  R.studio();
  editSkill(r.id);
  toast('Skill disimpan');
}
async function delSkill() {
  const id = String($('#kf').elements.id.value);
  if (id === '0' || !id) return toast('Skill belum tersimpan');
  if (!await konfirmasi('Hapus skill ini? Karakter yang memakainya jadi tanpa skill.', { judul: 'Hapus skill?', ya: 'Hapus', tidak: 'Batal' })) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('skill_del', fd)) { await loadAll(); R.studio(); toast('Skill dihapus'); }
}

function editEvent(id) {
  const f = $('#ef');
  const e = (DB.events || []).find(x => +x.id === id) || { name: '', desc: '', syarat: 0, aktif: 1, skenario: '', hadiah: [{ tipe: 'uang', jumlah: 500 }] };
  fill(f, Object.assign({ id }, e), ['id', 'name', 'desc', 'syarat', 'skenario']);
  f.elements.id.value = id;
  f.elements.aktif.checked = +e.aktif === 1;
  $('#evHadiah').innerHTML = '';
  (e.hadiah && e.hadiah.length ? e.hadiah : [{ tipe: 'uang', jumlah: 500 }]).forEach(h => tambahHadiah(h));
  const sh = (e.shop && typeof e.shop === 'object') ? e.shop : { aktif: 0, mata: 0, item: [] };
  f.elements.shop_aktif.checked = +sh.aktif === 1;
  fillEvMata(+sh.mata || 0);
  $('#evShop').innerHTML = '';
  (Array.isArray(sh.item) ? sh.item : []).forEach(tambahItem);
}
async function saveEvent(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!fd.getAll('hadiah_tipe[]').length) return toast('Tambahkan minimal satu hadiah');
  const r = await send('event_save', fd);
  if (!r) return;
  await loadAll(); R.studio(); editEvent(r.id); toast('Event disimpan');
}
async function delEvent() {
  const id = $('#ef').elements.id.value;
  if (!+id) return;
  if (!await konfirmasi('Hapus event ini? Semua progres pemain pada event ini ikut terhapus.', { judul: 'Hapus event?', ya: 'Hapus', tidak: 'Batal' })) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('event_del', fd)) { await loadAll(); R.studio(); toast('Event dihapus'); }
}


async function delChap() {
  const id = $('#sf').elements.id.value;
  if (!+id) return;
  if (!await konfirmasi('Hapus bab ini? Semua pemain kehilangan bab ini dari daftar cerita.', { judul: 'Hapus bab?', ya: 'Hapus', tidak: 'Batal' })) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('chapter_del', fd)) { await loadAll(); R.studio(); toast('Bab dihapus'); }
}


function keLocalInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const ms = /^\d+$/.test(s) ? Number(s) : Date.parse(s);
  if (!(ms > 0)) return '';
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function sisaBanner() {
  const el = $('#bfEnd'), hint = $('#bfEndHint');
  if (!el || !hint) return;
  const ms = el.value ? Date.parse(el.value) : 0;
  if (!(ms > 0)) { hint.textContent = 'Kosongkan bila panji selalu tampil. Bila diisi, panji hilang sendiri dari layar Wish begitu waktunya lewat.'; return; }
  const sisa = ms - Date.now();
  hint.textContent = sisa <= 0
    ? 'Tanggal ini sudah lewat, jadi panji tidak akan tampil di layar Wish.'
    : 'Sisa waktu ' + (typeof GACHA !== 'undefined' ? GACHA.formatSisa(sisa) : '') + ' — berakhir ' + new Date(ms).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '.';
}
function bersihAkhir() {
  const el = $('#bfEnd'); if (!el) return;
  el.value = ''; sisaBanner();
}
function editBanner(id) {
  const f = $('#bf'), b = DB.banners.find(x => +x.id === id) || { name: '', description: '', kind: 'char', pool: '', image: '' };
  f.elements.id.value = id;
  f.elements.name.value = b.name;
  f.elements.description.value = b.description;
  f.elements.kind.value = b.kind === 'weapon' ? 'weapon' : 'char';
  f.elements.time_text.value = b.time_text || '';
  f.elements.end_at.value = keLocalInput(b.end_at);
  sisaBanner();
  f.elements.pity.checked = !('pity' in b) || +b.pity !== 0;
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
  fd.set('pity', e.target.elements.pity.checked ? '1' : '0');
  if (!adaIsi(fd, 'pool')) return toast('Pilih minimal satu isi banner');
  const r = await send('banner_save', fd);
  if (!r) return;
  await loadAll(); R.studio(); editBanner(r.id); toast('Banner disimpan');
}
async function delBanner() {
  const id = $('#bf').elements.id.value;
  if (!+id) return;
  if (!await konfirmasi('Hapus banner ini? Pemanggilan pada banner ini berhenti.', { judul: 'Hapus banner?', ya: 'Hapus', tidak: 'Batal' })) return;
  const fd = new FormData(); fd.append('id', id);
  if (await send('banner_del', fd)) { bsel = 0; await loadAll(); R.studio(); toast('Banner dihapus'); }
}
