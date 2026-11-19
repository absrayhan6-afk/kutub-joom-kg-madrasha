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
  // ===== মার্কশিটের PDF সরাসরি আঁকা (A4, এক পাতা) =====
  // পেজের ছবি না তুলে PDF-এর ভেতরে লেখা-রেখা আঁকা হয়, তাই সব মোবাইলে একই রকম ও পরিষ্কার আসে।
  const loaded = {};
  const load = (src) => loaded[src] || (loaded[src] = new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = () => { delete loaded[src]; rej(new Error('PDF তৈরির জন্য ইন্টারনেট সংযোগ দরকার।')); }; document.head.appendChild(el); }));
  // যেকোনো ছবি (WebP সহ) → PNG; সঙ্গে মাপের অনুপাত
  const toPng = (src) => new Promise((res) => {
    if (!src) return res(null);
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => { try { const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0); res({ url: cv.toDataURL('image/png'), r: im.naturalWidth / im.naturalHeight }); } catch (e) { res(null); } };
    im.onerror = () => res(null); im.src = src;
  });
  // PDF-এর ফন্টে শুধু ইংরেজি — বাংলা থাকলে ইংরেজিতে রূপান্তর
  const en = (t) => { t = C.toEn(String(t == null ? '' : t)); if (/[^\x00-\x7F]/.test(t)) t = global.Translit ? global.Translit.name(t) : t; return t.replace(/[^\x00-\x7F]/g, ''); };
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  async function draw(doc, r, settings, images, first) {
    const s = settings || {};
    const G = '#0b4d2c', G2 = '#138a43', GOLD = '#e2b923', LINE = '#b9d8c3', ZEBRA = '#eef8f1', INK = '#12301f';
    const status = r.status || (r.passed ? 'pass' : 'fail'), passed = status === 'pass', special = status === 'special';
    const fill = (c) => doc.setFillColor(...hex(c)), stroke = (c) => doc.setDrawColor(...hex(c)), color = (c) => doc.setTextColor(...hex(c));
    const font = (st, size) => { doc.setFont(st[0], st[1]); doc.setFontSize(size); };
    const text = (t, x, y, o) => doc.text(String(t), x, y, o || {});
    const W = (t) => doc.getTextWidth(String(t));
    if (!first) doc.addPage();
    const [logo, sign] = await Promise.all([toPng((images && images.logo) || 'assets/logo.webp'), toPng(images && images.sign)]);

    // ফ্রেম
    const FX = 8, FY = 8, FW = 194, FH = 281;
    fill('#ffffff'); stroke(G); doc.setLineWidth(0.7); doc.roundedRect(FX, FY, FW, FH, 6, 6, 'FD');

    // মাথা: লোগো | মাদ্রাসার নাম
    if (logo) { const h = 31, w = Math.min(36, h * logo.r); doc.addImage(logo.url, 'PNG', 14 + (36 - w) / 2, 13, w, h); }
    stroke(G); doc.setLineWidth(0.5); doc.line(53, 14, 53, 43);
    const cx = 126;
    font(['times', 'bold'], 22); color(G); stroke(G); doc.setLineWidth(0.22);
    const nm = en(s.nameEn || s.name).toUpperCase().replace(/\s+/g, ' ').trim();
    // নমুনার মতো "&" থেকে দ্বিতীয় লাইন
    const amp = nm.indexOf(' & ');
    const nameLines = (amp > 0 && W(nm.slice(0, amp)) < 138 && W(nm.slice(amp + 1)) < 138 ? [nm.slice(0, amp), nm.slice(amp + 1)] : doc.splitTextToSize(nm, 138)).slice(0, 2);
    nameLines.forEach((l, i) => text(l, cx, 21 + i * 8.6 - (nameLines.length === 1 ? -4 : 0), { align: 'center', renderingMode: 'fillThenStroke' }));
    font(['helvetica', 'bold'], 10); color(INK);
    const addr = en(s.addressEn || s.address); const aw = W(addr), ay = 21 + nameLines.length * 8.6 + 0.6;
    fill('#b3261e'); doc.circle(cx - aw / 2 - 3, ay - 1.6, 1.1, 'F'); doc.triangle(cx - aw / 2 - 4, ay - 1.3, cx - aw / 2 - 2, ay - 1.3, cx - aw / 2 - 3, ay + 0.4, 'F');
    text(addr, cx, ay, { align: 'center' });
    if (s.established) {
      const est = 'Established: ' + C.toEn(s.established); font(['helvetica', 'bold'], 10); const ew = W(est), ey = ay + 5.2;
      text(est, cx, ey, { align: 'center' }); stroke(GOLD); doc.setLineWidth(0.5);
      doc.line(cx - ew / 2 - 30, ey - 1.2, cx - ew / 2 - 3, ey - 1.2); doc.line(cx + ew / 2 + 3, ey - 1.2, cx + ew / 2 + 30, ey - 1.2);
    }

    // পরীক্ষার তথ্য
    let y = 49; const att = r.attendance;
    const mh = att ? 12.5 : 8; stroke(G); doc.setLineWidth(0.4); doc.roundedRect(14, y, 182, mh, 3.5, 3.5, 'S');
    const seg = (parts, yy) => {
      font(['helvetica', 'bold'], 9.5);
      const ws = parts.map((p) => { font(['helvetica', 'bold'], 9.5); const a = W(p[0] + ' :') + 1.4; font(['helvetica', p[2] ? 'bold' : 'normal'], 9.5); return a + W(p[1]); });
      const gap = 7, tot = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1); let xx = 105 - tot / 2;
      parts.forEach((p, i) => {
        font(['helvetica', 'bold'], 9.5); color(G2); text(p[0] + ' :', xx, yy); const a = W(p[0] + ' :') + 1.4;
        font(['helvetica', p[2] ? 'bold' : 'normal'], 9.5); color(INK); text(p[1], xx + a, yy);
        xx += ws[i] + gap; if (i < parts.length - 1) { stroke('#999999'); doc.setLineWidth(0.3); doc.line(xx - gap / 2, yy - 3, xx - gap / 2, yy + 0.8); }
      });
    };
    seg([['Academic Year', en(r.year), 1], ['Class', en(r.classNameEn || r.className), 1], ['Examination', en(C.examEn(r.exam)), 1]], y + 5.2);
    if (att) seg([['Attendance', `Total: ${att.total} days, Present: ${att.present} days, Absent: ${att.absent} days`, 0]], y + 10.3);
    y += mh + 3;

    // Academic Transcript ফিতা
    stroke(GOLD); doc.setLineWidth(0.7); doc.line(16, y + 4, 74, y + 4); doc.line(136, y + 4, 194, y + 4);
    fill(G); stroke(GOLD); doc.setLineWidth(0.8); doc.roundedRect(75, y, 60, 8, 3, 3, 'FD');
    font(['helvetica', 'bold'], 14); color('#ffffff'); text('Academic Transcript', 105, y + 5.7, { align: 'center' });
    y += 12;

    // শিক্ষার্থীর তথ্য ও গ্রেড
    const ih = 33; stroke(G); doc.setLineWidth(0.4); doc.roundedRect(14, y, 120, ih, 3.5, 3.5, 'S');
    const info = [['Name', r.nameEn || r.name], ["Father's Name", r.fatherEn || r.father], ['Class', r.classNameEn || r.className], ['Roll No', r.roll], ['Registration No', r.reg], ['Merit Position', r.rank || '-']].filter((x) => x[1]);
    const lh = Math.min(5, (ih - 5) / info.length), iy = y + 4.5 + (ih - 4 - lh * info.length) / 2 + lh * 0.65;
    info.forEach((row, i) => { font(['helvetica', 'bold'], 10); color(INK); text(row[0], 26, iy + i * lh); text(':', 60, iy + i * lh); font(['helvetica', 'normal'], 10); text(doc.splitTextToSize(en(row[1]), 68)[0], 64, iy + i * lh); });
    fill('#fffdf3'); stroke(GOLD); doc.setLineWidth(0.8); doc.roundedRect(138, y, 58, ih, 3.5, 3.5, 'FD');
    font(['times', 'bold'], 15); color(G); text('Overall Grade', 167, y + 9, { align: 'center' });
    font(['helvetica', 'bold'], 34); color(passed ? '#f07c0f' : special ? '#9a6b00' : '#5b5b5b'); text(en(r.grade), 167, y + 26, { align: 'center' });
    // পাতার মালা (সাধারণ রূপ)
    y += ih + 3;

    // পাঁচটি ঘর
    const resText = passed ? 'PASS' : special ? 'SPECIAL' : 'FAIL';
    const tiles = [['Total Marks', String(r.total), '/' + r.full], ['Average', C.fix2(r.average)], ['GPA', C.fix2(r.gpa)], ['Result', resText], ['Merit Position', String(r.rank || '-')]];
    const unit = (182 - 4 * 2.5) / 5.15; let tx = 14;
    tiles.forEach((t, i) => {
      const w = i === 0 ? unit * 1.15 : unit, res = i === 3;
      if (res) { fill('#fff7dc'); stroke(GOLD); } else { fill('#ffffff'); stroke(G); }
      doc.setLineWidth(0.4); doc.roundedRect(tx, y, w, 13, 3, 3, 'FD');
      font(['helvetica', 'bold'], 8.5); color(G); text(t[0], tx + w / 2, y + 4, { align: 'center' });
      font(['helvetica', 'bold'], res && special ? 12 : 16); color(INK);
      if (t[2]) { const a = W(t[1]); font(['helvetica', 'bold'], 9); const b = W(t[2]); font(['helvetica', 'bold'], 16); const sx = tx + w / 2 - (a + b) / 2; text(t[1], sx, y + 10.8); font(['helvetica', 'bold'], 9); color('#444444'); text(t[2], sx + a, y + 10.8); }
      else text(t[1], tx + w / 2, y + 10.8, { align: 'center' });
      tx += w + 2.5;
    });
    y += 16;

    // নম্বরের টেবিল: বিষয় যত বেশি, সারি তত চিকন — সব মিলিয়ে এক পাতা
    const rows = r.rows || [], footTop = 262, msgH = 16;
    const avail = footTop - 6 - msgH - 4 - y;
    const rh = Math.max(2.2, Math.min(7.6, avail / (rows.length + 1.1)));
    const fs = Math.max(5.4, Math.min(10.5, rh * 1.45));
    const cols = [12, 72, 28, 34, 18, 18], heads = ['SL', 'Subject', 'Full Marks', 'Obtained Marks', 'Grade', 'GP'];
    const th = rh + 0.8, tableH = th + rh * rows.length;
    fill(G); doc.roundedRect(14, y, 182, th, 2.5, 2.5, 'F'); doc.rect(14, y + th / 2, 182, th / 2, 'F');
    let cxx = 14; font(['helvetica', 'bold'], fs); color('#ffffff');
    heads.forEach((h, i) => { text(h, cxx + cols[i] / 2, y + th / 2 + fs * 0.12, { align: 'center' }); cxx += cols[i]; });
    rows.forEach((row, k) => {
      const ry = y + th + k * rh;
      if (k % 2) { fill(ZEBRA); doc.rect(14, ry, 182, rh, 'F'); }
      stroke(LINE); doc.setLineWidth(0.2); doc.line(14, ry, 196, ry);
      const vals = [String(k + 1), en(row.nameEn || row.name), String(row.full), row.mark == null ? '-' : String(row.mark), en(row.grade), C.fix2(row.gp)];
      let xx = 14; font(['helvetica', 'normal'], fs); color(INK);
      vals.forEach((v, i) => { const mid = ry + rh / 2 + fs * 0.12; if (i === 1) text(doc.splitTextToSize(v, cols[1] - 6)[0], xx + 4, mid); else text(v, xx + cols[i] / 2, mid, { align: 'center' }); xx += cols[i]; });
    });
    stroke(LINE); doc.setLineWidth(0.2); cxx = 14; cols.slice(0, -1).forEach((w) => { cxx += w; doc.line(cxx, y + th, cxx, y + tableH); });
    stroke(G); doc.setLineWidth(0.4); doc.roundedRect(14, y, 182, tableH, 2.5, 2.5, 'S');
    // টেবিলের মাঝে হালকা লোগো
    if (logo && doc.GState) { const h = Math.min(tableH * 0.88, 78), w = h * logo.r; doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.1 })); doc.addImage(logo.url, 'PNG', 105 - w / 2, y + tableH / 2 - h / 2, w, h); doc.restoreGraphicsState(); }
    y += tableH + 4;

    // অভিনন্দন / বার্তা
    fill('#fbfdf5'); stroke(GOLD); doc.setLineWidth(0.6); doc.roundedRect(14, y, 182, msgH, 4, 4, 'FD');
    fill(passed ? '#1a8a46' : special ? '#9a6b00' : '#555555'); stroke(GOLD); doc.setLineWidth(0.7); doc.circle(24, y + msgH / 2, 4.6, 'FD');
    stroke('#ffffff'); doc.setLineWidth(0.9);
    if (passed) doc.lines([[1.6, 1.6], [3.2, -3.4]], 21.8, y + msgH / 2 + 0.1); else { font(['helvetica', 'bold'], 14); color('#ffffff'); text('!', 24, y + msgH / 2 + 2.2, { align: 'center' }); }
    stroke('#333333'); doc.setLineWidth(0.5); doc.line(33, y + 3, 33, y + msgH - 3);
    const msgT = passed ? ['Congratulations!', 'You have passed the examination. May Allah grant you more success.']
      : special ? ['Promoted on Special Consideration', `Failed in ${r.fails || ''} subject${r.fails > 1 ? 's' : ''}. Please take extra care. In sha Allah, you will do better next time.`]
        : ['Do not lose hope!', 'Study with more care. In sha Allah, you will do better in the next examination.'];
    font(['times', 'bolditalic'], special ? 15 : 19); color(G); text(msgT[0], 38, y + 7.4);
    font(['helvetica', 'normal'], 9.5); color(INK); text(doc.splitTextToSize(msgT[1], 152)[0], 38, y + 12.6);

    // নিচে: প্রকাশের তারিখ | স্বাক্ষর
    const d = r.publishedAt ? new Date(r.publishedAt) : new Date();
    const dstr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    font(['helvetica', 'bold'], 10.5); color(INK); text('Result Published: ' + dstr, 16, 272);
    stroke('#333333'); doc.setLineWidth(0.5); doc.line(105, 265, 105, 273);
    if (sign) { const h = 9, w = Math.min(44, h * sign.r); doc.addImage(sign.url, 'PNG', 166 - w / 2, 262, w, h); }
    doc.line(140, 271.5, 192, 271.5); font(['helvetica', 'bold'], 10.5); color(G); text('Head Teacher', 166, 276, { align: 'center' });

    // নিচের ঢেউ (ফ্রেমের ভেতরে)
    doc.saveGraphicsState();
    doc.roundedRect(FX, FY, FW, FH, 6, 6, null); doc.clip(); doc.discardPath();
    const wave = (yy, c) => { fill(c); doc.lines([[60, -6, 130, -6, 194, -2], [0, 14], [-194, 0]], FX, yy, [1, 1], 'F', true); };
    wave(282, GOLD); wave(284, G2); wave(286.5, G);
    doc.restoreGraphicsState();
    stroke(G); doc.setLineWidth(0.7); doc.roundedRect(FX, FY, FW, FH, 6, 6, 'S');
  }

  // r এক বা একাধিক মার্কশিটের তথ্য; সব এক PDF-এ, প্রতিটি এক পাতা
  async function pdf(list, settings, images, filename) {
    await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const doc = new global.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    list = Array.isArray(list) ? list : [list];
    for (let i = 0; i < list.length; i++) await draw(doc, list[i], settings, images, i === 0);
    const url = URL.createObjectURL(doc.output('blob'));
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  global.Marksheet = { render, esc, pdf };
})(window);
