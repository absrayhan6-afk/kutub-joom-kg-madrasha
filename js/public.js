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
    $$('[data-img]').forEach((el) => { const v = images[el.dataset.img]; if (v) el.src = v; });
    $$('[data-bg]').forEach((el) => { const v = images[el.dataset.bg]; if (v) el.style.backgroundImage = `url('${v}')`; });
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
        area.innerHTML = M.render(r, settings, images) + '<div class="result-actions"><button class="btn btn-green" type="button" id="printBtn">প্রিন্ট / PDF ডাউনলোড</button><button class="btn btn-ghost" type="button" id="againBtn">আরেকটি ফলাফল দেখুন</button></div>';
        $('#printBtn').onclick = () => window.print();
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
