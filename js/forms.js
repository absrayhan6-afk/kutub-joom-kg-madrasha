// ভর্তি ফরম (মাদ্রাসার ফরম্যাট অনুযায়ী) ও PDF তৈরি — অভিভাবকদের পেজ ও অ্যাডমিন দুই জায়গায় ব্যবহার হয়।
(function (global) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dmy = (ts) => { const d = ts ? new Date(ts) : new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const iso2dmy = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v.split('-').reverse().join('/') : (v || ''));

  const ICONS = {
    cap: 'M12 3 1 9l11 6 9-4.9V17h2V9zM5 13.2v4L12 21l7-3.8v-4L12 17z',
    people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM9 13c-3.3 0-7 1.7-7 4.5V20h14v-2.5C16 14.7 12.3 13 9 13zm7.6.1A5 5 0 0 1 18 17.5V20h4v-2.5c0-2.3-2.8-4-5.4-4.4z',
    person: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-9 2-9 6v2h18v-2c0-4-5-6-9-6z',
    phone: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z',
    book: 'M2 5c3-1.5 6.5-1.5 9.5.5v15C8.5 18.5 5 18.5 2 20zm20 0c-3-1.5-6.5-1.5-9.5.5v15c3-2 6.5-2 9.5-.5z',
    coins: 'M12 2C7 2 3 3.6 3 5.5S7 9 12 9s9-1.6 9-3.5S17 2 12 2zM3 8v3c0 1.9 4 3.5 9 3.5s9-1.6 9-3.5V8c0 1.9-4 3.5-9 3.5S3 9.9 3 8zm0 5.5v3C3 18.4 7 20 12 20s9-1.6 9-3.5v-3c0 1.9-4 3.5-9 3.5s-9-1.6-9-3.5z',
    cal: 'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm-2 7v10h14V9zm2 2h3v3H7zm5 0h3v3h-3z',
    id: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm2 4v2h6V9zm0 4v2h4v-2zm9-4v6h5V9z',
    list: 'M4 5h3v3H4zm5 .5h11v2H9zM4 10.5h3v3H4zm5 .5h11v2H9zM4 16h3v3H4zm5 .5h11v2H9z',
    pin: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z'
  };
  const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[k]}"/></svg>`;
  const dig = (v) => String(v == null ? '' : v).replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
  // প্রতিটি অঙ্ক আলাদা ঘরে
  // তারিখ ও নম্বরের জন্য অন্য ঘরের মতো ডট দেওয়া লাইন
  const boxes = (val) => `<span class="af-v af-num">${esc(dig(val || ''))}</span>`;
  const tick = (on) => `<span class="af-tick">${on ? '✓' : ''}</span>`;
  const dotted = (label, value, cls) => `<div class="af-line ${cls || ''}"><span class="af-l">${label}</span><span class="af-c">:</span><span class="af-v">${esc(value) || ''}</span></div>`;
  const card = (icon, title, body, cls) => `<section class="af-card ${cls || ''}"><div class="af-tab">${ico(icon)}<span>${title}</span></div><div class="af-body">${body}</div></section>`;
  const FEE_KEYS = [['admission', 'ভর্তি ফি'], ['books', 'বইয়ের টাকা'], ['diary', 'ডায়েরির টাকা'], ['monthly', 'মাসিক ফি'], ['card', 'কার্ড ফি']];
  // শ্রেণিভিত্তিক ফি (এডমিন প্যানেল থেকে ঠিক করা): settings.admFees[new|renew][classId]
  // ফির খাত: শুরুতে ৫টি, এডমিন প্যানেল থেকে নতুন খাত যোগ/নাম বদল/মুছা যায় (settings.admFeeItems)
  const feeItems = (s) => { const it = (s || {}).admFeeItems; return Array.isArray(it) && it.length ? it.map((i) => [i.k, i.t]) : FEE_KEYS; };
  const feesFor = (s, type, classId) => { const t = ((s || {}).admFees || {})[type === 'renew' ? 'renew' : 'new'] || {}; return Object.assign({}, t[classId] || {}); };
  const hasFees = (f, s) => !!f && feeItems(s).some((k) => String(f[k[0]] || '').trim());
  const feeTotal = (f, s) => feeItems(s).reduce((t, k) => t + (Number(dig((f || {})[k[0]])) || 0), 0);
  const MOSQUE = `<svg class="af-mosque" viewBox="0 0 200 130" aria-hidden="true"><defs><linearGradient id="afmq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c9a4c"/><stop offset="1" stop-color="#0b5d2e"/></linearGradient></defs><g fill="url(#afmq)"><path d="M100 22c-26 8-38 28-38 46h76c0-18-12-38-38-46z"/><rect x="60" y="66" width="80" height="60"/><path d="M98 8h4v14h-4z"/><circle cx="100" cy="6" r="4"/><rect x="28" y="40" width="10" height="86"/><path d="M26 40l7-16 7 16z"/><rect x="162" y="40" width="10" height="86"/><path d="M160 40l7-16 7 16z"/><rect x="8" y="70" width="8" height="56"/><path d="M6 70l6-12 6 12z"/><rect x="184" y="70" width="8" height="56"/><path d="M182 70l6-12 6 12z"/><path d="M40 92c-8 3-12 9-12 14h24c0-5-4-11-12-14zM160 92c-8 3-12 9-12 14h24c0-5-4-11-12-14z"/><rect x="40" y="104" width="22" height="22"/><rect x="138" y="104" width="22" height="22"/></g><path d="M150 30a10 10 0 1 0 8 16 8 8 0 1 1-8-16z" fill="#1c9a4c"/></svg>`;
  const SWOOSH = `<svg class="af-swoosh" viewBox="0 0 794 330" preserveAspectRatio="none" aria-hidden="true"><path d="M0 150C70 205 170 235 300 240L300 254C160 252 70 225 0 190Z" fill="#0b5d2e"/><path d="M0 196C80 232 170 252 300 256L300 262C165 262 75 244 0 210Z" fill="#e6b422"/><path d="M794 150C724 205 624 235 494 240L494 254C634 252 724 225 794 190Z" fill="#0b5d2e"/><path d="M794 196C714 232 624 252 494 256L494 262C629 262 719 244 794 210Z" fill="#e6b422"/><path d="M0 0H794V18C600 40 200 40 0 18Z" fill="#eaf6ee"/></svg>`;
  const WAVE = `<svg class="af-wave" viewBox="0 0 794 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30C250 0 550 0 794 26V80H0Z" fill="#e6b422"/><path d="M0 42C250 14 550 14 794 38V80H0Z" fill="#138a43"/><path d="M0 56C250 32 550 32 794 52V80H0Z" fill="#0b5d2e"/></svg>`;

  // a = আবেদনের তথ্য (a.type: 'new' নতুন ভর্তি, 'renew' পুরাতন শিক্ষার্থীর ভর্তি নবায়ন), s = সেটিংস, img = ছবি (logo, sign)
  // পুরনো ডাটাবেস নিয়মে জমা দেওয়ার জন্য: নতুন ঘরগুলো 'other' ঘরে JSON হিসেবে
  const EXTRA = ['type', 'reg', 'guardian', 'relation', 'relationOther', 'mobile2', 'email'];
  function legacy(a) {
    const o = {}, x = {};
    Object.keys(a).forEach((k) => { if (EXTRA.includes(k)) x[k] = a[k]; else o[k] = a[k]; });
    o.other = JSON.stringify(x).slice(0, 590);
    return o;
  }
  function norm(a) {
    a = Object.assign({}, a || {});
    if (typeof a.other === 'string' && a.other[0] === '{') { try { const x = JSON.parse(a.other); EXTRA.forEach((k) => { if (a[k] == null && x[k] != null) a[k] = x[k]; }); delete a.other; } catch (e) { /* সাধারণ লেখা */ } }
    if (!a.type) a.type = 'new';
    return a;
  }
  function render(a, s, img) {
    a = norm(a); s = s || {}; img = img || {};
    const renew = a.type === 'renew';
    const logo = img.logo || 'assets/logo.webp';
    const name1 = s.bName1 || 'কুতুবজোম ইসলামিয়া', name2 = s.bName2 || 'কে.জি এন্ড প্রি-ক্যাডেট মাদ্রাসা';
    const addr = s.formAddress || s.address || 'নয়াপাড়া কুতুবজোম, মহেশখালী, কক্সবাজার';
    const dob = /^\d{4}-\d{2}-\d{2}$/.test(a.dob || '') ? a.dob.split('-') : ['', '', ''];
    const rel = a.relation || '';
    const items = feeItems(s);
    const fees = hasFees(a.fees, s) ? a.fees : feesFor(s, a.type, a.applyClassId); const tot = feeTotal(fees, s);
    const money = (v) => `<span class="af-money"><b>৳</b>${esc(dig(v || ''))}</span>`;
    const student = `<div class="af-two"><div>${dotted('শিক্ষার্থীর নাম', a.nameBn)}${dotted('শ্রেণি', renew ? a.applyClass : a.currentClass)}</div>
      <div class="af-side"><div class="af-line"><span class="af-l af-ls">জন্ম তারিখ</span><span class="af-c">:</span>${boxes(dob[0] ? `${dob[2]}/${dob[1]}/${dob[0]}` : '')}</div>
      <div class="af-line"><span class="af-l af-ls">লিঙ্গ</span><span class="af-c">:</span><label>${tick(a.gender === 'ছেলে')} ছেলে</label><label>${tick(a.gender === 'মেয়ে')} মেয়ে</label></div></div></div>
      ${dotted('পিতার নাম', a.father)}${dotted('মাতার নাম', a.mother)}`;
    const guardian = `${dotted('অভিভাবকের নাম', a.guardian, 'af-wide')}
      <div class="af-line af-wide"><span class="af-l">শিক্ষার্থীর সাথে সম্পর্ক</span><span class="af-c">:</span><label>${tick(rel === 'পিতা')} পিতা</label><label>${tick(rel === 'মাতা')} মাতা</label><label>${tick(rel === 'অন্যান্য')} অন্যান্য :</label><span class="af-v">${esc(rel === 'অন্যান্য' ? a.relationOther : '')}</span></div>`;
    const contact = `<div class="af-line af-addr"><span class="af-l">বর্তমান ঠিকানা</span><span class="af-c">:</span><span class="af-v af-v2">${esc(a.address) || ''}</span></div>
      <div class="af-line af-mob"><span class="af-l">মোবাইল নম্বর (১)</span><span class="af-c">:</span>${boxes(a.guardianMobile || a.mobile)}<span class="af-bar"></span><span class="af-l">মোবাইল নম্বর (২)</span><span class="af-c">:</span>${boxes(a.mobile2 || (a.guardianMobile && a.mobile !== a.guardianMobile ? a.mobile : ''))}</div>
      ${dotted('ই-মেইল (যদি থাকে)', a.email, 'af-wide')}`;
    const feeRow = `<p class="af-feenote">${esc(s.feeNote || 'বিঃদ্রঃ উল্লেখিত সকল ফি মাদ্রাসায় এসে অফিসে পরিশোধ করতে হবে।')}</p><table class="af-fees af-n${Math.min(items.length + 1, 10)}"><thead><tr>${items.map((k) => `<th>${esc(k[1])}</th>`).join('')}<th>মোট টাকা</th></tr></thead><tbody><tr>${items.map((k) => `<td>${money(fees[k[0]])}</td>`).join('')}<td class="af-tot">${money(tot || '')}</td></tr></tbody></table>`;
    return `<article class="adm-form ${renew ? 'is-renew' : 'is-new'}" lang="bn">
  ${SWOOSH}${MOSQUE}<img class="af-water" src="${esc(logo)}" alt="" aria-hidden="true">
  <header class="af-head">
    <img class="af-logo" src="${esc(logo)}" alt="লোগো">
    <div class="af-name"><h1>${esc(name1)}</h1><h2>${esc(name2)}</h2><p>${ico('pin')}${esc(addr)}</p></div>
  </header>
  <div class="af-title"><div class="af-pill">${renew ? 'ভর্তি নবায়ন ফরম' : 'অনলাইন ভর্তি ফরম'}</div><div class="af-sub">${renew ? '(পুরাতন শিক্ষার্থীদের জন্য)' : '(নতুন শিক্ষার্থীদের জন্য)'}</div></div>
  ${a.code ? `<div class="af-code">আবেদন কোড: <b>${esc(a.code)}</b>${a.submittedAt ? ` · তারিখ: <b>${dmy(a.submittedAt)}</b>` : ''}</div>` : ''}
  ${renew ? `<div class="af-yearbar"><span>${ico('cal')}শিক্ষাবর্ষ : <b>${esc(dig(a.year || ''))}</b></span><i></i><span>${ico('cap')}আবেদন ধরন : <b>ভর্তি নবায়ন</b></span></div>
  <div class="af-regrow"><div class="af-regbox">${`<span class="af-chip">${ico('id')}রেজিস্ট্রেশন নম্বর</span>`}${boxes(a.reg)}</div><div class="af-regbox af-gold"><span class="af-chip">${ico('list')}নতুন ভর্তি রোল</span>${boxes(a.newRoll)}</div></div>` : ''}
  ${card(renew ? 'person' : 'cap', 'শিক্ষার্থীর তথ্য', student)}
  ${card('people', 'অভিভাবকের তথ্য', guardian)}
  ${card('phone', 'যোগাযোগের তথ্য', contact)}
  ${renew ? '' : `<section class="af-classbox"><div class="af-crow"><span class="af-chip af-big">${ico('book')}ভর্তির শ্রেণি</span><span class="af-cval">${esc(a.applyClass || '')}</span></div>
    <div class="af-crow"><span class="af-chip af-note">বিশেষ নির্দেশনা:</span><p>${esc(s.formNote || 'উল্লেখিত শ্রেণি মাদ্রাসায় যাচাই ও ভর্তি পরীক্ষার মাধ্যমে নির্ধারিত হবে। নির্ধারিত শ্রেণিতেই ভর্তি হতে হবে।')}</p></div>
    <div class="af-crow"><span class="af-chip af-note">প্রয়োজনীয় কাগজপত্র:</span><p>${esc(s.docNote || 'ভর্তির সময় শিক্ষার্থীর জন্ম নিবন্ধন সনদ এবং পিতা ও মাতার জাতীয় পরিচয়পত্রের (NID) ফটোকপি মাদ্রাসায় জমা দিতে হবে।')}</p></div></section>`}
  ${card('coins', 'ফি সংক্রান্ত তথ্য', feeRow, 'af-feecard')}
  ${renew ? '' : `<div class="af-total"><span>মোট টাকা :</span><b>৳ ${esc(tot ? String(tot) : '')}</b></div>`}
  ${WAVE}
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

  global.AdmissionForm = { render, pdf, esc, FEE_KEYS, feeItems, feeTotal, feesFor, hasFees, legacy, norm };
})(window);
