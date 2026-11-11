// ভর্তি ফরম (মাদ্রাসার ফরম্যাট অনুযায়ী) ও PDF তৈরি — অভিভাবকদের পেজ ও অ্যাডমিন দুই জায়গায় ব্যবহার হয়।
(function (global) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dmy = (ts) => { const d = ts ? new Date(ts) : new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const iso2dmy = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v.split('-').reverse().join('/') : (v || ''));

  const ICONS = {
    book: 'M2 5c3-1.5 6.5-1.5 9.5.5v15C8.5 18.5 5 18.5 2 20zm20 0c-3-1.5-6.5-1.5-9.5.5v15c3-2 6.5-2 9.5-.5z',
    people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3.3 0-7 1.7-7 4.5V20h14v-2.5C16 14.7 12.3 13 9 13zm7.6.1A5 5 0 0 1 18 17.5V20h4v-2.5c0-2.3-2.8-4-5.4-4.4z',
    cap: 'M12 3 1 9l11 6 9-4.9V17h2V9zM5 13.2v4L12 21l7-3.8v-4L12 17z',
    plus: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v4h4v2h-4v4h-2v-4H7v-2h4V7z',
    pen: 'M3 17.2V21h3.8l11-11-3.8-3.8zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.8 3.8z'
  };
  const sec = (icon, title) => `<div class="af-sec"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[icon]}"/></svg><span>${title}</span></div>`;
  const line = (label, value, cls) => `<div class="af-row ${cls || ''}"><span class="af-l">${label}</span><span class="af-c">:</span><span class="af-v">${esc(value) || '&nbsp;'}</span></div>`;

  // a = আবেদনের তথ্য, s = সেটিংস, img = ছবি (logo, sign)
  function render(a, s, img) {
    a = a || {}; s = s || {}; img = img || {};
    const logo = img.logo || 'assets/logo.webp';
    const gender = (g) => `<span class="af-box">${a.gender === g ? '✓' : ''}</span>`;
    return `<article class="adm-form" lang="bn">
  <div class="af-leaf af-leaf-l" aria-hidden="true"></div><div class="af-leaf af-leaf-r" aria-hidden="true"></div>
  <header class="af-head">
    <img class="af-logo" src="${esc(logo)}" alt="লোগো">
    <div class="af-title">
      <p class="af-tag">“${esc(s.bTagline || 'ইসলাম শিক্ষা, নৈতিকতা ও আধুনিকতার সমন্বয়ে')}”</p>
      <h1>${esc(s.bName1 || 'কুতুবজোম ইসলামীয়া')}</h1>
      <h2>${esc(s.bName2 || 'কে.জি এন্ড প্রি-ক্যাডেট মাদ্রাসা')}</h2>
      <div class="af-pill">ভর্তি ফরম</div>
    </div>
    <div class="af-photo">${a.photo ? `<img src="${esc(a.photo)}" alt="শিক্ষার্থীর ছবি">` : '<span>শিক্ষার্থীর<br>ছবি</span>'}</div>
  </header>
  <div class="af-meta"><span>আবেদন কোড: <b>${esc(a.code || '—')}</b></span><span>ভর্তি হতে চায়: <b>${esc(a.applyClass || '')}</b></span><span>শিক্ষাবর্ষ: <b>${esc(a.year || '')}</b></span></div>
  <img class="af-water" src="${esc(logo)}" alt="" aria-hidden="true">
  ${sec('book', 'শিক্ষার্থীর তথ্য')}
  ${line('নাম (বাংলায়)', a.nameBn)}${line('নাম (ইংরেজিতে)', a.nameEn)}${line('জন্মতারিখ', iso2dmy(a.dob))}${line('জাতীয়তা', a.nationality)}
  <div class="af-row"><span class="af-l">ধর্ম</span><span class="af-c">:</span><span class="af-v af-short">${esc(a.religion) || '&nbsp;'}</span><span class="af-gender">লিঙ্গ : ছেলে ${gender('ছেলে')} মেয়ে ${gender('মেয়ে')}</span></div>
  ${line('মোবাইল নম্বর', a.mobile)}${line('সম্পূর্ণ ঠিকানা', a.address, 'af-tall')}
  ${sec('people', 'অভিভাবকের তথ্য')}
  ${line('পিতার নাম', a.father)}${line('পিতার পেশা', a.fatherJob)}${line('মাতার নাম', a.mother)}${line('মাতার পেশা', a.motherJob)}${line('অভিভাবকের মোবাইল নম্বর', a.guardianMobile)}
  ${sec('cap', 'শিক্ষার্থীর পূর্বের তথ্য')}
  ${line('পূর্ববর্তী প্রতিষ্ঠানের নাম', a.prevSchool)}${line('বর্তমান শ্রেণি', a.currentClass)}
  ${sec('plus', 'বিশেষ তথ্য')}
  ${line('শারীরিক সমস্যা (যদি থাকে)', a.health)}${line('অন্যান্য তথ্য', a.other)}
  ${sec('pen', 'ঘোষণা')}
  <p class="af-decl">আমি উপরোক্ত তথ্যসমূহ সঠিক ও সত্য বলে ঘোষণা করছি।</p>
  <div class="af-foot-row"><span>তারিখ : <b>${dmy(a.submittedAt)}</b></span><div class="af-sign"><div class="af-sign-box"></div><span>অভিভাবকের স্বাক্ষর</span></div>
  ${a.status === 'confirmed' ? `<div class="af-sign af-principal">${img.sign ? `<img src="${esc(img.sign)}" alt="">` : '<div class="af-sign-box"></div>'}<span>প্রধান শিক্ষক</span></div>` : ''}</div>
  <footer class="af-footer">${esc(s.formFooter || 'আলোর পথে, ইসলামের পথে...')}</footer>
</article>`;
  }

  // HTML থেকে PDF (ব্রাউজারেই তৈরি, বাংলা লেখা ঠিক থাকে)
  const loaded = {};
  const load = (src) => loaded[src] || (loaded[src] = new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => { delete loaded[src]; rej(new Error('PDF তৈরির জন্য ইন্টারনেট সংযোগ দরকার।')); }; document.head.appendChild(el); }));
  async function pdf(html, filename) {
    await load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const host = document.createElement('div');
    host.className = 'pdf-host'; host.innerHTML = html;
    document.body.appendChild(host);
    try {
      await (document.fonts ? document.fonts.ready : Promise.resolve());
      await Promise.all(Array.from(host.querySelectorAll('img')).map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
      const pages = Array.from(host.children);
      const doc = new global.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await global.html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true });
        if (i) doc.addPage();
        const w = 210, h = Math.min(297, canvas.height * w / canvas.width);
        doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h);
      }
      doc.save(filename);
    } finally { host.remove(); }
  }

  global.AdmissionForm = { render, pdf, esc };
})(window);
