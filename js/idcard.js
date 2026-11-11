// শিক্ষার্থীর আইডি কার্ড (মাদ্রাসার দেওয়া ফরম্যাট অনুযায়ী): সামনে ও পেছনে দুই দিক।
// মাপ 2.13 × 3.39 in (54.1 × 86.1 mm), চারপাশে 0.125 in bleed। সব লেখা ইংরেজিতে। আইডি নম্বর = রেজিস্ট্রেশন নম্বর।
// SVG (মিলিমিটারে) — ব্রাউজারে দেখা, প্রিন্ট ও Adobe Illustrator-এ এডিট করা যায়।
(function (global) {
  'use strict';
  // নকশা আঁকা হয় 54 × 85.6 একক ধরে, তারপর আসল মাপে বড় করা হয়
  const BW = 54, BH = 85.6;
  const W = 2.13 * 25.4, H = 3.39 * 25.4, BLEED = 0.125 * 25.4;
  const SX = W / BW, SY = H / BH;
  const DEF = { navy: '#2b2e7c', blue: '#3f88c9', teal: '#7fcfdb', ink: '#111111', schoolSize: 0, addrLine: '', nameSize: 0, infoSize: 2.75, footer: 'STUDENT', signLabel: 'Headmaster Signature', qr: 'student', qrCustom: '', schoolLines: '', nameWeight: 400, nameFont: 'impact', addrSize: 2.4, footerSize: 2.6, contactSize: 1, schoolColor: '#ffffff', nameColor: '#111111', shapes: {}, off: {}, backPhone: '', backAddress: '', backEmail: '' };
  let NAVY, BLUE, TEAL, INK, CFG = DEF;
  function useCfg(c) { CFG = Object.assign({}, DEF, c || {}); NAVY = CFG.navy; BLUE = CFG.blue; TEAL = CFG.teal; INK = CFG.ink; }
  useCfg();
  const F_HEAD = "'Arial Black', 'Arial Bold', Arial, sans-serif";
  const F_NAME = "Impact, 'Arial Narrow Bold', 'Arial Narrow', Arial, sans-serif";
  const F_BODY = "Georgia, 'Times New Roman', serif";
  const x = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n2 = (v) => (Math.round(v * 100) / 100).toString();
  let seq = 0;

  // লম্বা লেখা শব্দ ধরে লাইনে ভাগ করা
  function wrap(text, maxChars, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean); const lines = [];
    let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { const rest = lines.slice(maxLines - 1).join(' '); lines.length = maxLines - 1; lines.push(rest.length > maxChars ? rest.slice(0, maxChars - 1) + '…' : rest); }
    return lines;
  }

  // ===== QR কোড (ভেক্টর, Illustrator-এ এডিটযোগ্য) =====
  let qrLoad = null;
  function ensureQR() {
    if (global.qrcode) return Promise.resolve(true);
    if (!qrLoad) qrLoad = new Promise((res) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
      s.onload = () => res(true); s.onerror = () => { qrLoad = null; res(false); };
      document.head.appendChild(s);
    });
    return qrLoad;
  }
  function qrSvg(text, px, py, size) {
    if (!global.qrcode) return `<rect x="${px}" y="${py}" width="${size}" height="${size}" fill="none" stroke="#999" stroke-width="0.2"/><text x="${px + size / 2}" y="${py + size / 2 + 0.7}" font-size="2" text-anchor="middle" fill="#999" font-family="${F_BODY}">QR</text>`;
    const q = global.qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(text))); q.make();
    const n = q.getModuleCount(), c = size / n; let d = '';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) d += `M${n2(px + k * c)} ${n2(py + r * c)}h${n2(c)}v${n2(c)}h${n2(-c)}z`;
    return `<rect x="${n2(px - 0.6)}" y="${n2(py - 0.6)}" width="${n2(size + 1.2)}" height="${n2(size + 1.2)}" fill="#ffffff"/><path d="${d}" fill="#111111"/>`;
  }

  // ===== পটভূমির আকৃতি — মাদ্রাসার দেওয়া কার্ড থেকে মাপা (54 × 85.6 একক) =====
  // প্রতিটি আকৃতি "কার্ড এডিট" থেকে আলাদাভাবে রং, অবস্থান ও মাপ বদলানো যায়।
  const SHAPES = {
    tBlue: { n: 'সামনে: উপরের নীল', d: 'M18.7 0H54V35.3L37.5 26.8Z', c: 'blue' },
    tNavy: { n: 'সামনে: উপরের গাঢ় নীল', d: 'M0 0H18.7L34.6 19.5L27 28.3L16.5 33L0 18.2Z', c: 'navy' },
    tTeal: { n: 'সামনে: উপরের হালকা নীল', d: 'M37.5 26.8L54 35.3V38.8L37 29.6Z', c: 'teal' },
    ring: { n: 'সামনে: ছবির চারপাশের রিং', d: 'M27 16.4A11.9 11.9 0 1 1 26.99 16.4Z', c: 'navy' },
    kBlue: { n: 'পেছনে: উপরের নীল', d: 'M17.6 0H54V35.5L38.5 27.5Z', c: 'blue' },
    kNavy: { n: 'পেছনে: উপরের গাঢ় নীল', d: 'M0 0H17.6L37.5 17.6L27 24.6L19 34.4L0 26.8Z', c: 'navy' },
    kTeal: { n: 'পেছনে: উপরের হালকা নীল', d: 'M38.5 27.5L54 35.5V38.4L38 30.2Z', c: 'teal' },
    kRing: { n: 'পেছনে: লোগোর চারপাশের রিং', d: 'M27 11.2A13.4 13.4 0 1 1 26.99 11.2Z', c: 'navy' },
    bNavy: { n: 'নিচের গাঢ় নীল (দুই দিকে)', d: 'M0 66.2L30 74.2V85.6H0Z', c: 'navy' },
    bTeal: { n: 'নিচের হালকা নীল বাঁক (দুই দিকে)', d: 'M8.6 85.6C9.4 76.3 13 70.8 20.4 70.2L54 81.4V85.6Z', c: 'teal' },
    bBlue: { n: 'নিচের নীল বাঁক (দুই দিকে)', d: 'M9.8 85.6C10.6 77.5 14.2 72.5 21.4 71.8L54 83.3V85.6Z', c: 'blue' }
  };
  // লেখা/ছবির অবস্থান (উপরে-নিচে mm) ও মাপ
  const ITEMS = {
    school: 'সামনে: মাদ্রাসার নাম', addr: 'সামনে: ঠিকানার লাইন', photo: 'সামনে: শিক্ষার্থীর ছবি', name: 'সামনে: শিক্ষার্থীর নাম', info: 'সামনে: তথ্য (আইডি, রোল…)', footer: 'সামনে: নিচের লেখা (STUDENT)',
    logo: 'পেছনে: লোগো', contact: 'পেছনে: ফোন, ঠিকানা, ইমেইল', qr: 'পেছনে: QR কোড', sign: 'পেছনে: স্বাক্ষর'
  };
  const sh = (k) => Object.assign({ dx: 0, dy: 0, s: 1, hide: false }, (CFG.shapes || {})[k] || {});
  const shapeColor = (k) => sh(k).color || CFG[SHAPES[k].c];
  function shape(k) {
    const o = sh(k); if (o.hide) return '';
    const s = Number(o.s) || 1, cx = 27, cy = 42.8;
    const t = (o.dx || o.dy || s !== 1) ? ` transform="translate(${n2(Number(o.dx || 0) + cx * (1 - s))} ${n2(Number(o.dy || 0) + cy * (1 - s))}) scale(${n2(s)})"` : '';
    return `<path id="Shape_${k}" d="${SHAPES[k].d}" fill="${shapeColor(k)}"${t}/>`;
  }
  const off = (k) => Object.assign({ dy: 0, dx: 0, s: 1 }, (CFG.off || {})[k] || {});
  // একটি অংশকে সরানো ও বড়-ছোট করা (নিজের কেন্দ্র ধরে)
  function place(k, cx, cy, inner) {
    const o = off(k); const s = Number(o.s) || 1, dx = Number(o.dx) || 0, dy = Number(o.dy) || 0;
    if (!dx && !dy && s === 1) return `<g id="${k}">${inner}</g>`;
    return `<g id="${k}" transform="translate(${n2(dx + cx * (1 - s))} ${n2(dy + cy * (1 - s))}) scale(${n2(s)})">${inner}</g>`;
  }
  const bottomShapes = () => shape('bNavy') + shape('bTeal') + shape('bBlue');
  // পটভূমি: স্ক্রিনে গোল কোনা; প্রিন্ট ফাইলে bleed পর্যন্ত বিস্তৃত
  let BLEED_MODE = false;
  const frame = (cid, inner) => BLEED_MODE
    ? `<g id="Background" transform="translate(${n2(-BLEED / SX)} ${n2(-BLEED / SY)}) scale(${n2((BW + 2 * BLEED / SX) / BW)} ${n2((BH + 2 * BLEED / SY) / BH)})"><rect width="${BW}" height="${BH}" fill="#ffffff"/>${inner}</g>`
    : `<defs><clipPath id="${cid}k"><rect width="${BW}" height="${BH}" rx="2.6"/></clipPath></defs><g id="Background" clip-path="url(#${cid}k)"><rect width="${BW}" height="${BH}" fill="#ffffff"/>${inner}</g>`;

  // ===== সামনের দিক =====
  // d = {name, id, father, cls, roll, phone, address, year, photo, logo, school, schoolAddress, ...}
  function front(d) {
    const cid = 'f' + (++seq);
    const school = CFG.schoolLines ? CFG.schoolLines.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 3) : wrap(String(d.school || '').toUpperCase(), 24, 2);
    const shortAddr = CFG.addrLine || String(d.schoolAddress || '').split(',').map((t) => t.trim()).filter(Boolean).slice(-2).join(', ');
    const name = wrap(d.name, 22, 2);
    const nameSize = Number(CFG.nameSize) || (name.length > 1 ? 3.4 : (String(d.name).length > 18 ? 3.7 : 4.1));
    const nameFont = CFG.nameFont === 'arial' ? F_HEAD.replace("'Arial Black', ", '') : CFG.nameFont === 'serif' ? F_BODY : F_NAME;
    const fsz = Number(CFG.infoSize) || 2.75;
    const schoolSize = Number(CFG.schoolSize) || (school.some((t) => t.length > 22) ? 3.3 : 3.6);
    const addrSize = Number(CFG.addrSize) || 2.4;
    const addr = wrap(d.address, 18, 2);
    const rows = [['ID Number', d.id], ["Father's name", d.father], ['Roll', d.roll], ['Class', d.cls], ['Mobile', d.phone]];
    const nameY = 46.5, y0 = 50.8 + (name.length - 1) * 3.8, lh = Math.min(3.57, fsz * 1.25);
    let y = y0;
    const row = (l, val, yy, first) => `${l ? `<text x="10.1" y="${n2(yy)}" font-size="${fsz}" fill="${INK}">${x(l)}</text>` : ''}${first ? `<text x="27.1" y="${n2(yy)}" font-size="${n2(fsz + 0.3)}" font-weight="700" fill="${INK}">:</text>` : ''}<text x="29.9" y="${n2(yy)}" font-size="${fsz}" fill="${INK}">${x(val || '')}</text>`;
    let rowsSvg = rows.map((r) => { const s = row(r[0], r[1], y, true); y += lh; return s; }).join('');
    rowsSvg += addr.length ? addr.map((l, i) => row(i === 0 ? 'Address' : '', l, y + i * fsz * 1.1, i === 0)).join('') : row('Address', '', y, true);
    const line1 = 6.95, gap = schoolSize * 1.28;
    const addrY = line1 + (school.length - 1) * gap + 3.2;
    return frame(cid, `${shape('tBlue')}${shape('tNavy')}${shape('tTeal')}${bottomShapes()}`) + `
  ${place('school', 27, line1, `<g font-family="${F_HEAD}" font-weight="900" fill="${CFG.schoolColor || '#ffffff'}" text-anchor="middle">${school.map((l, i) => `<text x="27" y="${n2(line1 + i * gap)}" font-size="${schoolSize}" letter-spacing="0.1">${x(l)}</text>`).join('')}</g>`)}
  ${place('addr', 27, addrY, `<text x="27" y="${n2(addrY)}" font-family="${F_BODY}" font-size="${addrSize}" fill="${CFG.schoolColor || '#ffffff'}" text-anchor="middle">${x(shortAddr)}</text>`)}
  ${place('photo', 27, 28.3, `<defs><clipPath id="${cid}p"><circle cx="27" cy="28.3" r="10.6"/></clipPath></defs>${shape('ring')}<circle cx="27" cy="28.3" r="10.6" fill="#ffffff"/>
  ${d.photo ? `<image xlink:href="${x(d.photo)}" x="16.4" y="17.7" width="21.2" height="21.2" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cid}p)"/>`
    : `<g clip-path="url(#${cid}p)"><rect x="16.2" y="17.5" width="21.6" height="21.6" fill="#e8edf5"/><circle cx="27" cy="25.8" r="4" fill="#b9c3d6"/><path d="M19 39c0-5.2 3.6-8.3 8-8.3s8 3.1 8 8.3z" fill="#b9c3d6"/></g>`}`)}
  ${place('name', 27, nameY - 1.4, `<g font-family="${nameFont}" font-weight="${CFG.nameWeight || 400}" fill="${CFG.nameColor || '#111111'}" text-anchor="middle">${name.map((l, i) => `<text x="27" y="${n2(nameY + i * 3.8)}" font-size="${nameSize}">${x(l)}</text>`).join('')}</g>`)}
  ${place('info', 27, y0 + 8, `<g font-family="${F_BODY}">${rowsSvg}</g>`)}
  ${place('footer', 26.8, 77.4, `<text x="26.8" y="78.4" font-family="${F_HEAD}" font-weight="900" font-size="${Number(CFG.footerSize) || 2.6}" fill="#ffffff" text-anchor="middle" letter-spacing="0.08">${x(CFG.footer)}</text>`)}`;
  }

  // ===== পেছনের দিক =====
  const ICON = {
    phone: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="1.6" fill="#2fb34a"/><path d="M${n2(cx - 0.7)} ${n2(cy - 0.9)}c.17-.1.38-.04.47.12l.36.62c.1.16.05.36-.1.47l-.23.19c.17.4.47.73.86.94l.21-.23c.12-.13.32-.16.47-.07l.61.38c.16.1.22.29.12.45l-.17.31c-.17.3-.52.44-.85.34a3.4 3.4 0 0 1-2.19-2.26c-.1-.32.06-.66.35-.82z" fill="#ffffff"/>`,
    pin: (cx, cy) => `<path d="M${cx} ${n2(cy + 2.1)}c-.2-.5-1.75-2.1-1.75-3.3a1.75 1.75 0 0 1 3.5 0c0 1.2-1.55 2.8-1.75 3.3z" fill="#e5484d"/><circle cx="${cx}" cy="${n2(cy - 1.2)}" r="0.62" fill="#ffffff"/>`,
    mail: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="1.6" fill="#3d8fd6"/><rect x="${n2(cx - 0.95)}" y="${n2(cy - 0.62)}" width="1.9" height="1.28" rx="0.15" fill="none" stroke="#ffffff" stroke-width="0.2"/><path d="M${n2(cx - 0.95)} ${n2(cy - 0.57)}l.95.72.95-.72" fill="none" stroke="#ffffff" stroke-width="0.2"/>`
  };
  function back(d) {
    const cid = 'b' + (++seq);
    const phone = CFG.backPhone || d.schoolPhone;
    const addrLines = CFG.backAddress ? CFG.backAddress.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 3) : wrap(d.schoolAddress, 24, 2);
    const email = CFG.backEmail || d.schoolEmail;
    const cs = Number(CFG.contactSize) || 1;
    const items = [['phone', [phone], 3.0], ['pin', addrLines, 2.3], ['mail', [email], 2.3]].filter((it) => it[1].join('').trim());
    // মাদ্রাসার কার্ড অনুযায়ী: ফোন 44.1, ঠিকানা 48.2/50.6, ইমেইল 54.6
    let y = 44.1; const lineTop = y - 3.4;
    const rows = items.map((it) => {
      const ty = y; const mid = ty - 0.85 + (it[1].length > 1 ? 1.2 : 0);
      const block = `${ICON[it[0]](12.1, Math.round(mid * 100) / 100)}<circle cx="16.3" cy="${n2(mid)}" r="0.95" fill="${shapeColor('kNavy')}"/>${it[1].map((l, i) => `<text x="18.4" y="${n2(ty + i * 2.45)}" font-size="${n2(it[2] * cs)}" fill="#111111">${x(l)}</text>`).join('')}`;
      y += 4.1 + (it[1].length - 1) * 2.45;
      return block;
    }).join('');
    const lineBot = y - 3.2;
    return frame(cid, `${shape('kBlue')}${shape('kNavy')}${shape('kTeal')}${bottomShapes()}`) + `
  ${place('logo', 27, 24.6, `${shape('kRing')}<circle cx="27" cy="24.6" r="12.4" fill="#ffffff"/>${d.logo ? `<image xlink:href="${x(d.logo)}" x="16.2" y="14.6" width="21.6" height="20" preserveAspectRatio="xMidYMid meet"/>` : ''}`)}
  ${place('contact', 27, (lineTop + lineBot) / 2, `<line x1="16.3" y1="${n2(lineTop)}" x2="16.3" y2="${n2(lineBot)}" stroke="${shapeColor('kNavy')}" stroke-width="0.5"/><g font-family="${F_BODY}">${rows}</g>`)}
  ${CFG.qr === 'none' ? '' : place('qr', 27, 62.9, qrSvg(CFG.qr === 'custom' ? (CFG.qrCustom || '') : CFG.qr === 'website' ? (d.website || '') : (d.qr || ''), 21.4, 57.3, 11.2))}
  ${place('sign', 42.6, 72, `${d.sign ? `<image xlink:href="${x(d.sign)}" x="35.9" y="68.3" width="13.4" height="4.1" preserveAspectRatio="xMidYMid meet"/>` : ''}<line x1="34.8" y1="72.8" x2="50.3" y2="72.8" stroke="#111111" stroke-width="0.3"/><text x="42.6" y="74.9" font-family="${F_BODY}" font-size="1.95" fill="#111111" text-anchor="middle">${x(CFG.signLabel)}</text>`)}`;
  }

  // একটি দিক আসল মাপে (mm)
  const side = (d, which) => `<g transform="scale(${n2(SX)} ${n2(SY)})">${which === 'back' ? back(d) : front(d)}</g>`;
  const svgOpen = (cls, label) => `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${n2(W)} ${n2(H)}" width="${n2(W * 4)}" height="${n2(H * 4)}" role="img" aria-label="${x(label)}">`;
  function previewSvg(d, which, cfg) {
    useCfg(cfg); BLEED_MODE = false;
    return svgOpen('id-svg', (which === 'back' ? 'Back of ID card: ' : 'ID card: ') + d.name) + side(d, which) + '</svg>';
  }

  // একজন শিক্ষার্থীর প্রিন্ট ফাইল: সামনে ও পেছন পাশাপাশি, প্রতিটি 2.13 × 3.39 in + 0.125 in bleed।
  // প্রতিটি দিক আলাদা লেয়ার/গ্রুপ (Front, Back → Background, Content, Trim)।
  function studentSvg(d, cfg) {
    useCfg(cfg); BLEED_MODE = true;
    const bw = W + 2 * BLEED, bh = H + 2 * BLEED, gap = 12.7;
    const one = (which, ox) => `<g id="${which === 'back' ? 'Back' : 'Front'}" transform="translate(${n2(ox + BLEED)} ${n2(BLEED)})">
  <g id="Artboard_${which === 'back' ? 2 : 1}_Bleed"><rect x="${n2(-BLEED)}" y="${n2(-BLEED)}" width="${n2(bw)}" height="${n2(bh)}" fill="none" stroke="#ff0000" stroke-width="0.1"/></g>
  <g id="Content">${side(d, which)}</g>
  <g id="Trim"><rect x="0" y="0" width="${n2(W)}" height="${n2(H)}" fill="none" stroke="#00b7eb" stroke-width="0.12"/></g></g>`;
    const out = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${n2(bw * 2 + gap)}mm" height="${n2(bh)}mm" viewBox="0 0 ${n2(bw * 2 + gap)} ${n2(bh)}">\n<title>${x(d.name + ' — ID ' + d.id)}</title>\n${one('front', 0)}\n${one('back', bw + gap)}\n</svg>`;
    BLEED_MODE = false;
    return out;
  }

  // A4 পাতায় সাজানো (প্রতি পাতায় 9টি কার্ড)। প্রতিটি সামনের পাতার পরে তার পেছনের পাতা,
  // কলাম উল্টো ক্রমে — দুই পিঠে প্রিন্ট করলে সামনে-পেছন মিলে যায়। সব পাতা একটি ফাইলে।
  function sheetSvg(list, title, cfg) {
    useCfg(cfg); BLEED_MODE = false;
    const PW = 210, PH = 297, cols = 3, rowsN = 3, gx = 8, gy = 6, PG = 12;
    const mx = (PW - (cols * W + (cols - 1) * gx)) / 2, my = (PH - (rowsN * H + (rowsN - 1) * gy)) / 2;
    const per = cols * rowsN, sheets = Math.max(1, Math.ceil(list.length / per));
    const pages = sheets * 2, totalH = pages * PH + (pages - 1) * PG;
    const id = (d, s) => x((s + '_Roll_' + d.roll + '_' + d.name).replace(/[^A-Za-z0-9_]+/g, '_'));
    let body = '';
    for (let p = 0; p < sheets; p++) {
      const chunk = list.slice(p * per, (p + 1) * per);
      ['Front', 'Back'].forEach((sd, k) => {
        const oy = (p * 2 + k) * (PH + PG);
        body += `<g id="Page_${p + 1}_${sd}"><rect x="0" y="${oy}" width="${PW}" height="${PH}" fill="#ffffff" stroke="#cccccc" stroke-width="0.2"/>`;
        chunk.forEach((d, i) => {
          const col = k ? cols - 1 - (i % cols) : i % cols;
          const cx = mx + col * (W + gx), cy = oy + my + Math.floor(i / cols) * (H + gy);
          body += `<g id="${id(d, sd)}" transform="translate(${n2(cx)} ${n2(cy)})">${side(d, k ? 'back' : 'front')}</g>`;
        });
        body += '</g>';
      });
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PW}mm" height="${totalH}mm" viewBox="0 0 ${PW} ${totalH}">\n<title>${x(title)}</title>\n${body}\n</svg>`;
  }

  // ছবি লোড
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('ছবিটি খোলা যাচ্ছে না।')); i.src = src; });
  const fileToUrl = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('ফাইল পড়া যায়নি।')); fr.readAsDataURL(file); });

  // কার্ডের গোল ছবির জন্য বর্গাকার করে কাটা (মুখ উপরের দিকে থাকে)
  async function portrait(src, size) {
    size = size || 420;
    const img = await loadImg(src);
    const s = Math.min(img.width, img.height);
    const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size);
    g.drawImage(img, (img.width - s) / 2, Math.max(0, (img.height - s) * 0.3), s, s, 0, 0, size, size);
    return cv.toDataURL('image/jpeg', 0.86);
  }

  // Illustrator-এর জন্য WebP → PNG
  async function toPng(src) {
    if (!src || /^data:image\/(png|jpeg)/.test(src)) return src;
    const img = await loadImg(src);
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    cv.getContext('2d').drawImage(img, 0, 0);
    return cv.toDataURL('image/png');
  }

  // ব্যাকগ্রাউন্ড সাদা করা (Google MediaPipe — ব্রাউজারেই চলে, ছবি কোথাও পাঠানো হয় না)
  let segP = null;
  function segmenter() {
    if (!segP) segP = (async () => {
      const V = '0.10.14';
      const vision = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}/vision_bundle.mjs`);
      const files = await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${V}/wasm`);
      return vision.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite' },
        runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false
      });
    })().catch((e) => { segP = null; throw e; });
    return segP;
  }
  async function whiteBackground(src) {
    const seg = await segmenter();
    const img = await loadImg(src);
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const res = seg.segment(cv);
    const masks = res.confidenceMasks || [];
    const mask = masks[masks.length - 1].getAsFloat32Array();
    const px = g.getImageData(0, 0, cv.width, cv.height); const d = px.data;
    for (let i = 0; i < mask.length; i++) {
      // কিনারা নরম রাখতে মাস্কের মান একটু টেনে নেওয়া
      const a = Math.min(1, Math.max(0, (mask[i] - 0.25) / 0.5));
      d[i * 4] = d[i * 4] * a + 255 * (1 - a); d[i * 4 + 1] = d[i * 4 + 1] * a + 255 * (1 - a); d[i * 4 + 2] = d[i * 4 + 2] * a + 255 * (1 - a);
    }
    g.putImageData(px, 0, 0);
    masks.forEach((m) => m.close && m.close());
    return cv.toDataURL('image/jpeg', 0.88);
  }

  global.IdCard = { W, H, DEF, SHAPES, ITEMS, previewSvg, sheetSvg, studentSvg, portrait, toPng, whiteBackground, fileToUrl, ensureQR };
})(window);
