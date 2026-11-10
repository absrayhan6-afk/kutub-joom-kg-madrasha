// শিক্ষার্থীর আইডি কার্ড (মাদ্রাসার দেওয়া ফরম্যাট অনুযায়ী): সামনে ও পেছনে দুই দিক।
// মাপ CR80 (54 × 85.6 mm), সব লেখা ইংরেজিতে। আইডি নম্বর = রেজিস্ট্রেশন নম্বর।
// SVG (মিলিমিটারে) — ব্রাউজারে দেখা, প্রিন্ট ও Adobe Illustrator-এ এডিট করা যায়।
(function (global) {
  'use strict';
  const W = 54, H = 85.6;
  const NAVY = '#2b2e7c', BLUE = '#3f88c9', TEAL = '#7fcfdb', INK = '#1f2357';
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

  // ===== পটভূমির নকশা =====
  const topShapes = () => `
    <path d="M0 0H23L41 38.5L33 41L0 19.5Z" fill="${NAVY}"/>
    <path d="M23 0H54V31L41 38.5Z" fill="${BLUE}"/>
    <path d="M54 31V36.6L41.6 43.6L39.4 39.4Z" fill="${TEAL}"/>`;
  const bottomShapes = () => `
    <path d="M0 72.5L54 81.5V85.6H0Z" fill="${NAVY}"/>
    <path d="M7.5 85.6C8.6 79.6 12.6 75.8 20 75.6L54 79.6V85.6Z" fill="${TEAL}"/>
    <path d="M11.2 85.6C12.4 81.4 15.6 78.6 21.2 78.4L54 82.2V85.6Z" fill="${BLUE}"/>`;
  const frame = (cid, inner) => `<defs><clipPath id="${cid}k"><rect width="${W}" height="${H}" rx="2.6"/></clipPath></defs><g clip-path="url(#${cid}k)"><rect width="${W}" height="${H}" fill="#ffffff"/>${inner}</g>`;

  // ===== সামনের দিক =====
  // d = {name, id, father, cls, roll, phone, address, year, photo, logo, school, schoolAddress, ...}
  function front(d) {
    const cid = 'f' + (++seq);
    const school = wrap(String(d.school || '').toUpperCase(), 24, 2);
    const shortAddr = String(d.schoolAddress || '').split(',').map((t) => t.trim()).filter(Boolean).slice(-2).join(', ');
    const name = wrap(d.name, 22, 2);
    const nameSize = name.length > 1 ? 3.2 : (String(d.name).length > 18 ? 3.4 : 3.9);
    const addr = wrap(d.address, 22, 2);
    const rows = [['ID Number', d.id], ["Father's name", d.father], ['Roll', d.roll], ['Class', d.cls], ['Mobile', d.phone]];
    let y = 46.6 + (name.length - 1) * 3.6;
    const row = (l, val, yy, first) => `${l ? `<text x="8.6" y="${n2(yy)}" font-size="2.55" fill="${INK}">${x(l)}</text>` : ''}${first ? `<text x="24.6" y="${n2(yy)}" font-size="2.8" font-weight="700" fill="${INK}">:</text>` : ''}<text x="26.4" y="${n2(yy)}" font-size="2.55" fill="${INK}">${x(val || '')}</text>`;
    let rowsSvg = rows.map((r) => { const s = row(r[0], r[1], y, true); y += 3.45; return s; }).join('');
    rowsSvg += addr.length ? addr.map((l, i) => row(i === 0 ? 'Address' : '', l, y + i * 3, i === 0)).join('') : row('Address', '', y, true);
    return frame(cid, `${topShapes()}${bottomShapes()}`) + `
  <g font-family="${F_HEAD}" font-weight="900" fill="#ffffff" text-anchor="middle">${school.map((l, i) => `<text x="27" y="${n2(5.4 + i * 4.1)}" font-size="${school.some((t) => t.length > 20) ? 3.05 : 3.35}" letter-spacing="0.12">${x(l)}</text>`).join('')}</g>
  <text x="27" y="${n2(5.4 + school.length * 4.1 + 0.2)}" font-family="${F_BODY}" font-size="2.35" fill="#ffffff" text-anchor="middle">${x(shortAddr)}</text>
  <defs><clipPath id="${cid}p"><circle cx="27" cy="27.6" r="9.4"/></clipPath></defs>
  <path d="M27 16.2A11.4 11.4 0 1 1 15.7 29.3C15.3 25 14.6 20 13.4 16.6C17.6 16.4 22.4 16.2 27 16.2Z" fill="${NAVY}"/>
  <circle cx="27" cy="27.6" r="9.9" fill="#ffffff"/>
  ${d.photo ? `<image xlink:href="${x(d.photo)}" x="17.6" y="18.2" width="18.8" height="18.8" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cid}p)"/>`
    : `<g clip-path="url(#${cid}p)"><rect x="17" y="17" width="20" height="21" fill="#e8edf5"/><circle cx="27" cy="25.2" r="3.6" fill="#b9c3d6"/><path d="M19.8 37.4c0-4.6 3.2-7.4 7.2-7.4s7.2 2.8 7.2 7.4z" fill="#b9c3d6"/></g>`}
  <g font-family="${F_NAME}" font-weight="700" fill="#111111" text-anchor="middle">${name.map((l, i) => `<text x="27" y="${n2(42.6 + i * 3.6)}" font-size="${nameSize}">${x(l)}</text>`).join('')}</g>
  <g font-family="${F_BODY}">${rowsSvg}</g>
  <text x="31.5" y="84.1" font-family="${F_HEAD}" font-weight="900" font-size="2.9" fill="#ffffff" text-anchor="middle" letter-spacing="0.1">STUDENT</text>`;
  }

  // ===== পেছনের দিক =====
  const ICON = {
    phone: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="1.75" fill="#2fb34a"/><path d="M${cx - 0.75} ${cy - 0.95}c.18-.1.4-.04.5.13l.38.66c.1.17.05.38-.1.5l-.25.2c.18.42.5.78.92 1l.22-.24c.13-.14.34-.17.5-.07l.65.4c.17.1.23.31.13.48l-.18.33c-.18.32-.55.47-.9.36a3.6 3.6 0 0 1-2.33-2.4c-.1-.34.06-.7.37-.87z" fill="#ffffff"/>`,
    pin: (cx, cy) => `<path d="M${cx} ${cy + 2.1}c-.2-.5-1.75-2.1-1.75-3.3a1.75 1.75 0 0 1 3.5 0c0 1.2-1.55 2.8-1.75 3.3z" fill="#e5484d"/><circle cx="${cx}" cy="${cy - 1.2}" r="0.62" fill="#ffffff"/>`,
    mail: (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="1.75" fill="#3d8fd6"/><rect x="${cx - 1}" y="${cy - 0.65}" width="2" height="1.35" rx="0.15" fill="none" stroke="#ffffff" stroke-width="0.22"/><path d="M${cx - 1} ${cy - 0.6}l1 .75 1-.75" fill="none" stroke="#ffffff" stroke-width="0.22"/>`
  };
  function back(d) {
    const cid = 'b' + (++seq);
    const addr = wrap(d.schoolAddress, 24, 2);
    const items = [['phone', [d.schoolPhone]], ['pin', addr], ['mail', [d.schoolEmail]]].filter((it) => it[1].join('').trim());
    let y = 43.2; const lineTop = y - 2.6;
    const rows = items.map((it) => {
      const ty = y; const block = `${ICON[it[0]](12.2, ty - 0.8 + (it[1].length > 1 ? 1.4 : 0))}<circle cx="17" cy="${n2(ty - 0.85 + (it[1].length > 1 ? 1.4 : 0))}" r="0.95" fill="${NAVY}"/>${it[1].map((l, i) => `<text x="19.4" y="${n2(ty + i * 2.9)}" font-size="${it[0] === 'mail' ? 2.25 : it[0] === 'phone' ? 2.9 : 2.3}" fill="#111111">${x(l)}</text>`).join('')}`;
      y += 3.2 + (it[1].length - 1) * 2.9 + 2;
      return block;
    }).join('');
    const lineBot = y - 3.6;
    return frame(cid, `
    <path d="M0 0H54V27L44 35Z" fill="${BLUE}"/>
    <path d="M0 0H30L46 34.5L39 37.5L0 23Z" fill="${NAVY}"/>
    <path d="M54 26V31.4L44.2 38.4L42.4 34.6Z" fill="${TEAL}"/>
    ${bottomShapes()}`) + `
  <circle cx="27" cy="20.4" r="12.6" fill="${NAVY}"/>
  <circle cx="26.2" cy="20.2" r="11.6" fill="#ffffff"/>
  ${d.logo ? `<image xlink:href="${x(d.logo)}" x="16.4" y="11.2" width="19.6" height="18" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <line x1="17" y1="${n2(lineTop)}" x2="17" y2="${n2(lineBot)}" stroke="${NAVY}" stroke-width="0.55"/>
  <g font-family="${F_BODY}">${rows}</g>
  ${qrSvg(d.qr || '', 20.3, y - 1.2, 13.4)}
  ${d.sign ? `<image xlink:href="${x(d.sign)}" x="36.6" y="${n2(y + 5.6)}" width="13.8" height="4.6" preserveAspectRatio="xMidYMid meet"/>` : ''}
  <line x1="35.6" y1="${n2(y + 10.6)}" x2="51.6" y2="${n2(y + 10.6)}" stroke="#111111" stroke-width="0.3"/>
  <text x="43.6" y="${n2(y + 13)}" font-family="${F_BODY}" font-size="1.95" fill="#111111" text-anchor="middle">Headmaster Signature</text>`;
  }

  const svgOpen = (cls, label) => `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}" role="img" aria-label="${x(label)}">`;
  function previewSvg(d, side) {
    return svgOpen('id-svg', (side === 'back' ? 'Back of ID card: ' : 'ID card: ') + d.name) + (side === 'back' ? back(d) : front(d)) + '</svg>';
  }

  // A4 পাতায় সাজানো (প্রতি পাতায় 9টি কার্ড)। প্রতিটি সামনের পাতার পরে তার পেছনের পাতা,
  // কলাম উল্টো ক্রমে — দুই পিঠে প্রিন্ট করলে সামনে-পেছন মিলে যায়। সব পাতা একটি ফাইলে।
  function sheetSvg(list, title) {
    const PW = 210, PH = 297, cols = 3, rowsN = 3, gx = 8, gy = 6, PG = 12;
    const mx = (PW - (cols * W + (cols - 1) * gx)) / 2, my = (PH - (rowsN * H + (rowsN - 1) * gy)) / 2;
    const per = cols * rowsN, sheets = Math.max(1, Math.ceil(list.length / per));
    const pages = sheets * 2, totalH = pages * PH + (pages - 1) * PG;
    const id = (d, s) => x((s + '_Roll_' + d.roll + '_' + d.name).replace(/[^A-Za-z0-9_]+/g, '_'));
    let body = '';
    for (let p = 0; p < sheets; p++) {
      const chunk = list.slice(p * per, (p + 1) * per);
      ['Front', 'Back'].forEach((side, k) => {
        const oy = (p * 2 + k) * (PH + PG);
        body += `<g id="Page_${p + 1}_${side}"><rect x="0" y="${oy}" width="${PW}" height="${PH}" fill="#ffffff" stroke="#cccccc" stroke-width="0.2"/>`;
        chunk.forEach((d, i) => {
          const col = k ? cols - 1 - (i % cols) : i % cols;
          const cx = mx + col * (W + gx), cy = oy + my + Math.floor(i / cols) * (H + gy);
          body += `<g id="${id(d, side)}" transform="translate(${n2(cx)} ${n2(cy)})">${k ? back(d) : front(d)}</g>`;
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

  global.IdCard = { W, H, front, back, previewSvg, sheetSvg, portrait, toPng, whiteBackground, fileToUrl, ensureQR };
})(window);
