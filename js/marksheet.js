// মার্কশিট তৈরি — অভিভাবকদের পেজ ও অ্যাডমিন দুই জায়গাতেই একই ডিজাইন। মার্কশিটের সব লেখা ইংরেজিতে।
// প্রিন্টে সবসময় এক পাতা (A4): বিষয় বেশি হলে টেবিলের সারি নিজে থেকে চিকন হয়, কম হলে নিচে ফাঁকা থাকে।
(function (global) {
  'use strict';
  const C = global.Calc;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateEn = (ts) => { const d = ts ? new Date(ts) : new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const laurel = (flip) => `<svg class="laurel${flip ? ' flip' : ''}" viewBox="0 0 40 90" aria-hidden="true"><path d="M30 88C10 70 6 40 18 6" fill="none" stroke="currentColor" stroke-width="2.5"/>${[14, 26, 38, 50, 62, 74].map((y, i) => `<ellipse cx="${(i < 3 ? 12 : 16) + i * 0.6}" cy="${y}" rx="7" ry="3.2" transform="rotate(-35 ${12 + i} ${y})"/><ellipse cx="${24 + i * 0.4}" cy="${y + 6}" rx="7" ry="3.2" transform="rotate(35 ${24 + i} ${y + 6})"/>`).join('')}</svg>`;
  const PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
  const WAVE = '<svg class="ms-wave" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 34C220 6 520 4 800 22V60H0z" fill="#e2b923"/><path d="M0 42C240 16 540 14 800 30V60H0z" fill="#138a43"/><path d="M0 50C260 30 560 28 800 40V60H0z" fill="#0b4d2c"/></svg>';

  // বিষয়ের সংখ্যা অনুযায়ী প্রিন্টে সারির উচ্চতা ও লেখার মাপ (mm / pt) — সব মিলিয়ে এক পাতা
  function density(n) {
    const rows = Math.max(1, n) + 1; // + শিরোনাম সারি
    const rh = Math.max(3.2, Math.min(7.6, 116 / rows));
    const fs = Math.max(7, Math.min(11, rh * 1.5));
    return `--ms-rh:${rh.toFixed(2)}mm;--ms-fs:${fs.toFixed(1)}pt`;
  }

  function render(r, settings, images) {
    const s = settings || {};
    const logo = (images && images.logo) || 'assets/logo.webp';
    const status = r.status || (r.passed ? 'pass' : 'fail');
    const passed = status === 'pass';
    const special = status === 'special';
    const resText = passed ? 'PASS' : special ? 'SPECIAL' : 'FAIL';
    const att = r.attendance;
    const rows = r.rows.map((x, i) => `<tr><td>${i + 1}</td><td class="ms-sub">${esc(x.nameEn || x.name)}</td><td>${x.full}</td><td>${x.mark == null ? '—' : x.mark}</td><td>${esc(x.grade)}</td><td>${C.fix2(x.gp)}</td></tr>`).join('');
    const info = [
      ['Name', r.nameEn || r.name], ["Father's Name", r.fatherEn || r.father], ['Class', r.classNameEn || r.className],
      ['Roll No', r.roll], ['Registration No', r.reg], ['Merit Position', r.rank || '—']
    ].filter((x) => x[1]).map((x) => `<div class="ms-k">${x[0]}</div><div class="ms-c">:</div><div class="ms-v">${esc(x[1])}</div>`).join('');
    const tiles = [
      ['Total Marks', `${r.total}<small>/${r.full}</small>`, ''],
      ['Average', C.fix2(r.average), ''],
      ['GPA', C.fix2(r.gpa), ''],
      ['Result', resText, passed ? 't-res' : special ? 't-res t-special' : 't-res t-fail'],
      ['Merit Position', r.rank || '—', '']
    ].map((t) => `<div class="ms-tile ${t[2]}"><span>${t[0]}</span><b>${t[1]}</b></div>`).join('');
    const est = s.established ? C.toEn(s.established) : '';
    return `<article class="marksheet" lang="en" aria-label="Marksheet" style="${density(r.rows.length)}">
  <header class="ms-head">
    <img class="ms-logo" src="${esc(logo)}" alt="Logo" width="120" height="110">
    <div class="ms-name"><h2>${esc(String(s.nameEn || s.name || '').toUpperCase())}</h2>
      <p class="ms-addr">${PIN}${esc(s.addressEn || s.address)}</p>
      ${est ? `<p class="ms-est"><span>Established: ${esc(est)}</span></p>` : ''}</div>
  </header>
  <div class="ms-meta">
    <div class="ms-meta-row"><span><i>Academic Year</i> : ${esc(r.year)}</span><span><i>Class</i> : ${esc(r.classNameEn || r.className)}</span><span><i>Examination</i> : ${esc(C.examEn(r.exam))}</span></div>
    ${att ? `<div class="ms-meta-row"><span><i>Attendance</i> : Total: <b>${att.total}</b> days, Present: <b>${att.present}</b> days, Absent: <b>${att.absent}</b> days</span></div>` : ''}
  </div>
  <div class="ms-ribbon"><span>Academic Transcript</span></div>
  <section class="ms-info">
    <div class="ms-grid">${info}</div>
    <div class="ms-grade ${passed ? '' : special ? 'is-special' : 'is-fail'}"><span>Overall Grade</span><div class="ms-grade-row">${laurel(false)}<b>${esc(r.grade)}</b>${laurel(true)}</div></div>
  </section>
  <section class="ms-tiles">${tiles}</section>
  <div class="ms-table-wrap"><table class="ms-table"><thead><tr><th>SL</th><th>Subject</th><th>Full Marks</th><th>Obtained Marks</th><th>Grade</th><th>GP</th></tr></thead><tbody>${rows}</tbody></table><img class="ms-water" src="${esc(logo)}" alt="" aria-hidden="true"></div>
  <section class="ms-msg ${passed ? '' : special ? 'is-special' : 'is-fail'}">
    <span class="ms-msg-ico" aria-hidden="true">${passed ? '<svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg>' : '!'}</span>
    <div class="ms-msg-text">${passed ? '<h3>Congratulations!</h3><p>You have passed the examination. May Allah grant you more success.</p>'
      : special ? `<h3>Promoted on Special Consideration</h3><p>Failed in ${r.fails || ''} subject${r.fails > 1 ? 's' : ''}. Please take extra care of ${r.fails > 1 ? 'these subjects' : 'this subject'}. In sha Allah, you will do better next time.</p>`
      : '<h3>Do not lose hope!</h3><p>Study with more care. In sha Allah, you will do better in the next examination.</p>'}</div>
  </section>
  <div class="ms-space"></div>
  <footer class="ms-foot"><span class="ms-pub">Result Published: ${dateEn(r.publishedAt)}</span><span class="ms-sign">${images && images.sign ? `<img src="${esc(images.sign)}" alt="" class="sign-img">` : ''}<span>Head Teacher</span></span></footer>
  ${WAVE}
</article>`;
  }
  // মার্কশিটের PDF সরাসরি ডাউনলোড — মোবাইলে প্রিন্ট কাজ না করলেও চলে।
  // আলাদা A4 মাপের ফ্রেমে প্রিন্টের মতো সাজিয়ে ছবি তুলে PDF বানানো হয় (বাংলা/ইংরেজি সব ঠিক থাকে)।
  const loaded = {};
  const load = (src) => loaded[src] || (loaded[src] = new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => { delete loaded[src]; rej(new Error('PDF তৈরির জন্য ইন্টারনেট সংযোগ দরকার।')); }; document.head.appendChild(el); }));
  // ক্যানভাস প্রায় পুরো সাদা হলে (কিছু ব্রাউজারে foreignObject কাজ করে না) সাধারণ পদ্ধতিতে আবার
  function blankCanvas(cv) {
    try { const g = cv.getContext('2d'); const d = g.getImageData(0, 0, cv.width, cv.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) dark++; return dark < 50; } catch (e) { return true; }
  }
  async function pdf(htmlList, filename) {
    const list = Array.isArray(htmlList) ? htmlList : [htmlList];
    await load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true');
    fr.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;height:1123px;border:0;background:#fff';
    document.body.appendChild(fr);
    try {
      const css = new URL('css/marksheet.css', location.href).href;
      const fonts = Array.from(document.querySelectorAll('link[rel=stylesheet]')).filter((l) => /fonts\.googleapis/.test(l.href)).map((l) => `<link rel="stylesheet" href="${esc(l.href)}">`).join('');
      const doc = fr.contentDocument;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${esc(location.href)}">${fonts}<link rel="stylesheet" href="${esc(css)}"></head><body style="margin:0;background:#fff"></body></html>`);
      doc.close();
      await new Promise((r) => { if (doc.readyState === 'complete') r(); else fr.onload = r; setTimeout(r, 4000); });
      const jsPDF = global.jspdf.jsPDF; const out = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      for (let i = 0; i < list.length; i++) {
        doc.body.innerHTML = `<div class="ms-a4">${list[i]}</div>`;
        try { await doc.fonts.ready; } catch (e) { /* পুরনো ব্রাউজার */ }
        // ছবিগুলো ফাইলের ভেতরে বসানো (তাহলে PDF-এ লোগো ও স্বাক্ষর আসে)
        await Promise.all(Array.from(doc.images).map(async (im) => {
          if (/^data:/.test(im.getAttribute('src') || '')) return;
          try { const bl = await (await fetch(im.src)).blob(); const url = await new Promise((r, j) => { const fr2 = new FileReader(); fr2.onload = () => r(fr2.result); fr2.onerror = j; fr2.readAsDataURL(bl); }); im.src = url; } catch (e) { /* না পেলে যেমন আছে */ }
        }));
        await Promise.all(Array.from(doc.images).map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 4000); })));
        // ব্রাউজারের নিজের রেন্ডারিং (লেখা হুবহু থাকে); না হলে সাধারণ পদ্ধতি
        const el = doc.body.firstElementChild, opt = { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 794, windowHeight: 1123 };
        let canvas = null;
        try { canvas = await global.html2canvas(el, Object.assign({ foreignObjectRendering: true }, opt)); canvas.toDataURL('image/jpeg', 0.5); if (blankCanvas(canvas)) canvas = null; } catch (e) { canvas = null; }
        if (!canvas) canvas = await global.html2canvas(el, opt);
        if (i) out.addPage();
        out.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      }
      const blob = out.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return url;
    } finally { fr.remove(); }
  }
  global.Marksheet = { render, esc, pdf };
})(window);
