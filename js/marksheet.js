// মার্কশিট তৈরি — অভিভাবকদের পেজ ও অ্যাডমিন দুই জায়গাতেই একই ডিজাইন। মার্কশিটের সব লেখা ইংরেজিতে।
(function (global) {
  'use strict';
  const C = global.Calc;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateEn = (ts) => { const d = ts ? new Date(ts) : new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
  const laurel = (flip) => `<svg class="laurel${flip ? ' flip' : ''}" viewBox="0 0 40 90" aria-hidden="true"><path d="M30 88C10 70 6 40 18 6" fill="none" stroke="currentColor" stroke-width="2.5"/>${[14, 26, 38, 50, 62, 74].map((y, i) => `<ellipse cx="${(i < 3 ? 12 : 16) + i * 0.6}" cy="${y}" rx="7" ry="3.2" transform="rotate(-35 ${12 + i} ${y})"/><ellipse cx="${24 + i * 0.4}" cy="${y + 6}" rx="7" ry="3.2" transform="rotate(35 ${24 + i} ${y + 6})"/>`).join('')}</svg>`;

  function render(r, settings, images) {
    const s = settings || {};
    const logo = (images && images.logo) || 'assets/logo.webp';
    const passed = r.passed;
    const rows = r.rows.map((x, i) => `<tr><td>${i + 1}</td><td class="ms-sub">${esc(x.nameEn || x.name)}</td><td>${x.full}</td><td>${x.mark == null ? '—' : x.mark}</td><td class="${x.grade === 'F' ? 'ms-f' : ''}">${esc(x.grade)}</td><td>${C.fix2(x.gp)}</td></tr>`).join('');
    const info = [
      ['Name', r.nameEn || r.name], ["Father's Name", r.fatherEn || r.father], ['Class', r.classNameEn || r.className],
      ['Roll No', r.roll], ['Registration No', r.reg], ['Merit Position', r.rank || '—']
    ].filter((x) => x[1]).map((x) => `<div class="ms-k">${x[0]}</div><div class="ms-c">:</div><div class="ms-v">${esc(x[1])}</div>`).join('');
    const tiles = [
      ['Total Marks', `${r.total}<small>/${r.full}</small>`, 't-blue'],
      ['Average', C.fix2(r.average), 't-purple'],
      ['GPA', C.fix2(r.gpa), 't-green'],
      ['Result', passed ? 'PASS' : 'FAIL', passed ? 't-orange' : 't-red'],
      ['Merit Position', r.rank || '—', 't-sky']
    ].map((t) => `<div class="ms-tile ${t[2]}"><span>${t[0]}</span><b>${t[1]}</b></div>`).join('');
    return `<article class="marksheet" lang="en" aria-label="Marksheet">
  <header class="ms-head">
    <img class="ms-logo" src="${esc(logo)}" alt="Logo" width="120" height="110">
    <div class="ms-name"><h2>${esc(s.nameEn || s.name)}</h2><p class="ms-addr"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>${esc(s.addressEn || s.address)}</p>${s.established ? `<p class="ms-en">Established: ${esc(C.toEn(s.established))}</p>` : ''}</div>
    <dl class="ms-meta"><dt>Academic Year</dt><dd>${esc(r.year)}</dd><dt>Class</dt><dd>${esc(r.classNameEn || r.className)}</dd><dt>Examination</dt><dd>${esc(C.examEn(r.exam))}</dd></dl>
  </header>
  <div class="ms-ribbon"><span>Academic Transcript</span></div>
  <section class="ms-info">
    <div class="ms-grid">${info}</div>
    <div class="ms-grade ${passed ? '' : 'is-fail'}"><span>Overall Grade</span><div class="ms-grade-row">${laurel(false)}<b>${esc(r.grade)}</b>${laurel(true)}</div></div>
  </section>
  <section class="ms-tiles">${tiles}</section>
  <div class="ms-table-wrap"><table class="ms-table"><thead><tr><th>SL</th><th>Subject</th><th>Full Marks</th><th>Obtained Marks</th><th>Grade</th><th>GP</th></tr></thead><tbody>${rows}</tbody></table></div>
  <section class="ms-msg ${passed ? '' : 'is-fail'}">
    <span class="ms-msg-ico" aria-hidden="true">${passed ? '<svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4z"/></svg>' : '!'}</span>
    <div>${passed ? '<h3>Congratulations!</h3><p>You have passed the examination. May Allah grant you more success.</p>' : '<h3>Do not lose hope!</h3><p>Study with more care. In sha Allah, you will do better in the next examination.</p>'}</div>
  </section>
  <footer class="ms-foot"><span>Result Published: ${dateEn(r.publishedAt)}</span><span class="ms-sign">Head Teacher</span></footer>
</article>`;
  }
  global.Marksheet = { render, esc };
})(window);
