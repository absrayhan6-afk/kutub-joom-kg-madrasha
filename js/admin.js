// অ্যাডমিন প্যানেল: প্রিন্সিপাল ও শিক্ষকদের সব কাজ
(async function () {
  'use strict';
  const C = window.Calc, M = window.Marksheet, U = window.StoreUtil;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc, bn = C.toBn;

  const store = await window.getStore();
  let me = null, settings = U.DEFAULT_SETTINGS, images = {}, catalog = { classes: U.DEFAULT_CLASSES, published: {} };
  const ui = {}; // প্রতিটি পেজে শেষ বাছাই মনে রাখা

  // ---------- ছোট সহায়ক ----------
  let toastT;
  function toast(t, err) { const el = $('#toast'); el.textContent = t; el.classList.toggle('err', !!err); el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, err ? 5000 : 2600); }
  const fail = (e) => toast((e && e.message) || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।', true);
  const isP = () => me && me.role === 'principal';
  const className = (id) => (catalog.classes.find((c) => c.id === id) || {}).name || id;
  const myClasses = () => isP() ? catalog.classes : catalog.classes.filter((c) => (me.classIds || []).includes(c.id));
  const yearList = () => { const y = Number(settings.activeYear) || new Date().getFullYear(); const s = new Set(); for (let i = y + 1; i >= Math.min(2022, y - 4); i--) s.add(String(i)); Object.keys(catalog.published || {}).forEach((k) => s.add(k.split('_')[0])); return Array.from(s).sort((a, b) => b - a); };
  const opt = (list, sel, label) => list.map((x) => { const v = typeof x === 'object' ? x.v : x; const t = typeof x === 'object' ? x.t : (label ? label(x) : x); return `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(t)}</option>`; }).join('');
  const classOpts = (sel, list) => opt((list || myClasses()).map((c) => ({ v: c.id, t: c.name })), sel);
  const yearOpts = (sel) => opt(yearList(), sel, bn);
  const examOpts = (sel) => opt(C.EXAMS.map((e) => ({ v: e.key, t: e.name })), sel);
  const money = (n) => '৳' + bn(Math.round(Number(n) || 0).toLocaleString('en-IN'));
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const csv = (rows) => '﻿' + rows.map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  function printHtml(html) { $('#printArea').innerHTML = html; setTimeout(() => window.print(), 300); }

  // ডায়ালগ: ফর্ম দেখিয়ে মান ফেরত দেয় (বাতিল করলে null)
  function dialog(title, body, okText, danger) {
    return new Promise((resolve) => {
      const d = $('#dlg'), f = $('#dlgForm');
      f.innerHTML = `<h2>${esc(title)}</h2>${body}<p class="form-msg" id="dlgMsg" hidden></p><div class="dlg-actions"><button type="button" class="btn btn-ghost" value="cancel" id="dlgCancel">বাতিল</button><button type="submit" class="btn ${danger ? 'btn-red' : 'btn-green'}" id="dlgOk">${esc(okText || 'সংরক্ষণ করুন')}</button></div>`;
      const done = (v) => { d.close(); resolve(v); };
      $('#dlgCancel').onclick = () => done(null);
      f.onsubmit = (ev) => { ev.preventDefault(); const data = {}; $$('input,select,textarea', f).forEach((el) => { if (!el.id) return; data[el.id] = el.type === 'checkbox' ? el.checked : el.value; }); data._checks = $$('input[type=checkbox][data-group]:checked', f).map((x) => x.value); done(data); };
      d.oncancel = () => resolve(null);
      d.showModal();
      const first = $('input,select,textarea', f); if (first) first.focus();
    });
  }
  const confirmBox = (title, text, ok) => dialog(title, `<p>${text}</p>`, ok || 'হ্যাঁ, নিশ্চিত', true).then((x) => !!x);

  // ছবি ছোট করে data URL বানানো
  function readImage(file, max, type) {
    return new Promise((res, rej) => {
      if (!file) return res(null);
      if (!/^image\//.test(file.type)) return rej(new Error('শুধু ছবি (JPG/PNG/WebP) আপলোড করুন।'));
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); res(cv.toDataURL(type || 'image/webp', 0.82)); }; img.onerror = () => rej(new Error('ছবিটি খোলা যাচ্ছে না।')); img.src = fr.result; };
      fr.onerror = () => rej(new Error('ফাইল পড়া যায়নি।')); fr.readAsDataURL(file);
    });
  }

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
    notice: 'M3 10v4a1 1 0 0 0 1 1h2l4 5h2V4h-2L6 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4z',
    admission: 'M4 4h7a2 2 0 0 1 2 2v14a3 3 0 0 0-3-3H4zm16 0h-5a2 2 0 0 0-2 2v14a3 3 0 0 1 3-3h4z',
    settings: 'M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.4-2.9a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z',
    search: 'M10 3a7 7 0 0 1 5.6 11.2l5.6 5.6-1.4 1.4-5.6-5.6A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
    logout: 'M10 17l-1.4-1.4 2.6-2.6H2v-2h9.2L8.6 8.4 10 7l5 5zm10 4h-8v-2h8V5h-8V3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2z',
    plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
    save: 'M5 3h11l3 3v15H5zm2 2v5h8V5zm5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    print: 'M6 3h12v5H6zm-3 6h18v8h-3v4H6v-4H3zm5 6v4h8v-4z',
    down: 'M11 3h2v10l4-4 1.4 1.4L12 16.8l-6.4-6.4L7 9l4 4zM5 19h14v2H5z'
  };
  const ic = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${I[k]}"/></svg>`;

  const PAGES = [
    { k: 'dashboard', t: 'ড্যাশবোর্ড', i: 'home', all: true },
    { k: 'students', t: 'শিক্ষার্থী ব্যবস্থাপনা', i: 'students', all: true },
    { k: 'classes', t: 'শ্রেণি ও বিষয়', i: 'classes' },
    { k: 'teachers', t: 'শিক্ষক ব্যবস্থাপনা', i: 'teacher' },
    { k: 'marks', t: 'নম্বর এন্ট্রি', i: 'marks', all: true },
    { k: 'publish', t: 'ফলাফল প্রকাশ', i: 'publish' },
    { k: 'archive', t: 'ফলাফল সংরক্ষণ', i: 'archive' },
    { k: 'fees', t: 'হিসাব', i: 'fees' },
    { k: 'notices', t: 'নোটিশ ব্যবস্থাপনা', i: 'notice' },
    { k: 'admission', t: 'ভর্তি বিজ্ঞপ্তি', i: 'admission' },
    { k: 'settings', t: 'সেটিংস', i: 'settings' }
  ];
  let current = 'dashboard';

  function buildNav() {
    const nav = $('#sideNav');
    nav.innerHTML = PAGES.filter((p) => isP() || p.all).map((p) => `<button type="button" data-page="${p.k}">${ic(p.i)}<span>${p.t}</span></button>`).join('') +
      '<div class="nav-sep"></div>' +
      `<a href="index.html" target="_blank" rel="noopener">${ic('search')}<span>পাবলিক রেজাল্ট</span></a>` +
      `<button type="button" id="logoutBtn">${ic('logout')}<span>লগ আউট</span></button>`;
    $$('[data-page]', nav).forEach((b) => b.addEventListener('click', () => go(b.dataset.page)));
    $('#logoutBtn').onclick = logout;
  }
  async function go(page) {
    current = page;
    $$('#sideNav [data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
    const p = PAGES.find((x) => x.k === page);
    $('#pageTitle').textContent = p ? p.t : '';
    $('#side').classList.remove('open');
    const v = $('#view'); v.innerHTML = '<div class="card empty">লোড হচ্ছে…</div>';
    try { await VIEWS[page](v); } catch (e) { v.innerHTML = `<div class="card note">${esc(e.message || 'পেজ লোড করা যায়নি।')}</div>`; }
    try { history.replaceState(null, '', '#' + page); } catch (e) { /* ignore */ }
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
      ['students', 'q1', 'students', 'শিক্ষার্থী যোগ'], ['marks', 'q2', 'marks', 'নম্বর এন্ট্রি'], ['publish', 'q3', 'publish', 'ফলাফল প্রকাশ'], ['notices', 'q4', 'notice', 'নোটিশ দিন'], ['fees', 'q5', 'fees', 'হিসাব']
    ] : [['marks', 'q2', 'marks', 'নম্বর এন্ট্রি'], ['students', 'q1', 'students', 'শিক্ষার্থী তালিকা']];
    const pubRows = myClasses().map((c) => `<tr><td class="left">${esc(c.name)}</td>${C.EXAMS.map((e) => { const on = catalog.published[U.marksId(year, e.key, c.id)]; return `<td>${on ? '<span class="chip chip-green">প্রকাশিত</span>' : '<span class="chip chip-gray">অপ্রকাশিত</span>'}</td>`; }).join('')}</tr>`).join('');
    v.innerHTML = `
      ${me.role === 'teacher' ? `<div class="note ok">আসসালামু আলাইকুম, ${esc(me.name)}। আপনার শ্রেণি: ${esc(myClasses().map((c) => c.name).join(', ') || 'এখনো দেওয়া হয়নি')}</div>` : ''}
      <section class="stats">
        <div class="stat s1">${ic('students')}<div><span>মোট শিক্ষার্থী (${bn(year)})</span><b>${bn(students.length)}</b></div></div>
        <div class="stat s2">${ic('teacher')}<div><span>মোট শিক্ষক</span><b>${bn(teachers.length)}</b></div></div>
        <div class="stat s3">${ic('admission')}<div><span>মোট বিষয়</span><b>${bn(subjects.length)}</b></div></div>
        <div class="stat s4">${ic('classes')}<div><span>মোট শ্রেণি</span><b>${bn(catalog.classes.length)}</b></div></div>
      </section>
      <section class="card"><h2>দ্রুত কাজের লিংক</h2><div class="quick">${quick.map((q) => `<button type="button" class="${q[1]}" data-go="${q[0]}">${ic(q[2])}${q[3]}</button>`).join('')}</div></section>
      <div class="grid-2">
        <section class="card"><h2>সাম্প্রতিক নোটিশ</h2>${notices.length ? notices.slice(0, 5).map((n) => `<div class="mini-notice"><span>${esc(n.title)}</span><time>${n.date ? bn(n.date.split('-').reverse().join('/')) : ''}</time></div>`).join('') : '<p class="empty">কোনো নোটিশ নেই</p>'}</section>
        <section class="card"><h2>শ্রেণি অনুযায়ী শিক্ষার্থী</h2>
          <div class="bars">${counts.map((x) => `<div class="bar"><b>${bn(x.n)}</b><i style="height:${(x.n / maxN) * 100}%"></i></div>`).join('')}</div>
          <div class="bar-labels">${counts.map((x) => `<span title="${esc(x.c.name)}">${esc(x.c.name.replace(' শ্রেণি', ''))}</span>`).join('')}</div>
        </section>
      </div>
      <section class="card"><h2>${bn(year)} সালের ফলাফলের অবস্থা</h2><div class="tbl-wrap"><table class="tbl pub-grid"><thead><tr><th class="left">শ্রেণি</th>${C.EXAMS.map((e) => `<th>${e.name}</th>`).join('')}</tr></thead><tbody>${pubRows}</tbody></table></div></section>`;
    $$('[data-go]', v).forEach((b) => b.onclick = () => go(b.dataset.go));
  };

  // ---------- শিক্ষার্থী ----------
  VIEWS.students = async (v) => {
    const cls = ui.sClass || (myClasses()[0] || {}).id, year = ui.sYear || settings.activeYear;
    v.innerHTML = `<section class="card">
      <div class="toolbar">
        <label class="fld w-md"><span>শ্রেণি</span><select id="sClass">${classOpts(cls)}</select></label>
        <label class="fld w-sm"><span>সাল</span><select id="sYear">${yearOpts(year)}</select></label>
        <label class="fld grow"><span>নাম / রোল দিয়ে খুঁজুন</span><input id="sFind" placeholder="নাম অথবা রোল"></label>
        ${isP() ? `<button class="btn btn-dark" id="sAdd" type="button">${ic('plus')}নতুন শিক্ষার্থী</button><button class="btn btn-ghost" id="sBulk" type="button">একসাথে অনেক যোগ</button><button class="btn btn-ghost" id="sPromote" type="button">প্রমোশন</button>` : ''}
      </div></section>
      <section class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th class="left">নাম</th><th class="left">পিতার নাম</th><th>রোল</th><th>রেজিস্ট্রেশন</th><th>মোবাইল</th>${isP() ? '<th>অ্যাকশন</th>' : ''}</tr></thead><tbody id="sBody"></tbody></table></div><p class="muted" id="sCount"></p></section>`;
    let list = [];
    const draw = () => {
      const q = C.toEn($('#sFind').value).toLowerCase();
      const rows = list.filter((s) => !q || s.name.toLowerCase().includes(q) || C.toEn(s.roll) === q);
      $('#sBody').innerHTML = rows.length ? rows.map((s, i) => `<tr><td>${bn(i + 1)}</td><td class="left">${esc(s.name)}</td><td class="left">${esc(s.father || '')}</td><td>${bn(s.roll)}</td><td>${bn(s.reg)}</td><td>${bn(s.phone || '')}</td>${isP() ? `<td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-edit="${s.id}">এডিট</button><button class="btn btn-sm btn-red" data-del="${s.id}">মুছুন</button></div></td>` : ''}</tr>`).join('') : `<tr><td colspan="7" class="empty">এই শ্রেণিতে ${bn($('#sYear').value)} সালের কোনো শিক্ষার্থী নেই।${isP() ? ' "নতুন শিক্ষার্থী" বাটনে চাপ দিয়ে যোগ করুন।' : ''}</td></tr>`;
      $('#sCount').textContent = `মোট ${bn(list.length)} জন শিক্ষার্থী`;
      $$('[data-edit]', v).forEach((b) => b.onclick = () => edit(list.find((s) => s.id === b.dataset.edit)));
      $$('[data-del]', v).forEach((b) => b.onclick = async () => { const s = list.find((x) => x.id === b.dataset.del); if (await confirmBox('শিক্ষার্থী মুছবেন?', `${esc(s.name)} (রোল ${bn(s.roll)}) কে তালিকা থেকে মুছে ফেলা হবে। আগে প্রকাশিত ফলাফল থেকে যাবে।`, 'মুছে ফেলুন')) { try { await store.deleteStudent(s.id); toast('মুছে ফেলা হয়েছে'); load(); } catch (e) { fail(e); } } });
    };
    const load = async () => { ui.sClass = $('#sClass').value; ui.sYear = $('#sYear').value; list = (await store.listStudents({ year: ui.sYear, classId: ui.sClass })).sort((a, b) => C.num(a.roll) - C.num(b.roll)); draw(); };
    const form = (s) => `<div class="grid-2" style="gap:12px">
      <label class="fld" style="grid-column:1/-1"><span>শিক্ষার্থীর নাম *</span><input id="name" required value="${esc(s.name || '')}"></label>
      <label class="fld" style="grid-column:1/-1"><span>পিতার নাম</span><input id="father" value="${esc(s.father || '')}"></label>
      <label class="fld"><span>রোল নম্বর *</span><input id="roll" inputmode="numeric" required value="${esc(s.roll || '')}"></label>
      <label class="fld"><span>রেজিস্ট্রেশন নম্বর *</span><input id="reg" inputmode="numeric" required value="${esc(s.reg || '')}"></label>
      <label class="fld" style="grid-column:1/-1"><span>অভিভাবকের মোবাইল</span><input id="phone" inputmode="tel" value="${esc(s.phone || '')}"></label></div>`;
    const check = (d, id) => {
      if (!d.name.trim()) return 'শিক্ষার্থীর নাম লিখুন।';
      if (!/^\d+$/.test(C.toEn(d.roll))) return 'রোল নম্বর শুধু সংখ্যা হবে।';
      if (!C.toEn(d.reg)) return 'রেজিস্ট্রেশন নম্বর লিখুন।';
      if (list.some((x) => x.id !== id && C.toEn(x.roll) === C.toEn(d.roll))) return `রোল ${bn(d.roll)} এই শ্রেণিতে আগে থেকেই আছে।`;
      if (list.some((x) => x.id !== id && C.toEn(x.reg) === C.toEn(d.reg))) return `রেজিস্ট্রেশন ${bn(d.reg)} আগে থেকেই আছে।`;
      return '';
    };
    async function edit(s) {
      s = s || {};
      for (;;) {
        const d = await dialog(s.id ? 'শিক্ষার্থীর তথ্য এডিট' : 'নতুন শিক্ষার্থী', form(Object.assign({}, s, ui.lastDraft || {})));
        if (!d) { ui.lastDraft = null; return; }
        const err = check(d, s.id);
        if (err) { ui.lastDraft = d; toast(err, true); continue; }
        ui.lastDraft = null;
        try { await store.saveStudent(Object.assign({}, s, { name: d.name.trim(), father: d.father.trim(), roll: C.toEn(d.roll), reg: C.toEn(d.reg), phone: C.toEn(d.phone), classId: ui.sClass, year: String(ui.sYear) })); toast('সংরক্ষণ হয়েছে'); await load(); } catch (e) { fail(e); }
        return;
      }
    }
    $('#sClass').onchange = load; $('#sYear').onchange = load; $('#sFind').oninput = draw;
    if (isP()) {
      $('#sAdd').onclick = () => edit();
      $('#sBulk').onclick = async () => {
        const d = await dialog('একসাথে অনেক শিক্ষার্থী যোগ', `<p class="muted">প্রতি লাইনে একজন: <b>রোল, নাম, পিতার নাম, রেজিস্ট্রেশন</b>। Excel থেকে কপি করেও বসাতে পারেন (কমা বা Tab দিয়ে আলাদা)।</p><label class="fld"><span>${esc(className(ui.sClass))} — ${bn(ui.sYear)}</span><textarea id="bulk" rows="10" placeholder="1, মুহাম্মদ আব্দুল্লাহ, আব্দুর রহিম, 26101&#10;2, ফাতিমা আক্তার, নুরুল ইসলাম, 26102"></textarea></label>`, 'যোগ করুন');
        if (!d) return;
        const out = []; const errs = [];
        d.bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
          const p = line.split(/\t|,/).map((x) => x.trim());
          const s = { roll: C.toEn(p[0]), name: p[1] || '', father: p[2] || '', reg: C.toEn(p[3] || ''), phone: '', classId: ui.sClass, year: String(ui.sYear) };
          const e = check(s, null) || (out.some((o) => o.roll === s.roll) ? `রোল ${bn(s.roll)} দুইবার আছে।` : '');
          if (e) errs.push(`লাইন ${bn(i + 1)}: ${e}`); else out.push(s);
        });
        if (errs.length) { toast(errs.slice(0, 2).join(' '), true); if (!out.length) return; }
        try { await store.saveStudents(out); toast(`${bn(out.length)} জন শিক্ষার্থী যোগ হয়েছে`); load(); } catch (e) { fail(e); }
      };
      $('#sPromote').onclick = () => promote(load);
    }
    await load();
  };

  // বার্ষিক ফলাফলের নতুন রোল অনুযায়ী পরের বছরে তোলা
  async function promote(reload) {
    const from = ui.sClass, fy = ui.sYear;
    const idx = catalog.classes.findIndex((c) => c.id === from);
    const next = catalog.classes[idx + 1] || catalog.classes[idx];
    const d = await dialog('পরবর্তী বছরে প্রমোশন', `<p>${esc(className(from))} (${bn(fy)}) এর সব শিক্ষার্থীকে নতুন শ্রেণি ও সালে তোলা হবে। বার্ষিক ফলাফল প্রকাশিত থাকলে মেধাক্রম অনুযায়ী নতুন রোল বসবে, না থাকলে আগের রোল থাকবে। রেজিস্ট্রেশন নম্বর একই থাকবে।</p>
      <div class="grid-2" style="gap:12px"><label class="fld"><span>নতুন শ্রেণি</span><select id="toClass">${classOpts(next.id, catalog.classes)}</select></label><label class="fld"><span>নতুন সাল</span><select id="toYear">${yearOpts(String(Number(fy) + 1))}</select></label></div>
      <label class="fld"><span><input type="checkbox" id="onlyPass" checked> শুধু উত্তীর্ণ শিক্ষার্থীদের তুলুন</span></label>`, 'প্রমোশন দিন');
    if (!d) return;
    try {
      const [list, subs, mk, exist] = await Promise.all([store.listStudents({ year: fy, classId: from }), store.listSubjects(from), store.getMarks(fy, 'annual', from), store.listStudents({ year: d.toYear, classId: d.toClass })]);
      if (exist.length) { toast(`${className(d.toClass)} ${bn(d.toYear)} এ আগে থেকেই ${bn(exist.length)} জন আছে। আগে সেগুলো দেখে নিন।`, true); return; }
      const hasAnnual = Object.keys(mk.entries || {}).length > 0;
      let ordered = list.map((s) => ({ s, newRoll: s.roll, passed: true }));
      if (hasAnnual) ordered = C.classResults(list, subs, mk.entries).map((r) => ({ s: r.student, newRoll: String(r.newRoll), passed: r.passed }));
      const out = ordered.filter((x) => !d.onlyPass || x.passed).map((x) => ({ name: x.s.name, father: x.s.father || '', reg: x.s.reg, phone: x.s.phone || '', roll: x.newRoll, classId: d.toClass, year: String(d.toYear), prevRoll: x.s.roll }));
      await store.saveStudents(out);
      toast(`${bn(out.length)} জন ${className(d.toClass)} (${bn(d.toYear)}) এ উঠেছে`);
      ui.sClass = d.toClass; ui.sYear = d.toYear; go('students');
    } catch (e) { fail(e); }
  }

  // ---------- শ্রেণি ও বিষয় ----------
  VIEWS.classes = async (v) => {
    const cls = ui.cClass || catalog.classes[0].id;
    v.innerHTML = `<div class="grid-2">
      <section class="card"><h2>বিষয় ব্যবস্থাপনা</h2>
        <div class="toolbar"><label class="fld w-md"><span>শ্রেণি</span><select id="cClass">${classOpts(cls, catalog.classes)}</select></label>
        <label class="fld grow"><span>নতুন বিষয়</span><input id="cNew" placeholder="বিষয়ের নাম"></label>
        <label class="fld w-sm"><span>পূর্ণমান</span><input id="cFull" inputmode="numeric" value="100"></label>
        <button class="btn btn-dark" id="cAdd" type="button">${ic('plus')}বিষয় যোগ</button></div>
        <div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>#</th><th class="left">বিষয়ের নাম</th><th>পূর্ণমান</th><th>পাস মার্ক</th><th>অ্যাকশন</th></tr></thead><tbody id="cBody"></tbody></table></div>
        <p class="muted">পাস মার্ক পূর্ণমানের ৩৩%। পূর্ণমান ৫০ হলে পাস মার্ক ১৬.৫ হবে।</p>
      </section>
      <section class="card"><h2>শ্রেণির তালিকা</h2>
        <div class="toolbar"><label class="fld grow"><span>নতুন শ্রেণি</span><input id="kNew" placeholder="যেমন: নবম শ্রেণি"></label><button class="btn btn-dark" id="kAdd" type="button">${ic('plus')}শ্রেণি যোগ</button></div>
        <div class="tbl-wrap" style="margin-top:14px"><table class="tbl"><thead><tr><th>ক্রম</th><th class="left">শ্রেণির নাম</th><th>অ্যাকশন</th></tr></thead><tbody id="kBody"></tbody></table></div>
      </section></div>`;
    let subs = [];
    const drawSubs = () => {
      $('#cBody').innerHTML = subs.length ? subs.map((s, i) => `<tr><td>${bn(i + 1)}</td><td class="left"><input class="cell cell-w" data-n="${s.id}" value="${esc(s.name)}"></td><td><input class="cell" data-f="${s.id}" inputmode="numeric" value="${s.full}"></td><td>${bn(String(s.pass))}</td><td><div class="row-actions"><button class="btn btn-sm btn-green" data-save="${s.id}">Save</button><button class="btn btn-sm btn-red" data-del="${s.id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="5" class="empty">এই শ্রেণিতে কোনো বিষয় নেই। উপরে বিষয় যোগ করুন।</td></tr>';
      $$('[data-save]', v).forEach((b) => b.onclick = async () => {
        const s = subs.find((x) => x.id === b.dataset.save); const name = $(`[data-n="${s.id}"]`).value.trim(); const full = C.num($(`[data-f="${s.id}"]`).value);
        if (!name || !(full > 0)) return toast('বিষয়ের নাম ও সঠিক পূর্ণমান দিন।', true);
        try { await store.saveSubject(Object.assign({}, s, { name, full, pass: Math.round(full * 0.33 * 100) / 100 })); toast('সংরক্ষণ হয়েছে'); loadSubs(); } catch (e) { fail(e); }
      });
      $$('[data-del]', v).forEach((b) => b.onclick = async () => { const s = subs.find((x) => x.id === b.dataset.del); if (await confirmBox('বিষয় মুছবেন?', `"${esc(s.name)}" বিষয়টি মুছে যাবে। এই বিষয়ের এন্ট্রি করা নম্বর আর হিসাবে আসবে না।`, 'মুছে ফেলুন')) { try { await store.deleteSubject(s.id); toast('মুছে ফেলা হয়েছে'); loadSubs(); } catch (e) { fail(e); } } });
    };
    const loadSubs = async () => { ui.cClass = $('#cClass').value; subs = await store.listSubjects(ui.cClass); drawSubs(); };
    const drawClasses = () => {
      $('#kBody').innerHTML = catalog.classes.map((c, i) => `<tr><td>${bn(i + 1)}</td><td class="left"><input class="cell cell-w" data-k="${c.id}" value="${esc(c.name)}"></td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-up="${i}" ${i ? '' : 'disabled'} aria-label="উপরে">▲</button><button class="btn btn-sm btn-green" data-ks="${c.id}">Save</button><button class="btn btn-sm btn-red" data-kd="${c.id}">Delete</button></div></td></tr>`).join('');
      $$('[data-ks]', v).forEach((b) => b.onclick = async () => { const c = catalog.classes.find((x) => x.id === b.dataset.ks); const name = $(`[data-k="${c.id}"]`).value.trim(); if (!name) return; c.name = name; await saveClasses(); });
      $$('[data-up]', v).forEach((b) => b.onclick = async () => { const i = Number(b.dataset.up); const a = catalog.classes; [a[i - 1], a[i]] = [a[i], a[i - 1]]; await saveClasses(); });
      $$('[data-kd]', v).forEach((b) => b.onclick = async () => { const c = catalog.classes.find((x) => x.id === b.dataset.kd); const n = (await store.listStudents({ classId: c.id })).length; if (n) return toast(`${c.name} এ ${bn(n)} জন শিক্ষার্থী আছে, তাই মোছা যাবে না।`, true); if (await confirmBox('শ্রেণি মুছবেন?', `"${esc(c.name)}" শ্রেণিটি তালিকা থেকে মুছে যাবে।`, 'মুছে ফেলুন')) { catalog.classes = catalog.classes.filter((x) => x.id !== c.id); await saveClasses(); } });
    };
    const saveClasses = async () => { catalog.classes.forEach((c, i) => { c.order = i + 1; }); try { await store.saveClasses(catalog.classes); toast('শ্রেণির তালিকা সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } drawClasses(); $('#cClass').innerHTML = classOpts(ui.cClass, catalog.classes); };
    $('#cClass').onchange = loadSubs;
    $('#cAdd').onclick = async () => {
      const name = $('#cNew').value.trim(); const full = C.num($('#cFull').value);
      if (!name) return toast('বিষয়ের নাম লিখুন।', true); if (!(full > 0)) return toast('সঠিক পূর্ণমান দিন।', true);
      if (subs.some((s) => s.name === name)) return toast('এই বিষয়টি আগে থেকেই আছে।', true);
      try { await store.saveSubject({ classId: ui.cClass, name, full, pass: Math.round(full * 0.33 * 100) / 100, order: subs.length + 1 }); $('#cNew').value = ''; toast('বিষয় যোগ হয়েছে'); loadSubs(); } catch (e) { fail(e); }
    };
    $('#kAdd').onclick = async () => { const name = $('#kNew').value.trim(); if (!name) return toast('শ্রেণির নাম লিখুন।', true); catalog.classes.push({ id: 'c' + Date.now().toString(36), name, order: catalog.classes.length + 1 }); $('#kNew').value = ''; await saveClasses(); };
    drawClasses(); await loadSubs();
  };

  // ---------- শিক্ষক ----------
  VIEWS.teachers = async (v) => {
    v.innerHTML = `<section class="card"><h2>নতুন শিক্ষক যোগ</h2>
      <div class="toolbar"><label class="fld grow"><span>শিক্ষকের নাম</span><input id="tName" placeholder="শিক্ষকের নাম"></label>
      <label class="fld w-md"><span>User ID</span><input id="tUser" placeholder="যেমন: karim" autocomplete="off"></label>
      <label class="fld w-md"><span>Password</span><input id="tPass" placeholder="কমপক্ষে ৬ অক্ষর" autocomplete="new-password"></label></div>
      <p style="margin:12px 0 6px;font-weight:700">যে শ্রেণিগুলোর নম্বর এন্ট্রি করবেন:</p>
      <div class="checks" id="tClasses">${catalog.classes.map((c) => `<label><input type="checkbox" value="${c.id}">${esc(c.name)}</label>`).join('')}</div>
      <div style="margin-top:12px"><button class="btn btn-dark" id="tAdd" type="button">${ic('plus')}শিক্ষক যোগ করুন</button></div></section>
      <section class="card"><h2>শিক্ষকদের তালিকা</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="left">নাম</th><th>User ID</th><th class="left">শ্রেণি</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead><tbody id="tBody"></tbody></table></div>
      <p class="muted">শিক্ষক নিজে লগইন করে "পাসওয়ার্ড পরিবর্তন" থেকে পাসওয়ার্ড বদলাতে পারবেন। কেউ পাসওয়ার্ড ভুলে গেলে তার অ্যাকাউন্ট মুছে নতুন User ID দিয়ে আবার যোগ করুন।</p></section>`;
    let users = [];
    const load = async () => {
      users = (await store.listUsers()).sort((a, b) => (a.role === 'principal' ? -1 : 1) - (b.role === 'principal' ? -1 : 1));
      $('#tBody').innerHTML = users.map((u) => `<tr><td class="left">${esc(u.name)}${u.role === 'principal' ? ' <span class="chip chip-gold">প্রিন্সিপাল</span>' : ''}</td><td>${esc(u.userId)}</td><td class="left">${u.role === 'principal' ? 'সব শ্রেণি' : esc((u.classIds || []).map(className).join(', ') || '—')}</td><td>${u.active === false ? '<span class="chip chip-red">বন্ধ</span>' : '<span class="chip chip-green">চালু</span>'}</td><td>${u.role === 'principal' ? '' : `<div class="row-actions"><button class="btn btn-sm btn-ghost" data-ed="${u.id}">এডিট</button><button class="btn btn-sm btn-red" data-del="${u.id}">Delete</button></div>`}</td></tr>`).join('');
      $$('[data-ed]', v).forEach((b) => b.onclick = async () => {
        const u = users.find((x) => x.id === b.dataset.ed);
        const d = await dialog('শিক্ষকের তথ্য', `<label class="fld"><span>নাম</span><input id="nm" value="${esc(u.name)}"></label><p style="margin:0;font-weight:700">শ্রেণি</p><div class="checks">${catalog.classes.map((c) => `<label><input type="checkbox" data-group="cls" value="${c.id}" ${(u.classIds || []).includes(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('')}</div><label class="fld"><span><input type="checkbox" id="act" ${u.active !== false ? 'checked' : ''}> অ্যাকাউন্ট চালু রাখুন</span></label>`);
        if (!d) return;
        try { await store.updateUser({ id: u.id, name: d.nm.trim() || u.name, classIds: d._checks, active: d.act }); toast('সংরক্ষণ হয়েছে'); load(); } catch (e) { fail(e); }
      });
      $$('[data-del]', v).forEach((b) => b.onclick = async () => { const u = users.find((x) => x.id === b.dataset.del); if (await confirmBox('শিক্ষক মুছবেন?', `${esc(u.name)} আর লগইন করতে পারবেন না।`, 'মুছে ফেলুন')) { try { await store.deleteUser(u.id); toast('মুছে ফেলা হয়েছে'); load(); } catch (e) { fail(e); } } });
    };
    $('#tAdd').onclick = async () => {
      const t = { name: $('#tName').value.trim(), userId: $('#tUser').value.trim(), password: $('#tPass').value, classIds: $$('#tClasses input:checked').map((x) => x.value) };
      if (!t.name) return toast('শিক্ষকের নাম লিখুন।', true);
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(t.userId)) return toast('User ID ইংরেজি অক্ষর/সংখ্যায় ৩–৩০ অক্ষরের হবে (স্পেস ছাড়া)।', true);
      if (t.password.length < 6) return toast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।', true);
      const b = $('#tAdd'); b.disabled = true;
      try { await store.createTeacher(t); toast(`${t.name} যোগ হয়েছেন। User ID: ${t.userId}`); $('#tName').value = ''; $('#tUser').value = ''; $('#tPass').value = ''; $$('#tClasses input').forEach((x) => { x.checked = false; }); load(); } catch (e) { fail(e); } finally { b.disabled = false; }
    };
    await load();
  };

  // ---------- নম্বর এন্ট্রি ----------
  VIEWS.marks = async (v) => {
    const cl = myClasses();
    if (!cl.length) { v.innerHTML = '<div class="card note">আপনাকে এখনো কোনো শ্রেণি দেওয়া হয়নি। প্রিন্সিপালের সাথে যোগাযোগ করুন।</div>'; return; }
    const cls = cl.some((c) => c.id === ui.mClass) ? ui.mClass : cl[0].id;
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld w-md"><span>শ্রেণি নির্বাচন</span><select id="mClass">${classOpts(cls)}</select></label>
      <label class="fld w-sm"><span>পরীক্ষার সন</span><select id="mYear">${yearOpts(ui.mYear || settings.activeYear)}</select></label>
      <label class="fld w-lg"><span>পরীক্ষার ধরন</span><select id="mExam">${examOpts(ui.mExam || 'first')}</select></label>
      <button class="btn btn-green" id="mSave" type="button">${ic('save')}Save Marks</button>
    </div></section><div id="mNote"></div><section class="card"><div class="tbl-wrap" id="mGrid"></div><p class="muted" id="mHelp">প্রতিটি ঘরে প্রাপ্ত নম্বর লিখুন। Enter চাপলে পরের ঘরে যাবে। মোট, গড়, গ্রেড ও GPA নিজে থেকে হিসাব হবে।</p></section>`;
    let students = [], subjects = [], data = { entries: {} }, dirty = false;
    const collect = () => {
      const entries = {};
      $$('input.cell', v).forEach((inp) => { const val = inp.value.trim(); if (val === '') return; (entries[inp.dataset.s] = entries[inp.dataset.s] || {})[inp.dataset.sub] = C.num(val); });
      return entries;
    };
    const recalc = () => {
      const entries = collect();
      const results = C.classResults(students, subjects, entries);
      results.forEach((r) => {
        const row = $(`tr[data-row="${r.student.id}"]`, v); if (!row) return;
        const done = r.missing === 0;
        row.querySelector('.r-total').textContent = done ? bn(r.total) : (r.total ? bn(r.total) : '—');
        row.querySelector('.r-avg').textContent = done ? bn(C.fix2(r.average)) : '—';
        const g = row.querySelector('.r-grade'); g.textContent = done ? r.grade : '—'; g.className = 'r-grade' + (done && r.grade === 'F' ? ' f' : '');
        row.querySelector('.r-gpa').textContent = done ? C.fix2(r.gpa) : '—';
        row.querySelector('.r-rank').textContent = done ? bn(r.rank) : '—';
      });
    };
    const load = async () => {
      ui.mClass = $('#mClass').value; ui.mYear = $('#mYear').value; ui.mExam = $('#mExam').value;
      [students, subjects, data] = await Promise.all([store.listStudents({ year: ui.mYear, classId: ui.mClass }), store.listSubjects(ui.mClass), store.getMarks(ui.mYear, ui.mExam, ui.mClass)]);
      students.sort((a, b) => C.num(a.roll) - C.num(b.roll)); dirty = false;
      const locked = !!data.published;
      $('#mNote').innerHTML = locked ? `<div class="note">এই পরীক্ষার ফলাফল প্রকাশিত হয়েছে, তাই নম্বর পরিবর্তন বন্ধ।${isP() ? ' পরিবর্তন করতে "ফলাফল প্রকাশ" পেজ থেকে প্রকাশ বাতিল করুন।' : ''}</div>` : '';
      $('#mSave').disabled = locked;
      if (!subjects.length) { $('#mGrid').innerHTML = `<p class="empty">এই শ্রেণিতে কোনো বিষয় যোগ করা হয়নি।${isP() ? ' "শ্রেণি ও বিষয়" পেজে বিষয় যোগ করুন।' : ''}</p>`; return; }
      if (!students.length) { $('#mGrid').innerHTML = `<p class="empty">${esc(className(ui.mClass))} এ ${bn(ui.mYear)} সালের কোনো শিক্ষার্থী নেই।</p>`; return; }
      const e = data.entries || {};
      $('#mGrid').innerHTML = `<table class="tbl"><thead><tr><th>#</th><th class="left">নাম</th><th>রোল</th>${subjects.map((s) => `<th>${esc(s.name)}<span class="th-sub">পূর্ণমান ${bn(s.full)}</span></th>`).join('')}<th>মোট</th><th>গড়</th><th>গ্রেড</th><th>GPA</th><th class="hl">মেধাক্রম</th></tr></thead><tbody>${students.map((st, i) => `<tr data-row="${st.id}"><td>${bn(i + 1)}</td><td class="left">${esc(st.name)}</td><td>${bn(st.roll)}</td>${subjects.map((s) => { const val = (e[st.id] || {})[s.id]; return `<td><input class="cell" inputmode="decimal" data-s="${st.id}" data-sub="${s.id}" data-max="${s.full}" value="${val == null ? '' : val}" ${locked ? 'disabled' : ''} aria-label="${esc(st.name)} — ${esc(s.name)}"></td>`; }).join('')}<td class="r-total"></td><td class="r-avg"></td><td class="r-grade"></td><td class="r-gpa"></td><td class="r-rank hl"></td></tr>`).join('')}</tbody></table>`;
      const cells = $$('input.cell', v);
      cells.forEach((inp, idx) => {
        inp.addEventListener('input', () => { const n = C.num(inp.value); inp.classList.toggle('bad', inp.value.trim() !== '' && (Number.isNaN(n) || n < 0 || n > Number(inp.dataset.max))); dirty = true; recalc(); });
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); const nx = cells[idx + 1]; if (nx) nx.focus(); } });
      });
      recalc();
    };
    $('#mSave').onclick = async () => {
      const bad = $$('input.cell.bad', v);
      if (bad.length) { bad[0].focus(); return toast('লাল ঘরের নম্বর ঠিক করুন: ০ থেকে পূর্ণমানের মধ্যে হতে হবে।', true); }
      const b = $('#mSave'); b.disabled = true;
      try { await store.saveMarks(ui.mYear, ui.mExam, ui.mClass, collect()); dirty = false; toast('নম্বর সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } finally { b.disabled = false; }
    };
    const change = async () => { if (dirty && !(await confirmBox('সংরক্ষণ করা হয়নি', 'নতুন লেখা নম্বর এখনো সংরক্ষণ হয়নি। সংরক্ষণ না করে অন্য তালিকায় যাবেন?', 'হ্যাঁ, যাব'))) { $('#mClass').value = ui.mClass; $('#mYear').value = ui.mYear; $('#mExam').value = ui.mExam; return; } load(); };
    $('#mClass').onchange = change; $('#mYear').onchange = change; $('#mExam').onchange = change;
    await load();
  };

  // ---------- ফলাফল প্রকাশ ----------
  async function classResultData(y, e, c) {
    const [students, subjects, marks] = await Promise.all([store.listStudents({ year: y, classId: c }), store.listSubjects(c), store.getMarks(y, e, c)]);
    const results = C.classResults(students, subjects, marks.entries || {});
    return { students, subjects, marks, results };
  }
  function resultTable(results) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>রোল</th><th class="left">নাম</th><th>মোট</th><th>গড়</th><th>গ্রেড</th><th>GPA</th><th>ফলাফল</th><th>মেধাক্রম</th><th class="hl">নতুন রোল</th><th>মার্কশিট</th></tr></thead><tbody>${results.length ? results.map((r) => `<tr><td>${bn(r.student.roll)}</td><td class="left">${esc(r.student.name)}</td><td>${r.missing ? '—' : bn(r.total)}</td><td>${r.missing ? '—' : bn(C.fix2(r.average))}</td><td class="${r.grade === 'F' ? 'f' : ''}">${r.missing ? '—' : r.grade}</td><td>${r.missing ? '—' : C.fix2(r.gpa)}</td><td>${r.missing ? `<span class="chip chip-gold">${bn(r.missing)}টি নম্বর বাকি</span>` : r.passed ? '<span class="chip chip-green">PASS</span>' : '<span class="chip chip-red">FAIL</span>'}</td><td>${bn(r.rank)}</td><td class="hl">${bn(r.newRoll)}</td><td><button class="btn btn-sm btn-ghost" data-ms="${r.student.id}" ${r.missing ? 'disabled' : ''}>দেখুন</button></td></tr>`).join('') : '<tr><td colspan="10" class="empty">কোনো শিক্ষার্থী নেই</td></tr>'}</tbody></table></div>`;
  }
  function bindMarksheets(root, results, y, e, c) {
    $$('[data-ms]', root).forEach((b) => b.onclick = () => {
      const r = results.find((x) => x.student.id === b.dataset.ms);
      const snap = U.snapshot(r, e, y, className(c));
      const d = $('#dlg'), f = $('#dlgForm');
      d.style.width = 'min(960px, calc(100vw - 24px))';
      f.innerHTML = M.render(snap, settings, images) + '<div class="dlg-actions"><button type="button" class="btn btn-ghost" id="dlgCancel">বন্ধ করুন</button><button type="button" class="btn btn-green" id="dlgPrint">' + ic('print') + 'প্রিন্ট</button></div>';
      $('#dlgCancel').onclick = () => { d.close(); d.style.width = ''; };
      $('#dlgPrint').onclick = () => { d.close(); d.style.width = ''; printHtml(M.render(snap, settings, images)); };
      d.showModal();
    });
  }
  VIEWS.publish = async (v) => {
    const year = ui.pYear || settings.activeYear;
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld w-sm"><span>সাল</span><select id="pYear">${yearOpts(year)}</select></label>
      <label class="fld w-md"><span>শ্রেণি</span><select id="pClass">${classOpts(ui.pClass || catalog.classes[0].id, catalog.classes)}</select></label>
      <label class="fld w-lg"><span>পরীক্ষা</span><select id="pExam">${examOpts(ui.pExam || 'first')}</select></label>
    </div></section>
    <section class="card" id="pDetail"></section>
    <section class="card"><h2>সব শ্রেণির অবস্থা</h2><div class="tbl-wrap" id="pGrid"></div></section>`;
    const grid = () => {
      const y = $('#pYear').value;
      $('#pGrid').innerHTML = `<table class="tbl"><thead><tr><th class="left">শ্রেণি</th>${C.EXAMS.map((e) => `<th>${e.name}</th>`).join('')}</tr></thead><tbody>${catalog.classes.map((c) => `<tr><td class="left">${esc(c.name)}</td>${C.EXAMS.map((e) => { const on = catalog.published[U.marksId(y, e.key, c.id)]; return `<td><button class="btn btn-sm ${on ? 'btn-green' : 'btn-ghost'}" data-pick="${c.id}|${e.key}">${on ? 'প্রকাশিত' : 'অপ্রকাশিত'}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
      $$('[data-pick]', v).forEach((b) => b.onclick = () => { const [c, e] = b.dataset.pick.split('|'); $('#pClass').value = c; $('#pExam').value = e; detail(); $('#pDetail').scrollIntoView({ behavior: 'smooth' }); });
    };
    const detail = async () => {
      ui.pYear = $('#pYear').value; ui.pClass = $('#pClass').value; ui.pExam = $('#pExam').value;
      const y = ui.pYear, c = ui.pClass, e = ui.pExam;
      const box = $('#pDetail'); box.innerHTML = '<p class="empty">লোড হচ্ছে…</p>';
      const { results, subjects, marks } = await classResultData(y, e, c);
      const missing = results.filter((r) => r.missing).length;
      const pub = !!marks.published;
      const ready = results.length && subjects.length && !missing;
      box.innerHTML = `<div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${esc(className(c))} — ${C.examName(e)} ${bn(y)} ${pub ? '<span class="chip chip-green">প্রকাশিত</span>' : '<span class="chip chip-gray">অপ্রকাশিত</span>'}</h2>
        <div class="toolbar">${pub ? `<button class="btn btn-red" id="pUn" type="button">প্রকাশ বাতিল করুন</button>` : `<button class="btn btn-green" id="pGo" type="button" ${ready ? '' : 'disabled'}>${ic('publish')}ফলাফল প্রকাশ করুন</button>`}
        <button class="btn btn-ghost" id="pPrint" type="button" ${ready ? '' : 'disabled'}>${ic('print')}সব মার্কশিট প্রিন্ট</button><button class="btn btn-ghost" id="pCsv" type="button" ${results.length ? '' : 'disabled'}>${ic('down')}Excel (CSV)</button></div></div>
        ${!subjects.length ? '<div class="note">এই শ্রেণিতে কোনো বিষয় নেই।</div>' : missing ? `<div class="note">${bn(missing)} জন শিক্ষার্থীর সব নম্বর এন্ট্রি হয়নি। সব নম্বর দেওয়া হলে প্রকাশ করা যাবে।</div>` : pub ? '<div class="note ok">অভিভাবকরা এখন রোল ও রেজিস্ট্রেশন নম্বর দিয়ে এই ফলাফল দেখতে পারছেন।</div>' : results.length ? '<div class="note ok">সব নম্বর এন্ট্রি হয়েছে। নিচে দেখে নিশ্চিত হয়ে "ফলাফল প্রকাশ করুন" চাপুন।</div>' : ''}
        <div style="margin-top:12px">${resultTable(results)}</div>`;
      bindMarksheets(box, results, y, e, c);
      const go2 = $('#pGo'), un = $('#pUn');
      if (go2) go2.onclick = async () => {
        if (!(await confirmBox('ফলাফল প্রকাশ করবেন?', `${esc(className(c))}, ${C.examName(e)} ${bn(y)} এর ফলাফল সবাই দেখতে পারবে। প্রকাশের পর নম্বর পরিবর্তন বন্ধ থাকবে।`, 'প্রকাশ করুন'))) return;
        go2.disabled = true;
        try { await store.publish(y, e, c, results.map((r) => U.snapshot(r, e, y, className(c)))); catalog.published[U.marksId(y, e, c)] = Date.now(); toast('ফলাফল প্রকাশিত হয়েছে'); detail(); grid(); } catch (er) { fail(er); go2.disabled = false; }
      };
      if (un) un.onclick = async () => {
        if (!(await confirmBox('প্রকাশ বাতিল করবেন?', 'অভিভাবকরা আর এই ফলাফল দেখতে পারবেন না। নম্বর ঠিক করে আবার প্রকাশ করতে পারবেন।', 'প্রকাশ বাতিল'))) return;
        try { await store.unpublish(y, e, c); delete catalog.published[U.marksId(y, e, c)]; toast('প্রকাশ বাতিল হয়েছে'); detail(); grid(); } catch (er) { fail(er); }
      };
      $('#pPrint').onclick = () => printHtml(results.filter((r) => !r.missing).sort((a, b) => C.num(a.student.roll) - C.num(b.student.roll)).map((r) => M.render(U.snapshot(r, e, y, className(c)), settings, images)).join(''));
      $('#pCsv').onclick = () => download(`result-${y}-${e}-${className(c)}.csv`, csv([['রোল', 'নাম', 'পিতার নাম', 'রেজিস্ট্রেশন', ...subjects.map((s) => s.name), 'মোট', 'গড়', 'গ্রেড', 'GPA', 'ফলাফল', 'মেধাক্রম', 'নতুন রোল'],
        ...results.map((r) => [r.student.roll, r.student.name, r.student.father || '', r.student.reg, ...r.rows.map((x) => x.mark == null ? '' : x.mark), r.total, C.fix2(r.average), r.grade, C.fix2(r.gpa), r.passed ? 'PASS' : 'FAIL', r.rank, r.newRoll])]), 'text/csv;charset=utf-8');
    };
    $('#pYear').onchange = () => { grid(); detail(); }; $('#pClass').onchange = detail; $('#pExam').onchange = detail;
    grid(); await detail();
  };

  // ---------- ফলাফল সংরক্ষণ (আগের বছরগুলো) ----------
  VIEWS.archive = async (v) => {
    const years = Array.from(new Set(Object.keys(catalog.published).map((k) => k.split('_')[0]).concat([String(settings.activeYear)]))).sort((a, b) => b - a);
    const sel = ui.aYear || years[0];
    v.innerHTML = `<section class="year-cards">${years.map((y) => { const n = Object.keys(catalog.published).filter((k) => k.startsWith(y + '_')).length; return `<div class="year-card${y === sel ? ' active' : ''}">${ic('archive')}<b>${bn(y)}</b><span>${bn(n)}টি প্রকাশিত ফলাফল</span><button class="btn btn-sm btn-dark" data-y="${y}">দেখুন</button></div>`; }).join('')}</section>
      <section class="card"><h2>${bn(sel)} সালের প্রকাশিত ফলাফল</h2><p class="muted">সব বছরের ফলাফল স্থায়ীভাবে সংরক্ষিত থাকে। অভিভাবকরাও যেকোনো বছর বেছে ফলাফল দেখতে পারেন।</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="left">শ্রেণি</th>${C.EXAMS.map((e) => `<th>${e.name}</th>`).join('')}</tr></thead><tbody>${catalog.classes.map((c) => `<tr><td class="left">${esc(c.name)}</td>${C.EXAMS.map((e) => catalog.published[U.marksId(sel, e.key, c.id)] ? `<td><button class="btn btn-sm btn-green" data-open="${c.id}|${e.key}">দেখুন</button></td>` : '<td><span class="chip chip-gray">নেই</span></td>').join('')}</tr>`).join('')}</tbody></table></div></section>
      <section class="card" id="aDetail" hidden></section>
      <section class="card"><h2>সম্পূর্ণ ব্যাকআপ</h2><p>সব শিক্ষার্থী, নম্বর, ফলাফল, হিসাব ও নোটিশের একটি কপি আপনার কম্পিউটারে রাখুন। মাসে অন্তত একবার ব্যাকআপ নেওয়া ভালো।</p><button class="btn btn-dark" id="aBackup" type="button">${ic('down')}Full Backup Download</button></section>`;
    $$('[data-y]', v).forEach((b) => b.onclick = () => { ui.aYear = b.dataset.y; go('archive'); });
    $$('[data-open]', v).forEach((b) => b.onclick = async () => {
      const [c, e] = b.dataset.open.split('|'); const box = $('#aDetail'); box.hidden = false; box.innerHTML = '<p class="empty">লোড হচ্ছে…</p>';
      const { results } = await classResultData(sel, e, c);
      box.innerHTML = `<h2>${esc(className(c))} — ${C.examName(e)} ${bn(sel)}</h2>${resultTable(results)}`;
      bindMarksheets(box, results, sel, e, c); box.scrollIntoView({ behavior: 'smooth' });
    });
    $('#aBackup').onclick = backup;
  };
  async function backup() { try { const d = await store.exportAll(); download(`kutubjoom-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(d, null, 1), 'application/json'); toast('ব্যাকআপ ডাউনলোড হয়েছে'); } catch (e) { fail(e); } }

  // ---------- হিসাব ----------
  VIEWS.fees = async (v) => {
    const cls = ui.fClass || catalog.classes[0].id, year = ui.fYear || settings.activeYear, tab = ui.fTab || 'collect', period = ui.fPeriod || 'first';
    v.innerHTML = `<section class="card"><div class="toolbar">
      <label class="fld w-md"><span>শ্রেণি</span><select id="fClass">${classOpts(cls, catalog.classes)}</select></label>
      <label class="fld w-sm"><span>সাল</span><select id="fYear">${yearOpts(year)}</select></label>
      <label class="fld w-lg"><span>হিসাবের পর্ব</span><select id="fPeriod">${opt(C.FEE_PERIODS.map((p) => ({ v: p.key, t: p.name })).concat([{ v: 'all', t: 'সারা বছর' }]), period)}</select></label>
      <div class="toolbar" role="tablist">${[['collect', 'টাকা আদায় এন্ট্রি'], ['summary', 'বকেয়া সারাংশ'], ['structure', 'ফি নির্ধারণ']].map((t) => `<button type="button" class="btn ${t[0] === tab ? 'btn-dark' : 'btn-ghost'}" data-tab="${t[0]}" role="tab" aria-selected="${t[0] === tab}">${t[1]}</button>`).join('')}</div>
    </div><p class="muted" style="margin:10px 0 0">বছরে তিনবার হিসাব হয়: প্রথম সাময়িক (ভর্তি ফি + জানুয়ারি–এপ্রিল + পরীক্ষা ফি), দ্বিতীয় সাময়িক (মে–আগস্ট + পরীক্ষা ফি), বার্ষিক (সেপ্টেম্বর–ডিসেম্বর + পরীক্ষা ফি)।</p></section>
    <div id="fBody"></div>`;
    let students = [], fees = { structure: {}, payments: {}, overrides: {} };
    const items = C.feeItems();
    const periodItems = () => (ui.fPeriod === 'all' ? items : items.filter((it) => C.FEE_PERIODS.find((p) => p.key === ui.fPeriod).items.includes(it.key)));
    const load = async () => {
      ui.fClass = $('#fClass').value; ui.fYear = $('#fYear').value; ui.fPeriod = $('#fPeriod').value;
      [students, fees] = await Promise.all([store.listStudents({ year: ui.fYear, classId: ui.fClass }), store.getFees(ui.fYear, ui.fClass)]);
      fees.structure = fees.structure || {}; fees.payments = fees.payments || {}; fees.overrides = fees.overrides || {};
      students.sort((a, b) => C.num(a.roll) - C.num(b.roll));
      ({ collect: drawCollect, summary: drawSummary, structure: drawStructure })[ui.fTab || 'collect']();
    };
    const saveFees = async () => { try { await store.saveFees(ui.fYear, ui.fClass, fees); toast('হিসাব সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } };
    const noStudents = () => `<section class="card empty">${esc(className(ui.fClass))} এ ${bn(ui.fYear)} সালের কোনো শিক্ষার্থী নেই।</section>`;

    function drawStructure() {
      const s = fees.structure;
      $('#fBody').innerHTML = `<section class="card"><h2>${esc(className(ui.fClass))} — ${bn(ui.fYear)} সালের ফি</h2>
        <div class="toolbar">
          <label class="fld w-md"><span>ভর্তি ফি (৳)</span><input id="sAdm" inputmode="numeric" value="${esc(s.admission || '')}"></label>
          <label class="fld w-md"><span>মাসিক বেতন (৳)</span><input id="sMon" inputmode="numeric" value="${esc(s.monthly || '')}"></label>
          ${C.EXAMS.map((e) => `<label class="fld w-md"><span>${e.short} পরীক্ষা ফি (৳)</span><input id="sEx_${e.key}" inputmode="numeric" value="${esc(s['exam_' + e.key] || '')}"></label>`).join('')}
        </div>
        <div style="margin-top:14px" class="toolbar"><button class="btn btn-green" id="sSave" type="button">${ic('save')}ফি সংরক্ষণ করুন</button>
        <button class="btn btn-ghost" id="sCopy" type="button">অন্য সব শ্রেণিতেও একই ফি বসান</button></div>
        <p class="muted">কোনো শিক্ষার্থীর বেতন মাফ বা কম হলে "টাকা আদায় এন্ট্রি" টেবিলে তার নামের পাশে "ছাড়" বাটন থেকে আলাদা মাসিক বেতন দিন।</p></section>`;
      const read = () => ({ admission: C.num($('#sAdm').value) || 0, monthly: C.num($('#sMon').value) || 0, exam_first: C.num($('#sEx_first').value) || 0, exam_second: C.num($('#sEx_second').value) || 0, exam_annual: C.num($('#sEx_annual').value) || 0 });
      $('#sSave').onclick = async () => { fees.structure = read(); await saveFees(); };
      $('#sCopy').onclick = async () => {
        if (!(await confirmBox('সব শ্রেণিতে বসাবেন?', `${bn(ui.fYear)} সালের সব শ্রেণির ফি এই পরিমাণে বসানো হবে। আদায়ের এন্ট্রি বদলাবে না।`, 'বসিয়ে দিন'))) return;
        const st = read();
        try { for (const c of catalog.classes) { const f = await store.getFees(ui.fYear, c.id); await store.saveFees(ui.fYear, c.id, { structure: st, payments: f.payments || {}, overrides: f.overrides || {} }); } fees.structure = st; toast('সব শ্রেণিতে ফি বসানো হয়েছে'); } catch (e) { fail(e); }
      };
    }

    function drawCollect() {
      if (!students.length) { $('#fBody').innerHTML = noStudents(); return; }
      const its = periodItems();
      const st = fees.structure;
      if (!Number(st.monthly) && !Number(st.admission)) { $('#fBody').innerHTML = `<section class="card note">এই শ্রেণির ফি এখনো নির্ধারণ করা হয়নি। আগে "ফি নির্ধারণ" ট্যাবে ফি বসান।</section>`; return; }
      $('#fBody').innerHTML = `<section class="card"><div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">টাকা আদায় — ${esc(className(ui.fClass))} ${bn(ui.fYear)}</h2><button class="btn btn-green" id="cSave" type="button">${ic('save')}সংরক্ষণ করুন</button></div>
        <p class="muted">যে টাকা জমা হয়েছে তা ঘরে লিখুন। ঘরে দুইবার ক্লিক করলে পুরো টাকা বসে যাবে। সবুজ = পরিশোধ, লাল = বাকি।</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>রোল</th><th class="left">নাম</th>${its.map((it) => `<th>${esc(it.name)}<span class="th-sub">${money(C.feeDue(Object.assign({}, st, fees.overrides[''] || {}), it.key))}</span></th>`).join('')}<th>মোট জমা</th><th>বাকি</th><th></th></tr></thead>
        <tbody>${students.map((s) => { const p = fees.payments[s.id] || {}; const ov = fees.overrides[s.id] || {}; const stS = Object.assign({}, st, ov); return `<tr data-st="${s.id}"><td>${bn(s.roll)}</td><td class="left">${esc(s.name)}${ov.monthly != null ? ` <span class="chip chip-gold">বেতন ${money(ov.monthly)}</span>` : ''}</td>${its.map((it) => { const due = C.feeDue(stS, it.key); const val = p[it.key]; const cls = val == null || val === '' ? '' : (Number(val) >= due ? 'fee-paid' : 'fee-due'); return `<td class="${cls}"><input class="cell fee-cell" inputmode="numeric" data-s="${s.id}" data-k="${it.key}" data-due="${due}" value="${val == null ? '' : val}" aria-label="${esc(s.name)} — ${esc(it.name)}"></td>`; }).join('')}<td class="c-paid"></td><td class="c-bal"></td><td><button class="btn btn-sm btn-ghost" data-ov="${s.id}">ছাড়</button></td></tr>`; }).join('')}
        <tr class="sum-row"><td colspan="2" class="left">মোট</td>${its.map((it) => `<td data-sum="${it.key}"></td>`).join('')}<td id="sumPaid"></td><td id="sumBal"></td><td></td></tr></tbody></table></div></section>`;
      const recalc = () => {
        let tp = 0, tb = 0; const col = {};
        students.forEach((s) => {
          let paid = 0, due = 0;
          $$(`input[data-s="${s.id}"]`, v).forEach((inp) => { const n = C.num(inp.value) || 0; paid += n; due += Number(inp.dataset.due); col[inp.dataset.k] = (col[inp.dataset.k] || 0) + n; const td = inp.parentElement; td.className = inp.value.trim() === '' ? (Number(inp.dataset.due) ? '' : '') : (n >= Number(inp.dataset.due) ? 'fee-paid' : 'fee-due'); });
          const row = $(`tr[data-st="${s.id}"]`, v); row.querySelector('.c-paid').textContent = money(paid); const bal = Math.max(0, due - paid); row.querySelector('.c-bal').innerHTML = bal ? `<b class="f">${money(bal)}</b>` : '<span class="chip chip-green">পরিশোধ</span>';
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
      $$('[data-ov]', v).forEach((b) => b.onclick = async () => {
        const s = students.find((x) => x.id === b.dataset.ov); const ov = fees.overrides[s.id] || {};
        const d = await dialog('বেতন ছাড়', `<p>${esc(s.name)} এর জন্য আলাদা মাসিক বেতন দিন (পুরো মাফ হলে ০)। খালি রাখলে শ্রেণির নির্ধারিত বেতন (${money(fees.structure.monthly)}) প্রযোজ্য হবে।</p><label class="fld"><span>মাসিক বেতন (৳)</span><input id="mon" inputmode="numeric" value="${ov.monthly == null ? '' : ov.monthly}"></label>`);
        if (!d) return;
        if (d.mon.trim() === '') delete fees.overrides[s.id]; else fees.overrides[s.id] = { monthly: C.num(d.mon) || 0 };
        await saveFees(); drawCollect();
      });
    }

    function drawSummary() {
      if (!students.length) { $('#fBody').innerHTML = noStudents(); return; }
      const rows = students.map((s) => ({ s, f: C.studentFees(fees.structure, fees.payments[s.id], fees.overrides[s.id]) }));
      const per = ui.fPeriod;
      const pick = (f) => per === 'all' ? f : f.periods.find((p) => p.key === per);
      const tot = rows.reduce((a, r) => { const x = pick(r.f); a.due += x.due; a.paid += x.paid; a.bal += x.balance; return a; }, { due: 0, paid: 0, bal: 0 });
      const dueCount = rows.filter((r) => pick(r.f).balance > 0).length;
      $('#fBody').innerHTML = `<section class="stats">
          <div class="stat s2">${ic('fees')}<div><span>মোট প্রাপ্য</span><b>${money(tot.due)}</b></div></div>
          <div class="stat s1">${ic('save')}<div><span>মোট আদায়</span><b>${money(tot.paid)}</b></div></div>
          <div class="stat s4">${ic('notice')}<div><span>মোট বকেয়া</span><b>${money(tot.bal)}</b></div></div>
          <div class="stat s3">${ic('students')}<div><span>বকেয়া আছে</span><b>${bn(dueCount)} জন</b></div></div></section>
        <section class="card"><div class="toolbar" style="justify-content:space-between;align-items:center"><h2 style="margin:0">${per === 'all' ? 'সারা বছরের' : esc(C.FEE_PERIODS.find((p) => p.key === per).name)} — ${esc(className(ui.fClass))} ${bn(ui.fYear)}</h2>
        <div class="toolbar"><button class="btn btn-ghost" id="slipAll" type="button">${ic('print')}বকেয়া স্লিপ প্রিন্ট</button><button class="btn btn-ghost" id="fCsv" type="button">${ic('down')}Excel (CSV)</button></div></div>
        <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>রোল</th><th class="left">নাম</th>${C.FEE_PERIODS.map((p) => `<th>${p.name}<span class="th-sub">বাকি</span></th>`).join('')}<th>মোট প্রাপ্য</th><th>মোট জমা</th><th>মোট বাকি</th><th></th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${bn(r.s.roll)}</td><td class="left">${esc(r.s.name)}</td>${r.f.periods.map((p) => `<td>${p.balance ? `<b class="f">${money(p.balance)}</b>` : '<span class="chip chip-green">পরিশোধ</span>'}</td>`).join('')}<td>${money(r.f.due)}</td><td>${money(r.f.paid)}</td><td>${r.f.balance ? `<b class="f">${money(r.f.balance)}</b>` : '—'}</td><td><button class="btn btn-sm btn-ghost" data-slip="${r.s.id}">স্লিপ</button></td></tr>`).join('')}</tbody></table></div></section>`;
      const slip = (r) => {
        const p = fees.payments[r.s.id] || {}; const stS = Object.assign({}, fees.structure, fees.overrides[r.s.id] || {});
        const due = items.filter((it) => C.feeDue(stS, it.key) > (Number(p[it.key]) || 0));
        return `<div class="slip"><h3>${esc(settings.name)}</h3><p class="slip-sub">বকেয়া / পরীক্ষার ফি'র বিবরণ — ${bn(ui.fYear)}</p><p><b>নাম:</b> ${esc(r.s.name)} &nbsp; <b>শ্রেণি:</b> ${esc(className(ui.fClass))} &nbsp; <b>রোল:</b> ${bn(r.s.roll)}</p>
          <table class="tbl"><thead><tr>${due.map((it) => `<th>${esc(it.name)}</th>`).join('') || '<th>বকেয়া</th>'}<th>মোট বাকি</th></tr></thead><tbody><tr>${due.map((it) => `<td>${money(C.feeDue(stS, it.key) - (Number(p[it.key]) || 0))}</td>`).join('') || '<td>নেই</td>'}<td><b>${money(r.f.balance)}</b></td></tr></tbody></table>
          <p style="margin:10px 0 0">সম্মানিত অভিভাবক, আসন্ন পরীক্ষার আগে উপরের বকেয়া পরিশোধ করে প্রবেশপত্র সংগ্রহ করার অনুরোধ রইল।</p><p style="text-align:right;margin:24px 0 0;font-weight:700">প্রধান শিক্ষক</p></div>`;
      };
      $('#slipAll').onclick = () => { const list = rows.filter((r) => r.f.balance > 0); if (!list.length) return toast('কারো বকেয়া নেই।'); printHtml(list.map(slip).join('')); };
      $$('[data-slip]', v).forEach((b) => b.onclick = () => printHtml(slip(rows.find((r) => r.s.id === b.dataset.slip))));
      $('#fCsv').onclick = () => download(`fees-${ui.fYear}-${className(ui.fClass)}.csv`, csv([['রোল', 'নাম', ...items.map((it) => it.name), ...C.FEE_PERIODS.map((p) => p.name + ' বাকি'), 'মোট প্রাপ্য', 'মোট জমা', 'মোট বাকি'],
        ...rows.map((r) => { const p = fees.payments[r.s.id] || {}; return [r.s.roll, r.s.name, ...items.map((it) => p[it.key] == null ? '' : p[it.key]), ...r.f.periods.map((x) => x.balance), r.f.due, r.f.paid, r.f.balance]; })]), 'text/csv;charset=utf-8');
    }

    $$('[data-tab]', v).forEach((b) => b.onclick = () => { ui.fTab = b.dataset.tab; go('fees'); });
    $('#fClass').onchange = load; $('#fYear').onchange = load; $('#fPeriod').onchange = load;
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
      $('#nList').innerHTML = list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="left">শিরোনাম</th><th>তারিখ</th><th>অবস্থা</th><th>অ্যাকশন</th></tr></thead><tbody>${list.map((n) => `<tr><td class="left">${esc(n.title)}</td><td>${n.date ? bn(n.date.split('-').reverse().join('/')) : ''}</td><td>${n.pinned ? '<span class="chip chip-gold">গুরুত্বপূর্ণ</span>' : ''}</td><td><div class="row-actions"><button class="btn btn-sm btn-ghost" data-ed="${n.id}">এডিট</button><button class="btn btn-sm btn-red" data-del="${n.id}">Delete</button></div></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">কোনো নোটিশ নেই। উপরে নতুন নোটিশ লিখুন।</p>';
      $$('[data-ed]', v).forEach((b) => b.onclick = async () => {
        const n = list.find((x) => x.id === b.dataset.ed);
        const d = await dialog('নোটিশ এডিট', `<label class="fld"><span>শিরোনাম</span><input id="t" value="${esc(n.title)}" required></label><label class="fld"><span>তারিখ</span><input id="dt" type="date" value="${esc(n.date || '')}"></label><label class="fld"><span>বিস্তারিত</span><textarea id="b">${esc(n.body || '')}</textarea></label><label><input type="checkbox" id="p" ${n.pinned ? 'checked' : ''}> গুরুত্বপূর্ণ</label>`);
        if (!d || !d.t.trim()) return;
        try { await store.saveNotice(Object.assign({}, n, { title: d.t.trim(), date: d.dt, body: d.b.trim(), pinned: d.p })); toast('সংরক্ষণ হয়েছে'); load(); } catch (e) { fail(e); }
      });
      $$('[data-del]', v).forEach((b) => b.onclick = async () => { const n = list.find((x) => x.id === b.dataset.del); if (await confirmBox('নোটিশ মুছবেন?', `"${esc(n.title)}" নোটিশটি ওয়েবসাইট থেকে সরে যাবে।`, 'মুছে ফেলুন')) { try { await store.deleteNotice(n.id); toast('মুছে ফেলা হয়েছে'); load(); } catch (e) { fail(e); } } });
    };
    $('#nAdd').onclick = async () => {
      const title = $('#nTitle').value.trim(); if (!title) return toast('নোটিশের শিরোনাম লিখুন।', true);
      try { await store.saveNotice({ title, date: $('#nDate').value, body: $('#nBody').value.trim(), pinned: $('#nPin').checked }); $('#nTitle').value = ''; $('#nBody').value = ''; $('#nPin').checked = false; toast('নোটিশ প্রকাশিত হয়েছে'); load(); } catch (e) { fail(e); }
    };
    await load();
  };

  // ---------- ভর্তি বিজ্ঞপ্তি ----------
  VIEWS.admission = async (v) => {
    const s = settings;
    v.innerHTML = `<section class="adm-preview" id="aPrev"><h2></h2><p class="b"></p><p><b>ভর্তির শেষ সময়: <span class="d"></span></b></p></section>
      <section class="card"><h2>ভর্তি বিজ্ঞপ্তি এডিট</h2>
      <label class="fld"><span>শিরোনাম</span><input id="adT" value="${esc(s.admissionTitle || '')}"></label>
      <label class="fld" style="margin-top:10px"><span>বিস্তারিত</span><textarea id="adB">${esc(s.admissionBody || '')}</textarea></label>
      <div class="toolbar" style="margin-top:10px;align-items:center"><label class="fld w-lg"><span>ভর্তির শেষ সময়</span><input id="adD" value="${esc(s.admissionDeadline || '')}" placeholder="যেমন: ৩১ জানুয়ারি ২০২৭"></label>
      <label><input type="checkbox" id="adO" ${s.admissionOpen !== false ? 'checked' : ''}> ওয়েবসাইটে দেখান</label>
      <button class="btn btn-green" id="adSave" type="button">${ic('save')}সংরক্ষণ করুন</button></div></section>`;
    const prev = () => { $('#aPrev h2').textContent = $('#adT').value; $('#aPrev .b').textContent = $('#adB').value; $('#aPrev .d').textContent = $('#adD').value; };
    ['#adT', '#adB', '#adD'].forEach((id) => { $(id).oninput = prev; }); prev();
    $('#adSave').onclick = async () => { const d = { admissionTitle: $('#adT').value.trim(), admissionBody: $('#adB').value.trim(), admissionDeadline: $('#adD').value.trim(), admissionOpen: $('#adO').checked }; try { await store.saveSettings(d); Object.assign(settings, d); toast('ভর্তি বিজ্ঞপ্তি সংরক্ষণ হয়েছে'); } catch (e) { fail(e); } };
  };

  // ---------- সেটিংস ----------
  VIEWS.settings = async (v) => {
    const s = settings;
    const f = (id, label, val, extra) => `<label class="fld"><span>${label}</span><input id="${id}" value="${esc(val || '')}" ${extra || ''}></label>`;
    const imgRow = (k, label, max, round) => `<div class="img-row"><div class="img-thumb${round ? ' round' : ''}" id="th_${k}" style="background-image:url('${esc(images[k] || ({ logo: 'assets/logo.webp', campus: 'assets/campus.jpg', devPhoto: 'assets/developer.webp' })[k])}')"></div><div class="fld grow"><span>${label}</span><input type="file" accept="image/*" id="fi_${k}" data-max="${max}"></div><button class="btn btn-sm btn-ghost" type="button" data-orig="${k}">আসল ছবি</button></div>`;
    v.innerHTML = `<div class="grid-2">
      <section class="card"><h2>লোগো ও ছবি</h2>${imgRow('logo', 'মাদ্রাসার লোগো', 400)}${imgRow('campus', 'মাদ্রাসার ক্যাম্পাসের ছবি', 1400)}${imgRow('devPhoto', 'ডেভেলপারের ছবি', 300, true)}<p class="muted">ছবি নিজে থেকে ছোট করে সংরক্ষণ হয়, তাই ওয়েবসাইট দ্রুত খুলবে।</p></section>
      <section class="card"><h2>নাম ও ঠিকানা</h2><div style="display:grid;gap:10px">${f('stName', 'মাদ্রাসার নাম (বাংলা)', s.name)}${f('stNameEn', 'মাদ্রাসার নাম (ইংরেজি)', s.nameEn)}${f('stAddr', 'ঠিকানা', s.address)}<div class="grid-2" style="gap:10px">${f('stS1', 'স্লোগান (১ম লাইন)', s.slogan1)}${f('stS2', 'স্লোগান (২য় লাইন)', s.slogan2)}</div>${f('stYear', 'চলতি শিক্ষাবর্ষ (Active Exam Year)', s.activeYear, 'inputmode="numeric"')}</div></section>
      <section class="card"><h2>মাদ্রাসার যোগাযোগ</h2><div style="display:grid;gap:10px">${f('stPhone', 'মোবাইল', s.phone, 'inputmode="tel"')}${f('stEmail', 'ইমেইল', s.email, 'type="email"')}${f('stFb', 'ফেসবুক পেজের লিংক', s.facebook)}</div></section>
      <section class="card"><h2>ডেভেলপার তথ্য</h2><div style="display:grid;gap:10px">${f('stDev', 'ডেভেলপারের নাম', s.devName)}${f('stDevPhone', 'ডেভেলপারের মোবাইল / WhatsApp', s.devPhone, 'inputmode="tel"')}${f('stDevEmail', 'ডেভেলপারের ইমেইল', s.devEmail, 'type="email"')}${f('stQuote', 'ফুটারের উক্তি', s.devQuote)}</div></section>
      <section class="card"><h2>প্রিন্সিপাল লগইন</h2><p>User ID: <b>${esc(me.userId)}</b></p><button class="btn btn-dark" type="button" id="stPw">পাসওয়ার্ড পরিবর্তন করুন</button></section>
      <section class="card"><h2>ব্যাকআপ</h2><p>সব ডাটার একটি কপি কম্পিউটারে রাখুন।</p><div class="toolbar"><button class="btn btn-dark" type="button" id="stBackup">${ic('down')}Full Backup Download</button>${store.mode === 'demo' ? '<button class="btn btn-red" type="button" id="stReset">ডেমো ডাটা নতুন করে শুরু</button>' : ''}</div></section>
    </div>
    <section class="card"><button class="btn btn-green" type="button" id="stSave">${ic('save')}সব সেটিংস সংরক্ষণ করুন</button></section>`;
    $$('input[type=file]', v).forEach((inp) => inp.onchange = async () => {
      const k = inp.id.slice(3);
      try { const url = await readImage(inp.files[0], Number(inp.dataset.max), k === 'campus' ? 'image/jpeg' : 'image/webp'); if (!url) return; await store.saveImages({ [k]: url }); images[k] = url; $('#th_' + k).style.backgroundImage = `url('${url}')`; applyBrand(); toast('ছবি সংরক্ষণ হয়েছে'); } catch (e) { fail(e); }
    });
    $$('[data-orig]', v).forEach((b) => b.onclick = async () => { const k = b.dataset.orig; try { await store.saveImages({ [k]: '' }); images[k] = ''; toast('আসল ছবি ফিরিয়ে আনা হয়েছে'); go('settings'); } catch (e) { fail(e); } });
    $('#stPw').onclick = changePw; $('#stBackup').onclick = backup;
    if ($('#stReset')) $('#stReset').onclick = async () => { if (await confirmBox('ডেমো রিসেট', 'সব নমুনা ডাটা প্রথম অবস্থায় ফিরে যাবে।', 'রিসেট করুন')) { await store.resetDemo(); location.reload(); } };
    $('#stSave').onclick = async () => {
      const y = C.toEn($('#stYear').value);
      if (!/^20\d\d$/.test(y)) return toast('সঠিক শিক্ষাবর্ষ লিখুন, যেমন 2026।', true);
      const d = { name: $('#stName').value.trim(), nameEn: $('#stNameEn').value.trim(), address: $('#stAddr').value.trim(), slogan1: $('#stS1').value.trim(), slogan2: $('#stS2').value.trim(), activeYear: y, phone: C.toEn($('#stPhone').value), email: $('#stEmail').value.trim(), facebook: $('#stFb').value.trim(), devName: $('#stDev').value.trim(), devPhone: C.toEn($('#stDevPhone').value), devEmail: $('#stDevEmail').value.trim(), devQuote: $('#stQuote').value.trim() };
      if (!d.name) return toast('মাদ্রাসার নাম খালি রাখা যাবে না।', true);
      try { await store.saveSettings(d); Object.assign(settings, d); applyBrand(); toast('সেটিংস সংরক্ষণ হয়েছে'); } catch (e) { fail(e); }
    };
  };

  // ---------- পাসওয়ার্ড, লগইন, লগআউট ----------
  async function changePw() {
    const d = await dialog('পাসওয়ার্ড পরিবর্তন', `<label class="fld"><span>বর্তমান পাসওয়ার্ড</span><input id="cur" type="password" autocomplete="current-password" required></label><label class="fld"><span>নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)</span><input id="nw" type="password" autocomplete="new-password" required></label><label class="fld"><span>নতুন পাসওয়ার্ড আবার লিখুন</span><input id="nw2" type="password" autocomplete="new-password" required></label>`, 'পরিবর্তন করুন');
    if (!d) return;
    if (d.nw.length < 8) return toast('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।', true);
    if (d.nw !== d.nw2) return toast('দুইবার লেখা নতুন পাসওয়ার্ড মিলছে না।', true);
    try { await store.changePassword(d.cur, d.nw); toast('পাসওয়ার্ড পরিবর্তন হয়েছে'); } catch (e) { fail(e); }
  }
  async function logout() { await store.logout(); location.hash = ''; }

  let setupMode = false;
  async function showLogin() {
    $('#appView').hidden = true; $('#loginView').hidden = false;
    document.title = 'স্টাফ লগইন | কুতুবজোম মাদ্রাসা';
    try { setupMode = await store.needsSetup(); } catch (e) { setupMode = false; }
    if (setupMode) {
      $('#loginTitle').textContent = 'প্রথমবার সেটআপ';
      $('#loginSub').textContent = 'প্রিন্সিপালের অ্যাকাউন্ট তৈরি করুন। এটি শুধু একবারই করা যাবে।';
      $('#lNameWrap').hidden = false; $('#loginBtn span').textContent = 'অ্যাকাউন্ট তৈরি করুন';
      $('#lPass').placeholder = 'নতুন Password (কমপক্ষে ৮ অক্ষর)'; $('#lPass').autocomplete = 'new-password';
    }
  }
  async function showApp() {
    $('#loginView').hidden = true; $('#appView').hidden = false;
    document.title = 'অ্যাডমিন প্যানেল | কুতুবজোম মাদ্রাসা';
    $('#whoName').textContent = me.role === 'principal' ? 'Principal' : me.name;
    $('#whoPhoto').hidden = me.role !== 'principal';
    $('#whoBtn').classList.toggle('no-photo', me.role !== 'principal');
    buildNav();
    const h = (location.hash || '').slice(1);
    go(PAGES.some((p) => p.k === h && (isP() || p.all)) ? h : 'dashboard');
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
        if (!/^[A-Za-z0-9._-]{3,30}$/.test(user)) throw new Error('User ID ইংরেজি অক্ষর/সংখ্যায় ৩–৩০ অক্ষরের হবে।');
        if (pass.length < 8) throw new Error('Password কমপক্ষে ৮ অক্ষরের দিন।');
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
  window.addEventListener('beforeprint', () => { if (!$('#printArea').innerHTML) $('#printArea').innerHTML = '<p>প্রিন্ট করার জন্য মার্কশিট বা স্লিপ বাটন ব্যবহার করুন।</p>'; });
  window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });

  store.onAuth((p) => { me = p; if (p) showApp(); else showLogin(); });
})();
