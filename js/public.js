// অভিভাবকদের পেজ: সেটিংস দেখানো, নোটিশ, রেজাল্ট খোঁজা
(async function () {
  'use strict';
  const C = window.Calc, M = window.Marksheet;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc;
  let settings = window.StoreUtil.DEFAULT_SETTINGS, images = {}, catalog = { classes: window.StoreUtil.DEFAULT_CLASSES, published: {} };

  // মোবাইল মেনু
  const menuBtn = $('#menuBtn'), nav = $('#mainNav');
  menuBtn.addEventListener('click', () => { const o = nav.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', o); });
  $$('#mainNav a[data-nav]').forEach((a) => a.addEventListener('click', () => {
    $$('#mainNav a').forEach((x) => x.classList.toggle('active', x === a));
    nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false');
  }));
  $('#yearNow').textContent = C.toBn(new Date().getFullYear());

  // ফেসবুক লিংক: মোবাইলে সরাসরি ফেসবুক অ্যাপে খোলে (অ্যাপে লগইন থাকে, তাই লগইন পেজ আসে না)।
  // অ্যাপ না থাকলে বা কম্পিউটারে সাধারণ ফেসবুক লিংক খোলে।
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href*="facebook.com"]');
    if (!a) return;
    const url = a.href.replace('://m.facebook.com', '://www.facebook.com');
    const isAndroid = /Android/i.test(navigator.userAgent), isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isAndroid && !isIOS) return; // কম্পিউটারে নতুন ট্যাবে সাধারণ লিংক
    ev.preventDefault();
    const app = isAndroid ? 'fb://facewebmodal/f?href=' + encodeURIComponent(url) : 'fb://profile?id=' + encodeURIComponent(url.split('facebook.com/')[1] || '');
    let left = false;
    const onHide = () => { left = true; };
    document.addEventListener('visibilitychange', onHide, { once: true });
    window.location.href = isIOS ? 'fb://facewebmodal/f?href=' + encodeURIComponent(url) : app;
    setTimeout(() => { document.removeEventListener('visibilitychange', onHide); if (!left && !document.hidden) window.open(url, '_blank', 'noopener'); }, 1200);
  });

  function applySettings() {
    $$('[data-set]').forEach((el) => {
      const v = settings[el.dataset.set];
      if (v == null || v === '') return;
      el.textContent = /phone/i.test(el.dataset.set) ? C.toBn(v) : v;
      if (el.dataset.href === 'tel') el.href = 'tel:' + v;
      if (el.dataset.href === 'mailto') el.href = 'mailto:' + v;
    });
    $$('[data-set-link]').forEach((el) => { const v = settings[el.dataset.setLink]; if (v) el.href = v; else el.hidden = true; });
    $$('[data-href-tel]').forEach((el) => { el.href = 'tel:' + settings[el.dataset.hrefTel]; });
    $$('[data-href-wa]').forEach((el) => { el.href = 'https://wa.me/88' + C.toEn(settings[el.dataset.hrefWa]).replace(/^\+?88/, ''); });
    $$('[data-href-mail]').forEach((el) => { el.href = 'mailto:' + settings[el.dataset.hrefMail]; });
    $('#admission').hidden = settings.admissionOpen === false;
    $$('[data-img]').forEach((el) => { const v = images[el.dataset.img]; if (v) { el.src = v; el.hidden = false; } });
    $$('[data-bg]').forEach((el) => { const v = images[el.dataset.bg] || images[el.dataset.bgFallback]; if (v) el.style.backgroundImage = `url('${v}')`; });
  }

  function fillSelects() {
    $('#fClass').innerHTML = '<option value="">ক্লাস নির্বাচন করুন</option>' + catalog.classes.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    $('#fExam').innerHTML = '<option value="">পরীক্ষা নির্বাচন করুন</option>' + C.EXAMS.map((e) => `<option value="${e.key}">${e.name}</option>`).join('');
    const years = new Set([String(settings.activeYear)]);
    Object.keys(catalog.published || {}).forEach((k) => years.add(k.split('_')[0]));
    const list = Array.from(years).filter(Boolean).sort((a, b) => b - a);
    $('#fYear').innerHTML = list.map((y) => `<option value="${y}">${C.toBn(y)}</option>`).join('');
  }

  function renderNotices(list) {
    const box = $('#noticeList');
    if (!list.length) { box.innerHTML = '<p class="muted">এখন কোনো নোটিশ নেই।</p>'; return; }
    box.innerHTML = list.slice(0, 8).map((n) => `<article class="notice${n.pinned ? ' pinned' : ''}"><h3>${esc(n.title)}${n.pinned ? '<span class="pin">গুরুত্বপূর্ণ</span>' : ''}</h3>${n.date ? `<time datetime="${esc(n.date)}">${C.toBn(n.date.split('-').reverse().join('/'))}</time>` : ''}${n.body ? `<p>${esc(n.body)}</p>` : ''}</article>`).join('');
  }

  const msg = (t) => { const el = $('#formMsg'); el.textContent = t || ''; el.hidden = !t; };

  let store;
  try {
    store = await window.getStore();
    if (store.mode === 'demo') $('#demoBar').hidden = false;
    [settings, images, catalog] = await Promise.all([store.getSettings(), store.getImages(), store.getCatalog()]);
    applySettings(); fillSelects();
    renderNotices(await store.listNotices());
  } catch (e) {
    fillSelects();
    $('#noticeList').innerHTML = '<p class="muted">নোটিশ লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে পেজটি আবার খুলুন।</p>';
  }

  // ===== অনলাইন ভর্তি আবেদন: নতুন ভর্তি ও পুরাতন শিক্ষার্থীর ভর্তি নবায়ন (একই লিংক) =====
  const AF = window.AdmissionForm;
  const apMsg = (t) => { const el = $('#apMsg'); el.textContent = t || ''; el.hidden = !t; };
  let apPhoto = '', apType = 'new';
  const nextYear = () => String(Number(settings.activeYear) + (new Date().getMonth() >= 9 ? 1 : 0));
  function openApply() {
    $('#apply').hidden = false; $('#applyChoose').hidden = false; $('#applyForm').hidden = true; $('#applyDone').hidden = true;
    setTimeout(() => $('#apply').scrollIntoView({ behavior: 'smooth' }), 30);
  }
  function chooseType(t) {
    apType = t === 'renew' ? 'renew' : 'new';
    $('#applyChoose').hidden = true; $('#applyForm').hidden = false; apMsg('');
    $('#apTitle').textContent = apType === 'renew' ? `ভর্তি নবায়ন ফরম (পুরাতন শিক্ষার্থী) · শিক্ষাবর্ষ ${nextYear()}` : 'অনলাইন ভর্তি ফরম (নতুন শিক্ষার্থী)';
    $('#apClassLbl').innerHTML = (apType === 'renew' ? 'নতুন শিক্ষাবর্ষে যে শ্রেণিতে পড়বে' : 'যে শ্রেণিতে ভর্তি হতে চায়') + ' <b class="req">*</b>';
    $$('[data-only]', $('#applyForm')).forEach((el) => { el.hidden = el.dataset.only !== apType; });
    $('#apPhotoLbl').innerHTML = apType === 'renew' ? 'শিক্ষার্থীর ছবি (ঐচ্ছিক)' : 'শিক্ষার্থীর ছবি <b class="req">*</b> (বাধ্যতামূলক)';
    $('#apClass').innerHTML = '<option value="">শ্রেণি নির্বাচন করুন</option>' + catalog.classes.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    showFees();
    $('#applyForm').scrollIntoView({ behavior: 'smooth' });
  }
  // বাছাই করা শ্রেণির ফি (এডমিন প্যানেলে ঠিক করা)
  function showFees() {
    const box = $('#apFeeBox'); const f = AF.feesFor(settings, apType, $('#apClass').value);
    if (!$('#apClass').value || !AF.hasFees(f, settings)) { box.hidden = true; return; }
    const cls = (catalog.classes.find((c) => c.id === $('#apClass').value) || {}).name || '';
    box.hidden = false;
    box.innerHTML = `<b>${esc(cls)} — ${apType === 'renew' ? 'ভর্তি নবায়নের' : 'ভর্তির'} ফি</b><div class="apply-fee-grid">${AF.feeItems(settings).filter((k) => String(f[k[0]] || '').trim()).map((k) => `<span>${k[1]}<b>৳ ${esc(C.toEn(f[k[0]]))}</b></span>`).join('')}<span class="tot">মোট টাকা<b>৳ ${AF.feeTotal(f, settings)}</b></span></div>`;
  }
  $('#apClass').addEventListener('change', showFees);
  $$('#applyOpen, [data-open-apply]').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); nav.classList.remove('open'); openApply(); }));
  $$('.apply-type').forEach((b) => { b.onclick = () => chooseType(b.dataset.type); });
  if (location.hash === '#apply') openApply();
  const closeApply = () => { $('#apply').hidden = true; $('#admission').scrollIntoView({ behavior: 'smooth' }); };
  $('#apCancel').onclick = closeApply; $('#apCancel0').onclick = closeApply;
  $('#apBack').onclick = () => { $('#applyForm').hidden = true; $('#applyChoose').hidden = false; };
  $$('input[name=apRel]').forEach((r) => r.addEventListener('change', () => { $('#apRelOtherWrap').hidden = r.value !== 'অন্যান্য' || !r.checked; }));
  // অভিভাবক পিতা বা মাতা হলে নাম নিজে থেকে বসে
  $$('input[name=apRel]').forEach((r) => r.addEventListener('change', () => {
    const g = $('#apGuardian'); if (g.value.trim() && !g.dataset.auto) return;
    const v = r.value === 'পিতা' ? $('#apFather').value.trim() : r.value === 'মাতা' ? $('#apMother').value.trim() : '';
    if (v) { g.value = v; g.dataset.auto = '1'; }
  }));
  $('#apGuardian').addEventListener('input', () => { delete $('#apGuardian').dataset.auto; });
  $('#apNameBn').addEventListener('input', () => { const en = $('#apNameEn'); if (!en.dataset.touched) en.value = window.Translit.name($('#apNameBn').value); });
  $('#apNameEn').addEventListener('input', () => { $('#apNameEn').dataset.touched = '1'; });
  $('#apPhoto').addEventListener('change', async () => {
    const f = $('#apPhoto').files[0]; if (!f) return;
    try {
      const src = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(f); });
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const w = 300, h = 360, r = w / h; let sw = img.width, sh = img.height; if (sw / sh > r) sw = sh * r; else sh = sw / r;
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) * 0.3, sw, sh, 0, 0, w, h);
      apPhoto = cv.toDataURL('image/jpeg', 0.8); $('#apPh').style.backgroundImage = `url('${apPhoto}')`; $('#apPh').textContent = '';
    } catch (e) { apMsg('ছবিটি খোলা যাচ্ছে না। অন্য ছবি দিন।'); }
  });
  $('#applyForm').addEventListener('submit', async (ev) => {
    ev.preventDefault(); apMsg('');
    const v = (id) => $(id).value.trim();
    const renew = apType === 'renew';
    const cls = catalog.classes.find((c) => c.id === v('#apClass'));
    const g = ($('input[name=apGender]:checked') || {}).value || '';
    const rel = ($('input[name=apRel]:checked') || {}).value || '';
    const a = { type: apType, nameBn: v('#apNameBn'), nameEn: v('#apNameEn'), dob: v('#apDob'), gender: g, father: v('#apFather'), mother: v('#apMother'), guardian: v('#apGuardian'), relation: rel, relationOther: rel === 'অন্যান্য' ? v('#apRelOther') : '', address: v('#apAddr'), guardianMobile: C.toEn(v('#apGMobile')), mobile2: C.toEn(v('#apMobile2')), email: v('#apEmail'), currentClass: renew ? '' : v('#apCur'), applyClassId: cls ? cls.id : '', applyClass: cls ? cls.name : '', year: nextYear(), reg: renew ? C.toEn(v('#apReg')) : '' };
    if (apPhoto) a.photo = apPhoto;
    if (renew && !/^\d{1,8}$/.test(a.reg)) return apMsg('সঠিক রেজিস্ট্রেশন নম্বর লিখুন (শুধু সংখ্যা)।');
    if (!renew && !apPhoto) return apMsg('নতুন শিক্ষার্থীর ছবি দেওয়া বাধ্যতামূলক। "শিক্ষার্থীর ছবি" ঘরে ছবি দিন।');
    if (!cls) return apMsg(renew ? 'নতুন শিক্ষাবর্ষে যে শ্রেণিতে পড়বে তা নির্বাচন করুন।' : 'যে শ্রেণিতে ভর্তি হতে চায় তা নির্বাচন করুন।');
    if (!a.nameBn) return apMsg('শিক্ষার্থীর নাম (বাংলায়) লিখুন।');
    if (!g) return apMsg('লিঙ্গ নির্বাচন করুন।');
    if (!a.father) return apMsg('পিতার নাম লিখুন।');
    if (!a.address) return apMsg('বর্তমান ঠিকানা লিখুন।');
    if (!/^01\d{9}$/.test(a.guardianMobile)) return apMsg('সঠিক মোবাইল নম্বর (১) দিন (11 সংখ্যা, 01 দিয়ে শুরু)।');
    if (a.mobile2 && !/^01\d{9}$/.test(a.mobile2)) return apMsg('মোবাইল নম্বর (২) সঠিক নয় (11 সংখ্যা, 01 দিয়ে শুরু), অথবা ঘরটি খালি রাখুন।');
    if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return apMsg('ই-মেইল ঠিকানা সঠিক নয়, অথবা ঘরটি খালি রাখুন।');
    if (!$('#apDecl').checked) return apMsg('ঘোষণার ঘরে টিক দিন।');
    Object.keys(a).forEach((k) => { if (a[k] === '') delete a[k]; });
    const btn = $('#apSubmit'); btn.disabled = true;
    try {
      if (!store) store = await window.getStore();
      let code;
      try { code = await store.submitApplication(a); }
      catch (e) {
        // ডাটাবেসের নিয়ম এখনো পুরনো থাকলে: নতুন ঘরগুলো একটি ঘরে রেখে জমা (কোনো তথ্য হারায় না)
        if (!/অনুমতি/.test(e.message || '')) throw e;
        code = await store.submitApplication(AF.legacy(a));
      }
      const full = Object.assign({ code, submittedAt: Date.now(), status: 'new' }, a);
      const done = $('#applyDone');
      done.innerHTML = `<div class="tick"><svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg></div><h3 style="justify-content:center">${renew ? 'ভর্তি নবায়নের' : 'ভর্তির'} আবেদন সফলভাবে জমা হয়েছে</h3><p>আপনার আবেদন কোড:</p><div class="apply-code">${esc(code)}</div><p class="muted">কোডটি লিখে রাখুন। মাদ্রাসায় এলে এই কোড বললেই আপনার ফর্ম খুঁজে পাওয়া যাবে। ফর্মের PDF আপনার মোবাইলে ডাউনলোড হচ্ছে।</p><div class="result-actions"><button class="btn btn-green" type="button" id="apPdf">PDF আবার ডাউনলোড</button><button class="btn btn-ghost" type="button" id="apPrint">প্রিন্ট</button></div><div class="af-scale" style="margin-top:16px">${AF.render(full, settings, images)}</div>`;
      $('#applyForm').hidden = true; done.hidden = false; done.scrollIntoView({ behavior: 'smooth' });
      const getPdf = () => AF.pdf(AF.render(full, settings, images), `${renew ? 'Renewal' : 'Admission'}-Form-${code}.pdf`).catch(() => apMsg('PDF তৈরি করা যায়নি। "প্রিন্ট" চেপে Save as PDF করুন।'));
      $('#apPdf').onclick = getPdf;
      $('#apPrint').onclick = () => { $('#resultArea').hidden = false; $('#resultArea').innerHTML = AF.render(full, settings, images); window.print(); };
      getPdf();
      $('#applyForm').reset(); apPhoto = ''; $('#apPh').style.backgroundImage = ''; $('#apPh').textContent = 'শিক্ষার্থীর ছবি'; delete $('#apNameEn').dataset.touched; $('#apRelOtherWrap').hidden = true;
    } catch (e) { apMsg(e.message || 'আবেদন জমা দেওয়া যায়নি। আবার চেষ্টা করুন।'); } finally { btn.disabled = false; }
  });

  $('#resultForm').addEventListener('submit', async (ev) => {
    ev.preventDefault(); msg('');
    const q = { classId: $('#fClass').value, exam: $('#fExam').value, roll: C.toEn($('#fRoll').value), reg: C.toEn($('#fReg').value), year: $('#fYear').value };
    if (!q.classId) return msg('ক্লাস নির্বাচন করুন।');
    if (!q.exam) return msg('পরীক্ষা নির্বাচন করুন।');
    if (!/^\d+$/.test(q.roll)) return msg('সঠিক রোল নম্বর লিখুন (শুধু সংখ্যা)।');
    if (!q.reg) return msg('রেজিস্ট্রেশন নম্বর লিখুন।');
    const btn = $('#searchBtn'); btn.disabled = true;
    const area = $('#resultArea');
    try {
      if (!store) store = await window.getStore();
      const key = window.StoreUtil.marksId(q.year, q.exam, q.classId);
      const r = await store.findResult(q);
      area.hidden = false;
      if (r) {
        area.innerHTML = M.render(r, settings, images) + '<div class="result-actions"><button class="btn btn-green" type="button" id="pdfBtn">PDF ডাউনলোড</button><button class="btn btn-ghost" type="button" id="printBtn">প্রিন্ট</button><button class="btn btn-ghost" type="button" id="againBtn">আরেকটি ফলাফল দেখুন</button></div>';
        $('#printBtn').onclick = () => window.print();
        $('#pdfBtn').onclick = async () => {
          const b = $('#pdfBtn'); b.disabled = true; const t = b.textContent; b.textContent = 'PDF তৈরি হচ্ছে…';
          try { await M.pdf(r, settings, images, `Marksheet-${C.toEn(r.roll)}-${C.toEn(r.reg)}-${r.year}.pdf`); b.textContent = '✓ PDF ডাউনলোড হয়েছে'; setTimeout(() => { b.textContent = t; }, 4000); }
          catch (e) { console.error(e); b.textContent = t; alert('PDF তৈরি করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন, অথবা Chrome ব্রাউজারে খুলে "প্রিন্ট" চেপে Save as PDF করুন।'); }
          finally { b.disabled = false; }
        };
      } else {
        const cls = (catalog.classes.find((c) => c.id === q.classId) || {}).name || '';
        const published = catalog.published && catalog.published[key];
        area.innerHTML = `<div class="not-found"><h3>${published ? 'ফলাফল পাওয়া যায়নি' : 'ফলাফল এখনো প্রকাশিত হয়নি'}</h3><p>${published
          ? `${esc(cls)}, ${C.examName(q.exam)} ${C.toBn(q.year)}: রোল ${C.toBn(q.roll)} ও রেজিস্ট্রেশন ${C.toBn(q.reg)} মিলছে না। নম্বর দুটি আবার দেখে লিখুন।`
          : `${esc(cls)}, ${C.examName(q.exam)} ${C.toBn(q.year)} এর ফলাফল মাদ্রাসা কর্তৃপক্ষ এখনো প্রকাশ করেনি। প্রকাশের পর এখানে দেখা যাবে।`}</p></div><div class="result-actions"><button class="btn btn-ghost" type="button" id="againBtn">আবার চেষ্টা করুন</button></div>`;
      }
      $('#againBtn').onclick = () => { area.hidden = true; $('#result').scrollIntoView({ behavior: 'smooth' }); $('#fRoll').focus(); };
      area.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      msg(e.message || 'ফলাফল খুঁজতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally { btn.disabled = false; }
  });
})();
