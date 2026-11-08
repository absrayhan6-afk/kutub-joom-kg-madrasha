// গ্রেড, GPA, মেধাক্রম ও হিসাবের ক্যালকুলেশন — সব জায়গায় একই নিয়ম ব্যবহার হয়।
(function (global) {
  'use strict';

  const EXAMS = [
    { key: 'first', name: 'প্রথম সাময়িক পরীক্ষা', short: '১ম সাময়িক' },
    { key: 'second', name: 'দ্বিতীয় সাময়িক পরীক্ষা', short: '২য় সাময়িক' },
    { key: 'annual', name: 'বার্ষিক পরীক্ষা', short: 'বার্ষিক' }
  ];
  const examName = (k) => (EXAMS.find((e) => e.key === k) || {}).name || k;

  // বাংলাদেশ শিক্ষা বোর্ডের গ্রেডিং পদ্ধতি
  const GRADES = [
    { min: 80, grade: 'A+', gp: 5 },
    { min: 70, grade: 'A', gp: 4 },
    { min: 60, grade: 'A-', gp: 3.5 },
    { min: 50, grade: 'B', gp: 3 },
    { min: 40, grade: 'C', gp: 2 },
    { min: 33, grade: 'D', gp: 1 },
    { min: 0, grade: 'F', gp: 0 }
  ];

  const BN = '০১২৩৪৫৬৭৮৯';
  const toEn = (v) => String(v == null ? '' : v).replace(/[০-৯]/g, (d) => BN.indexOf(d)).trim();
  const toBn = (v) => String(v == null ? '' : v).replace(/[0-9]/g, (d) => BN[d]);
  const num = (v) => {
    const s = toEn(v);
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const fix2 = (n) => (Math.round(n * 100) / 100).toFixed(2);

  function subjectGrade(mark, full, pass) {
    const pct = full > 0 ? (mark / full) * 100 : 0;
    if (mark < pass) return { grade: 'F', gp: 0 };
    const g = GRADES.find((x) => pct >= x.min);
    return { grade: g.grade, gp: g.gp };
  }

  function gpaGrade(gpa, passed) {
    if (!passed) return 'F';
    if (gpa >= 5) return 'A+';
    if (gpa >= 4) return 'A';
    if (gpa >= 3.5) return 'A-';
    if (gpa >= 3) return 'B';
    if (gpa >= 2) return 'C';
    if (gpa >= 1) return 'D';
    return 'F';
  }

  // একজন শিক্ষার্থীর ফলাফল। marks = {subjectId: value}
  function studentResult(subjects, marks) {
    const rows = [];
    let total = 0, full = 0, gpSum = 0, passed = true, missing = 0;
    subjects.forEach((s) => {
      const m = num(marks ? marks[s.id] : null);
      if (m === null || Number.isNaN(m)) { missing++; rows.push({ id: s.id, name: s.name, full: s.full, pass: s.pass, mark: null, grade: '—', gp: 0 }); return; }
      const g = subjectGrade(m, s.full, s.pass);
      if (g.grade === 'F') passed = false;
      total += m; full += s.full; gpSum += g.gp;
      rows.push({ id: s.id, name: s.name, full: s.full, pass: s.pass, mark: m, grade: g.grade, gp: g.gp });
    });
    const count = subjects.length || 1;
    const gpa = passed ? gpSum / count : 0;
    return {
      rows, total, full, missing,
      average: subjects.length ? total / subjects.length : 0,
      percentage: full ? (total / full) * 100 : 0,
      gpa, passed: passed && missing === 0,
      grade: gpaGrade(gpa, passed && missing === 0)
    };
  }

  // শ্রেণির সবার ফলাফল + মেধাক্রম + নতুন রোল
  function classResults(students, subjects, entries) {
    const list = students.map((st) => Object.assign({ student: st }, studentResult(subjects, (entries || {})[st.id])));
    const sorted = list.slice().sort((a, b) =>
      (b.passed - a.passed) || (b.total - a.total) || (b.gpa - a.gpa) || (num(a.student.roll) - num(b.student.roll)));
    let prev = null;
    sorted.forEach((r, i) => {
      if (prev && prev.passed === r.passed && prev.total === r.total && prev.gpa === r.gpa) r.rank = prev.rank;
      else r.rank = i + 1;
      r.newRoll = i + 1;
      prev = r;
    });
    return sorted;
  }

  // ===== হিসাব =====
  const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  // বছরে তিনবার হিসাব: প্রতিটি পরীক্ষার আগে
  const FEE_PERIODS = [
    { key: 'first', name: 'প্রথম সাময়িক হিসাব', items: ['admission', 'm1', 'm2', 'm3', 'm4', 'exam_first'] },
    { key: 'second', name: 'দ্বিতীয় সাময়িক হিসাব', items: ['m5', 'm6', 'm7', 'm8', 'exam_second'] },
    { key: 'annual', name: 'বার্ষিক হিসাব', items: ['m9', 'm10', 'm11', 'm12', 'exam_annual'] }
  ];
  function feeItems() {
    const items = [{ key: 'admission', name: 'ভর্তি ফি', type: 'admission' }];
    MONTHS.forEach((m, i) => items.push({ key: 'm' + (i + 1), name: m, type: 'monthly' }));
    EXAMS.forEach((e) => items.push({ key: 'exam_' + e.key, name: e.short + ' পরীক্ষা ফি', type: 'exam_' + e.key }));
    return items;
  }
  function feeDue(structure, key) {
    const s = structure || {};
    if (key === 'admission') return Number(s.admission) || 0;
    if (/^m\d+$/.test(key)) return Number(s.monthly) || 0;
    if (key.startsWith('exam_')) return Number(s[key]) || 0;
    return 0;
  }
  // একজন শিক্ষার্থীর হিসাব — প্রতি পর্বে কত দেয়, কত দিয়েছে, কত বাকি
  function studentFees(structure, paid, override) {
    const p = paid || {};
    const st = Object.assign({}, structure, override || {});
    const periods = FEE_PERIODS.map((per) => {
      let due = 0, got = 0;
      per.items.forEach((k) => { due += feeDue(st, k); got += Number(p[k]) || 0; });
      return { key: per.key, name: per.name, due, paid: got, balance: Math.max(0, due - got) };
    });
    const due = periods.reduce((a, b) => a + b.due, 0);
    const got = periods.reduce((a, b) => a + b.paid, 0);
    return { periods, due, paid: got, balance: Math.max(0, due - got) };
  }

  global.Calc = { EXAMS, examName, GRADES, toEn, toBn, num, fix2, subjectGrade, studentResult, classResults, MONTHS, FEE_PERIODS, feeItems, feeDue, studentFees };
})(typeof window !== 'undefined' ? window : globalThis);
