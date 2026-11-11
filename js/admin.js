// অ্যাডমিন প্যানেল: প্রিন্সিপাল, শিক্ষক ও অফিস কর্মচারীর সব কাজ
(async function () {
  'use strict';
  const C = window.Calc, M = window.Marksheet, U = window.StoreUtil, ID = window.IdCard;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc, bn = C.toBn;

  const store = await window.getStore();
  let me = null, settings = U.DEFAULT_SETTINGS, images = {}, catalog = { classes: U.DEFAULT_CLASSES, published: {} };
  const ui = {}; // প্রতিটি পেজে শেষ বাছাই মনে রাখা

  // ---------- ছোট সহায়ক ----------
  let toastT;
  function toast(t, err) { const el = $('#toast'); el.textContent = t; el.classList.toggle('err', !!err); el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, err ? 5500 : 2600); }
  const fail = (e) => toast((e && e.message) || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।', true);
  const role = () => (me ? me.role : '');
  const isP = () => role() === 'principal';
  const cls = (id) => catalog.classes.find((c) => c.id === id) || { id, name: id, nameEn: id };
  const className = (id) => cls(id).name;
  const classEn = (id) => cls(id).nameEn || cls(id).name;
  const myClasses = () => role() === 'teacher' ? catalog.classes.filter((c) => (me.classIds || []).includes(c.id)) : catalog.classes;
  const yearList = () => { const y = Number(settings.activeYear) || new Date().getFullYear(); const s = new Set(); for (let i = y + 1; i >= Math.min(2022, y - 4); i--) s.add(String(i)); Object.keys(catalog.published || {}).forEach((k) => s.add(k.split('_')[0])); return Array.from(s).sort((a, b) => b - a); };
  const opt = (list, sel) => list.map((o) => { const v = typeof o === 'object' ? o.v : o; const t = typeof o === 'object' ? o.t : o; return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`; }).join('');
  const classOpts = (sel, list) => opt((list || myClasses()).map((c) => ({ v: c.id, t: c.name })), sel);
  const yearOpts = (sel) => opt(yearList(), sel);
  const examOpts = (sel) => opt(C.EXAMS.map((e) => ({ v: e.key, t: e.name })), sel);
  const money = (n) => '৳' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, '-');
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  const csv = (rows) => '﻿' + rows.map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const scripts = {};
  const loadScript = (src) => scripts[src] || (scripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error('ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।')); }; document.head.appendChild(s); }));
  // Excel (.xlsx) — না পারলে CSV
  async function excel(file, sheets) {
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const wb = window.XLSX.utils.book_new();
      const used = new Set();
      sheets.forEach((s) => {
        let n = safeName(s.name).replace(/[[\]]/g, '').slice(0, 31) || 'Sheet'; let k = 2; while (used.has(n)) n = n.slice(0, 28) + ' ' + k++; used.add(n);
        const ws = window.XLSX.utils.aoa_to_sheet(s.rows);
        ws['!cols'] = s.rows[0].map((h, i) => ({ wch: Math.max(6, ...s.rows.map((r) => String(r[i] == null ? '' : r[i]).length + 2)) }));
        window.XLSX.utils.book_append_sheet(wb, ws, n);
      });
      window.XLSX.writeFile(wb, safeName(file) + '.xlsx');
    } catch (e) {
      sheets.forEach((s) => download(safeName(file + (sheets.length > 1 ? ' - ' + s.name : '')) + '.csv', csv(s.rows), 'text/csv;charset=utf-8'));
    }
    toast('Excel ফাইল ডাউনলোড হচ্ছে');
  }
  function printHtml(html) { $('#printArea').innerHTML = html; setTimeout(() => window.print(), 300); }

  // ডায়ালগ: ফর্ম দেখিয়ে মান ফেরত দেয় (বাতিল করলে null)
  function dialog(title, body, okText, danger, wide, onOpen) {
    return new Promise((resolve) => {
      const d = $('#dlg'), f = $('#dlgForm');
      d.style.width = wide ? 'min(960px, calc(100vw - 24px))' : '';
      f.innerHTML = `<h2>${esc(title)}</h2>${body}<div class="dlg-actions"><button type="button" class="btn btn-ghost" id="dlgCancel">বাতিল</button>${okText === false ? '' : `<button type="submit" class="btn ${danger ? 'btn-red' : 'btn-green'}" id="dlgOk">${esc(okText || 'সংরক্ষণ করুন')}</button>`}</div>`;
      let done = false;
      const finish = (v) => { if (done) return; done = true; if (d.open) d.close(); resolve(v); };
      $('#dlgCancel').onclick = () => finish(null);
      f.onsubmit = (ev) => { ev.preventDefault(); const data = {}; $$('input,select,textarea', f).forEach((el) => { if (!el.id || el.type === 'file') return; data[el.id] = el.type === 'checkbox' ? el.checked : el.value; }); data._checks = $$('input[type=checkbox][data-group]:checked', f).map((el) => el.value); data._form = f; finish(data); };
      d.onclose = () => finish(null);
      d.showModal();
      const first = $('input:not([type=file]),select,textarea', f); if (first) first.focus();
      if (onOpen) onOpen(f);
    });
  }
  // বাংলা ঘরে লিখলে ইংরেজি ঘর নিজে থেকে পূরণ (যতক্ষণ ইংরেজি ঘর হাতে বদলানো না হয়)
  function autoEn(bnEl, enEl, fn) {
    if (!bnEl || !enEl) return;
    enEl.dataset.auto = enEl.value.trim() ? (enEl.value.trim() === fn(bnEl.value) ? '1' : '0') : '1';
    bnEl.addEventListener('input', () => { if (enEl.dataset.auto === '1') enEl.value = fn(bnEl.value); });
    enEl.addEventListener('input', () => { enEl.dataset.auto = enEl.value.trim() ? '0' : '1'; });
  }
  const TL = window.Translit;
  const statusChip = (r) => r.status === 'incomplete' ? `<span class="chip chip-gold">${r.missing}টি নম্বর বাকি</span>` : r.status === 'pass' ? '<span class="chip chip-green">PASS</span>' : r.status === 'special' ? `<span class="chip chip-orange">বিশেষ বিবেচনা (${r.fails})</span>` : `<span class="chip chip-red">FAIL (${r.fails})</span>`;
  const signImg = (h) => images.sign ? `<img src="${esc(images.sign)}" alt="" style="height:${h || 38}px;max-width:170px;object-fit:contain;display:block;margin:0 auto">` : '';
  const confirmBox = (title, text, ok) => dialog(title, `<p>${text}</p>`, ok || 'হ্যাঁ, নিশ্চিত', true).then((v) => !!v);

  // ছবি ছোট করে data URL বানানো
  async function readImage(file, max, type) {
    if (!file) return null;
    if (!/^image\//.test(file.type)) throw new Error('শুধু ছবি (JPG/PNG/WebP) আপলোড করুন।');
    const src = await ID.fileToUrl(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('ছবিটি খোলা যাচ্ছে না।')); i.src = src; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    const g = cv.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); }
    g.drawImage(img, 0, 0, cv.width, cv.height);
    if (type === 'sign') {
      // স্বাক্ষরের সাদা ব্যাকগ্রাউন্ড স্বচ্ছ করা
      const px = g.getImageData(0, 0, cv.width, cv.height); const d = px.data;
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; if (l > 200) d[i + 3] = 0; else if (l > 150) d[i + 3] = Math.round(255 * (200 - l) / 50); }
      g.putImageData(px, 0, 0); return cv.toDataURL('image/png');
    }
    return cv.toDataURL(type || 'image/webp', 0.82);
  }
  const avatar = (u, size) => u && u.photo ? `<img class="avatar" src="${esc(u.photo)}" alt="" width="${size || 40}" height="${size || 40}">` : `<span class="avatar avatar-empty" style="width:${size || 40}px;height:${size || 40}px">${esc((u && u.name || '?').trim().charAt(0))}</span>`;

  function applyBrand() {
    $$('[data-set]').forEach((el) => { const v = settings[el.dataset.set]; if (v) el.textContent = v; });
    $$('[data-img]').forEach((el) => { const v = images[el.dataset.img]; if (v) el.src = v; });
    $$('[data-bg]').forEach((el) => { const v = images[el.dataset.bg]; if (v) el.style.backgroundImage = `url('${v}')`; });
  }

  // ---------- আইকন ----------
  const I = {
    home: 'M12 3 2 12h3v8h5v-6h4v6h5v-8h3z',
    students: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3.3 0-7 1.7-7 4.5V20h14v-2.5C16 14.7 12.3 13 9 13zm7.6.1A5 5 0 0 1 18 17.5V20h4v-2.5c0-2.3-2.8-4-5.4-4.4z',
    classes: 'M4 4h16v4H4zm0 6h7v10H4zm9 0h7v4h-7zm0 6h7v4h-7z',
    teacher: 'M12 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-6 18v-2c0-3 2.7-5 6-5s6 2 6 5v2zM19 8l3 1.5-3 1.5z',
    marks: 'M3 17.2V21h3.8l11-11-3.8-3.8zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8z',
    publish: 'M5 20h14v-2H5zm7-17-6 6h4v6h4V9h4z',
    archive: 'M3 3h18v4H3zm1 6h16v12H4zm5 3v2h6v-2z',
    fees: 'M3 6h18v12H3zm9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 8v2a2 2 0 0 0 2-2zm12 0a2 2 0 0 0 2 2V8zM5 14v2h2a2 2 0 0 0-2-2zm14 0a2 2 0 0 0-2 2h2z',
    idcard: 'M2 5h20v14H2zm6 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm-4 9h8c0-2-1.8-3.2-4-3.2S4 15 4 17zm10-8h6v1.6h-6zm0 3h6v1.6h-6zm0 3h4v1.6h-4z',
    notice: 'M3 10v4a1 1 0 0 0 1 1h2l4 5h2V4h-2L6 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z',
    admission: 'M4 4h7a2 2 0 0 1 2 2v14a3 3 0 0 0-3-3H4zm16 0h-5a2 2 0 0 0-2 2v14a3 3 0 0 1 3-3h4z',
    settings: 'M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.9a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
    search: 'M10 3a7 7 0 0 1 5.6 11.2l5.6 5.6-1.4 1.4-5.6-5.6A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
    logout: 'M10 17l-1.4-1.4 2.6-2.6H2v-2h9.2L8.6 8.4 10 7l5 5zm10 4h-8v-2h8V5h-8V3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z',
    plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
    save: 'M5 3h11l3 3v15H5zm2 2v5h8V5zm5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    print: 'M6 3h12v5H6zm-3 6h18v8h-3v4H6v-4H3zm5 6v4h8v-4z',
    down: 'M11 3h2v10l4-4 1.4 1.4L12 16.8l-6.4-6.4L7 9l4 4zM5 19h14v2H5z',
    camera: 'M9 3h6l1.8 2H21v15H3V5h4.2zm3 5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
    edit: 'M3 17.2V21h3.8l11-11-3.8-3.8zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8z',
    upload: 'M11 16V6.8l-4 4L5.6 9.4 12 3l6.4 6.4L17 10.8l-4-4V16zM5 19h14v2H5z',
    apply: 'M6 2h9l5 5v15H6zm8 1.5V8h4.5zM9 12h8v1.6H9zm0 3.5h8v1.6H9z',
    table: 'M3 4h18v16H3zm2 2v3h6V6zm8 0v3h6V6zM5 11v3h6v-3zm8 0v3h6v-3zM5 16v2h6v-2zm8 0v2h6v-2z'
  };
  const ic = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${I[k]}"/></svg>`;

  const PAGES = [
    { k: 'dashboard', t: 'ড্যাশবোর্ড', i: 'home', r: ['principal', 'teacher', 'office'] },
    { k: 'students', t: 'শিক্ষার্থী ব্যবস্থাপনা', i: 'students', r: ['principal', 'teacher'] },
    { k: 'classes', t: 'শ্রেণি ও বিষয়', i: 'classes', r: ['principal'] },
    { k: 'teachers', t: 'শিক্ষক ও স্টাফ', i: 'teacher', r: ['principal'] },
    { k: 'marks', t: 'নম্বর এন্ট্রি', i: 'marks', r: ['principal', 'teacher'] },
    { k: 'publish', t: 'ফলাফল প্রকাশ', i: 'publish', r: ['principal'] },
    { k: 'archive', t: 'ফলাফল সংরক্ষণ', i: 'archive', r: ['principal'] },
    { k: 'fees', t: 'হিসাব', i: 'fees', r: ['principal', 'office'] },
    { k: 'idcards', t: 'আইডি কার্ড', i: 'idcard', r: ['principal', 'office'] },
    { k: 'applications', t: 'ভর্তি আবেদন', i: 'apply', r: ['principal'] },
    { k: 'notices', t: 'নোটিশ ব্যবস্থাপনা', i: 'notice', r: ['principal'] },
    { k: 'banner', t: 'ভর্তি ব্যানার', i: 'admission', r: ['principal'] },
    { k: 'config', t: 'সেটিংস', i: 'settings', r: ['principal'] }
  ];
  const allowed = (k) => PAGES.some((p) => p.k === k && p.r.includes(role()));

  function buildNav() {
    const nav = $('#sideNav');
    nav.innerHTML = PAGES.filter((p) => p.r.includes(role())).map((p) => `<button type="button" data-page="${p.k}">${ic(p.i)}<span>${p.t}</span>${p.k === 'applications' ? '<b class="nav-badge" id="appBadge" hidden></b>' : ''}</button>`).join('') +
      '<div class="nav-sep"></div>' +
      `<a href="index.html" target="_blank" rel="noopener">${ic('search')}<span>পাবলিক রেজাল্ট</span></a>` +
      `<button type="button" id="logoutBtn">${ic('logout')}<span>লগ আউট</span></button>`;
    $$('[data-page]', nav).forEach((b) => b.addEventListener('click', () => go(b.dataset.page)));
    $('#logoutBtn').onclick = logout;
    refreshAppBadge();
  }
  // নতুন ভর্তি আবেদনের সংখ্যা (নোটিফিকেশন)
  let newApps = 0;
  async function refreshAppBadge() {
    if (!isP()) return;
    try { newApps = (await store.listApplications()).filter((a) => a.status === 'new').length; } catch (e) { newApps = 0; }
    const b = $('#appBadge'); if (b) { b.textContent = newApps; b.hidden = !newApps; }
  }
  async function go(page) {
    if (!allowed(page)) page = role() === 'office' ? 'idcards' : 'dashboard';
    $$('#sideNav [data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
    const p = PAGES.find((x) => x.k === page);
    $('#pageTitle').textContent = p ? p.t : '';
    $('#side').classList.remove('open');
    const v = $('#view'); v.innerHTML = '<div class="card empty">লোড হচ্ছে…</div>';
    try { history.replaceState(null, '', '#' + page); sessionStorage.setItem('kjm-last', page); sessionStorage.setItem('kjm-ui', JSON.stringify(ui)); } catch (e) { /* ignore */ }
    try { await VIEWS[page](v); } catch (e) { v.innerHTML = `<div class="card note">${esc(e.message || 'পেজ লোড করা যায়নি।')}</div>`; }
    window.scrollTo(0, 0);
  }

  // =====================================================================
  const VIEWS = {};

  // ---------- ড্যাশবোর্ড ----------
  VIEWS.dashboard = async (v) => {
    const year = settings.activeYear;
    const [students, users, subjects, notices] = await Promise.all([store.listStudents({ year }), store.listUsers().catch(() => []), store.listSubjects(), store.listNotices()]);
    const teachers = users.filter((u) => u.role === 'teacher' && u.active !== false);
    const counts = catalog.classes.map((c) => ({ c, n: students.filter((s) => s.classId === c.id).length }));
    const maxN = Math.max(5, ...counts.map((x) => x.n));
    const quick = isP() ? [
      ['students', 'q1', 'students', 'শিক্ষার্থী যোগ'], ['marks', 'q2', 'marks', 'নম্বর এন্ট্রি'], ['publish', 'q3', 'publish', 'ফলাফল প্রকাশ'], ['fees', 'q5', 'fees', 'হিসাব'], ['idcards', 'q4', 'idcard', 'আইডি কার্ড']
    ] : role() === 'office' ? [['fees', 'q5', 'fees', 'হিসাব'], ['idcards', 'q4', 'idcard', 'আইডি কার্ড']] : [['marks', 'q2', 'marks', 'নম্বর এন্ট্রি'], ['students', 'q1', 'students', 'শিক্ষার্থী তালিকা']];
    const pubRows = myClasses().map((c) => `<tr><td class="left">${esc(c.name)}</td>${C.EXAMS.map((e) => { const on = catalog.published[U.marksId(year, e.key, c.id)]; return `<td>${on ? '<span class="chip chip-green">প্রকাশিত</span>' : '<span class="chip chip-gray">অপ্রকাশিত</span>'}</td>`; }).join('')}</tr>`).join('');
    v.innerHTML = `
      ${isP() && newApps ? `<button type="button" class="note app-alert" data-go="applications">${ic('apply')}<span><b>${newApps}টি নতুন অনলাইন ভর্তি আবেদন</b> জমা হয়েছে। দেখতে এখানে চাপুন।</span></button>` : ''}
      ${role() === 'teacher' ? `<div class="note ok">আসসালামু আলাইকুম, ${esc(me.name)}। আপনার শ্রেণি: ${esc(myClasses().map((c) => c.name).join(', ') || 'এখনো দেওয়া হয়নি')}</div>` : ''}
      <section class="stats">
        <div class="stat s1">${ic('students')}<div><span>মোট শিক্ষার্থী (${year})</span><b>${students.length}</b></div></div>
        <div class="stat s2">${ic('teacher')}<div><span>মোট শিক্ষক</span><b>${teachers.length}</b></div></div>
        <div class="stat s3">${ic('admission')}<div><span>মোট বিষয়</span><b>${subjects.length}</b></div></div>
        <div class="stat s4">${ic('classes')}<div><span>মোট শ্রেণি</span><b>${catalog.classes.length}</b></div></div>
      </section>
      <section class="card"><h2>দ্রুত কাজের লিংক</h2><div class="quick">${quick.map((q) => `<button type="button" class="${q[1]}" data-go="${q[0]}">${ic(q[2])}${q[3]}</button>`).join('')}</div></section>
      <div class="grid-2">
        <section class="card"><h2>সাম্প্রতিক নোটিশ</h2>${notices.length ? notices.slice(0, 5).map((n) => `<div class="mini-notice"><span>${esc(n.title)}</span><time>${dmy(n.date)}</time></div>`).join('') : '<p class="empty">কোনো নোটিশ নেই</p>'}</section>
        <section class="card"><h2>শ্রেণি অনুযায়ী শিক্ষার্থী</h2>
          <div class="bars">${counts.map((x) => `<div class="bar"><b>${x.n}</b><i style="height:${(x.n / maxN) * 100}%"></i></div>`).join('')}</div>
          <div class="bar-labels">${counts.map((x) => `<span title="${esc(x.c.name)}">${esc(x.c.name.replace(' শ্রেণি', ''))}</span>`).join('')}</div>
        </section>
      </div>
      <section class="card"><h2>${year} সালের ফলাফলের অবস্থা</h2><div class="tbl-wrap"><table class="tbl pub-grid"><thead><tr><th class="left">শ্রেণি</th>${C.EXAMS.map((e) => `<th>${e.name}</th>`).join('')}</tr></thead><tbody>${pubRows}</tbody></table></div></section>`;
    $$('[data-go]', v).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  };

  // ---------- শিক্ষার্থী ----------
  // রেজিস্ট্রেশন নম্বর: সব শ্রেণির জন্য একটাই ক্রম, শিক্ষার্থী যোগ হলেই নিজে থেকে তৈরি হয়,
  // প্রতি বছর একই থাকে (প্রমোশনে শুধু রোল বদলায়)।
  VIEWS.students = async (v) => {
    const c0 = myClasses().some((c) => c.id === ui.sClass) ? ui.sClass : (myClasses()[0] || {}).id;
    v.innerHTML = `<section class="card">
      <div class="toolbar">
        <label class="fld w-md"><span>শ্রেণি</span><select id="sClass">${classOpts(c0)}</select></label>
        <label class="fld w-sm"><span>সাল</span><select id="sYear">${yearOpts(ui.sYear || settings.activeYear)}</select></label>
        <label class="fld grow"><span>নাম / রোল / রেজিস্ট্রেশন দিয়ে খুঁজুন</span><input id="sFind" placeholder="নাম, রোল অথবা রেজিস্ট্রেশন"></label>
        ${isP() ? `<button class="btn btn-dark" id="sAdd" type="button">${ic('plus')}নতুন শিক্ষার্থী</button><label class="btn btn-green file-btn">${ic('upload')}Excel আপলোড<input type="file" id="sExcel" accept=".xlsx,.xls,.csv" hidden></label><button class="btn btn-ghost" id="sBulk" type="button">লিখে একসাথে যোগ</button><button class="btn btn-ghost" id="sPromote" type="button">এই শ্রেণির প্রমোশন</button>` : ''}
        <button class="btn btn-ghost" id="sXls" type="button">${ic('down')}Excel</button>
      </div>
      ${isP() ? '<p class="muted" style="margin:10px 0 0">রেজিস্ট্রেশন নম্বর নিজে থেকে তৈরি হয় (সব শ্রেণির জন্য একটাই ক্রম) এবং প্রতি বছর একই থাকে। বাংলা নাম লিখলে ইংরেজি নাম নিজে থেকে বসে, ভুল হলে ঠিক করে দিন। কোনো শিক্ষার্থী বাদ দিলে পরের রোলগুলো এক ঘর উপরে আসে, রেজিস্ট্রেশন বদলায় না।</p>' : ''}</section>
      <section class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th class="left">নাম</th><th class="left">পিতার নাম</th><th>রোল</th><th>রেজিস্ট্রেশন</th><th>মোবাইল</th>${isP() ? '<th>অ্যাকশন</th>' : ''}</tr></thead><tbody id="sBody"></tbody></table></div><p class="muted" id="sCount"></p></section>`;
    let list = [];
    const draw = () => {
      const q = C.toEn($('#sFind').value).toLowerCase();
      const rows = list.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.nameEn || '').toLowerCase().includes(q) || C.toEn(s.roll) === q || C.toEn(s.reg) === q);
      $('#sBody').innerHTML = rows.length ? rows.map((s, i) => `<tr><td>${i + 1}</td><td class="left">${esc(s.name)}${s.nameEn ? `<span class="th-sub">${esc(s.nameEn)}</span>` : ''}</td><td class="left">${esc(s.father || '')}${s.fatherEn ? `<span class="th-sub">${esc(s.fatherEn)}</span>` : ''}</td><td>${esc(s.roll)}</td><td><b>${esc(s.reg)}</b></td><td>${esc(s.phone || '')}</td>${isP() ? `<td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-edit="${s.id}">এডিট</button><button class="btn btn-sm btn-red" data-del="${s.id}">বাদ দিন</button></div></td>` : ''}</tr>`).join('') : `<tr><td colspan="7" class="empty">এই শ্রেণিতে ${esc($('#sYear').value)} সালের কোনো শিক্ষার্থী নেই।${isP() ? ' "নতুন শিক্ষার্থী" বা "Excel আপলোড" দিয়ে যোগ করুন।' : ''}</td></tr>`;
      $('#sCount').textContent = `মোট ${list.length} জন শিক্ষার্থী`;
      $$('[data-edit]', v).forEach((b) => { b.onclick = () => edit(list.find((s) => s.id === b.dataset.edit)); });
      $$('[data-del]', v).forEach((b) => { b.onclick = () => removeStudent(list.find((x) => x.id === b.dataset.del)); });
    };
    const load = async () => { ui.sClass = $('#sClass').value; ui.sYear = $('#sYear').value; list = (await store.listStudents({ year: ui.sYear, classId: ui.sClass })).sort((a, b) => C.num(a.roll) - C.num(b.roll)); draw(); };
    const nextRoll = () => String(list.reduce((m, x) => Math.max(m, C.num(x.roll) || 0), 0) + 1);

    // বাদ দিলে পরের রোলগুলো এক ঘর উপরে আসে
    async function removeStudent(s) {
      const d = await dialog('শিক্ষার্থী বাদ দেবেন?', `<p>${esc(s.name)} (রোল ${esc(s.roll)}, রেজিস্ট্রেশন ${esc(s.reg)}) কে ${esc(className(ui.sClass))} ${esc(ui.sYear)} এর তালিকা থেকে বাদ দেওয়া হবে। আগে প্রকাশিত ফলাফল থেকে যাবে।</p><label><input type="checkbox" id="shift" checked> পরের শিক্ষার্থীদের রোল এক ঘর উপরে আনুন (যেমন রোল ${C.num(s.roll) + 1} → ${s.roll})</label>`, 'বাদ দিন', true);
      if (!d) return;
      try {
        await store.deleteStudent(s.id);
        if (d.shift) { const r = C.num(s.roll); const moved = list.filter((x) => x.id !== s.id && C.num(x.roll) > r).map((x) => Object.assign({}, x, { roll: String(C.num(x.roll) - 1) })); if (moved.length) await store.saveStudents(moved); }
        toast('বাদ দেওয়া হয়েছে' + (d.shift ? ', রোল ঠিক করা হয়েছে' : '')); load();
      } catch (e) { fail(e); }
    }
    const form = (s, isNew) => `<div class="grid-2" style="gap:12px">
      <label class="fld"><span>শিক্ষার্থীর নাম (বাংলা) *</span><input id="name" required value="${esc(s.name || '')}"></label>
      <label class="fld"><span>Student Name (English)</span><input id="nameEn" lang="en" value="${esc(s.nameEn || '')}" placeholder="বাংলা নাম লিখলে নিজে থেকে বসবে"></label>
      <label class="fld"><span>পিতার নাম (বাংলা)</span><input id="father" value="${esc(s.father || '')}"></label>
      <label class="fld"><span>Father's Name (English)</span><input id="fatherEn" lang="en" value="${esc(s.fatherEn || '')}"></label>
      <label class="fld"><span>রোল নম্বর *</span><input id="roll" inputmode="numeric" required value="${esc(s.roll || '')}"></label>
      <label class="fld"><span>রেজিস্ট্রেশন / আইডি নম্বর</span><input id="reg" value="${isNew ? '' : esc(s.reg || '')}" placeholder="নিজে থেকে তৈরি হবে" readonly></label>
      <label class="fld"><span>অভিভাবকের মোবাইল</span><input id="phone" inputmode="tel" value="${esc(s.phone || '')}"></label>
      <label class="fld"><span>Address (English)</span><input id="address" lang="en" value="${esc(s.address || '')}" placeholder="Village, Upazila, District"></label></div>`;
    const check = (d, id) => {
      if (!d.name.trim()) return 'শিক্ষার্থীর নাম লিখুন।';
      if (!/^\d+$/.test(C.toEn(d.roll))) return 'রোল নম্বর শুধু সংখ্যা হবে।';
      if (list.some((x) => x.id !== id && C.toEn(x.roll) === C.toEn(d.roll))) return `রোল ${C.toEn(d.roll)} এই শ্রেণিতে আগে থেকেই আছে।`;
      return '';
    };
    async function edit(s) {
      const isNew = !s; s = s || { roll: nextRoll() };
      let draft = s;
      for (;;) {
        const d = await dialog(isNew ? 'নতুন শিক্ষার্থী' : 'শিক্ষার্থীর তথ্য এডিট', form(draft, isNew), undefined, false, true, (f) => { autoEn($('#name', f), $('#nameEn', f), TL.name); autoEn($('#father', f), $('#fatherEn', f), TL.name); });
        if (!d) return;
        const err = check(d, s.id);
        if (err) { draft = Object.assign({}, s, d); toast(err, true); continue; }
        try {
          const rec = Object.assign({}, s, { name: d.name.trim(), nameEn: d.nameEn.trim() || TL.name(d.name), father: d.father.trim(), fatherEn: d.fatherEn.trim() || TL.name(d.father), roll: C.toEn(d.roll), phone: C.toEn(d.phone), address: d.address.trim(), classId: ui.sClass, year: String(ui.sYear) });
          if (isNew) rec.reg = (await store.allocateRegs(1))[0];
          await store.saveStudent(rec); toast(isNew ? `যোগ হয়েছে। রেজিস্ট্রেশন নম্বর: ${rec.reg}` : 'সংরক্ষণ হয়েছে'); await load();
        } catch (e) { fail(e); }
        return;
      }
    }
    // অনেক শিক্ষার্থী একসাথে: রেজিস্ট্রেশন নম্বর ও ইংরেজি নাম নিজে থেকে
    async function importRows(rows, source) {
      const errs = [], out = [];
      let roll = Number(nextRoll());
      rows.forEach((r, i) => {
        const name = String(r.name || '').trim(); if (!name) return;
        const rl = C.toEn(r.roll) || String(roll);
        const e = !/^\d+$/.test(rl) ? 'রোল সংখ্যা নয়' : (list.some((x) => C.toEn(x.roll) === rl) || out.some((o) => o.roll === rl)) ? `রোল ${rl} আগে থেকেই আছে` : (r.reg && (list.some((x) => C.toEn(x.reg) === C.toEn(r.reg)) || out.some((o) => o.reg === C.toEn(r.reg)))) ? `রেজিস্ট্রেশন ${r.reg} আগে থেকেই আছে` : '';
        if (e) { errs.push(`${source} ${i + 1}: ${e}`); return; }
        roll = Math.max(roll, Number(rl) + 1);
        out.push({ roll: rl, name, nameEn: String(r.nameEn || '').trim() || TL.name(name), father: String(r.father || '').trim(), fatherEn: String(r.fatherEn || '').trim() || TL.name(r.father || ''), reg: C.toEn(r.reg || ''), phone: C.toEn(r.phone || ''), address: String(r.address || '').trim(), classId: ui.sClass, year: String(ui.sYear) });
      });
      if (!out.length) { toast(errs[0] || 'যোগ করার মতো কোনো শিক্ষার্থী পাওয়া যায়নি।', true); return; }
      const need = out.filter((o) => !o.reg);
      const ok = await dialog('শিক্ষার্থী যোগ নিশ্চিত করুন', `<p>${out.length} জন শিক্ষার্থী ${esc(className(ui.sClass))} (${esc(ui.sYear)}) এ যোগ হবে।${need.length ? ` ${need.length} জনের রেজিস্ট্রেশন নম্বর নিজে থেকে তৈরি হবে।` : ''}${errs.length ? `<br><b class="f">${errs.length}টি সারি বাদ পড়েছে:</b> ${esc(errs.slice(0, 4).join('; '))}` : ''}</p><div class="tbl-wrap" style="max-height:300px;overflow:auto"><table class="tbl"><thead><tr><th>রোল</th><th class="left">নাম</th><th class="left">Name (English)</th><th class="left">পিতার নাম</th><th>মোবাইল</th></tr></thead><tbody>${out.map((o) => `<tr><td>${esc(o.roll)}</td><td class="left">${esc(o.name)}</td><td class="left">${esc(o.nameEn)}</td><td class="left">${esc(o.father)}</td><td>${esc(o.phone)}</td></tr>`).join('')}</tbody></table></div>`, 'যোগ করুন', false, true);
      if (!ok) return;
      try {
        const regs = need.length ? await store.allocateRegs(need.length) : [];
        need.forEach((o, i) => { o.reg = regs[i]; });
        await store.saveStudents(out); toast(`${out.length} জন শিক্ষার্থী যোগ হয়েছে`); load();
      } catch (e) { fail(e); }
    }
    $('#sClass').onchange = load; $('#sYear').onchange = load; $('#sFind').oninput = draw;
    $('#sXls').onclick = () => excel(`Students ${classEn(ui.sClass)} ${ui.sYear}`, [{ name: classEn(ui.sClass), rows: [['Roll', 'নাম', 'Name (English)', 'পিতার নাম', "Father's Name", 'Registration', 'Mobile', 'Address'], ...list.map((s) => [Number(s.roll), s.name, s.nameEn || '', s.father || '', s.fatherEn || '', s.reg, s.phone || '', s.address || ''])] }]);
    if (isP()) {
      $('#sAdd').onclick = () => edit();
      $('#sExcel').onchange = async () => {
        const f = $('#sExcel').files[0]; $('#sExcel').value = ''; if (!f) return;
        try {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
          const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' });
          const aoa = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
          // শিরোনামের সারি খুঁজে কলাম চেনা
          const keys = { roll: /roll|রোল|ক্রমিক/i, nameEn: /english|ইংরেজি|ইংরেজী/i, name: /name|নাম/i, father: /father|পিতা/i, phone: /mobile|phone|মোবাইল|ফোন/i, address: /address|ঠিকানা|গ্রাম/i, reg: /reg|রেজি|id no|আইডি/i };
          let hi = aoa.findIndex((r) => r.some((c) => keys.name.test(String(c))) && r.some((c) => keys.roll.test(String(c))));
          let col = {};
          if (hi >= 0) {
            aoa[hi].forEach((c, i) => { const t = String(c); if (keys.father.test(t)) { if (keys.nameEn.test(t)) col.fatherEn = i; else if (col.father == null) col.father = i; return; } if (keys.nameEn.test(t) && keys.name.test(t)) { col.nameEn = i; return; } Object.keys(keys).forEach((k) => { if (k !== 'nameEn' && k !== 'father' && col[k] == null && keys[k].test(t)) col[k] = i; }); });
          } else { hi = -1; col = { roll: 0, name: 1, father: 2, phone: 3, address: 4 }; }
          const rows = aoa.slice(hi + 1).filter((r) => r.some((c) => String(c).trim())).map((r) => { const o = {}; Object.keys(col).forEach((k) => { o[k] = String(r[col[k]] == null ? '' : r[col[k]]).trim(); }); return o; });
          await importRows(rows, 'সারি');
        } catch (e) { fail(e); }
      };
      $('#sBulk').onclick = async () => {
        const d = await dialog('লিখে একসাথে অনেক শিক্ষার্থী যোগ', `<p class="muted">প্রতি লাইনে একজন: <b>রোল, নাম, পিতার নাম, মোবাইল, ঠিকানা</b>। রেজিস্ট্রেশন নম্বর আর ইংরেজি নাম নিজে থেকে বসবে। রোল খালি রাখলে পরের রোল বসবে।</p><label class="fld"><span>${esc(className(ui.sClass))} — ${esc(ui.sYear)}</span><textarea id="bulk" rows="10" placeholder="1, নুসরাত জান্নাত সুবাহ, আব্দুর রহিম, 01810000000, Kutubjoom"></textarea></label>`, 'পরের ধাপ', false, true);
        if (!d) return;
        const rows = d.bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => { const p = line.split(/\t|,/).map((t) => t.trim()); return { roll: p[0], name: p[1], father: p[2], phone: p[3], address: p.slice(4).join(', ') }; });
        await importRows(rows, 'লাইন');
      };
      $('#sPromote').onclick = () => promoteOne();
    }
    await load();
  };

  // একটি শ্রেণির প্রমোশন: বার্ষিক ফলাফলের মেধাক্রম অনুযায়ী নতুন রোল (উত্তীর্ণ → বিশেষ বিবেচনা)।
  // রেজিস্ট্রেশন নম্বর একই থাকে।
  async function promotionPlan(year, classId, toClass, toYear, keepFailed) {
    const [list, subs, mk] = await Promise.all([store.listStudents({ year, classId }), store.listSubjects(classId), store.getMarks(year, 'annual', classId)]);
    const hasAnnual = Object.keys(mk.entries || {}).length > 0;
    const ordered = hasAnnual ? C.classResults(list, subs, mk.entries) : list.slice().sort((a, b) => C.num(a.roll) - C.num(b.roll)).map((s) => ({ student: s, promoted: true }));
    const up = [], stay = [];
    ordered.forEach((r) => (r.promoted ? up : stay).push(r.student));
    const mk2 = (s, c, roll) => ({ name: s.name, nameEn: s.nameEn || '', father: s.father || '', fatherEn: s.fatherEn || '', reg: s.reg, phone: s.phone || '', address: s.address || '', roll: String(roll), classId: c, year: String(toYear), prevRoll: s.roll, prevClass: classId });
    const promoted = toClass ? up.map((s, i) => mk2(s, toClass, i + 1)) : [];
    const repeat = keepFailed ? stay.map((s, i) => mk2(s, classId, i + 1)) : [];
    return { list, hasAnnual, promoted, repeat, graduated: toClass ? 0 : up.length, failed: stay.length };
  }
  async function promoteOne() {
    const from = ui.sClass, fy = ui.sYear;
    const idx = catalog.classes.findIndex((c) => c.id === from);
    const next = catalog.classes[idx + 1];
    const d = await dialog('এই শ্রেণির প্রমোশন', `<p>${esc(className(from))} (${esc(fy)}) এর শিক্ষার্থীদের নতুন শ্রেণি ও সালে তোলা হবে। বার্ষিক পরীক্ষার মেধাক্রম অনুযায়ী নতুন রোল বসবে (প্রথমে উত্তীর্ণরা, তারপর বিশেষ বিবেচনা)। নাম, পিতার নাম, রেজিস্ট্রেশন সব একই থাকবে।</p>
      <div class="grid-2" style="gap:12px"><label class="fld"><span>নতুন শ্রেণি</span><select id="toClass">${classOpts(next ? next.id : from, catalog.classes)}</select></label><label class="fld"><span>নতুন সাল</span><select id="toYear">${yearOpts(String(Number(fy) + 1))}</select></label></div>
      <label><input type="checkbox" id="keep" checked> অকৃতকার্য শিক্ষার্থীরা (3 বা বেশি বিষয়ে) একই শ্রেণিতে থাকবে</label>`, 'প্রমোশন দিন');
    if (!d) return;
    try {
      const exist = await store.listStudents({ year: d.toYear, classId: d.toClass });
      if (exist.length) return toast(`${className(d.toClass)} ${d.toYear} এ আগে থেকেই ${exist.length} জন আছে। আগে সেগুলো দেখে নিন।`, true);
      const plan = await promotionPlan(fy, from, d.toClass, d.toYear, d.keep);
      await store.saveStudents(plan.promoted.concat(plan.repeat));
      toast(`${plan.promoted.length} জন ${className(d.toClass)} (${d.toYear}) এ উঠেছে${plan.repeat.length ? `, ${plan.repeat.length} জন একই শ্রেণিতে` : ''}`);
      ui.sClass = d.toClass; ui.sYear = d.toYear; go('students');
    } catch (e) { fail(e); }
  }

  // ---------- শ্রেণি ও বিষয় ----------
  VIEWS.classes = async (v) => {
    const c0 = ui.cClass || catalog.classes[0].id;
    v.innerHTML = `<section class="card"><h2>বিষয় ব্যবস্থাপনা</h2>
        <div class="toolbar"><label class="fld w-md"><span>শ্রেণি</span><select id="cClass">${classOpts(c0, catalog.classes)}</select></label>
        <label class="fld grow"><span>নতুন বিষয় (বাংলা)</span><input id="cNew" placeholder="বিষয়ের নাম"></label>
        <label class="fld w-md"><span>Subject (English)</span><input id="cNewEn" lang="en" placeholder="মার্কশিটে দেখাবে"></label>
        <label class="fld w-sm"><span>পূর্ণমান</span><input id="cFull" inputmode="numeric" value="100"></label>
        <label class="fld w-sm"><span>পাস মার্ক</span><input id="cPass" inputmode="decimal" value="33" data-auto="1"></label>
        <button class="btn btn-dark" id="cAdd" type="button">${ic('plus')}বিষয় যোগ</button></div>
        <div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>#</th><th class="left">বিষয়ের নাম</th><th class="left">Subject (English)</th><th>পূর্ণমান</th><th>পাস মার্ক</th><th>অ্যাকশন</th></tr></thead><tbody id="cBody"></tbody></table></div>
        <p class="muted">পূর্ণমান লিখলে পাস মার্ক নিজে থেকে 33% বসে যায় (100 → 33, 50 → 16.5)। চাইলে পাস মার্ক নিজের মতো বদলে দিন, যেমন 50 নম্বরে 16 বা 17।</p>
      </section>
      <section class="card"><h2>শ্রেণির তালিকা</h2>
        <div class="toolbar"><label class="fld grow"><span>নতুন শ্রেণি (বাংলা)</span><input id="kNew" placeholder="যেমন: নবম শ্রেণি"></label><label class="fld w-md"><span>Class (English)</span><input id="kNewEn" lang="en" placeholder="Class Nine"></label><button class="btn btn-dark" id="kAdd" type="button">${ic('plus')}শ্রেণি যোগ</button></div>
        <div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>ক্রম</th><th class="left">শ্রেণির নাম</th><th class="left">Class (English)</th><th>অ্যাকশন</th></tr></thead><tbody id="kBody"></tbody></table></div>
      </section>`;
    // পূর্ণমান বদলালে পাস মার্ক নিজে থেকে বসবে, যতক্ষণ না পাস মার্ক হাতে বদলানো হয়
    const autoPass = (fullEl, passEl) => {
      fullEl.addEventListener('input', () => { const f = C.num(fullEl.value); if (passEl.dataset.auto === '1' && f > 0) passEl.value = C.passMarkFor(f); });
      passEl.addEventListener('input', () => { passEl.dataset.auto = passEl.value.trim() === '' ? '1' : '0'; });
    };
    autoPass($('#cFull'), $('#cPass'));
    autoEn($('#cNew'), $('#cNewEn'), TL.subject); autoEn($('#kNew'), $('#kNewEn'), TL.className);
    let subs = [];
    const drawSubs = () => {
      $('#cBody').innerHTML = subs.length ? subs.map((s, i) => `<tr><td>${i + 1}</td><td class="left"><input class="cell cell-w" data-n="${s.id}" value="${esc(s.name)}"></td><td class="left"><input class="cell cell-w" lang="en" data-ne="${s.id}" value="${esc(s.nameEn || '')}"></td><td><input class="cell" data-f="${s.id}" inputmode="numeric" value="${s.full}"></td><td><input class="cell" data-p="${s.id}" inputmode="decimal" value="${s.pass}" data-auto="${Number(s.pass) === C.passMarkFor(s.full) ? 1 : 0}"></td><td><div class="row-actions"><button class="btn btn-sm btn-green" data-save="${s.id}">Save</button><button class="btn btn-sm btn-red" data-del="${s.id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="6" class="empty">এই শ্রেণিতে কোনো বিষয় নেই। উপরে বিষয় যোগ করুন।</td></tr>';
      subs.forEach((s) => { autoPass($(`[data-f="${s.id}"]`), $(`[data-p="${s.id}"]`)); autoEn($(`[data-n="${s.id}"]`), $(`[data-ne="${s.id}"]`), TL.subject); });
      $$('[data-save]', v).forEach((b) => { b.onclick = async () => {
        const s = subs.find((x) => x.id === b.dataset.save); const name = $(`[data-n="${s.id}"]`).value.trim(); const full = C.num($(`[data-f="${s.id}"]`).value); const pass = C.num($(`[data-p="${s.id}"]`).value);
        if (!name || !(full > 0)) return toast('বিষয়ের নাম ও সঠিক পূর্ণমান দিন।', true);
        if (!(pass > 0) || pass > full) return toast('পাস মার্ক 0 থেকে পূর্ণমানের মধ্যে দিন।', true);
        try { await store.saveSubject(Object.assign({}, s, { name, nameEn: $(`[data-ne="${s.id}"]`).value.trim(), full, pass })); toast('সংরক্ষণ হয়েছে'); loadSubs(); } catch (e) { fail(e); }
      }; });
      $$('[data-del]', v).forEach((b) => { b.onclick = async () => { const s = subs.find((x) => x.id === b.dataset.del); if (await confirmBox('বিষয় মুছবেন?', `"${esc(s.name)}" বিষয়টি মুছে যাবে। এই বিষয়ের এন্ট্রি করা নম্বর আর হিসাবে আসবে না।`, 'মুছে ফেলুন')) { try { await store.deleteSubject(s.id); toast('মুছে ফেলা হয়েছে'); loadSubs(); } catch (e) { fail(e); } } }; });
    };
    const loadSubs = async () => { ui.cClass = $('#cClass').value; subs = await store.listSubjects(ui.cClass); drawSubs(); };
    const drawClasses = () => {
      $('#kBody').innerHTML = catalog.classes.map((c, i) => `<tr><td>${i + 1}</td><td class="left"><input class="cell cell-w" data-k="${c.id}" value="${esc(c.name)}"></td><td class="left"><input class="cell cell-w" lang="en" data-ke="${c.id}" value="${esc(c.nameEn || '')}"></td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-up="${i}" ${i ? '' : 'disabled'} aria-label="উপরে">▲</button><button class="btn btn-sm btn-green" data-ks="${c.id}">Save</button><button class="btn btn-sm btn-red" data-kd="${c.id}">Delete</button></div></td></tr>`).join('');
      catalog.classes.forEach((c) => autoEn($(`[data-k="${c.id}"]`), $(`[data-ke="${c.id}"]`), TL.className));
      $$('[data-ks]', v).forEach((b) => { b.onclick = async () => { const c = catalog.classes.find((x) => x.id === b.dataset.ks); const name = $(`[data-k="${c.id}"]`).value.trim(); if (!name) return; c.name = name; c.nameEn = $(`[data-ke="${c.id}"]`).value.trim(); await saveClasses(); }; });
      $$('[data-up]', v).forEach((b) => { b.onclick = async () => { const i = Number(b.dataset.up); const a = catalog.classes; [a[i - 1], a[i]] = [a[i], a[i - 1]]; await saveClasses(); }; });
      $$('[data-kd]', v).forEach((b) => { b.onclick = async () => { const c = catalog.classes.find((x) => x.id === b.dataset.kd); const n = (await store.listStudents({ classId: c.id })).length; if (n) return toast(`${c.name} এ ${n} জন শিক্ষার্থী আছে, তাই মোছা যাবে না।`, true); if (await confirmBox('শ্রেণি মুছবেন?', `"${esc(c.name)}" শ্রেণিটি তালিকা থেকে মুছে যাবে।`, 'মুছে ফেলুন')) { catalog.classes = catalog.classes.filter((x) => x.id !== c.id); await saveClasses(); } }; });
    };
    const saveClasses = async () => { catalog.classes.forEach((c, i) => { c.order = i + 1; }); try { await store.saveClasses(catalog.classes); toast('শ্রেণির তালিকা সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } drawClasses(); $('#cClass').innerHTML = classOpts(ui.cClass, catalog.classes); };
    $('#cClass').onchange = loadSubs;
    $('#cAdd').onclick = async () => {
      const name = $('#cNew').value.trim(); const full = C.num($('#cFull').value); const pass = C.num($('#cPass').value);
      if (!name) return toast('বিষয়ের নাম লিখুন।', true); if (!(full > 0)) return toast('সঠিক পূর্ণমান দিন।', true);
      if (!(pass > 0) || pass > full) return toast('পাস মার্ক 0 থেকে পূর্ণমানের মধ্যে দিন।', true);
      if (subs.some((s) => s.name === name)) return toast('এই বিষয়টি আগে থেকেই আছে।', true);
      try { await store.saveSubject({ classId: ui.cClass, name, nameEn: $('#cNewEn').value.trim() || TL.subject(name), full, pass, order: subs.length + 1 }); $('#cNew').value = ''; $('#cNewEn').value = ''; $('#cNewEn').dataset.auto = '1'; toast('বিষয় যোগ হয়েছে'); loadSubs(); } catch (e) { fail(e); }
    };
    $('#kAdd').onclick = async () => { const name = $('#kNew').value.trim(); if (!name) return toast('শ্রেণির নাম লিখুন।', true); catalog.classes.push({ id: 'c' + Date.now().toString(36), name, nameEn: $('#kNewEn').value.trim() || TL.className(name), order: catalog.classes.length + 1 }); $('#kNew').value = ''; $('#kNewEn').value = ''; $('#kNewEn').dataset.auto = '1'; await saveClasses(); };
    drawClasses(); await loadSubs();
  };

  // ---------- শিক্ষক ও স্টাফ ----------
  VIEWS.teachers = async (v) => {
    v.innerHTML = `<section class="card"><h2>নতুন শিক্ষক / স্টাফ যোগ</h2>
      <div class="toolbar"><label class="fld grow"><span>নাম</span><input id="tName" placeholder="নাম"></label>
      <label class="fld w-md"><span>পদ</span><select id="tRole"><option value="teacher">শিক্ষক</option><option value="office">অফিস / কম্পিউটার</option></select></label>
      <label class="fld w-md"><span>মোবাইল</span><input id="tPhone" inputmode="tel"></label></div>
      <div class="toolbar" style="margin-top:10px"><label class="fld w-md"><span>User ID</span><input id="tUser" placeholder="যেমন: karim" autocomplete="off"></label>
      <label class="fld w-md"><span>Password</span><input id="tPass" placeholder="কমপক্ষে 6 অক্ষর" autocomplete="new-password"></label>
      <label class="fld grow"><span>ছবি</span><input id="tPhoto" type="file" accept="image/*"></label></div>
      <div id="tClassWrap"><p style="margin:12px 0 6px;font-weight:700">যে শ্রেণিগুলোর নম্বর এন্ট্রি করবেন:</p>
      <div class="checks" id="tClasses">${catalog.classes.map((c) => `<label><input type="checkbox" value="${c.id}">${esc(c.name)}</label>`).join('')}</div></div>
      <p class="muted" id="tOfficeNote" hidden>অফিস / কম্পিউটার কর্মচারী লগইন করলে শুধু "আইডি কার্ড" অংশ দেখতে পাবেন: শিক্ষার্থীর ছবি তোলা, কার্ডের তথ্য ঠিক করা আর কার্ড ডাউনলোড।</p>
      <div style="margin-top:12px"><button class="btn btn-dark" id="tAdd" type="button">${ic('plus')}যোগ করুন</button></div></section>
      <section class="card"><h2>শিক্ষক ও স্টাফের তালিকা</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ছবি</th><th class="left">নাম</th><th>পদ</th><th>User ID</th><th>মোবাইল</th><th class="left">শ্রেণি</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead><tbody id="tBody"></tbody></table></div>
      <p class="muted">কেউ পাসওয়ার্ড ভুলে গেলে তার অ্যাকাউন্ট মুছে নতুন User ID দিয়ে আবার যোগ করুন। প্রত্যেকে নিজে লগইন করে "পাসওয়ার্ড পরিবর্তন" থেকে পাসওয়ার্ড বদলাতে পারবেন।</p></section>`;
    $('#tRole').onchange = () => { const off = $('#tRole').value === 'office'; $('#tClassWrap').hidden = off; $('#tOfficeNote').hidden = !off; };
    let users = [];
    const order = { principal: 0, teacher: 1, office: 2 };
    const load = async () => {
      users = (await store.listUsers()).sort((a, b) => (order[a.role] - order[b.role]) || String(a.name).localeCompare(String(b.name)));
      $('#tBody').innerHTML = users.map((u) => `<tr><td>${avatar(u, 44)}</td><td class="left">${esc(u.name)}</td><td>${u.role === 'principal' ? '<span class="chip chip-gold">প্রিন্সিপাল</span>' : u.role === 'office' ? '<span class="chip chip-gray">অফিস / কম্পিউটার</span>' : 'শিক্ষক'}</td><td>${esc(u.userId)}</td><td>${esc(u.phone || '')}</td><td class="left">${u.role === 'principal' ? 'সব শ্রেণি' : u.role === 'office' ? 'আইডি কার্ড' : esc((u.classIds || []).map(className).join(', ') || '—')}</td><td>${u.active === false ? '<span class="chip chip-red">বন্ধ</span>' : '<span class="chip chip-green">চালু</span>'}</td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-ed="${u.id}">এডিট</button>${u.role === 'principal' ? '' : `<button class="btn btn-sm btn-red" data-del="${u.id}">Delete</button>`}</div></td></tr>`).join('');
      $$('[data-ed]', v).forEach((b) => { b.onclick = () => editUser(users.find((x) => x.id === b.dataset.ed)).then((ok) => ok && load()); });
      $$('[data-del]', v).forEach((b) => { b.onclick = async () => { const u = users.find((x) => x.id === b.dataset.del); if (await confirmBox('অ্যাকাউন্ট মুছবেন?', `${esc(u.name)} আর লগইন করতে পারবেন না।`, 'মুছে ফেলুন')) { try { await store.deleteUser(u.id); toast('মুছে ফেলা হয়েছে'); load(); } catch (e) { fail(e); } } }; });
    };
    $('#tAdd').onclick = async () => {
      const t = { name: $('#tName').value.trim(), role: $('#tRole').value, phone: C.toEn($('#tPhone').value), userId: $('#tUser').value.trim(), password: $('#tPass').value, classIds: $('#tRole').value === 'teacher' ? $$('#tClasses input:checked').map((el) => el.value) : [] };
      if (!t.name) return toast('নাম লিখুন।', true);
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(t.userId)) return toast('User ID ইংরেজি অক্ষর/সংখ্যায় 3–30 অক্ষরের হবে (স্পেস ছাড়া)।', true);
      if (t.password.length < 6) return toast('পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।', true);
      const b = $('#tAdd'); b.disabled = true;
      try { t.photo = await readImage($('#tPhoto').files[0], 240, 'image/jpeg') || ''; await store.createUser(t); toast(`${t.name} যোগ হয়েছেন। User ID: ${t.userId}`); ['#tName', '#tUser', '#tPass', '#tPhone', '#tPhoto'].forEach((s) => { $(s).value = ''; }); $$('#tClasses input').forEach((el) => { el.checked = false; }); load(); } catch (e) { fail(e); } finally { b.disabled = false; }
    };
    await load();
  };
  // যেকোনো অ্যাকাউন্টের নাম, মোবাইল, ছবি, শ্রেণি এডিট (প্রিন্সিপালসহ)
  async function editUser(u) {
    const d = await dialog(u.role === 'principal' ? 'প্রিন্সিপালের প্রোফাইল' : 'শিক্ষক / স্টাফের তথ্য', `<div style="display:flex;gap:14px;align-items:center">${avatar(u, 72)}<label class="fld grow"><span>নতুন ছবি</span><input type="file" accept="image/*" id="ph"></label></div>
      ${u.photo ? '<label><input type="checkbox" id="rmPh"> ছবি মুছে ফেলুন</label>' : ''}
      <label class="fld"><span>নাম</span><input id="nm" value="${esc(u.name)}" required></label>
      <label class="fld"><span>মোবাইল</span><input id="phn" inputmode="tel" value="${esc(u.phone || '')}"></label>
      ${u.role === 'teacher' ? `<p style="margin:0;font-weight:700">শ্রেণি</p><div class="checks">${catalog.classes.map((c) => `<label><input type="checkbox" data-group="cls" value="${c.id}" ${(u.classIds || []).includes(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('')}</div>` : ''}
      ${u.role !== 'principal' ? `<label><input type="checkbox" id="act" ${u.active !== false ? 'checked' : ''}> অ্যাকাউন্ট চালু রাখুন</label>` : ''}`);
    if (!d) return false;
    try {
      const upd = { id: u.id, name: d.nm.trim() || u.name, phone: C.toEn(d.phn) };
      const file = $('#ph', d._form).files[0];
      if (file) upd.photo = await readImage(file, 240, 'image/jpeg'); else if (d.rmPh) upd.photo = '';
      if (u.role === 'teacher') upd.classIds = d._checks;
      if (u.role !== 'principal') upd.active = d.act;
      await store.updateUser(upd);
      if (me.id === u.id) { Object.assign(me, upd); showWho(); }
      toast('সংরক্ষণ হয়েছে'); return true;
    } catch (e) { fail(e); return false; }
  }

  // ---------- নম্বর এন্ট্রি ----------
  async function classResultData(y, e, c) {
    const [students, subjects, marks] = await Promise.all([store.listStudents({ year: y, classId: c }), store.listSubjects(c), store.getMarks(y, e, c)]);
    const results = C.classResults(students, subjects, marks.entries || {});
    return { students, subjects, marks, results };
  }
  // শ্রেণির সব শিক্ষার্থীর ফলাফল একসাথে (Excel)
  function resultRows(subjects, results, marks) {
    const m = marks || {}; const att = m.attendance || {};
    return [['Merit', 'Roll', 'Name', 'Name (English)', 'Registration', ...subjects.map((s) => s.nameEn || s.name), 'Total', 'Average', 'GPA', 'Grade', 'Result', 'Failed Subjects', 'Working Days', 'Present', 'Absent'],
      ...results.slice().sort((a, b) => (a.rank || 9999) - (b.rank || 9999) || C.num(a.student.roll) - C.num(b.student.roll)).map((r) => { const a = C.attendance(m.totalDays, att[r.student.id]); return [r.rank || '', Number(r.student.roll), r.student.name, r.student.nameEn || '', r.student.reg, ...r.rows.map((x) => (x.mark == null ? '' : x.mark)), r.total, Number(C.fix2(r.average)), Number(C.fix2(r.gpa)), r.status === 'incomplete' ? '' : r.grade, C.STATUS[r.status].en, r.fails || 0, a ? a.total : '', a ? a.present : '', a ? a.absent : '']; })];
  }
  const snapOf = (r, e, y, c, marks) => U.snapshot(r, e, y, cls(c), C.attendance((marks || {}).totalDays, ((marks || {}).attendance || {})[r.student.id]));
  VIEWS.marks = async (v) => {
    const cl = myClasses();
    if (!cl.length) { v.innerHTML = '<div class="card note">আপনাকে এখনো কোনো শ্রেণি দেওয়া হয়নি। প্রিন্সিপালের সাথে যোগাযোগ করুন।</div>'; return; }
    const c0 = cl.some((c) => c.id === ui.mClass) ? ui.mClass : cl[0].id;
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld w-md"><span>শ্রেণি নির্বাচন</span><select id="mClass">${classOpts(c0)}</select></label>
      <label class="fld w-sm"><span>পরীক্ষার সন</span><select id="mYear">${yearOpts(ui.mYear || settings.activeYear)}</select></label>
      <label class="fld w-lg"><span>পরীক্ষার ধরন</span><select id="mExam">${examOpts(ui.mExam || 'first')}</select></label>
      <label class="fld w-sm"><span>মোট কার্যদিবস</span><input id="mDays" inputmode="numeric" placeholder="যেমন 90"></label>
      <button class="btn btn-green" id="mSave" type="button">${ic('save')}Save Marks</button>
      <button class="btn btn-ghost" id="mXls" type="button">${ic('down')}Excel (পুরো শ্রেণি)</button>
    </div></section><div id="mNote"></div><section class="card"><div class="tbl-wrap" id="mGrid"></div><p class="muted">প্রতিটি ঘরে প্রাপ্ত নম্বর লিখুন। Enter চাপলে পরের ঘরে যাবে। "উপস্থিত" ঘরে কত দিন উপস্থিত ছিল লিখুন, অনুপস্থিত নিজে থেকে হিসাব হবে (মার্কশিটে দেখাবে)। 1–2 বিষয়ে অকৃতকার্য হলে "বিশেষ বিবেচনা" (মেধাক্রম সবার শেষে), 3 বা বেশি বিষয়ে অকৃতকার্য হলে FAIL (মেধাক্রম নেই)।</p></section>`;
    let students = [], subjects = [], data = { entries: {} }, dirty = false;
    const collect = () => {
      const entries = {};
      $$('input.cell[data-sub]', v).forEach((inp) => { const val = inp.value.trim(); if (val === '') return; (entries[inp.dataset.s] = entries[inp.dataset.s] || {})[inp.dataset.sub] = C.num(val); });
      return entries;
    };
    const collectAtt = () => { const a = {}; $$('input.att', v).forEach((inp) => { const n = C.num(inp.value); if (inp.value.trim() !== '' && !Number.isNaN(n)) a[inp.dataset.s] = n; }); return { totalDays: C.num($('#mDays').value) || 0, attendance: a }; };
    const recalcAtt = () => { const t = C.num($('#mDays').value); $$('input.att', v).forEach((inp) => { const a = C.attendance(t, inp.value); inp.closest('tr').querySelector('.r-abs').textContent = a ? a.absent : '—'; inp.classList.toggle('bad', inp.value.trim() !== '' && (Number.isNaN(C.num(inp.value)) || (t > 0 && C.num(inp.value) > t))); }); };
    const recalc = () => {
      C.classResults(students, subjects, collect()).forEach((r) => {
        const row = $(`tr[data-row="${r.student.id}"]`, v); if (!row) return;
        const done = r.missing === 0;
        row.querySelector('.r-total').textContent = r.total ? r.total : '—';
        row.querySelector('.r-avg').textContent = done ? C.fix2(r.average) : '—';
        const g = row.querySelector('.r-grade'); g.textContent = done ? r.grade : '—'; g.className = 'r-grade' + (done && r.grade === 'F' ? ' f' : '');
        row.querySelector('.r-gpa').textContent = done ? C.fix2(r.gpa) : '—';
        row.querySelector('.r-rank').textContent = r.rank || '—';
        row.querySelector('.r-status').innerHTML = statusChip(r);
      });
    };
    const load = async () => {
      ui.mClass = $('#mClass').value; ui.mYear = $('#mYear').value; ui.mExam = $('#mExam').value;
      [students, subjects, data] = await Promise.all([store.listStudents({ year: ui.mYear, classId: ui.mClass }), store.listSubjects(ui.mClass), store.getMarks(ui.mYear, ui.mExam, ui.mClass)]);
      students.sort((a, b) => C.num(a.roll) - C.num(b.roll)); dirty = false;
      const locked = !!data.published;
      $('#mNote').innerHTML = locked ? `<div class="note" style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>এই পরীক্ষার ফলাফল প্রকাশিত হয়েছে, তাই নম্বর পরিবর্তন বন্ধ।${isP() ? '' : ' পরিবর্তন দরকার হলে প্রিন্সিপালকে জানান।'}</span>${isP() ? `<button class="btn btn-sm btn-dark" id="mUnlock" type="button">${ic('edit')}প্রকাশ বাতিল করে এডিট করুন</button>` : ''}</div>` : '';
      $('#mSave').disabled = locked;
      if ($('#mUnlock')) $('#mUnlock').onclick = async () => {
        if (!(await confirmBox('এডিট করবেন?', 'ফলাফলের প্রকাশ বাতিল হবে, অভিভাবকরা সাময়িকভাবে এই রেজাল্ট দেখতে পাবেন না। নম্বর ঠিক করে "ফলাফল প্রকাশ" পেজ থেকে আবার প্রকাশ করবেন।', 'প্রকাশ বাতিল করে এডিট'))) return;
        try { await store.unpublish(ui.mYear, ui.mExam, ui.mClass); delete catalog.published[U.marksId(ui.mYear, ui.mExam, ui.mClass)]; toast('এখন নম্বর এডিট করা যাবে'); load(); } catch (e) { fail(e); }
      };
      if (!subjects.length) { $('#mGrid').innerHTML = `<p class="empty">এই শ্রেণিতে কোনো বিষয় যোগ করা হয়নি।${isP() ? ' "শ্রেণি ও বিষয়" পেজে বিষয় যোগ করুন।' : ''}</p>`; return; }
      if (!students.length) { $('#mGrid').innerHTML = `<p class="empty">${esc(className(ui.mClass))} এ ${esc(ui.mYear)} সালের কোনো শিক্ষার্থী নেই।</p>`; return; }
      const e = data.entries || {}; const att = data.attendance || {};
      $('#mDays').value = data.totalDays || ''; $('#mDays').disabled = locked;
      $('#mGrid').innerHTML = `<table class="tbl"><thead><tr><th>#</th><th class="left">নাম</th><th>পুরাতন রোল</th>${subjects.map((s) => `<th>${esc(s.name)}<span class="th-sub">পূর্ণমান ${s.full} · পাস ${s.pass}</span></th>`).join('')}<th>উপস্থিত<span class="th-sub">দিন</span></th><th>অনুপস্থিত</th><th>মোট</th><th>গড়</th><th>গ্রেড</th><th>GPA</th><th>অবস্থা</th><th class="hl">মেধাক্রম</th></tr></thead><tbody>${students.map((st, i) => `<tr data-row="${st.id}"><td>${i + 1}</td><td class="left">${esc(st.name)}</td><td>${esc(st.roll)}</td>${subjects.map((s) => { const val = (e[st.id] || {})[s.id]; return `<td><input class="cell" inputmode="decimal" data-s="${st.id}" data-sub="${s.id}" data-max="${s.full}" value="${val == null ? '' : val}" ${locked ? 'disabled' : ''} aria-label="${esc(st.name)} — ${esc(s.name)}"></td>`; }).join('')}<td><input class="cell att" inputmode="numeric" data-s="${st.id}" value="${att[st.id] == null ? '' : att[st.id]}" ${locked ? 'disabled' : ''} aria-label="${esc(st.name)} — উপস্থিত দিন"></td><td class="r-abs">—</td><td class="r-total"></td><td class="r-avg"></td><td class="r-grade"></td><td class="r-gpa"></td><td class="r-status"></td><td class="r-rank hl"></td></tr>`).join('')}</tbody></table>`;
      $$('input.att', v).forEach((inp) => inp.addEventListener('input', () => { dirty = true; recalcAtt(); }));
      $('#mDays').oninput = () => { dirty = true; recalcAtt(); };
      recalcAtt();
      const cells = $$('input.cell', v);
      cells.forEach((inp, idx) => {
        if (inp.classList.contains('att')) { inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const nx = cells[idx + 1]; if (nx) nx.focus(); } }); return; }
        inp.addEventListener('input', () => { const n = C.num(inp.value); inp.classList.toggle('bad', inp.value.trim() !== '' && (Number.isNaN(n) || n < 0 || n > Number(inp.dataset.max))); dirty = true; recalc(); });
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const nx = cells[idx + 1]; if (nx) nx.focus(); } });
      });
      recalc();
    };
    $('#mSave').onclick = async () => {
      const bad = $$('input.cell.bad', v);
      if (bad.length) { bad[0].focus(); return toast('লাল ঘরের নম্বর ঠিক করুন: 0 থেকে পূর্ণমানের মধ্যে হতে হবে।', true); }
      const b = $('#mSave'); b.disabled = true;
      try { await store.saveMarks(ui.mYear, ui.mExam, ui.mClass, collect(), collectAtt()); dirty = false; toast('নম্বর সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } finally { b.disabled = !!data.published; }
    };
    $('#mXls').onclick = () => excel(`Result ${classEn(ui.mClass)} ${C.examEn(ui.mExam)} ${ui.mYear}`, [{ name: classEn(ui.mClass), rows: resultRows(subjects, C.classResults(students, subjects, collect()), collectAtt()) }]);
    const change = async () => { if (dirty && !(await confirmBox('সংরক্ষণ করা হয়নি', 'নতুন লেখা নম্বর এখনো সংরক্ষণ হয়নি। সংরক্ষণ না করে অন্য তালিকায় যাবেন?', 'হ্যাঁ, যাব'))) { $('#mClass').value = ui.mClass; $('#mYear').value = ui.mYear; $('#mExam').value = ui.mExam; return; } load(); };
    $('#mClass').onchange = change; $('#mYear').onchange = change; $('#mExam').onchange = change;
    await load();
  };

  // ---------- ফলাফল প্রকাশ ----------
  function resultTable(results) {
    const sorted = results.slice().sort((a, b) => C.num(a.student.roll) - C.num(b.student.roll));
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>পুরাতন রোল</th><th class="left">নাম</th><th>মোট</th><th>গড়</th><th>গ্রেড</th><th>GPA</th><th>ফলাফল</th><th class="hl">মেধাক্রম</th><th>মার্কশিট</th></tr></thead><tbody>${sorted.length ? sorted.map((r) => `<tr><td>${esc(r.student.roll)}</td><td class="left">${esc(r.student.name)}</td><td>${r.missing ? '—' : r.total}</td><td>${r.missing ? '—' : C.fix2(r.average)}</td><td class="${r.grade === 'F' ? 'f' : ''}">${r.missing ? '—' : r.grade}</td><td>${r.missing ? '—' : C.fix2(r.gpa)}</td><td>${statusChip(r)}</td><td class="hl">${r.rank || '—'}</td><td><button class="btn btn-sm btn-ghost" data-ms="${r.student.id}" ${r.missing ? 'disabled' : ''}>দেখুন</button></td></tr>`).join('') : '<tr><td colspan="9" class="empty">কোনো শিক্ষার্থী নেই</td></tr>'}</tbody></table></div>`;
  }
  function bindMarksheets(root, results, y, e, c, marks) {
    $$('[data-ms]', root).forEach((b) => { b.onclick = async () => {
      const r = results.find((x) => x.student.id === b.dataset.ms);
      const html = M.render(snapOf(r, e, y, c, marks), settings, images);
      const d = await dialog('মার্কশিট', html, 'প্রিন্ট / PDF', false, true);
      if (d) printHtml(html);
    }; });
  }
  VIEWS.publish = async (v) => {
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld w-sm"><span>সাল</span><select id="pYear">${yearOpts(ui.pYear || settings.activeYear)}</select></label>
      <label class="fld w-md"><span>শ্রেণি</span><select id="pClass">${classOpts(ui.pClass || catalog.classes[0].id, catalog.classes)}</select></label>
      <label class="fld w-lg"><span>পরীক্ষা</span><select id="pExam">${examOpts(ui.pExam || 'first')}</select></label>
    </div></section>
    <section class="card" id="pDetail"></section>
    <section class="card"><h2>সব শ্রেণির অবস্থা</h2><div class="tbl-wrap" id="pGrid"></div></section>`;
    const grid = () => {
      const y = $('#pYear').value;
      $('#pGrid').innerHTML = `<table class="tbl"><thead><tr><th class="left">শ্রেণি</th>${C.EXAMS.map((e) => `<th>${e.name}</th>`).join('')}</tr></thead><tbody>${catalog.classes.map((c) => `<tr><td class="left">${esc(c.name)}</td>${C.EXAMS.map((e) => { const on = catalog.published[U.marksId(y, e.key, c.id)]; return `<td><button class="btn btn-sm ${on ? 'btn-green' : 'btn-ghost'}" data-pick="${c.id}|${e.key}">${on ? 'প্রকাশিত' : 'অপ্রকাশিত'}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
      $$('[data-pick]', v).forEach((b) => { b.onclick = () => { const [c, e] = b.dataset.pick.split('|'); $('#pClass').value = c; $('#pExam').value = e; detail(); $('#pDetail').scrollIntoView({ behavior: 'smooth' }); }; });
    };
    const detail = async () => {
      ui.pYear = $('#pYear').value; ui.pClass = $('#pClass').value; ui.pExam = $('#pExam').value;
      const y = ui.pYear, c = ui.pClass, e = ui.pExam;
      const box = $('#pDetail'); box.innerHTML = '<p class="empty">লোড হচ্ছে…</p>';
      const { results, subjects, marks } = await classResultData(y, e, c);
      const missing = results.filter((r) => r.missing).length;
      const pub = !!marks.published;
      const ready = results.length && subjects.length && !missing;
      box.innerHTML = `<div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${esc(className(c))} — ${C.examName(e)} ${esc(y)} ${pub ? '<span class="chip chip-green">প্রকাশিত</span>' : '<span class="chip chip-gray">অপ্রকাশিত</span>'}</h2>
        <div class="toolbar">${pub ? `<button class="btn btn-red" id="pUn" type="button">প্রকাশ বাতিল (এডিট করতে)</button>` : `<button class="btn btn-green" id="pGo" type="button" ${ready ? '' : 'disabled'}>${ic('publish')}ফলাফল প্রকাশ করুন</button>`}
        <button class="btn btn-ghost" id="pEdit" type="button">${ic('edit')}নম্বর এডিট</button>
        <button class="btn btn-ghost" id="pPrint" type="button" ${ready ? '' : 'disabled'}>${ic('print')}সব মার্কশিট প্রিন্ট / PDF</button><button class="btn btn-ghost" id="pXls" type="button" ${results.length ? '' : 'disabled'}>${ic('down')}Excel</button></div></div>
        ${!subjects.length ? '<div class="note">এই শ্রেণিতে কোনো বিষয় নেই।</div>' : missing ? `<div class="note">${missing} জন শিক্ষার্থীর সব নম্বর এন্ট্রি হয়নি। সব নম্বর দেওয়া হলে প্রকাশ করা যাবে।</div>` : pub ? '<div class="note ok">অভিভাবকরা এখন রোল ও রেজিস্ট্রেশন নম্বর দিয়ে এই ফলাফল দেখতে পারছেন। ভুল থাকলে "প্রকাশ বাতিল" চেপে নম্বর ঠিক করে আবার প্রকাশ করুন।</div>' : results.length ? '<div class="note ok">সব নম্বর এন্ট্রি হয়েছে। নিচে দেখে নিশ্চিত হয়ে "ফলাফল প্রকাশ করুন" চাপুন।</div>' : ''}
        <div style="margin-top:12px">${resultTable(results)}</div>`;
      bindMarksheets(box, results, y, e, c, marks);
      const goBtn = $('#pGo'), un = $('#pUn');
      if (goBtn) goBtn.onclick = async () => {
        if (!(await confirmBox('ফলাফল প্রকাশ করবেন?', `${esc(className(c))}, ${C.examName(e)} ${esc(y)} এর ফলাফল সবাই দেখতে পারবে। ভুল হলে পরে "প্রকাশ বাতিল" করে আবার এডিট করা যাবে।`, 'প্রকাশ করুন'))) return;
        goBtn.disabled = true;
        try { await store.publish(y, e, c, results.map((r) => snapOf(r, e, y, c, marks))); catalog.published[U.marksId(y, e, c)] = Date.now(); toast('ফলাফল প্রকাশিত হয়েছে'); detail(); grid(); } catch (er) { fail(er); goBtn.disabled = false; }
      };
      if (un) un.onclick = async () => {
        if (!(await confirmBox('প্রকাশ বাতিল করবেন?', 'অভিভাবকরা সাময়িকভাবে এই ফলাফল দেখতে পারবেন না। নম্বর এন্ট্রি পেজে নম্বর ঠিক করে আবার প্রকাশ করতে পারবেন।', 'প্রকাশ বাতিল'))) return;
        try { await store.unpublish(y, e, c); delete catalog.published[U.marksId(y, e, c)]; toast('প্রকাশ বাতিল হয়েছে। এখন নম্বর এডিট করা যাবে।'); detail(); grid(); } catch (er) { fail(er); }
      };
      $('#pEdit').onclick = () => { ui.mClass = c; ui.mYear = y; ui.mExam = e; go('marks'); };
      $('#pPrint').onclick = () => printHtml(results.filter((r) => !r.missing).sort((a, b) => C.num(a.student.roll) - C.num(b.student.roll)).map((r) => M.render(snapOf(r, e, y, c, marks), settings, images)).join(''));
      $('#pXls').onclick = () => excel(`Result ${classEn(c)} ${C.examEn(e)} ${y}`, [{ name: classEn(c), rows: resultRows(subjects, results, marks) }]);
    };
    $('#pYear').onchange = () => { grid(); detail(); }; $('#pClass').onchange = detail; $('#pExam').onchange = detail;
    grid(); await detail();
  };

  // ---------- ফলাফল সংরক্ষণ, Archive ও প্রমোশন ----------
  VIEWS.archive = async (v) => {
    const archived = settings.archivedYears || [];
    const years = Array.from(new Set(Object.keys(catalog.published).map((k) => k.split('_')[0]).concat([String(settings.activeYear)], archived))).sort((a, b) => b - a);
    const sel = ui.aYear || years[0];
    const ay = String(settings.activeYear), ny = String(Number(ay) + 1);
    v.innerHTML = `<section class="card archive-hero"><div><h2>${ay} সাল Archive ও প্রমোশন</h2>
        <p>এক ক্লিকে: ${ay} সালের সব রেজাল্ট স্থায়ীভাবে সংরক্ষিত থাকবে, আর সব শ্রেণির শিক্ষার্থী বার্ষিক পরীক্ষার মেধাক্রম অনুযায়ী নতুন রোল নিয়ে পরের শ্রেণিতে (${ny} সালে) উঠে যাবে। নাম আর নতুন করে লিখতে হবে না। চলতি সাল হয়ে যাবে ${ny}।</p>
        <label><input type="checkbox" id="aKeep" checked> অকৃতকার্য শিক্ষার্থীরা (3 বা বেশি বিষয়ে) একই শ্রেণিতে থাকবে। বিশেষ বিবেচনার শিক্ষার্থীরা পরের শ্রেণিতে উঠবে, রোল পাবে উত্তীর্ণদের পরে।</label></div>
        <div class="toolbar"><button class="btn btn-ghost" id="aPreview" type="button">আগে দেখে নিন</button><button class="btn btn-gold" id="aRun" type="button">${ic('archive')}${ay} Archive করুন ও প্রমোশন দিন</button></div>
        <div id="aPlan"></div></section>
      <section class="year-cards">${years.map((y) => { const n = Object.keys(catalog.published).filter((k) => k.startsWith(y + '_')).length; return `<div class="year-card${y === sel ? ' active' : ''}">${ic('archive')}<b>${y}</b><span>${n}টি প্রকাশিত ফলাফল</span>${archived.includes(y) ? '<span class="chip chip-gold">Archived</span>' : y === ay ? '<span class="chip chip-green">চলতি সাল</span>' : ''}<div class="row-actions"><button class="btn btn-sm btn-dark" data-y="${y}">দেখুন</button><button class="btn btn-sm btn-ghost" data-yx="${y}">Excel</button></div></div>`; }).join('')}</section>
      <section class="card"><h2>${sel} সালের প্রকাশিত ফলাফল</h2><p class="muted">সব বছরের ফলাফল স্থায়ীভাবে সংরক্ষিত থাকে। অভিভাবকরাও যেকোনো বছর বেছে ফলাফল দেখতে পারেন। "Excel" বাটনে ওই বছরের সব শ্রেণি ও পরীক্ষার ফলাফল একটি ফাইলে আলাদা আলাদা শিটে পাবেন।</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="left">শ্রেণি</th>${C.EXAMS.map((e) => `<th>${e.name}</th>`).join('')}</tr></thead><tbody>${catalog.classes.map((c) => `<tr><td class="left">${esc(c.name)}</td>${C.EXAMS.map((e) => catalog.published[U.marksId(sel, e.key, c.id)] ? `<td><button class="btn btn-sm btn-green" data-open="${c.id}|${e.key}">দেখুন</button></td>` : '<td><span class="chip chip-gray">নেই</span></td>').join('')}</tr>`).join('')}</tbody></table></div></section>
      <section class="card" id="aDetail" hidden></section>
      <section class="card"><h2>সম্পূর্ণ ব্যাকআপ</h2><p>সব শিক্ষার্থী, নম্বর, ফলাফল, হিসাব ও নোটিশের একটি কপি আপনার কম্পিউটারে রাখুন। মাসে অন্তত একবার ব্যাকআপ নেওয়া ভালো।</p><button class="btn btn-dark" id="aBackup" type="button">${ic('down')}Full Backup Download</button></section>`;
    $$('[data-y]', v).forEach((b) => { b.onclick = () => { ui.aYear = b.dataset.y; go('archive'); }; });
    $$('[data-yx]', v).forEach((b) => { b.onclick = () => yearExcel(b.dataset.yx); });
    $$('[data-open]', v).forEach((b) => { b.onclick = async () => {
      const [c, e] = b.dataset.open.split('|'); const box = $('#aDetail'); box.hidden = false; box.innerHTML = '<p class="empty">লোড হচ্ছে…</p>';
      const { results, subjects, marks } = await classResultData(sel, e, c);
      box.innerHTML = `<div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${esc(className(c))} — ${C.examName(e)} ${sel}</h2><button class="btn btn-ghost" id="aX" type="button">${ic('down')}Excel</button></div><div style="margin-top:12px">${resultTable(results)}</div>`;
      $('#aX').onclick = () => excel(`Result ${classEn(c)} ${C.examEn(e)} ${sel}`, [{ name: classEn(c), rows: resultRows(subjects, results, marks) }]);
      bindMarksheets(box, results, sel, e, c, marks); box.scrollIntoView({ behavior: 'smooth' });
    }; });
    $('#aBackup').onclick = backup;

    // প্রমোশনের পরিকল্পনা: কে কোথায় যাবে
    const buildPlan = async () => {
      const keep = $('#aKeep').checked; const plans = [];
      for (let i = 0; i < catalog.classes.length; i++) {
        const c = catalog.classes[i], next = catalog.classes[i + 1];
        const p = await promotionPlan(ay, c.id, next ? next.id : null, ny, keep);
        if (p.list.length) plans.push(Object.assign({ c, next }, p));
      }
      return plans;
    };
    const showPlan = (plans) => {
      $('#aPlan').innerHTML = plans.length ? `<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th class="left">${ay} শ্রেণি</th><th>শিক্ষার্থী</th><th class="left">${ny} এ যাবে</th><th>উত্তীর্ণ</th><th>অকৃতকার্য</th><th>বার্ষিক ফলাফল</th></tr></thead><tbody>${plans.map((p) => `<tr><td class="left">${esc(p.c.name)}</td><td>${p.list.length}</td><td class="left">${p.next ? esc(p.next.name) : 'শেষ শ্রেণি (পাস করে বের হবে)'}</td><td>${p.promoted.length + p.graduated}</td><td>${p.failed}${p.repeat.length ? ' (একই শ্রেণিতে)' : ''}</td><td>${p.hasAnnual ? '<span class="chip chip-green">আছে</span>' : '<span class="chip chip-gold">নেই — পুরাতন রোলের ক্রমে</span>'}</td></tr>`).join('')}</tbody></table></div>` : `<p class="note" style="margin-top:12px">${ay} সালে কোনো শিক্ষার্থী নেই।</p>`;
      $('#aPlan').insertAdjacentHTML('beforeend', '<p class="muted" style="margin:8px 0 0">রেজিস্ট্রেশন নম্বর সবার একই থাকবে, শুধু শ্রেণি ও রোল বদলাবে।</p>');
    };
    $('#aPreview').onclick = async () => { try { showPlan(await buildPlan()); } catch (e) { fail(e); } };
    $('#aRun').onclick = async () => {
      try {
        const plans = await buildPlan(); showPlan(plans);
        if (!plans.length) return;
        const existing = (await store.listStudents({ year: ny })).length;
        if (existing) return toast(`${ny} সালে আগে থেকেই ${existing} জন শিক্ষার্থী আছে। দুইবার প্রমোশন এড়াতে কাজটি বন্ধ রাখা হলো।`, true);
        const noAnnual = plans.filter((p) => !p.hasAnnual).length;
        if (!(await confirmBox(`${ay} Archive করবেন?`, `${plans.reduce((a, p) => a + p.promoted.length + p.repeat.length, 0)} জন শিক্ষার্থী ${ny} সালের নতুন শ্রেণিতে নতুন রোলসহ যুক্ত হবে। ${ay} সালের সব রেজাল্ট সংরক্ষিত থাকবে। চলতি সাল হবে ${ny}।${noAnnual ? ` সতর্কতা: ${noAnnual}টি শ্রেণির বার্ষিক নম্বর এন্ট্রি হয়নি, সেগুলোতে পুরাতন রোলের ক্রমেই নতুন রোল বসবে।` : ''}`, 'Archive ও প্রমোশন'))) return;
        const all = []; plans.forEach((p) => { all.push(...p.promoted, ...p.repeat); });
        await store.saveStudents(all);
        const upd = { activeYear: ny, archivedYears: Array.from(new Set(archived.concat([ay]))) };
        await store.saveSettings(upd); Object.assign(settings, upd);
        toast(`${ay} Archive হয়েছে। ${all.length} জন শিক্ষার্থী ${ny} সালের জন্য প্রস্তুত।`);
        ui.aYear = ay; go('archive');
      } catch (e) { fail(e); }
    };
  };
  // এক বছরের সব প্রকাশিত ফলাফল একটি Excel ফাইলে
  async function yearExcel(y) {
    const sheets = [];
    for (const c of catalog.classes) for (const e of C.EXAMS) {
      if (!catalog.published[U.marksId(y, e.key, c.id)]) continue;
      const { subjects, results, marks } = await classResultData(y, e.key, c.id);
      sheets.push({ name: `${c.nameEn || c.name} ${e.short}`, rows: resultRows(subjects, results, marks) });
    }
    if (!sheets.length) return toast(`${y} সালের কোনো প্রকাশিত ফলাফল নেই।`, true);
    excel(`Results ${y} - All Classes`, sheets);
  }
  async function backup() { try { const d = await store.exportAll(); download(`kutubjoom-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(d, null, 1), 'application/json'); toast('ব্যাকআপ ডাউনলোড হয়েছে'); } catch (e) { fail(e); } }

  // ---------- হিসাব (পরীক্ষার রুটিনসহ) ----------
  // রুটিনের পাতা: উপরে শিক্ষার্থীর নাম/রোল/শ্রেণি/পিতার নাম, মাঝে সব শ্রেণির রুটিন, নিচে ওই শিক্ষার্থীর বকেয়া
  function routineHtml(rt, st, fee, highlightClass) {
    const shifts = (rt.shifts || []).filter((sh) => (sh.classIds || []).length);
    const cols = []; shifts.forEach((sh, si) => sh.classIds.forEach((cid, k) => cols.push({ cid, si, first: k === 0 })));
    const head1 = shifts.map((sh, si) => `${si ? '<th class="rt-gap"></th>' : ''}<th colspan="${sh.classIds.length}">${esc(sh.name)}<span class="rt-time">${esc(sh.time)}</span></th>`).join('');
    const head2 = cols.map((c) => `${c.first && c.si ? '<th class="rt-gap"></th>' : ''}<th class="${c.cid === highlightClass ? 'rt-hl' : ''}">${esc(className(c.cid))}</th>`).join('');
    const body = (rt.rows || []).map((r) => `<tr><td class="rt-date">${esc(r.date)}</td>${cols.map((c) => `${c.first && c.si ? '<td class="rt-gap"></td>' : ''}<td class="${c.cid === highlightClass ? 'rt-hl' : ''}">${esc((r.cells || {})[c.cid] || '')}</td>`).join('')}</tr>`).join('');
    let feeBlock = '';
    if (fee) {
      const its = fee.items; const p = fee.paid || {};
      feeBlock = `<h3 class="rt-fee-title">বকেয়া/পরীক্ষার ফি'র বিবরণ :</h3><table class="rt-fee"><thead><tr><th>খাত</th>${its.map((it) => `<th>${esc(it.name)}</th>`).join('')}<th>মোট</th></tr></thead><tbody>
        <tr><th>প্রদেয়</th>${its.map((it) => `<td>${C.itemDue(it, fee.discount)}</td>`).join('')}<td>${its.reduce((a, it) => a + C.itemDue(it, fee.discount), 0)}</td></tr>
        <tr><th>জমা</th>${its.map((it) => `<td>${p[it.key] == null ? '' : p[it.key]}</td>`).join('')}<td>${its.reduce((a, it) => a + (Number(p[it.key]) || 0), 0)}</td></tr>
        <tr class="rt-due"><th>বাকি</th>${its.map((it) => { const b = C.itemDue(it, fee.discount) - (Number(p[it.key]) || 0); return `<td>${b > 0 ? b : '—'}</td>`; }).join('')}<td>${Math.max(0, its.reduce((a, it) => a + C.itemDue(it, fee.discount) - (Number(p[it.key]) || 0), 0))}</td></tr></tbody></table>`;
    }
    return `<section class="routine-page">
      <div class="rt-head"><div class="rt-student">${st ? `<p>নাম : <b>${esc(st.name)}</b></p><p>পিতার নাম : <b>${esc(st.father || '')}</b></p><p>শ্রেণি : <b>${esc(className(st.classId))}</b> &nbsp; রোল : <b>${esc(st.roll)}</b></p>` : '<p>নাম : ..............................................</p><p>শ্রেণি : ............... রোল : ...............</p>'}</div>
        <div class="rt-title"><p class="rt-bis">বিসমিল্লাহির রাহমানির রাহীম</p><h2>${esc(settings.name)}</h2><h3>${esc(rt.title || '')}</h3></div><div class="rt-logo"><img src="${esc(images.logo || 'assets/logo.webp')}" alt=""></div></div>
      <table class="rt-table"><thead><tr><th rowspan="2" class="rt-date">তারিখ ও বার</th>${head1}</tr><tr>${head2}</tr></thead><tbody>${body}</tbody></table>
      ${feeBlock}
      <div class="rt-foot"><div class="rt-letter"><p class="rt-to">সম্মানিত অভিভাবকবৃন্দের জ্ঞাতার্থে :</p><p>${esc(rt.letter || '').replace(/\n/g, '<br>')}</p>${rt.resultDate ? `<p><b>পরীক্ষার ফলাফল ঘোষণার সম্ভাব্য তারিখ : ${esc(rt.resultDate)}</b></p>` : ''}</div>
        <div class="rt-sign"><p>অনুরোধক্রমে -</p>${signImg(40)}<p><b>প্রধান শিক্ষক</b></p><p><b>${esc(settings.name)}</b></p><p>${esc(settings.address)}</p></div></div>
    </section>`;
  }

  VIEWS.fees = async (v) => {
    const tab = ui.fTab || 'collect';
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld w-md"><span>শ্রেণি</span><select id="feClass">${classOpts(ui.fClass || catalog.classes[0].id, catalog.classes)}</select></label>
      <label class="fld w-sm"><span>সাল</span><select id="feYear">${yearOpts(ui.fYear || settings.activeYear)}</select></label>
      <label class="fld w-lg"><span>হিসাবের পর্ব</span><select id="fPeriod">${opt(C.FEE_PERIODS.map((p) => ({ v: p.key, t: p.name })).concat([{ v: 'all', t: 'সারা বছর' }]), ui.fPeriod || 'first')}</select></label>
      <div class="toolbar" role="tablist">${[['collect', 'টাকা আদায় এন্ট্রি'], ['summary', 'বকেয়া সারাংশ'], ['routine', 'পরীক্ষার রুটিন'], ['items', 'ফি ও খাত']].map((t) => `<button type="button" class="btn ${t[0] === tab ? 'btn-dark' : 'btn-ghost'}" data-tab="${t[0]}" role="tab" aria-selected="${t[0] === tab}">${t[1]}</button>`).join('')}</div>
    </div><p class="muted" style="margin:10px 0 0">বছরে তিনবার হিসাব হয়। কোন মাস বা খাত কোন হিসাবে যাবে, "ফি ও খাত" ট্যাবে বদলানো যায়। আদায় এন্ট্রিতে যে ঘর খালি থাকবে, সেটা নিজে থেকে বকেয়া হিসেবে ধরা হবে। "পরীক্ষার রুটিন" ট্যাব থেকে প্রতিটি শিক্ষার্থীর জন্য রুটিন ও বকেয়া একসাথে প্রিন্ট করা যায়।</p></section>
    <div id="fBody"></div>`;
    let students = [], fees = C.normalizeFees({});
    const periodItems = () => (ui.fPeriod === 'all' ? fees.items : fees.items.filter((it) => it.period === ui.fPeriod));
    const load = async () => {
      ui.fClass = $('#feClass').value; ui.fYear = $('#feYear').value; ui.fPeriod = $('#fPeriod').value;
      [students, fees] = await Promise.all([store.listStudents({ year: ui.fYear, classId: ui.fClass }), store.getFees(ui.fYear, ui.fClass)]);
      students.sort((a, b) => C.num(a.roll) - C.num(b.roll));
      await ({ collect: drawCollect, summary: drawSummary, items: drawItems, routine: drawRoutine })[ui.fTab || 'collect']();
    };
    const saveFees = async (msg) => { try { await store.saveFees(ui.fYear, ui.fClass, fees); toast(msg || 'হিসাব সংরক্ষণ হয়েছে'); return true; } catch (e) { fail(e); return false; } };
    const noStudents = () => `<section class="card empty">${esc(className(ui.fClass))} এ ${esc(ui.fYear)} সালের কোনো শিক্ষার্থী নেই।</section>`;
    const periodOpts = (sel) => opt(C.FEE_PERIODS.map((p) => ({ v: p.key, t: p.name })), sel);
    // রুটিনের নিচের বকেয়া টেবিলের তথ্য
    const feeFor = (s, per) => ({ items: per === 'all' ? fees.items : fees.items.filter((it) => it.period === per), paid: fees.payments[s.id] || {}, discount: fees.discounts[s.id] });

    // ফি ও খাত: নাম, টাকা, কোন হিসাবে — সব এডিটযোগ্য, নতুন খাত যোগ
    function drawItems() {
      $('#fBody').innerHTML = `<section class="card"><div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">ফি ও খাত — ${esc(className(ui.fClass))} ${esc(ui.fYear)}</h2><div class="toolbar"><button class="btn btn-ghost" id="iCopy" type="button">অন্য সব শ্রেণিতেও একই খাত বসান</button><button class="btn btn-green" id="iSave" type="button">${ic('save')}সংরক্ষণ করুন</button></div></div>
        <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>#</th><th class="left">খাতের নাম</th><th>টাকা (৳)</th><th>কোন হিসাবে</th><th>মাসিক বেতন?<span class="th-sub">ছাড় প্রযোজ্য</span></th><th></th></tr></thead><tbody id="iBody"></tbody></table></div>
        <div class="toolbar" style="margin-top:14px"><label class="fld grow"><span>নতুন খাত</span><input id="iName" placeholder="যেমন: কোচিং ফি, কার্ড ফি, বই, পোশাক"></label><label class="fld w-sm"><span>টাকা</span><input id="iAmt" inputmode="numeric"></label><label class="fld w-lg"><span>কোন হিসাবে</span><select id="iPer">${periodOpts(ui.fPeriod === 'all' ? 'first' : ui.fPeriod)}</select></label><label style="align-self:center"><input type="checkbox" id="iMon"> মাসিক</label><button class="btn btn-dark" id="iAdd" type="button">${ic('plus')}খাত যোগ</button></div>
        <div class="toolbar" style="margin-top:10px"><label class="fld w-md"><span>সব মাসিক বেতন একসাথে বদলান (৳)</span><input id="iMonthly" inputmode="numeric" placeholder="যেমন: 150"></label><button class="btn btn-ghost" id="iMonthlyBtn" type="button">সব মাসে বসান</button></div>
        <p class="muted">কোনো মাস অন্য হিসাবে নিতে চাইলে "কোন হিসাবে" থেকে বদলে দিন। যেমন প্রথম সাময়িকে 4 মাসের জায়গায় 6 মাস নিতে মে ও জুন মাসকে "প্রথম সাময়িক হিসাব" করুন।</p></section>`;
      const draw = () => {
        $('#iBody').innerHTML = fees.items.map((it, i) => `<tr><td>${i + 1}</td><td class="left"><input class="cell cell-w" data-in="${i}" value="${esc(it.name)}"></td><td><input class="cell" data-ia="${i}" inputmode="numeric" value="${it.amount || 0}"></td><td><select class="cell-sel" data-ip="${i}">${periodOpts(it.period)}</select></td><td><input type="checkbox" data-im="${i}" ${it.monthly ? 'checked' : ''} aria-label="মাসিক"></td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-iu="${i}" ${i ? '' : 'disabled'} aria-label="উপরে">▲</button><button class="btn btn-sm btn-red" data-id="${i}">মুছুন</button></div></td></tr>`).join('');
        $$('[data-id]', v).forEach((b) => { b.onclick = () => { read(); fees.items.splice(Number(b.dataset.id), 1); draw(); }; });
        $$('[data-iu]', v).forEach((b) => { b.onclick = () => { read(); const i = Number(b.dataset.iu); [fees.items[i - 1], fees.items[i]] = [fees.items[i], fees.items[i - 1]]; draw(); }; });
      };
      const read = () => fees.items.forEach((it, i) => { it.name = $(`[data-in="${i}"]`).value.trim() || it.name; it.amount = C.num($(`[data-ia="${i}"]`).value) || 0; it.period = $(`[data-ip="${i}"]`).value; it.monthly = $(`[data-im="${i}"]`).checked; });
      draw();
      $('#iAdd').onclick = () => { const name = $('#iName').value.trim(); if (!name) return toast('খাতের নাম লিখুন।', true); read(); fees.items.push({ key: 'x' + Date.now().toString(36), name, amount: C.num($('#iAmt').value) || 0, period: $('#iPer').value, monthly: $('#iMon').checked }); $('#iName').value = ''; $('#iAmt').value = ''; draw(); toast('খাত যোগ হয়েছে। সংরক্ষণ করতে ভুলবেন না।'); };
      $('#iMonthlyBtn').onclick = () => { const n = C.num($('#iMonthly').value); if (!(n >= 0) || $('#iMonthly').value.trim() === '') return toast('মাসিক বেতনের পরিমাণ লিখুন।', true); read(); fees.items.forEach((it) => { if (it.monthly) it.amount = n; }); draw(); };
      $('#iSave').onclick = async () => { read(); await saveFees('ফি ও খাত সংরক্ষণ হয়েছে'); };
      $('#iCopy').onclick = async () => {
        if (!(await confirmBox('সব শ্রেণিতে বসাবেন?', `${esc(ui.fYear)} সালের সব শ্রেণিতে এই খাত ও টাকার পরিমাণ বসানো হবে। আগের আদায়ের এন্ট্রি ঠিক থাকবে।`, 'বসিয়ে দিন'))) return;
        read();
        try { for (const c of catalog.classes) { const f = await store.getFees(ui.fYear, c.id); await store.saveFees(ui.fYear, c.id, Object.assign(f, { items: JSON.parse(JSON.stringify(fees.items)) })); } toast('সব শ্রেণিতে খাত বসানো হয়েছে'); } catch (e) { fail(e); }
      };
    }

    async function discountDialog(s) {
      const cur = fees.discounts[s.id] || {};
      const d = await dialog('বেতন ছাড় / ফ্রি', `<p>${esc(s.name)} (রোল ${esc(s.roll)})</p>
        <label class="fld"><span>ছাড়ের ধরন</span><select id="dt">${opt(C.DISCOUNTS.map((x) => ({ v: x.key, t: x.name })), cur.type || '')}</select></label>
        <div class="grid-2" style="gap:12px"><label class="fld"><span>ছাড় % (নির্দিষ্ট % হলে)</span><input id="dp" inputmode="numeric" value="${esc(cur.percent || '')}"></label><label class="fld"><span>মাসিক বেতন ৳ (নির্দিষ্ট বেতন হলে)</span><input id="da" inputmode="numeric" value="${cur.amount == null ? '' : esc(cur.amount)}"></label></div>
        <label class="fld"><span>কোন ফি-তে প্রযোজ্য</span><select id="ds">${opt([{ v: 'monthly', t: 'শুধু মাসিক বেতন' }, { v: 'all', t: 'সব ফি (ভর্তি, পরীক্ষা ফি সহ)' }], cur.scope || 'monthly')}</select></label>`);
      if (!d) return;
      if (!d.dt) delete fees.discounts[s.id];
      else fees.discounts[s.id] = { type: d.dt, percent: C.num(d.dp) || 0, amount: C.num(d.da) || 0, scope: d.ds };
      if (await saveFees('ছাড় সংরক্ষণ হয়েছে')) load();
    }

    function drawCollect() {
      if (!students.length) { $('#fBody').innerHTML = noStudents(); return; }
      const its = periodItems();
      if (!its.length) { $('#fBody').innerHTML = '<section class="card note">এই হিসাবে কোনো খাত নেই। "ফি ও খাত" ট্যাবে খাত যোগ করুন।</section>'; return; }
      $('#fBody').innerHTML = `<section class="card"><div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">টাকা আদায় — ${esc(className(ui.fClass))} ${esc(ui.fYear)}</h2><button class="btn btn-green" id="cSave" type="button">${ic('save')}সংরক্ষণ করুন</button></div>
        <p class="muted">জমা হওয়া টাকা ঘরে লিখুন। ঘরে দুইবার ক্লিক করলে পুরো টাকা বসে যাবে। সবুজ = পরিশোধ, লাল = আংশিক, খালি = বকেয়া। ফ্রি বা অর্ধেক বেতনের জন্য "ছাড়" বাটন ব্যবহার করুন।</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>রোল</th><th class="left">নাম</th>${its.map((it) => `<th>${esc(it.name)}<span class="th-sub">${money(it.amount)}</span></th>`).join('')}<th>জমা</th><th>বাকি</th><th>ছাড়</th></tr></thead>
        <tbody>${students.map((s) => { const p = fees.payments[s.id] || {}; const dc = fees.discounts[s.id]; return `<tr data-st="${s.id}"><td>${esc(s.roll)}</td><td class="left">${esc(s.name)}${dc && dc.type ? ` <span class="chip chip-gold">${esc(C.discountLabel(dc))}</span>` : ''}</td>${its.map((it) => { const due = C.itemDue(it, dc); const val = p[it.key]; return `<td><input class="cell fee-cell" inputmode="numeric" data-s="${s.id}" data-k="${it.key}" data-due="${due}" value="${val == null ? '' : val}" placeholder="${due}" aria-label="${esc(s.name)} — ${esc(it.name)}"></td>`; }).join('')}<td class="c-paid"></td><td class="c-bal"></td><td><button class="btn btn-sm btn-ghost" data-dc="${s.id}">ছাড়</button></td></tr>`; }).join('')}
        <tr class="sum-row"><td colspan="2" class="left">মোট</td>${its.map((it) => `<td data-sum="${it.key}"></td>`).join('')}<td id="sumPaid"></td><td id="sumBal"></td><td></td></tr></tbody></table></div></section>`;
      const recalc = () => {
        let tp = 0, tb = 0; const col = {};
        students.forEach((s) => {
          let paid = 0, due = 0;
          $$(`input[data-s="${s.id}"]`, v).forEach((inp) => { const n = C.num(inp.value) || 0; const dd = Number(inp.dataset.due); paid += n; due += dd; col[inp.dataset.k] = (col[inp.dataset.k] || 0) + n; inp.parentElement.className = inp.value.trim() === '' ? (dd ? 'fee-due-empty' : '') : (n >= dd ? 'fee-paid' : 'fee-due'); });
          const row = $(`tr[data-st="${s.id}"]`, v); row.querySelector('.c-paid').textContent = money(paid); const bal = Math.max(0, due - paid); row.querySelector('.c-bal').innerHTML = bal ? `<b class="due">${money(bal)}</b>` : '<span class="paid">পরিশোধ</span>';
          tp += paid; tb += bal;
        });
        Object.keys(col).forEach((k) => { const td = $(`[data-sum="${k}"]`, v); if (td) td.textContent = money(col[k]); });
        $('#sumPaid').textContent = money(tp); $('#sumBal').textContent = money(tb);
      };
      $$('input.fee-cell', v).forEach((inp) => { inp.addEventListener('input', recalc); inp.addEventListener('dblclick', () => { inp.value = inp.dataset.due; recalc(); }); });
      recalc();
      $('#cSave').onclick = async () => {
        $$('input.fee-cell', v).forEach((inp) => { const p = (fees.payments[inp.dataset.s] = fees.payments[inp.dataset.s] || {}); const n = C.num(inp.value); if (inp.value.trim() === '' || Number.isNaN(n)) delete p[inp.dataset.k]; else p[inp.dataset.k] = n; });
        await saveFees();
      };
      $$('[data-dc]', v).forEach((b) => { b.onclick = () => discountDialog(students.find((x) => x.id === b.dataset.dc)); });
    }

    // একজন শিক্ষার্থীর সম্পূর্ণ হিসাব (PDF/প্রিন্ট)
    const statement = (s) => {
      const p = fees.payments[s.id] || {}; const dc = fees.discounts[s.id]; const f = C.studentFees(fees.items, p, dc);
      return `<div class="slip"><div class="slip-head"><img src="${esc(images.logo || 'assets/logo.webp')}" alt="" width="54" height="50"><div><h3>${esc(settings.name)}</h3><p class="slip-sub">${esc(settings.address)} · শিক্ষার্থীর হিসাব ${esc(ui.fYear)}</p></div></div>
        <p><b>নাম:</b> ${esc(s.name)} &nbsp; <b>পিতার নাম:</b> ${esc(s.father || '')} &nbsp; <b>শ্রেণি:</b> ${esc(className(ui.fClass))} &nbsp; <b>রোল:</b> ${esc(s.roll)} &nbsp; <b>রেজিস্ট্রেশন:</b> ${esc(s.reg)}${dc && dc.type ? ` &nbsp; <b>ছাড়:</b> ${esc(C.discountLabel(dc))}` : ''}</p>
        ${C.FEE_PERIODS.map((per) => { const its = fees.items.filter((it) => it.period === per.key); if (!its.length) return ''; const sum = f.periods.find((x) => x.key === per.key); return `<h4 style="margin:10px 0 4px">${per.name}</h4><table class="tbl"><thead><tr><th class="left">খাত</th><th>প্রদেয়</th><th>জমা</th><th>বাকি</th></tr></thead><tbody>${its.map((it) => { const due = C.itemDue(it, dc); const got = Number(p[it.key]) || 0; return `<tr><td class="left">${esc(it.name)}</td><td>${money(due)}</td><td>${p[it.key] == null ? '—' : money(got)}</td><td>${due - got > 0 ? `<b class="due">${money(due - got)}</b>` : '—'}</td></tr>`; }).join('')}<tr class="sum-row"><td class="left">মোট</td><td>${money(sum.due)}</td><td>${money(sum.paid)}</td><td>${money(sum.balance)}</td></tr></tbody></table>`; }).join('')}
        <p style="margin:12px 0 0;font-weight:700">সারা বছর: প্রদেয় ${money(f.due)} · জমা ${money(f.paid)} · বাকি ${money(f.balance)}</p>
        <div style="text-align:right;margin:16px 0 0;font-weight:700;display:flex;flex-direction:column;align-items:flex-end">${signImg(38)}<span>প্রধান শিক্ষক</span></div></div>`;
    };

    function drawSummary() {
      if (!students.length) { $('#fBody').innerHTML = noStudents(); return; }
      const rows = students.map((s) => ({ s, f: C.studentFees(fees.items, fees.payments[s.id], fees.discounts[s.id]) }));
      const per = ui.fPeriod;
      const pick = (f) => per === 'all' ? f : f.periods.find((p) => p.key === per);
      const tot = rows.reduce((a, r) => { const x = pick(r.f); a.due += x.due; a.paid += x.paid; a.bal += x.balance; return a; }, { due: 0, paid: 0, bal: 0 });
      const dueCount = rows.filter((r) => pick(r.f).balance > 0).length;
      $('#fBody').innerHTML = `<section class="stats">
          <div class="stat s2">${ic('fees')}<div><span>মোট প্রাপ্য</span><b>${money(tot.due)}</b></div></div>
          <div class="stat s1">${ic('save')}<div><span>মোট আদায়</span><b>${money(tot.paid)}</b></div></div>
          <div class="stat s4">${ic('notice')}<div><span>মোট বকেয়া</span><b>${money(tot.bal)}</b></div></div>
          <div class="stat s3">${ic('students')}<div><span>বকেয়া আছে</span><b>${dueCount} জন</b></div></div></section>
        <section class="card"><div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${per === 'all' ? 'সারা বছরের' : esc(C.periodName(per))} — ${esc(className(ui.fClass))} ${esc(ui.fYear)}</h2>
        <div class="toolbar"><button class="btn btn-ghost" id="slipAll" type="button">${ic('print')}বকেয়া স্লিপ</button><button class="btn btn-ghost" id="fPdf" type="button">${ic('print')}পুরো শ্রেণির PDF</button><button class="btn btn-ghost" id="fXls" type="button">${ic('down')}Excel</button></div></div>
        <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>রোল</th><th class="left">নাম</th>${C.FEE_PERIODS.map((p) => `<th>${p.name}<span class="th-sub">বাকি</span></th>`).join('')}<th>মোট প্রাপ্য</th><th>মোট জমা</th><th>মোট বাকি</th><th>প্রিন্ট</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${esc(r.s.roll)}</td><td class="left">${esc(r.s.name)}${fees.discounts[r.s.id] && fees.discounts[r.s.id].type ? ` <span class="chip chip-gold">${esc(C.discountLabel(fees.discounts[r.s.id]))}</span>` : ''}</td>${r.f.periods.map((p) => `<td>${p.balance ? `<b class="due">${money(p.balance)}</b>` : '<span class="paid">পরিশোধ</span>'}</td>`).join('')}<td>${money(r.f.due)}</td><td>${money(r.f.paid)}</td><td>${r.f.balance ? `<b class="due">${money(r.f.balance)}</b>` : '—'}</td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-stm="${r.s.id}">হিসাব</button><button class="btn btn-sm btn-ghost" data-rt="${r.s.id}">রুটিন</button></div></td></tr>`).join('')}
        <tr class="sum-row"><td colspan="2" class="left">মোট</td>${C.FEE_PERIODS.map((p) => `<td>${money(rows.reduce((a, r) => a + r.f.periods.find((x) => x.key === p.key).balance, 0))}</td>`).join('')}<td>${money(rows.reduce((a, r) => a + r.f.due, 0))}</td><td>${money(rows.reduce((a, r) => a + r.f.paid, 0))}</td><td>${money(rows.reduce((a, r) => a + r.f.balance, 0))}</td><td></td></tr></tbody></table></div>
        <p class="muted">"হিসাব" = শিক্ষার্থীর সারা বছরের হিসাব, "রুটিন" = পরীক্ষার রুটিনের নিচে তার বকেয়া। প্রিন্টের পাতায় প্রিন্টার হিসেবে "Save as PDF" বেছে নিলে PDF ফাইল হিসেবে সংরক্ষণ হবে।</p></section>`;
      const slip = (r) => {
        const p = fees.payments[r.s.id] || {}; const dc = fees.discounts[r.s.id];
        const its = (per === 'all' ? fees.items : fees.items.filter((it) => it.period === per)).filter((it) => C.itemDue(it, dc) > (Number(p[it.key]) || 0));
        const bal = its.reduce((a, it) => a + C.itemDue(it, dc) - (Number(p[it.key]) || 0), 0);
        return `<div class="slip"><h3>${esc(settings.name)}</h3><p class="slip-sub">বকেয়া / পরীক্ষার ফি'র বিবরণ — ${per === 'all' ? esc(ui.fYear) : esc(C.periodName(per)) + ' ' + esc(ui.fYear)}</p><p><b>নাম:</b> ${esc(r.s.name)} &nbsp; <b>পিতার নাম:</b> ${esc(r.s.father || '')} &nbsp; <b>শ্রেণি:</b> ${esc(className(ui.fClass))} &nbsp; <b>রোল:</b> ${esc(r.s.roll)}</p>
          <table class="tbl"><thead><tr>${its.map((it) => `<th>${esc(it.name)}</th>`).join('') || '<th>বকেয়া</th>'}<th>মোট বাকি</th></tr></thead><tbody><tr>${its.map((it) => `<td>${money(C.itemDue(it, dc) - (Number(p[it.key]) || 0))}</td>`).join('') || '<td>নেই</td>'}<td><b>${money(bal)}</b></td></tr></tbody></table>
          <p style="margin:10px 0 0">সম্মানিত অভিভাবক, আসন্ন পরীক্ষার আগে উপরের বকেয়া পরিশোধ করে প্রবেশপত্র সংগ্রহ করার অনুরোধ রইল।</p><div style="text-align:right;margin:10px 0 0;font-weight:700;display:flex;flex-direction:column;align-items:flex-end">${signImg(34)}<span>প্রধান শিক্ষক</span></div></div>`;
      };
      $('#slipAll').onclick = () => { const list = rows.filter((r) => pick(r.f).balance > 0); if (!list.length) return toast('এই হিসাবে কারো বকেয়া নেই।'); printHtml(list.map(slip).join('')); };
      $('#fPdf').onclick = () => printHtml(`<div class="slip"><h3>${esc(settings.name)}</h3><p class="slip-sub">${esc(className(ui.fClass))} — হিসাব ${esc(ui.fYear)}</p>${$('#fBody .tbl-wrap').innerHTML.replace(/<div class="row-actions">[\s\S]*?<\/div>/g, '')}</div>`);
      $$('[data-stm]', v).forEach((b) => { b.onclick = () => printHtml(statement(students.find((s) => s.id === b.dataset.stm))); });
      $$('[data-rt]', v).forEach((b) => { b.onclick = async () => { const rt = await currentRoutine(); if (!rt) return; const s = students.find((x) => x.id === b.dataset.rt); printHtml(routineHtml(rt, s, feeFor(s, rt.feePeriod || per), s.classId)); }; });
      $('#fXls').onclick = () => excel(`Fees ${classEn(ui.fClass)} ${ui.fYear}`, [{ name: classEn(ui.fClass), rows: [['Roll', 'Name', 'Discount', ...fees.items.map((it) => `${it.name} (${it.amount})`), ...C.FEE_PERIODS.map((p) => p.name + ' বাকি'), 'মোট প্রাপ্য', 'মোট জমা', 'মোট বাকি'],
        ...rows.map((r) => { const p = fees.payments[r.s.id] || {}; return [Number(r.s.roll), r.s.name, C.discountLabel(fees.discounts[r.s.id]), ...fees.items.map((it) => (p[it.key] == null ? '' : p[it.key])), ...r.f.periods.map((x) => x.balance), r.f.due, r.f.paid, r.f.balance]; })] }]);
    }

    // ===== পরীক্ষার রুটিন (সব কিছু এডিটযোগ্য) =====
    const rExam = () => ui.rExam || (ui.fPeriod === 'all' ? 'annual' : ui.fPeriod);
    async function currentRoutine() {
      const rt = await store.getRoutine(ui.fYear, rExam());
      if (!rt) { toast(`${C.examName(rExam())} ${ui.fYear} এর রুটিন এখনো তৈরি হয়নি। "পরীক্ষার রুটিন" ট্যাবে তৈরি করুন।`, true); return null; }
      return rt;
    }
    async function drawRoutine() {
      let rt = await store.getRoutine(ui.fYear, rExam());
      const isNew = !rt;
      if (!rt) rt = { title: `${C.examName(rExam())} - ${ui.fYear} খ্রিঃ`, shifts: [{ name: 'প্রথম শিফ্ট', time: '(সকাল 08:00 - 10:00 পর্যন্ত)', classIds: catalog.classes.map((c) => c.id) }], rows: [{ date: '', cells: {} }], letter: '', resultDate: '', feePeriod: rExam() };
      $('#fBody').innerHTML = `<section class="card"><div class="toolbar" style="justify-content:space-between;align-items:flex-end">
          <div class="toolbar"><label class="fld w-lg"><span>পরীক্ষা</span><select id="rExam">${examOpts(rExam())}</select></label>${isNew ? '<span class="chip chip-gold" style="align-self:center">নতুন রুটিন</span>' : ''}</div>
          <div class="toolbar"><button class="btn btn-ghost" id="rSample" type="button">মাদ্রাসার নমুনা রুটিন বসান</button><button class="btn btn-green" id="rSave" type="button">${ic('save')}রুটিন সংরক্ষণ</button></div></div>
        <div class="grid-2" style="gap:12px;margin-top:12px"><label class="fld"><span>শিরোনাম</span><input id="rTitle" value="${esc(rt.title || '')}"></label>
          <div class="grid-2" style="gap:12px"><label class="fld"><span>ফলাফল ঘোষণার সম্ভাব্য তারিখ</span><input id="rResult" value="${esc(rt.resultDate || '')}"></label><label class="fld"><span>নিচের বকেয়া টেবিলে কোন হিসাব</span><select id="rFeePer">${opt(C.FEE_PERIODS.map((p) => ({ v: p.key, t: p.name })).concat([{ v: 'all', t: 'সারা বছর' }]), rt.feePeriod || rExam())}</select></label></div></div>
        <h3 style="margin-top:16px">শিফট ও শ্রেণি</h3><div id="rShifts"></div><button class="btn btn-sm btn-ghost" id="rAddShift" type="button">${ic('plus')}শিফট যোগ</button>
        <h3 style="margin-top:16px">রুটিন (তারিখ, বিষয় — সব ঘর এডিট করা যায়)</h3><div class="tbl-wrap" id="rGrid"></div>
        <div class="toolbar" style="margin-top:10px"><button class="btn btn-sm btn-ghost" id="rAddRow" type="button">${ic('plus')}নতুন তারিখ (সারি) যোগ</button></div>
        <label class="fld" style="margin-top:14px"><span>অভিভাবকদের জন্য বার্তা</span><textarea id="rLetter" rows="5">${esc(rt.letter || '')}</textarea></label></section>
        <section class="card"><h2>প্রিন্ট</h2><p>প্রতিটি শিক্ষার্থীর জন্য আলাদা পাতা: উপরে নাম, পিতার নাম, শ্রেণি ও রোল, মাঝে সব শ্রেণির রুটিন (তার শ্রেণি হাইলাইট করা), নিচে তার বকেয়া হিসাব।</p>
        <div class="toolbar"><button class="btn btn-dark" id="rPrintClass" type="button">${ic('print')}${esc(className(ui.fClass))} — সবার রুটিন + বকেয়া (${students.length} পাতা)</button><button class="btn btn-ghost" id="rPrintBlank" type="button">${ic('print')}শুধু রুটিন (নাম ছাড়া)</button><button class="btn btn-ghost" id="rPreview" type="button">আগে দেখুন</button></div></section>
        <section class="card" id="rPrev" hidden><div class="rt-scale"></div></section>`;
      const read = () => {
        rt.title = $('#rTitle').value.trim(); rt.resultDate = $('#rResult').value.trim(); rt.feePeriod = $('#rFeePer').value; rt.letter = $('#rLetter').value;
        rt.shifts.forEach((sh, i) => { sh.name = $(`[data-shn="${i}"]`).value.trim(); sh.time = $(`[data-sht="${i}"]`).value.trim(); sh.classIds = $$(`[data-shc="${i}"]:checked`, v).map((el) => el.value); });
        rt.rows.forEach((r, i) => { r.date = $(`[data-rd="${i}"]`).value.trim(); $$(`[data-rc^="${i}|"]`, v).forEach((el) => { const cid = el.dataset.rc.split('|')[1]; if (el.value.trim()) r.cells[cid] = el.value.trim(); else delete r.cells[cid]; }); });
      };
      const draw = () => {
        $('#rShifts').innerHTML = rt.shifts.map((sh, i) => `<div class="rt-shift-row"><label class="fld w-md"><span>শিফটের নাম</span><input data-shn="${i}" value="${esc(sh.name)}"></label><label class="fld w-lg"><span>সময়</span><input data-sht="${i}" value="${esc(sh.time)}"></label><div class="checks">${catalog.classes.map((c) => `<label><input type="checkbox" data-shc="${i}" value="${c.id}" ${(sh.classIds || []).includes(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('')}</div><button class="btn btn-sm btn-red" data-shdel="${i}" type="button" ${rt.shifts.length > 1 ? '' : 'disabled'}>মুছুন</button></div>`).join('');
        const cols = []; rt.shifts.forEach((sh) => (sh.classIds || []).forEach((cid) => { if (!cols.includes(cid)) cols.push(cid); }));
        $('#rGrid').innerHTML = `<table class="tbl rt-edit"><thead><tr><th>তারিখ ও বার</th>${cols.map((cid) => `<th>${esc(className(cid))}</th>`).join('')}<th></th></tr></thead><tbody>${rt.rows.map((r, i) => `<tr><td><input class="cell cell-w" data-rd="${i}" value="${esc(r.date)}" placeholder="29/08/26 (শনিবার)"></td>${cols.map((cid) => `<td><input class="cell cell-w" data-rc="${i}|${cid}" value="${esc((r.cells || {})[cid] || '')}"></td>`).join('')}<td><button class="btn btn-sm btn-red" data-rdel="${i}" type="button" aria-label="সারি মুছুন">✕</button></td></tr>`).join('')}</tbody></table>`;
        $$('[data-shc]', v).forEach((el) => { el.onchange = () => { read(); draw(); }; });
        $$('[data-shdel]', v).forEach((b) => { b.onclick = () => { read(); rt.shifts.splice(Number(b.dataset.shdel), 1); draw(); }; });
        $$('[data-rdel]', v).forEach((b) => { b.onclick = () => { read(); rt.rows.splice(Number(b.dataset.rdel), 1); draw(); }; });
      };
      draw();
      $('#rExam').onchange = () => { ui.rExam = $('#rExam').value; drawRoutine(); };
      $('#rAddShift').onclick = () => { read(); rt.shifts.push({ name: 'নতুন শিফট', time: '', classIds: [] }); draw(); };
      $('#rAddRow').onclick = () => { read(); rt.rows.push({ date: '', cells: {} }); draw(); const last = $(`[data-rd="${rt.rows.length - 1}"]`); if (last) last.focus(); };
      $('#rSample').onclick = async () => { if (!(await confirmBox('নমুনা রুটিন বসাবেন?', 'মাদ্রাসার দ্বিতীয় সাময়িক পরীক্ষার রুটিনের মতো করে সব ঘর পূরণ হবে। পরে সব কিছু বদলানো যাবে।', 'বসিয়ে দিন'))) return; rt = U.sampleRoutine(ui.fYear); $('#rTitle').value = rt.title; $('#rResult').value = rt.resultDate; $('#rLetter').value = rt.letter; $('#rFeePer').value = rt.feePeriod; draw(); };
      $('#rSave').onclick = async () => { read(); try { await store.saveRoutine(ui.fYear, rExam(), rt); toast('রুটিন সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } };
      $('#rPrintClass').onclick = () => { read(); if (!students.length) return toast('এই শ্রেণিতে কোনো শিক্ষার্থী নেই।', true); printHtml(students.map((s) => routineHtml(rt, s, feeFor(s, rt.feePeriod), s.classId)).join('')); };
      $('#rPrintBlank').onclick = () => { read(); printHtml(routineHtml(rt, null, null, null)); };
      $('#rPreview').onclick = () => { read(); const box = $('#rPrev'); box.hidden = false; const s0 = students[0]; box.querySelector('.rt-scale').innerHTML = routineHtml(rt, s0 || null, s0 ? feeFor(s0, rt.feePeriod) : null, s0 ? s0.classId : null); box.scrollIntoView({ behavior: 'smooth' }); };
    }

    $$('[data-tab]', v).forEach((b) => { b.onclick = () => { ui.fTab = b.dataset.tab; go('fees'); }; });
    $('#feClass').onchange = load; $('#feYear').onchange = load; $('#fPeriod').onchange = load;
    await load();
  };

  // ---------- আইডি কার্ড ----------
  // কার্ডের তথ্য শিক্ষার্থীর তালিকা থেকে নিজে আসে; ভুল হলে "তথ্য" থেকে শুধু কার্ডের জন্য বদলানো যায়।
  // "কার্ড এডিট" থেকে নকশা (নাম, লেখার সাইজ, রং, QR) বদলানো যায়।
  const cardCfg = () => Object.assign({}, ID.DEF, settings.card || {});
  function cardData(s, photo, logo) {
    const o = s.card || {};
    return {
      name: o.name || s.nameEn || s.name, id: o.id || s.reg, father: o.father || s.fatherEn || s.father || '', cls: o.cls || classEn(s.classId), roll: o.roll || s.roll,
      phone: o.phone || s.phone || '', address: o.address || s.address || '', year: s.year, photo: photo || '', logo,
      school: settings.nameEn || settings.name, schoolAddress: settings.addressEn || settings.address, schoolPhone: settings.phone || '', schoolEmail: settings.email || '', sign: images.sign || '',
      website: location.origin && location.origin.startsWith('http') ? location.origin : '',
      qr: `${o.name || s.nameEn || s.name}\nID: ${o.id || s.reg}\nClass: ${o.cls || classEn(s.classId)}  Roll: ${o.roll || s.roll}\nMobile: ${o.phone || s.phone || ''}\n${settings.nameEn || settings.name}`
    };
  }
  VIEWS.idcards = async (v) => {
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld w-md"><span>শ্রেণি</span><select id="iClass">${classOpts(ui.iClass || catalog.classes[0].id, catalog.classes)}</select></label>
      <label class="fld w-sm"><span>সাল</span><select id="iYear">${yearOpts(ui.iYear || settings.activeYear)}</select></label>
      <label class="fld grow"><span>নাম / রোল দিয়ে খুঁজুন</span><input id="iFind" placeholder="নাম অথবা রোল"></label>
      <label style="align-self:center"><input type="checkbox" id="iBg" ${ui.iBg === false ? '' : 'checked'}> ছবির ব্যাকগ্রাউন্ড সাদা করুন</label>
    </div>
    <div class="toolbar" style="margin-top:12px"><button class="btn btn-green" id="iZip" type="button">${ic('down')}এই শ্রেণির কার্ড (Illustrator ZIP)</button><button class="btn btn-dark" id="iZipAll" type="button">${ic('down')}সব শ্রেণির কার্ড (ZIP)</button><button class="btn btn-ghost" id="iPrint" type="button">${ic('print')}প্রিন্ট / PDF</button>${isP() ? `<button class="btn btn-gold" id="iDesign" type="button">${ic('edit')}কার্ড এডিট</button>` : ''}</div>
    <p class="muted" style="margin:10px 0 0">কার্ডের মাপ 2.13 × 3.39 ইঞ্চি, চারপাশে 0.125 ইঞ্চি bleed। ZIP ফাইলে প্রতিটি শিক্ষার্থীর জন্য আলাদা Illustrator ফাইল (সামনে ও পেছন পাশাপাশি, লেয়ার আলাদা) এবং পুরো শ্রেণির সব কার্ড একসাথে একটি ফাইল থাকে।</p></section>
    <section class="card"><div id="iStat" class="muted"></div><div class="id-grid" id="iGrid"></div></section>`;
    let list = [], photos = {};
    const logo0 = () => images.logo || 'assets/logo.webp';
    const draw = () => {
      const q = C.toEn($('#iFind').value).toLowerCase();
      const rows = list.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.nameEn || '').toLowerCase().includes(q) || C.toEn(s.roll) === q);
      const noPhoto = list.filter((s) => !photos[s.id]).length, noEn = list.filter((s) => !s.nameEn).length;
      $('#iStat').innerHTML = `মোট ${list.length} জন · ছবি বাকি <b>${noPhoto}</b> জন${noEn ? ` · ইংরেজি নাম বাকি <b>${noEn}</b> জন` : ''}`;
      const cfg = cardCfg();
      $('#iGrid').innerHTML = rows.length ? rows.map((s) => { const d = cardData(s, photos[s.id], logo0()); return `<div class="id-item"><div class="id-pair">${ID.previewSvg(d, 'front', cfg)}${ID.previewSvg(d, 'back', cfg)}</div>
        <div class="id-meta">${photos[s.id] ? '' : '<span class="chip chip-red">ছবি নেই</span>'}${s.nameEn ? '' : '<span class="chip chip-gold">ইংরেজি নাম নেই</span>'}${s.card && Object.keys(s.card).length ? '<span class="chip chip-gray">কার্ডে আলাদা তথ্য</span>' : ''}</div>
        <div class="row-actions"><button class="btn btn-sm btn-green" data-cam="${s.id}">${ic('camera')}ছবি তুলুন</button><label class="btn btn-sm ${photos[s.id] ? 'btn-done' : 'btn-ghost'} file-btn">${photos[s.id] ? '✓ ছবি আপলোড হয়েছে' : ic('upload') + 'আপলোড'}<input type="file" accept="image/*" data-up="${s.id}" hidden></label><button class="btn btn-sm btn-ghost" data-info="${s.id}">${ic('edit')}তথ্য</button><button class="btn btn-sm btn-ghost" data-pr="${s.id}">${ic('print')}প্রিন্ট</button>${photos[s.id] ? `<button class="btn btn-sm btn-ghost" data-rm="${s.id}" aria-label="ছবি মুছুন">✕</button>` : ''}</div></div>`; }).join('') : `<p class="empty">${esc(className($('#iClass').value))} এ ${esc($('#iYear').value)} সালের কোনো শিক্ষার্থী নেই।</p>`;
      $$('[data-cam]', v).forEach((b) => { b.onclick = () => camera(list.find((s) => s.id === b.dataset.cam)); });
      $$('[data-up]', v).forEach((inp) => { inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { await setPhoto(list.find((s) => s.id === inp.dataset.up), await ID.fileToUrl(f)); } catch (e) { fail(e); } }; });
      $$('[data-info]', v).forEach((b) => { b.onclick = () => info(list.find((s) => s.id === b.dataset.info)); });
      $$('[data-pr]', v).forEach((b) => { b.onclick = () => { const s = list.find((x) => x.id === b.dataset.pr); const cfg = cardCfg(); const d = cardData(s, photos[s.id], logo0()); printHtml(`<div class="id-print"><div class="id-print-card">${ID.previewSvg(d, 'front', cfg)}</div><div class="id-print-card">${ID.previewSvg(d, 'back', cfg)}</div></div>`); }; });
      $$('[data-rm]', v).forEach((b) => { b.onclick = async () => { if (!(await confirmBox('ছবি মুছবেন?', 'এই শিক্ষার্থীর কার্ডের ছবি মুছে যাবে।', 'মুছে ফেলুন'))) return; try { await store.savePhoto(b.dataset.rm, ''); delete photos[b.dataset.rm]; draw(); } catch (e) { fail(e); } }; });
    };
    const load = async () => {
      ui.iClass = $('#iClass').value; ui.iYear = $('#iYear').value;
      list = (await store.listStudents({ year: ui.iYear, classId: ui.iClass })).sort((a, b) => C.num(a.roll) - C.num(b.roll));
      photos = await store.getPhotos(list.map((s) => s.id));
      draw();
      if (!window.qrcode && await ID.ensureQR()) draw(); // QR কোড লাইব্রেরি লোড হলে আবার আঁকা
    };
    // ছবি প্রস্তুত: বর্গাকার করে কাটা → ব্যাকগ্রাউন্ড সাদা → সংরক্ষণ
    async function setPhoto(s, src) {
      toast('ছবি প্রস্তুত হচ্ছে…');
      let url = await ID.portrait(src, 420);
      if ($('#iBg').checked) {
        try { url = await ID.whiteBackground(url); } catch (e) { toast('ব্যাকগ্রাউন্ড সাদা করা যায়নি (ইন্টারনেট সংযোগ দেখুন)। মূল ছবিটি বসানো হলো।', true); }
      }
      await store.savePhoto(s.id, url); photos[s.id] = url; draw(); toast(`${s.nameEn || s.name} এর ছবি বসানো হয়েছে`);
    }
    // ক্যামেরা: কম্পিউটারের ওয়েবক্যাম বা মোবাইলের ক্যামেরা
    async function camera(s) {
      let stream = null, facing = 'user';
      const d = $('#dlg'), f = $('#dlgForm');
      d.style.width = 'min(560px, calc(100vw - 24px))';
      f.innerHTML = `<h2>${esc(s.nameEn || s.name)} — ছবি তুলুন</h2><div class="cam-box"><video id="camV" autoplay playsinline muted></video><div class="cam-guide" aria-hidden="true"></div></div><p class="muted" id="camMsg">মুখ মাঝখানের দাগের ভেতরে রাখুন, পেছনে হালকা রঙের দেয়াল হলে ভালো হয়।</p>
        <div class="dlg-actions"><button type="button" class="btn btn-ghost" id="camClose">বাতিল</button><button type="button" class="btn btn-ghost" id="camFlip">ক্যামেরা বদলান</button><label class="btn btn-ghost file-btn">${ic('upload')}ফাইল থেকে<input type="file" accept="image/*" capture="user" id="camFile" hidden></label><button type="button" class="btn btn-green" id="camShot">${ic('camera')}ছবি তুলুন</button></div>`;
      const stop = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
      const close = () => { stop(); if (d.open) d.close(); };
      const start = async () => {
        stop();
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }); $('#camV').srcObject = stream; }
        catch (e) { $('#camMsg').textContent = 'ক্যামেরা চালু করা যায়নি। ব্রাউজারে ক্যামেরার অনুমতি দিন, অথবা "ফাইল থেকে" বাটনে মোবাইলের ক্যামেরা দিয়ে ছবি তুলুন।'; $('#camShot').disabled = true; }
      };
      d.onclose = stop;
      $('#camClose').onclick = close;
      $('#camFlip').onclick = () => { facing = facing === 'user' ? 'environment' : 'user'; $('#camShot').disabled = false; start(); };
      $('#camFile').onchange = async () => { const file = $('#camFile').files[0]; if (!file) return; close(); try { await setPhoto(s, await ID.fileToUrl(file)); } catch (e) { fail(e); } };
      $('#camShot').onclick = async () => {
        const vid = $('#camV'); if (!vid.videoWidth) return;
        const cv = document.createElement('canvas'); cv.width = vid.videoWidth; cv.height = vid.videoHeight;
        const g = cv.getContext('2d'); if (facing === 'user') { g.translate(cv.width, 0); g.scale(-1, 1); } g.drawImage(vid, 0, 0);
        const src = cv.toDataURL('image/jpeg', 0.92); close();
        try { await setPhoto(s, src); } catch (e) { fail(e); }
      };
      d.showModal(); start();
    }
    // কার্ডের তথ্য: ইংরেজি নাম, পিতার নাম, মোবাইল, ঠিকানা আসল তালিকায় সংরক্ষণ হয়;
    // আইডি, রোল, শ্রেণি বদলালে শুধু কার্ডে বদলায় (রেজিস্ট্রেশন নম্বর ঠিক থাকে)
    async function info(s) {
      const d0 = cardData(s, '', '');
      const d = await dialog('আইডি কার্ডের তথ্য এডিট', `<p class="muted">${esc(s.name)} · আসল রোল ${esc(s.roll)} · রেজিস্ট্রেশন ${esc(s.reg)}</p>
        <div class="grid-2" style="gap:12px">
        <label class="fld"><span>Name (কার্ডে)</span><input id="cName" lang="en" value="${esc(d0.name)}"></label>
        <label class="fld"><span>ID Number</span><input id="cId" value="${esc(d0.id)}"></label>
        <label class="fld"><span>Father's name</span><input id="cFather" lang="en" value="${esc(d0.father)}"></label>
        <label class="fld"><span>Roll</span><input id="cRoll" value="${esc(d0.roll)}"></label>
        <label class="fld"><span>Class</span><input id="cCls" lang="en" value="${esc(d0.cls)}"></label>
        <label class="fld"><span>Mobile</span><input id="cPhone" inputmode="tel" value="${esc(d0.phone)}"></label>
        <label class="fld" style="grid-column:1/-1"><span>Address</span><input id="cAddr" lang="en" value="${esc(d0.address)}"></label></div>
        <label><input type="checkbox" id="cReset"> কার্ডের আলাদা তথ্য মুছে শিক্ষার্থীর তালিকার তথ্য ফিরিয়ে আনুন</label>`, undefined, false, true);
      if (!d) return;
      try {
        const real = { nameEn: d.cName.trim(), fatherEn: d.cFather.trim(), phone: C.toEn(d.cPhone), address: d.cAddr.trim() };
        const card = {};
        if (!d.cReset) {
          if (d.cId.trim() && d.cId.trim() !== String(s.reg)) card.id = d.cId.trim();
          if (d.cRoll.trim() && d.cRoll.trim() !== String(s.roll)) card.roll = d.cRoll.trim();
          if (d.cCls.trim() && d.cCls.trim() !== classEn(s.classId)) card.cls = d.cCls.trim();
        }
        real.card = card;
        await store.updateStudentCard(s.id, real); Object.assign(s, real); draw(); toast('কার্ডের তথ্য সংরক্ষণ হয়েছে');
      } catch (e) { fail(e); }
    }
    // কার্ডের নকশা এডিট (লাইভ প্রিভিউসহ): লেখা, প্রতিটি অংশের অবস্থান/মাপ, প্রতিটি রঙিন আকৃতি
    async function design() {
      const c = JSON.parse(JSON.stringify(cardCfg())); c.off = c.off || {}; c.shapes = c.shapes || {};
      const sample = list[0] ? cardData(list[0], photos[list[0].id], logo0()) : cardData({ name: 'Student Name', reg: '1001', roll: '1', classId: ui.iClass, year: ui.iYear, father: 'Father Name' }, '', logo0());
      const defLines = String(settings.nameEn || settings.name).toUpperCase();
      await ID.ensureQR();
      const num = (id, label, val, min, max, step) => `<label class="fld"><span>${label}</span><input id="${id}" type="number" step="${step}" min="${min}" max="${max}" value="${esc(val)}"></label>`;
      const slider = (id, label, val, min, max, step) => `<label class="sl"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${esc(val)}"><output>${esc(val)}</output></label>`;
      const colorOf = (k) => (c.shapes[k] && c.shapes[k].color) || c[ID.SHAPES[k].c];
      const body = `<div class="design-grid"><div class="design-fields">
        <div class="seg" role="tablist"><button type="button" class="btn btn-sm btn-dark" data-seg="t">লেখা</button><button type="button" class="btn btn-sm btn-ghost" data-seg="p">অবস্থান ও মাপ</button><button type="button" class="btn btn-sm btn-ghost" data-seg="s">রঙিন আকৃতি</button></div>
        <div data-pane="t" class="pane">
          <label class="fld"><span>মাদ্রাসার নাম (কার্ডে) — প্রতি লাইন আলাদা</span><textarea id="dLines" rows="2" placeholder="${esc(defLines)}">${esc(c.schoolLines)}</textarea></label>
          <div class="grid-3" style="gap:10px">${num('dSchool', 'নামের সাইজ', c.schoolSize || 3.2, 1.5, 5, 0.05)}${num('dAddrSize', 'ঠিকানার সাইজ', c.addrSize, 1.2, 4, 0.05)}<label class="fld"><span>নাম ও ঠিকানার রং</span><input id="dSchoolColor" type="color" value="${esc(c.schoolColor)}"></label></div>
          <label class="fld"><span>ঠিকানার লাইন</span><input id="dAddr" value="${esc(c.addrLine)}" placeholder="Maheshkhali, Cox's Bazar"></label>
          <div class="grid-2" style="gap:10px">${num('dName', 'শিক্ষার্থীর নামের সাইজ', c.nameSize || 3.9, 2, 6, 0.05)}<label class="fld"><span>নামের মোটা ভাব</span><select id="dWeight">${opt([{ v: 300, t: 'পাতলা' }, { v: 400, t: 'স্বাভাবিক' }, { v: 600, t: 'হালকা বোল্ড' }, { v: 700, t: 'বোল্ড' }], c.nameWeight)}</select></label></div>
          <div class="grid-2" style="gap:10px"><label class="fld"><span>নামের ফন্ট</span><select id="dFont">${opt([{ v: 'impact', t: 'Impact (চওড়া)' }, { v: 'arial', t: 'Arial' }, { v: 'serif', t: 'Georgia / Times' }], c.nameFont)}</select></label><label class="fld"><span>নামের রং</span><input id="dNameColor" type="color" value="${esc(c.nameColor)}"></label></div>
          <div class="grid-3" style="gap:10px">${num('dInfo', 'তথ্যের সাইজ', c.infoSize, 1.6, 3.5, 0.05)}${num('dContact', 'পেছনের যোগাযোগের সাইজ (গুণ)', c.contactSize, 0.6, 1.6, 0.05)}${num('dFooterSize', 'নিচের লেখার সাইজ', c.footerSize, 1.5, 5, 0.05)}</div>
          <div class="grid-2" style="gap:10px"><label class="fld"><span>নিচের লেখা</span><input id="dFooter" value="${esc(c.footer)}"></label><label class="fld"><span>স্বাক্ষরের নিচের লেখা</span><input id="dSign" value="${esc(c.signLabel)}"></label></div>
          <p style="margin:6px 0 0;font-weight:700">পেছনের দিক</p>
          <div class="grid-2" style="gap:10px"><label class="fld"><span>মোবাইল নম্বর</span><input id="dBPhone" value="${esc(c.backPhone)}" placeholder="${esc(settings.phone || '')}"></label><label class="fld"><span>ইমেইল</span><input id="dBEmail" value="${esc(c.backEmail)}" placeholder="${esc(settings.email || '')}"></label></div>
          <label class="fld"><span>ঠিকানা (প্রতি লাইন আলাদা)</span><textarea id="dBAddr" rows="2" placeholder="${esc(settings.addressEn || '')}">${esc(c.backAddress)}</textarea></label>
          ${isP() ? `<div class="img-row"><div class="img-thumb" id="dSignTh" style="background-image:url('${esc(images.sign || '')}')"></div><label class="fld grow"><span>প্রিন্সিপালের স্বাক্ষর (ছবি)</span><input type="file" accept="image/*" id="dSignFile"></label></div>` : ''}
          <label class="fld"><span>QR কোডে কী থাকবে</span><select id="dQr">${opt([{ v: 'student', t: 'শিক্ষার্থীর তথ্য (নাম, আইডি, শ্রেণি, রোল, মোবাইল)' }, { v: 'website', t: 'ওয়েবসাইটের লিংক' }, { v: 'custom', t: 'নিজের লেখা' }, { v: 'none', t: 'QR কোড দেখাবে না' }], c.qr)}</select></label>
          <label class="fld"><span>নিজের লেখা (QR)</span><input id="dQrText" value="${esc(c.qrCustom)}"></label>
        </div>
        <div data-pane="p" class="pane" hidden><p class="muted" style="margin:0">উপরে-নিচে / ডানে-বামে সরান (mm) আর বড়-ছোট করুন। প্রিভিউ সাথে সাথে বদলাবে।</p>
          ${Object.keys(ID.ITEMS).map((k) => { const o = Object.assign({ dx: 0, dy: 0, s: 1 }, c.off[k] || {}); return `<div class="pos-row"><b>${ID.ITEMS[k]}</b>${slider('o_dy_' + k, 'উপরে ↕ নিচে', o.dy, -20, 20, 0.2)}${slider('o_dx_' + k, 'বামে ↔ ডানে', o.dx, -20, 20, 0.2)}${slider('o_s_' + k, 'মাপ', o.s, 0.5, 1.8, 0.02)}</div>`; }).join('')}
        </div>
        <div data-pane="s" class="pane" hidden><p class="muted" style="margin:0">কার্ডের প্রতিটি রঙিন আকৃতি আলাদাভাবে রং, অবস্থান ও মাপ বদলানো যায়।</p>
          ${Object.keys(ID.SHAPES).map((k) => { const o = Object.assign({ dx: 0, dy: 0, s: 1, hide: false }, c.shapes[k] || {}); return `<div class="pos-row"><b><input type="color" id="s_c_${k}" value="${esc(colorOf(k))}" aria-label="রং"> ${ID.SHAPES[k].n}</b>${slider('s_dy_' + k, 'উপরে ↕ নিচে', o.dy, -30, 30, 0.2)}${slider('s_dx_' + k, 'বামে ↔ ডানে', o.dx, -30, 30, 0.2)}${slider('s_s_' + k, 'মাপ', o.s, 0.5, 1.8, 0.02)}<label><input type="checkbox" id="s_h_${k}" ${o.hide ? 'checked' : ''}> লুকান</label></div>`; }).join('')}
        </div>
        <label><input type="checkbox" id="dReset"> সব কিছু শুরুর নকশায় ফিরিয়ে আনুন</label></div>
        <div class="design-prev" id="dPrev"></div></div>`;
      let result = null;
      const readCfg = (f) => {
        const g = (id) => $('#' + id, f);
        const o = { schoolLines: g('dLines').value.trim(), schoolSize: Number(g('dSchool').value) || 0, addrSize: Number(g('dAddrSize').value) || 2.35, schoolColor: g('dSchoolColor').value, addrLine: g('dAddr').value.trim(), nameSize: Number(g('dName').value) || 0, nameWeight: Number(g('dWeight').value) || 400, nameFont: g('dFont').value, nameColor: g('dNameColor').value, infoSize: Number(g('dInfo').value) || 2.55, contactSize: Number(g('dContact').value) || 1, footerSize: Number(g('dFooterSize').value) || 2.9, footer: g('dFooter').value, signLabel: g('dSign').value, backPhone: g('dBPhone').value.trim(), backEmail: g('dBEmail').value.trim(), backAddress: g('dBAddr').value.trim(), qr: g('dQr').value, qrCustom: g('dQrText').value, navy: c.navy, blue: c.blue, teal: c.teal, off: {}, shapes: {} };
        Object.keys(ID.ITEMS).forEach((k) => { const v2 = { dy: Number(g('o_dy_' + k).value), dx: Number(g('o_dx_' + k).value), s: Number(g('o_s_' + k).value) }; if (v2.dy || v2.dx || v2.s !== 1) o.off[k] = v2; });
        Object.keys(ID.SHAPES).forEach((k) => { const v2 = { dy: Number(g('s_dy_' + k).value), dx: Number(g('s_dx_' + k).value), s: Number(g('s_s_' + k).value), hide: g('s_h_' + k).checked }; const col = g('s_c_' + k).value; if (col.toLowerCase() !== String(c[ID.SHAPES[k].c]).toLowerCase()) v2.color = col; if (v2.dy || v2.dx || v2.s !== 1 || v2.hide || v2.color) o.shapes[k] = v2; });
        return o;
      };
      const d = await dialog('আইডি কার্ড এডিট (নকশা)', body, 'সংরক্ষণ করুন', false, true, (f) => {
        const paint = () => { $$('.sl', f).forEach((l) => { l.querySelector('output').textContent = l.querySelector('input').value; }); const cfg = $('#dReset', f).checked ? ID.DEF : readCfg(f); result = cfg; $('#dPrev', f).innerHTML = ID.previewSvg(sample, 'front', cfg) + ID.previewSvg(sample, 'back', cfg); };
        $$('[data-seg]', f).forEach((b) => { b.onclick = () => { $$('[data-seg]', f).forEach((x) => { x.className = 'btn btn-sm ' + (x === b ? 'btn-dark' : 'btn-ghost'); }); $$('[data-pane]', f).forEach((pn) => { pn.hidden = pn.dataset.pane !== b.dataset.seg; }); }; });
        f.addEventListener('input', paint); f.addEventListener('change', paint); paint();
        const sf = $('#dSignFile', f);
        if (sf) sf.addEventListener('change', async () => { try { const url = await readImage(sf.files[0], 500, 'sign'); if (!url) return; await store.saveImages({ sign: url }); images.sign = url; sample.sign = url; $('#dSignTh', f).style.backgroundImage = `url('${url}')`; paint(); toast('স্বাক্ষর সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } });
      });
      if (!d) return;
      const cfg = d.dReset ? {} : result;
      try { await store.saveSettings({ card: cfg }); settings.card = cfg; draw(); toast('কার্ডের নকশা সংরক্ষণ হয়েছে'); } catch (e) { fail(e); }
    }
    // Illustrator ফাইল: প্রতি শিক্ষার্থী আলাদা (সামনে + পেছন, bleed সহ) ও পুরো শ্রেণি একসাথে
    const logoPng = () => ID.toPng(logo0()).catch(() => '');
    async function classFiles(classId, year, logo, folder) {
      const ss = (await store.listStudents({ year, classId })).sort((a, b) => C.num(a.roll) - C.num(b.roll));
      if (!ss.length) return [];
      await ID.ensureQR();
      const ph = await store.getPhotos(ss.map((s) => s.id));
      const cfg = cardCfg(); const cname = safeName(classEn(classId));
      const datas = ss.map((s) => cardData(s, ph[s.id], logo));
      const files = [[`${folder}00 - All ID Cards - ${cname} - ${year}.svg`, ID.sheetSvg(datas, `${settings.nameEn} — ${classEn(classId)} ${year} ID Cards`, cfg)]];
      datas.forEach((d) => files.push([`${folder}Roll ${String(d.roll).padStart(2, '0')} - ${safeName(d.name)}.svg`, ID.studentSvg(d, cfg)]));
      return files;
    }
    async function zipDownload(files, name) {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
        const zip = new window.JSZip(); files.forEach((f) => zip.file(f[0], f[1]));
        zip.file('README - Illustrator.txt', 'Open any .svg file in Adobe Illustrator (File > Open).\r\nEach student file has Front and Back side by side, each 2.13 x 3.39 in with 0.125 in bleed (red line = bleed, blue line = trim).\r\nTo make 2 artboards: select the two red bleed rectangles, then Object > Artboards > Convert to Artboards.\r\nEvery side is a separate group/layer (Background, Content, Trim), so all text and shapes stay editable.\r\nSave as .ai from File > Save As.\r\n');
        download(name, await zip.generateAsync({ type: 'blob' }));
      } catch (e) { files.forEach((f, i) => setTimeout(() => download(f[0].split('/').pop(), f[1], 'image/svg+xml'), i * 600)); }
    }
    $('#iZip').onclick = async () => {
      const b = $('#iZip'); b.disabled = true;
      try { const files = await classFiles(ui.iClass, ui.iYear, await logoPng(), ''); if (!files.length) return toast('এই শ্রেণিতে কোনো শিক্ষার্থী নেই।', true); await zipDownload(files, `ID Cards - ${safeName(classEn(ui.iClass))} - ${ui.iYear}.zip`); toast(`${files.length - 1} জনের কার্ড ডাউনলোড হচ্ছে`); } catch (e) { fail(e); } finally { b.disabled = false; }
    };
    $('#iZipAll').onclick = async () => {
      const b = $('#iZipAll'); b.disabled = true; toast('সব শ্রেণির কার্ড তৈরি হচ্ছে…');
      try {
        const logo = await logoPng(); let files = [];
        for (const c of catalog.classes) files = files.concat(await classFiles(c.id, ui.iYear, logo, `${safeName(classEn(c.id))}/`));
        if (!files.length) return toast(`${ui.iYear} সালে কোনো শিক্ষার্থী নেই।`, true);
        await zipDownload(files, `ID Cards - All Classes - ${ui.iYear}.zip`); toast('সব শ্রেণির কার্ড ডাউনলোড হচ্ছে');
      } catch (e) { fail(e); } finally { b.disabled = false; }
    };
    $('#iPrint').onclick = () => {
      const cfg = cardCfg();
      printHtml(`<div class="id-print">${list.map((s) => { const d = cardData(s, photos[s.id], logo0()); return `<div class="id-print-card">${ID.previewSvg(d, 'front', cfg)}</div><div class="id-print-card">${ID.previewSvg(d, 'back', cfg)}</div>`; }).join('')}</div>`);
    };
    if ($('#iDesign')) $('#iDesign').onclick = design;
    $('#iClass').onchange = load; $('#iYear').onchange = load; $('#iFind').oninput = draw;
    $('#iBg').onchange = () => { ui.iBg = $('#iBg').checked; };
    await load();
  };

  // ---------- নোটিশ ----------
  VIEWS.notices = async (v) => {
    v.innerHTML = `<section class="card"><h2>নতুন নোটিশ</h2>
      <div class="toolbar"><label class="fld grow"><span>শিরোনাম</span><input id="nTitle" placeholder="নোটিশের শিরোনাম"></label><label class="fld w-md"><span>তারিখ</span><input id="nDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></label></div>
      <label class="fld" style="margin-top:10px"><span>বিস্তারিত (ঐচ্ছিক)</span><textarea id="nBody" placeholder="নোটিশের বিস্তারিত লিখুন"></textarea></label>
      <div class="toolbar" style="margin-top:10px;align-items:center"><label><input type="checkbox" id="nPin"> গুরুত্বপূর্ণ (উপরে থাকবে)</label><button class="btn btn-dark" id="nAdd" type="button">${ic('plus')}নতুন নোটিশ</button></div></section>
      <section class="card"><h2>সব নোটিশ</h2><div id="nList"></div></section>`;
    let list = [];
    const load = async () => {
      list = await store.listNotices();
      $('#nList').innerHTML = list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="left">শিরোনাম</th><th>তারিখ</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead><tbody>${list.map((n) => `<tr><td class="left">${esc(n.title)}</td><td>${dmy(n.date)}</td><td>${n.pinned ? '<span class="chip chip-gold">গুরুত্বপূর্ণ</span>' : ''}</td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-ed="${n.id}">এডিট</button><button class="btn btn-sm btn-red" data-del="${n.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">কোনো নোটিশ নেই। উপরে নতুন নোটিশ লিখুন।</p>';
      $$('[data-ed]', v).forEach((b) => { b.onclick = async () => {
        const n = list.find((x) => x.id === b.dataset.ed);
        const d = await dialog('নোটিশ এডিট', `<label class="fld"><span>শিরোনাম</span><input id="t" value="${esc(n.title)}" required></label><label class="fld"><span>তারিখ</span><input id="dt" type="date" value="${esc(n.date || '')}"></label><label class="fld"><span>বিস্তারিত</span><textarea id="b">${esc(n.body || '')}</textarea></label><label><input type="checkbox" id="p" ${n.pinned ? 'checked' : ''}> গুরুত্বপূর্ণ</label>`);
        if (!d || !d.t.trim()) return;
        try { await store.saveNotice(Object.assign({}, n, { title: d.t.trim(), date: d.dt, body: d.b.trim(), pinned: d.p })); toast('সংরক্ষণ হয়েছে'); load(); } catch (e) { fail(e); }
      }; });
      $$('[data-del]', v).forEach((b) => { b.onclick = async () => { const n = list.find((x) => x.id === b.dataset.del); if (await confirmBox('নোটিশ মুছবেন?', `"${esc(n.title)}" নোটিশটি ওয়েবসাইট থেকে সরে যাবে।`, 'মুছে ফেলুন')) { try { await store.deleteNotice(n.id); toast('মুছে ফেলা হয়েছে'); load(); } catch (e) { fail(e); } } }; });
    };
    $('#nAdd').onclick = async () => {
      const title = $('#nTitle').value.trim(); if (!title) return toast('নোটিশের শিরোনাম লিখুন।', true);
      try { await store.saveNotice({ title, date: $('#nDate').value, body: $('#nBody').value.trim(), pinned: $('#nPin').checked }); $('#nTitle').value = ''; $('#nBody').value = ''; $('#nPin').checked = false; toast('নোটিশ প্রকাশিত হয়েছে'); load(); } catch (e) { fail(e); }
    };
    await load();
  };

  // ---------- ভর্তি বিজ্ঞপ্তি (ব্যানার এডিট) ----------
  const BANNER_ICONS = ['M2 5c3-1.5 6.5-1.5 9.5.5v15C8.5 18.5 5 18.5 2 20zm20 0c-3-1.5-6.5-1.5-9.5.5v15c3-2 6.5-2 9.5-.5z', 'm12 2 3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.5l-6.4 3.7 1.6-7.1L1.8 9.3 9 8.6z', 'M12 2c-1.5 2-4 3-4 6v1H6v13h12V9h-2V8c0-3-2.5-4-4-6zM9 13h6v7H9z', 'M7 12 2 7l5-5 5 5zm10 0-5-5 5-5 5 5zM4 14h16v2l-8 6-8-6z'];
  function bannerHtml(s, img) {
    const bg = img.bannerBg || img.campus || 'assets/campus.jpg';
    return `<div class="adm-banner"><div class="ab-bg" style="background-image:url('${esc(bg)}')"></div>
      <div class="ab-top"><img class="ab-logo" src="${esc(img.logo || 'assets/logo.webp')}" alt=""><div class="ab-titles"><span class="ab-tag">${esc(s.bTagline)}</span><h2 class="ab-name1">${esc(s.bName1)}</h2><p class="ab-name2">${esc(s.bName2)}</p></div><span></span></div>
      <div class="ab-mid"><div>${img.bannerKids ? `<img class="ab-kids" src="${esc(img.bannerKids)}" alt="">` : ''}</div><div class="ab-right">${s.bRibbon ? `<span class="ab-ribbon">${esc(s.bRibbon)}</span>` : ''}${s.bShowBadge !== false && s.bBadge ? `<span class="ab-badge">${esc(s.bBadge)}</span>` : ''}<div class="ab-cards">${[1, 2, 3, 4].filter((n) => s['bc' + n]).map((n) => `<div class="ab-card"><svg viewBox="0 0 24 24"><path d="${BANNER_ICONS[n - 1]}"/></svg><span>${esc(s['bc' + n])}</span></div>`).join('')}</div></div></div>
      <div class="ab-bottom"><span class="ab-strip">${esc(s.bStrip)}</span>${s.bPill ? `<span class="ab-pill">${esc(s.bPill)}</span>` : ''}</div></div>`;
  }
  VIEWS.banner = async (v) => {
    const s = settings;
    const f = (id, label, val) => `<label class="fld"><span>${label}</span><input id="${id}" value="${esc(val || '')}"></label>`;
    const imgRow = (k, label, max) => `<div class="img-row"><div class="img-thumb" id="th_${k}" style="background-image:url('${esc(images[k] || (k === 'bannerBg' ? images.campus || 'assets/campus.jpg' : ''))}')"></div><div class="fld grow"><span>${label}</span><input type="file" accept="image/*" id="fi_${k}" data-max="${max}"></div><button class="btn btn-sm btn-ghost" type="button" data-clear="${k}">মুছুন</button></div>`;
    v.innerHTML = `<section class="card"><h2>ভর্তি ব্যানারের প্রিভিউ</h2><div id="bPrev"></div><p class="muted">ব্যানারটি হোম পেজের "ভর্তি" অংশে দেখায়। নিচে লেখা বদলালে প্রিভিউ সাথে সাথে বদলাবে।</p></section>
      <div class="grid-2">
      <section class="card"><h2>ব্যানারের লেখা</h2><div style="display:grid;gap:10px">${f('bTagline', 'উপরের লেখা', s.bTagline)}<div class="grid-2" style="gap:10px">${f('bName1', 'নাম (১ম লাইন, সবুজ)', s.bName1)}${f('bName2', 'নাম (২য় লাইন, নীল)', s.bName2)}</div><div class="grid-2" style="gap:10px">${f('bRibbon', 'হলুদ ফিতার লেখা', s.bRibbon)}${f('bBadge', 'লাল ব্যাজের লেখা', s.bBadge)}</div><label><input type="checkbox" id="bShowBadge" ${s.bShowBadge !== false ? 'checked' : ''}> লাল ব্যাজ দেখান</label>
        <div class="grid-2" style="gap:10px">${f('bc1', 'কার্ড 1', s.bc1)}${f('bc2', 'কার্ড 2', s.bc2)}${f('bc3', 'কার্ড 3', s.bc3)}${f('bc4', 'কার্ড 4', s.bc4)}</div>${f('bStrip', 'নিচের সবুজ পট্টির লেখা', s.bStrip)}${f('bPill', 'নিচের হলুদ লেখা', s.bPill)}</div></section>
      <section class="card"><h2>ব্যানারের ছবি</h2>${imgRow('bannerBg', 'পেছনের ছবি (না দিলে ক্যাম্পাসের ছবি)', 1800)}${imgRow('bannerKids', 'বাম পাশের ছবি (যেমন শিক্ষার্থীদের ছবি, PNG হলে ভালো)', 700)}<p class="muted">লোগো বদলাতে "সেটিংস" পেজ ব্যবহার করুন।</p>
        <h2 style="margin-top:16px">ভর্তি বিজ্ঞপ্তি</h2><div style="display:grid;gap:10px">${f('adT', 'শিরোনাম', s.admissionTitle)}<label class="fld"><span>বিস্তারিত</span><textarea id="adB">${esc(s.admissionBody || '')}</textarea></label>${f('adD', 'ভর্তির শেষ সময়', s.admissionDeadline)}${f('formFooter', 'ভর্তি ফরমের নিচের লেখা', s.formFooter)}<label><input type="checkbox" id="adO" ${s.admissionOpen !== false ? 'checked' : ''}> হোম পেজে ভর্তি ব্যানার দেখান</label></div></section></div>
      <section class="card"><button class="btn btn-green" id="adSave" type="button">${ic('save')}সংরক্ষণ করুন</button></section>`;
    const keys = ['bTagline', 'bName1', 'bName2', 'bRibbon', 'bBadge', 'bc1', 'bc2', 'bc3', 'bc4', 'bStrip', 'bPill', 'formFooter'];
    const read = () => { const d = {}; keys.forEach((k) => { d[k] = $('#' + k).value.trim(); }); d.bShowBadge = $('#bShowBadge').checked; d.admissionTitle = $('#adT').value.trim(); d.admissionBody = $('#adB').value.trim(); d.admissionDeadline = $('#adD').value.trim(); d.admissionOpen = $('#adO').checked; return d; };
    const prev = () => { $('#bPrev').innerHTML = bannerHtml(Object.assign({}, settings, read()), images); };
    v.addEventListener('input', prev); v.addEventListener('change', prev); prev();
    $$('input[type=file]', v).forEach((inp) => { inp.onchange = async () => {
      const k = inp.id.slice(3);
      try { const url = await readImage(inp.files[0], Number(inp.dataset.max), k === 'bannerKids' ? 'image/png' : 'image/jpeg'); if (!url) return; await store.saveImages({ [k]: url }); images[k] = url; $('#th_' + k).style.backgroundImage = `url('${url}')`; prev(); toast('ছবি সংরক্ষণ হয়েছে'); } catch (e) { fail(e); }
    }; });
    $$('[data-clear]', v).forEach((b) => { b.onclick = async () => { const k = b.dataset.clear; try { await store.saveImages({ [k]: '' }); images[k] = ''; $('#th_' + k).style.backgroundImage = k === 'bannerBg' ? `url('${images.campus || 'assets/campus.jpg'}')` : ''; prev(); toast('ছবি মুছে ফেলা হয়েছে'); } catch (e) { fail(e); } }; });
    $('#adSave').onclick = async () => { const d = read(); try { await store.saveSettings(d); Object.assign(settings, d); toast('ভর্তি ব্যানার সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } };
  };

  // ---------- অনলাইন ভর্তি আবেদন ----------
  const AF = window.AdmissionForm;
  VIEWS.applications = async (v) => {
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld grow"><span>আবেদন কোড / নাম / মোবাইল দিয়ে খুঁজুন</span><input id="apFind" placeholder="যেমন KJ27-7Q4M9C"></label>
      <label class="fld w-md"><span>অবস্থা</span><select id="apFilter">${opt([{ v: '', t: 'সব' }, { v: 'new', t: 'নতুন' }, { v: 'confirmed', t: 'কনফার্ম' }, { v: 'admitted', t: 'ভর্তি সম্পন্ন' }], ui.apFilter || '')}</select></label>
      <button class="btn btn-ghost" id="apXls" type="button">${ic('down')}Excel</button></div>
      <p class="muted" style="margin:10px 0 0">অভিভাবকরা হোম পেজ থেকে অনলাইনে ভর্তির আবেদন জমা দেন। "কনফার্ম" চাপলে আবেদন কনফার্ম হয় ও ফরমের PDF ডাউনলোড হয় (প্রিন্ট করে রাখার জন্য)। "শিক্ষার্থী তালিকায় যোগ" চাপলে নতুন রেজিস্ট্রেশন নম্বরসহ শিক্ষার্থী হিসেবে যোগ হয়।</p></section>
      <section class="stats" id="apStats"></section>
      <section class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>কোড</th><th class="left">নাম</th><th class="left">পিতার নাম</th><th>শ্রেণি</th><th>মোবাইল</th><th>তারিখ</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead><tbody id="apBody"></tbody></table></div></section>`;
    let list = [];
    const chip = (st) => st === 'new' ? '<span class="chip chip-red">নতুন</span>' : st === 'confirmed' ? '<span class="chip chip-gold">কনফার্ম</span>' : '<span class="chip chip-green">ভর্তি সম্পন্ন</span>';
    const draw = () => {
      const q = C.toEn($('#apFind').value).trim().toLowerCase(); ui.apFilter = $('#apFilter').value;
      const rows = list.filter((a) => (!ui.apFilter || a.status === ui.apFilter) && (!q || a.code.toLowerCase().includes(q) || (a.nameBn || '').toLowerCase().includes(q) || (a.nameEn || '').toLowerCase().includes(q) || (a.guardianMobile || '').includes(q)));
      const cnt = (st) => list.filter((a) => a.status === st).length;
      $('#apStats').innerHTML = `<div class="stat s4">${ic('apply')}<div><span>নতুন আবেদন</span><b>${cnt('new')}</b></div></div><div class="stat s2">${ic('apply')}<div><span>কনফার্ম</span><b>${cnt('confirmed')}</b></div></div><div class="stat s1">${ic('students')}<div><span>ভর্তি সম্পন্ন</span><b>${cnt('admitted')}</b></div></div><div class="stat s3">${ic('apply')}<div><span>মোট আবেদন</span><b>${list.length}</b></div></div>`;
      $('#apBody').innerHTML = rows.length ? rows.map((a) => `<tr><td><b>${esc(a.code)}</b></td><td class="left">${esc(a.nameBn)}${a.nameEn ? `<span class="th-sub">${esc(a.nameEn)}</span>` : ''}</td><td class="left">${esc(a.father || '')}</td><td>${esc(a.applyClass || '')}</td><td>${esc(a.guardianMobile || '')}</td><td>${new Date(a.submittedAt).toLocaleDateString('en-GB')}</td><td>${chip(a.status)}</td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-view="${a.code}">দেখুন</button>${a.status === 'new' ? `<button class="btn btn-sm btn-green" data-conf="${a.code}">কনফার্ম + PDF</button>` : `<button class="btn btn-sm btn-ghost" data-pdf="${a.code}">PDF</button>`}${a.status !== 'admitted' ? `<button class="btn btn-sm btn-dark" data-admit="${a.code}">শিক্ষার্থী তালিকায় যোগ</button>` : ''}<button class="btn btn-sm btn-red" data-del="${a.code}" aria-label="মুছুন">✕</button></div></td></tr>`).join('') : '<tr><td colspan="8" class="empty">কোনো আবেদন পাওয়া যায়নি।</td></tr>';
      const find = (c) => list.find((a) => a.code === c);
      $$('[data-view]', v).forEach((b) => { b.onclick = async () => { const a = find(b.dataset.view); const dd = await dialog(`ভর্তি ফরম — ${a.code}`, `<div class="af-scale">${AF.render(a, settings, images)}</div>`, 'প্রিন্ট', false, true); if (dd) printHtml(AF.render(a, settings, images)); }; });
      $$('[data-conf]', v).forEach((b) => { b.onclick = async () => { const a = find(b.dataset.conf); try { await store.updateApplication(a.code, { status: 'confirmed', confirmedAt: Date.now() }); a.status = 'confirmed'; draw(); refreshAppBadge(); toast('কনফার্ম হয়েছে। PDF তৈরি হচ্ছে…'); await pdfOf(a); } catch (e) { fail(e); } }; });
      $$('[data-pdf]', v).forEach((b) => { b.onclick = () => pdfOf(find(b.dataset.pdf)); });
      $$('[data-admit]', v).forEach((b) => { b.onclick = () => admit(find(b.dataset.admit)); });
      $$('[data-del]', v).forEach((b) => { b.onclick = async () => { const a = find(b.dataset.del); if (!(await confirmBox('আবেদন মুছবেন?', `${esc(a.code)} — ${esc(a.nameBn)} এর আবেদন মুছে যাবে।`, 'মুছে ফেলুন'))) return; try { await store.deleteApplication(a.code); list = list.filter((x) => x !== a); draw(); refreshAppBadge(); } catch (e) { fail(e); } }; });
    };
    const pdfOf = (a) => AF.pdf(AF.render(a, settings, images), `Admission-Form-${a.code}.pdf`).catch(() => { toast('PDF তৈরি করা গেল না, প্রিন্টের পাতা খুলছে।', true); printHtml(AF.render(a, settings, images)); });
    // আবেদন থেকে শিক্ষার্থী: নতুন রেজিস্ট্রেশন নম্বর, শ্রেণির পরের রোল
    async function admit(a) {
      const y = String(Number(a.year) || settings.activeYear);
      const d = await dialog('শিক্ষার্থী তালিকায় যোগ', `<p>${esc(a.nameBn)} (${esc(a.code)})</p><div class="grid-2" style="gap:12px"><label class="fld"><span>শ্রেণি</span><select id="cl">${classOpts(a.applyClassId || catalog.classes[0].id, catalog.classes)}</select></label><label class="fld"><span>সাল</span><select id="yr">${yearOpts(y)}</select></label></div><p class="muted">নতুন রেজিস্ট্রেশন নম্বর নিজে থেকে তৈরি হবে, রোল হবে ওই শ্রেণির শেষ রোলের পরেরটি।</p>`, 'যোগ করুন');
      if (!d) return;
      try {
        const ex = await store.listStudents({ year: d.yr, classId: d.cl });
        const roll = String(ex.reduce((m, x) => Math.max(m, C.num(x.roll) || 0), 0) + 1);
        const reg = (await store.allocateRegs(1))[0];
        const st = await store.saveStudent({ name: a.nameBn, nameEn: a.nameEn || TL.name(a.nameBn), father: a.father || '', fatherEn: TL.name(a.father || ''), phone: a.guardianMobile || a.mobile || '', address: TL.hasBn(a.address) ? '' : (a.address || ''), roll, reg, classId: d.cl, year: String(d.yr), appCode: a.code });
        if (a.photo) await store.savePhoto(st.id, a.photo).catch(() => {});
        await store.updateApplication(a.code, { status: 'admitted', studentId: st.id, reg }); a.status = 'admitted'; draw(); refreshAppBadge();
        toast(`ভর্তি সম্পন্ন: ${className(d.cl)}, রোল ${roll}, রেজিস্ট্রেশন ${reg}`);
      } catch (e) { fail(e); }
    }
    $('#apFind').oninput = draw; $('#apFilter').onchange = draw;
    $('#apXls').onclick = () => excel('Admission Applications', [{ name: 'Applications', rows: [['Code', 'Status', 'Date', 'নাম', 'Name (English)', 'শ্রেণি', 'জন্মতারিখ', 'লিঙ্গ', 'পিতার নাম', 'পিতার পেশা', 'মাতার নাম', 'মাতার পেশা', 'অভিভাবকের মোবাইল', 'মোবাইল', 'ঠিকানা', 'পূর্ববর্তী প্রতিষ্ঠান', 'বর্তমান শ্রেণি', 'শারীরিক সমস্যা', 'অন্যান্য'], ...list.map((a) => [a.code, a.status, new Date(a.submittedAt).toLocaleDateString('en-GB'), a.nameBn, a.nameEn, a.applyClass, a.dob, a.gender, a.father, a.fatherJob, a.mother, a.motherJob, a.guardianMobile, a.mobile, a.address, a.prevSchool, a.currentClass, a.health, a.other])] }]);
    list = await store.listApplications(); draw();
  };

  // ---------- সেটিংস ----------
  VIEWS.config = async (v) => {
    const s = settings;
    const f = (id, label, val, extra) => `<label class="fld"><span>${label}</span><input id="${id}" value="${esc(val || '')}" ${extra || ''}></label>`;
    const DEF = { logo: 'assets/logo.webp', campus: 'assets/campus.jpg', devPhoto: 'assets/developer.webp', sign: '' };
    const imgRow = (k, label, max, round) => `<div class="img-row"><div class="img-thumb${round ? ' round' : ''}" id="th_${k}" style="background-image:url('${esc(images[k] || DEF[k])}')"></div><div class="fld grow"><span>${label}</span><input type="file" accept="image/*" id="fi_${k}" data-max="${max}"></div><button class="btn btn-sm btn-ghost" type="button" data-orig="${k}">${k === 'sign' ? 'মুছুন' : 'আসল ছবি'}</button></div>`;
    v.innerHTML = `<div class="grid-2">
      <section class="card"><h2>প্রিন্সিপালের প্রোফাইল</h2><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">${avatar(me, 84)}<div><p style="margin:0;font-size:20px;font-weight:700">${esc(me.name)}</p><p class="muted" style="margin:2px 0 8px">User ID: ${esc(me.userId)}${me.phone ? ' · ' + esc(me.phone) : ''}</p><div class="toolbar"><button class="btn btn-dark" type="button" id="stProfile">${ic('edit')}নাম, ছবি ও মোবাইল বদলান</button><button class="btn btn-ghost" type="button" id="stPw">পাসওয়ার্ড পরিবর্তন</button></div></div></div></section>
      <section class="card"><h2>লোগো, ব্যানার ও ছবি</h2>${imgRow('logo', 'মাদ্রাসার লোগো', 400)}${imgRow('campus', 'ব্যানারের ছবি (হোম পেজ ও লগইন পেজ)', 1600)}${imgRow('devPhoto', 'ডেভেলপারের ছবি', 300, true)}${imgRow('sign', 'প্রিন্সিপালের স্বাক্ষর — মার্কশিট, আইডি কার্ড, রুটিন, হিসাব ও ভর্তি ফরম সব জায়গায় বসবে (সাদা কাগজে সই করে ছবি তুলে দিন)', 500)}<p class="muted">ছবি নিজে থেকে ছোট করে সংরক্ষণ হয়, তাই ওয়েবসাইট দ্রুত খুলবে।</p></section>
      <section class="card"><h2>নাম ও ঠিকানা</h2><div style="display:grid;gap:10px">${f('stName', 'মাদ্রাসার নাম (বাংলা)', s.name)}${f('stNameEn', 'Madrasa Name (English) — মার্কশিট ও আইডি কার্ডে', s.nameEn, 'lang="en"')}${f('stAddr', 'ঠিকানা (বাংলা)', s.address)}${f('stAddrEn', 'Address (English)', s.addressEn, 'lang="en"')}<div class="grid-2" style="gap:10px">${f('stEst', 'প্রতিষ্ঠাকাল', s.established, 'inputmode="numeric"')}${f('stYear', 'চলতি শিক্ষাবর্ষ', s.activeYear, 'inputmode="numeric"')}</div>${f('stRegStart', 'রেজিস্ট্রেশন নম্বর শুরু (প্রথম শিক্ষার্থীর)', s.regStart, 'inputmode="numeric"')}</div></section>
      <section class="card"><h2>ব্যানারের লেখা ও বৈশিষ্ট্য</h2><div style="display:grid;gap:10px"><div class="grid-2" style="gap:10px">${f('stS1', 'স্লোগান (১ম লাইন)', s.slogan1)}${f('stS2', 'স্লোগান (২য় লাইন)', s.slogan2)}</div>${[1, 2, 3, 4].map((n) => `<div class="grid-2" style="gap:10px">${f('stF' + n + 't', `বৈশিষ্ট্য ${n}: শিরোনাম`, s['f' + n + 't'])}${f('stF' + n + 'd', 'বিবরণ', s['f' + n + 'd'])}</div>`).join('')}</div></section>
      <section class="card"><h2>মাদ্রাসার যোগাযোগ</h2><div style="display:grid;gap:10px">${f('stPhone', 'মোবাইল', s.phone, 'inputmode="tel"')}${f('stEmail', 'ইমেইল', s.email, 'type="email"')}${f('stFb', 'ফেসবুক পেজের লিংক', s.facebook)}</div></section>
      <section class="card"><h2>ডেভেলপার তথ্য</h2><div style="display:grid;gap:10px">${f('stDev', 'ডেভেলপারের নাম', s.devName)}${f('stDevPhone', 'ডেভেলপারের মোবাইল / WhatsApp', s.devPhone, 'inputmode="tel"')}${f('stDevEmail', 'ডেভেলপারের ইমেইল', s.devEmail, 'type="email"')}${f('stDevFb', 'ডেভেলপারের ফেসবুক লিংক (ফুটারের ফেসবুক আইকন)', s.devFacebook)}${f('stQuote', 'ফুটারের উক্তি', s.devQuote)}</div></section>
      <section class="card"><h2>ব্যাকআপ</h2><p>সব ডাটার একটি কপি কম্পিউটারে রাখুন।</p><div class="toolbar"><button class="btn btn-dark" type="button" id="stBackup">${ic('down')}Full Backup Download</button>${store.mode === 'demo' ? '<button class="btn btn-red" type="button" id="stReset">ডেমো ডাটা নতুন করে শুরু</button>' : ''}</div></section>
    </div>
    <section class="card"><button class="btn btn-green" type="button" id="stSave">${ic('save')}সব সেটিংস সংরক্ষণ করুন</button></section>`;
    $$('input[type=file]', v).forEach((inp) => { inp.onchange = async () => {
      const k = inp.id.slice(3);
      try { const url = await readImage(inp.files[0], Number(inp.dataset.max), k === 'campus' ? 'image/jpeg' : k === 'sign' ? 'sign' : 'image/webp'); if (!url) return; await store.saveImages({ [k]: url }); images[k] = url; $('#th_' + k).style.backgroundImage = `url('${url}')`; applyBrand(); toast('ছবি সংরক্ষণ হয়েছে'); } catch (e) { fail(e); }
    }; });
    $$('[data-orig]', v).forEach((b) => { b.onclick = async () => { const k = b.dataset.orig; try { await store.saveImages({ [k]: '' }); images[k] = ''; toast(k === 'sign' ? 'স্বাক্ষর মুছে ফেলা হয়েছে' : 'আসল ছবি ফিরিয়ে আনা হয়েছে'); go('config'); } catch (e) { fail(e); } }; });
    $('#stProfile').onclick = async () => { if (await editUser(me)) go('config'); };
    $('#stPw').onclick = changePw; $('#stBackup').onclick = backup;
    if ($('#stReset')) $('#stReset').onclick = async () => { if (await confirmBox('ডেমো রিসেট', 'সব নমুনা ডাটা প্রথম অবস্থায় ফিরে যাবে।', 'রিসেট করুন')) { await store.resetDemo(); location.reload(); } };
    $('#stSave').onclick = async () => {
      const y = C.toEn($('#stYear').value);
      if (!/^20\d\d$/.test(y)) return toast('সঠিক শিক্ষাবর্ষ লিখুন, যেমন 2026।', true);
      const val = (id) => $(id).value.trim();
      const d = { name: val('#stName'), nameEn: val('#stNameEn'), address: val('#stAddr'), addressEn: val('#stAddrEn'), established: C.toEn(val('#stEst')), activeYear: y, slogan1: val('#stS1'), slogan2: val('#stS2'), phone: C.toEn(val('#stPhone')), email: val('#stEmail'), facebook: val('#stFb'), devName: val('#stDev'), devPhone: C.toEn(val('#stDevPhone')), devEmail: val('#stDevEmail'), devFacebook: val('#stDevFb'), devQuote: val('#stQuote'), regStart: C.toEn(val('#stRegStart')) || '1001' };
      [1, 2, 3, 4].forEach((n) => { d['f' + n + 't'] = val('#stF' + n + 't'); d['f' + n + 'd'] = val('#stF' + n + 'd'); });
      if (!d.name) return toast('মাদ্রাসার নাম খালি রাখা যাবে না।', true);
      try { await store.saveSettings(d); Object.assign(settings, d); applyBrand(); toast('সেটিংস সংরক্ষণ হয়েছে'); } catch (e) { fail(e); }
    };
  };

  // ---------- পাসওয়ার্ড, লগইন, লগআউট ----------
  async function changePw() {
    const d = await dialog('পাসওয়ার্ড পরিবর্তন', `<label class="fld"><span>বর্তমান পাসওয়ার্ড</span><input id="cur" type="password" autocomplete="current-password" required></label><label class="fld"><span>নতুন পাসওয়ার্ড (কমপক্ষে 8 অক্ষর)</span><input id="nw" type="password" autocomplete="new-password" required></label><label class="fld"><span>নতুন পাসওয়ার্ড আবার লিখুন</span><input id="nw2" type="password" autocomplete="new-password" required></label>`, 'পরিবর্তন করুন');
    if (!d) return;
    if (d.nw.length < 8) return toast('নতুন পাসওয়ার্ড কমপক্ষে 8 অক্ষরের দিন।', true);
    if (d.nw !== d.nw2) return toast('দুইবার লেখা নতুন পাসওয়ার্ড মিলছে না।', true);
    try { await store.changePassword(d.cur, d.nw); toast('পাসওয়ার্ড পরিবর্তন হয়েছে'); } catch (e) { fail(e); }
  }
  async function logout() { await store.logout(); try { sessionStorage.removeItem('kjm-last'); history.replaceState(null, '', '#admin'); } catch (e) { /* ignore */ } }

  let setupMode = false;
  async function showLogin() {
    $('#appView').hidden = true; $('#loginView').hidden = false;
    document.title = 'স্টাফ লগইন | কুতুবজোম মাদ্রাসা';
    try { setupMode = await store.needsSetup(); } catch (e) { setupMode = false; }
    if (setupMode) {
      $('#loginTitle').textContent = 'প্রথমবার সেটআপ';
      $('#loginSub').textContent = 'প্রিন্সিপালের অ্যাকাউন্ট তৈরি করুন। এটি শুধু একবারই করা যাবে।';
      $('#lNameWrap').hidden = false; $('#loginBtn span').textContent = 'অ্যাকাউন্ট তৈরি করুন';
      $('#lPass').placeholder = 'নতুন Password (কমপক্ষে 8 অক্ষর)'; $('#lPass').autocomplete = 'new-password';
    }
  }
  function showWho() {
    $('#whoName').textContent = me.role === 'principal' ? (me.name || 'Principal') : me.name;
    $('#whoAvatar').innerHTML = avatar(me, 40);
    $('#whoRole').textContent = U.ROLES[me.role] || '';
  }
  function showApp() {
    $('#loginView').hidden = true; $('#appView').hidden = false;
    document.title = 'অ্যাডমিন প্যানেল | কুতুবজোম মাদ্রাসা';
    showWho(); buildNav();
    const h = (location.hash || '').slice(1);
    let last = ''; try { last = sessionStorage.getItem('kjm-last') || ''; Object.assign(ui, JSON.parse(sessionStorage.getItem('kjm-ui') || '{}')); } catch (e) { /* ignore */ }
    go(allowed(h) ? h : allowed(last) ? last : 'dashboard');
  }

  // ---------- শুরু ----------
  if (store.mode === 'demo') $('#demoBarA').hidden = false;
  try { [settings, images, catalog] = await Promise.all([store.getSettings(), store.getImages(), store.getCatalog()]); } catch (e) { /* ডিফল্ট দিয়ে চলবে */ }
  applyBrand();

  $('#eyeBtn').onclick = () => { const p = $('#lPass'); p.type = p.type === 'password' ? 'text' : 'password'; };
  $('#loginForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const m = $('#loginMsg'); m.hidden = true;
    const user = $('#lUser').value.trim(), pass = $('#lPass').value;
    const show = (t) => { m.textContent = t; m.hidden = false; };
    if (!user || !pass) return show('User ID ও Password দুটোই লিখুন।');
    const b = $('#loginBtn'); b.disabled = true;
    try {
      if (setupMode) {
        if (!/^[A-Za-z0-9._-]{3,30}$/.test(user)) throw new Error('User ID ইংরেজি অক্ষর/সংখ্যায় 3–30 অক্ষরের হবে।');
        if (pass.length < 8) throw new Error('Password কমপক্ষে 8 অক্ষরের দিন।');
        me = await store.setupPrincipal(user, pass, $('#lName').value.trim());
        setupMode = false; catalog = await store.getCatalog();
      } else me = await store.login(user, pass);
      $('#lPass').value = '';
    } catch (e) { show(e.message); } finally { b.disabled = false; }
  });
  $('#sideBtn').onclick = () => $('#side').classList.toggle('open');
  $('#whoBtn').onclick = () => { const mnu = $('#whoMenu'); mnu.hidden = !mnu.hidden; $('#whoBtn').setAttribute('aria-expanded', String(!mnu.hidden)); };
  document.addEventListener('click', (e) => { if (!$('#whoBox').contains(e.target)) $('#whoMenu').hidden = true; if ($('#side').classList.contains('open') && !$('#side').contains(e.target) && !$('#sideBtn').contains(e.target)) $('#side').classList.remove('open'); });
  $('#pwBtn').onclick = () => { $('#whoMenu').hidden = true; changePw(); };
  $('#logoutBtn2').onclick = logout;
  window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });

  // "স্টাফ লগইন" থেকে এলে সবসময় নতুন করে User ID ও Password চাইবে
  if (location.hash === '#login' || location.hash === '#admin') { try { sessionStorage.removeItem('kjm-last'); await store.logout(); } catch (e) { /* ignore */ } }
  window.addEventListener('hashchange', () => { if ((location.hash === '#login' || location.hash === '#admin') && me) { try { sessionStorage.removeItem('kjm-last'); } catch (e) { /* ignore */ } store.logout(); } });
  let shownFor = null;
  store.onAuth((p) => {
    me = p;
    if (!p) { shownFor = null; showLogin(); return; }
    if (shownFor === p.id && !$('#appView').hidden) { showWho(); return; } // প্রোফাইল আপডেট হলে শুধু নাম/ছবি বদলাবে
    shownFor = p.id; showApp();
  });
})();
