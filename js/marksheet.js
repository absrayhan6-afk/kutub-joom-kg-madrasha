// মার্কশিট তৈরি — অভিভাবকদের পেজ ও অ্যাডমিন দুই জায়গাতেই একই ডিজাইন।
(function (global) {
  'use strict';
  const C = global.Calc;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bn = (v) => C.toBn(v);
  const dateBn = (ts) => { const d = ts ? new Date(ts) : new Date(); return bn(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`); };
  const laurel = (flip) => `<svg class="laurel${flip ? ' flip' : ''}" viewBox="0 0 40 90" aria-hidden="true"><path d="M30 88C10 70 6 40 18 6" fill="none" stroke="currentColor" stroke-width="2.5"/>${[14, 26, 38, 50, 62, 74].map((y, i) => `<ellipse cx="${(i < 3 ? 12 : 16) + i * 0.6}" cy="${y}" rx="7" ry="3.2" transform="rotate(-35 ${12 + i} ${y})"/><ellipse cx="${24 + i * 0.4}" cy="${y + 6}" rx="7" ry="3.2" transform="rotate(35 ${24 + i} ${y + 6})"/>`).join('')}</svg>`;

  function render(r, settings, images) {
    const s = settings || {};
    const logo = (images && images.logo) || 'assets/logo.webp';
    const passed = r.passed;
    const rows = r.rows.map((x, i) => `<tr><td>${bn(i + 1)}</td><td class="ms-sub">${esc(x.name)}</td><td>${bn(x.full)}</td><td>${x.mark == null ? '—' : bn(x.mark)}</td><td class="${x.grade === 'F' ? 'ms-f' : ''}">${esc(x.grade)}</td><td>${C.fix2(x.gp)}</td></tr>`).join('');
    const info = [
      ['নাম', r.name], ['পিতার নাম', r.father], ['শ্রেণি', r.className], ['রোল নম্বর', bn(r.roll)], ['রেজিস্ট্রেশন নম্বর', bn(r.reg)], ['মেধাক্রম', r.rank ? bn(r.rank) : '—']
    ].filter((x) => x[1]).map((x) => `<div class="ms-k">${x[0]}</div><div class="ms-c">:</div><div class="ms-v">${esc(x[1])}</div>`).join('');
    const tiles = [
      ['মোট নম্বর', `${bn(r.total)}<small>/${bn(r.full)}</small>`, 't-blue'],
      ['গড় নম্বর', bn(C.fix2(r.average)), 't-purple'],
      ['GPA', C.fix2(r.gpa), 't-green'],
      ['ফলাফল', passed ? 'PASS' : 'FAIL', passed ? 't-orange' : 't-red'],
      r.newRoll ? ['নতুন রোল', bn(r.newRoll), 't-sky'] : ['মেধাক্রম', r.rank ? bn(r.rank) : '—', 't-sky']
    ].map((t) => `<div class="ms-tile ${t[2]}"><span>${t[0]}</span><b>${t[1]}</b></div>`).join('');
    return `<article class="marksheet" aria-label="মার্কশিট">
  <header class="ms-head">
    <img class="ms-logo" src="${esc(logo)}" alt="লোগো" width="120" height="110">
    <div class="ms-name"><h2>${esc(s.name)}</h2><p class="ms-en">${esc(s.nameEn)}</p><p class="ms-addr"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>${esc(s.address)}</p></div>
    <dl class="ms-meta"><dt>পরীক্ষার সন</dt><dd>${bn(r.year)}</dd><dt>শ্রেণি</dt><dd>${esc(r.className)}</dd><dt>পরীক্ষার ধরন</dt><dd>${esc(C.examName(r.exam))}</dd></dl>
  </header>
  <div class="ms-ribbon"><span>পরীক্ষার ফলাফল</span></div>
  <section class="ms-info">
    <div class="ms-grid">${info}</div>
    <div class="ms-grade ${passed ? '' : 'is-fail'}"><span>সার্বিক গ্রেড</span><div class="ms-grade-row">${laurel(false)}<b>${esc(r.grade)}</b>${laurel(true)}</div></div>
  </section>
  <section class="ms-tiles">${tiles}</section>
  <div class="ms-table-wrap"><table class="ms-table"><thead><tr><th>ক্রম</th><th>বিষয়</th><th>পূর্ণমান</th><th>প্রাপ্ত নম্বর</th><th>গ্রেড</th><th>GP</th></tr></thead><tbody>${rows}</tbody></table></div>
  <section class="ms-msg ${passed ? '' : 'is-fail'}">
    <span class="ms-msg-ico" aria-hidden="true">${passed ? '<svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg>' : '!'}</span>
    <div>${passed ? '<h3>অভিনন্দন!</h3><p>তুমি উত্তীর্ণ হয়েছ। আল্লাহ তোমার সাফল্য আরও বাড়িয়ে দিন।</p>' : '<h3>হতাশ হয়ো না!</h3><p>আরও মনোযোগ দিয়ে পড়াশোনা করো। ইনশাআল্লাহ পরের পরীক্ষায় ভালো করবে।</p>'}</div>
  </section>
  <footer class="ms-foot"><span>ফলাফল প্রকাশ: ${dateBn(r.publishedAt)}</span><span class="ms-sign">প্রধান শিক্ষক</span></footer>
</article>`;
  }
  global.Marksheet = { render, esc };
})(window);
