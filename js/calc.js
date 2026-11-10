// গ্রেড, GPA, মেধাক্রম ও হিসাবের ক্যালকুলেশন — সব জায়গায় একই নিয়ম ব্যবহার হয়।
(function (global) {
  'use strict';

  const EXAMS = [
    { key: 'first', name: 'প্রথম সাময়িক পরীক্ষা', short: '1ম সাময়িক', en: 'First Terminal Examination' },
    { key: 'second', name: 'দ্বিতীয় সাময়িক পরীক্ষা', short: '2য় সাময়িক', en: 'Second Terminal Examination' },
    { key: 'annual', name: 'বার্ষিক পরীক্ষা', short: 'বার্ষিক', en: 'Annual Examination' }
  ];
  const examName = (k) => (EXAMS.find((e) => e.key === k) || {}).name || k;
  const examEn = (k) => (EXAMS.find((e) => e.key === k) || {}).en || k;

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
  // সব সংখ্যা ইংরেজিতে দেখানো হয় (মাদ্রাসার নির্দেশনা অনুযায়ী)
  const toBn = (v) => toEn(v);
  const num = (v) => {
    const s = toEn(v);
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const fix2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  const passMarkFor = (full) => Math.round(Number(full) * 0.33 * 100) / 100;

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
      const base = { id: s.id, name: s.name, nameEn: s.nameEn || '', full: s.full, pass: s.pass };
      const m = num(marks ? marks[s.id] : null);
      if (m === null || Number.isNaN(m)) { missing++; rows.push(Object.assign(base, { mark: null, grade: '—', gp: 0 })); return; }
      const g = subjectGrade(m, s.full, s.pass);
      if (g.grade === 'F') passed = false;
      total += m; full += s.full; gpSum += g.gp;
      rows.push(Object.assign(base, { mark: m, grade: g.grade, gp: g.gp }));
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

  // শ্রেণির সবার ফলাফল + মেধাক্রম। newRoll শুধু প্রমোশনের সময় নতুন রোল বসাতে ব্যবহার হয়।
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
  // বছরে তিনবার হিসাব: প্রতিটি পরীক্ষার আগে। কোন ফি কোন হিসাবে যাবে তা প্রতিটি ফি-তে বদলানো যায়।
  const FEE_PERIODS = [
    { key: 'first', name: 'প্রথম সাময়িক হিসাব' },
    { key: 'second', name: 'দ্বিতীয় সাময়িক হিসাব' },
    { key: 'annual', name: 'বার্ষিক হিসাব' }
  ];
  const periodName = (k) => (FEE_PERIODS.find((p) => p.key === k) || {}).name || k;

  // ডিফল্ট ফি-এর তালিকা (প্রিন্সিপাল যোগ/বাদ/বদল করতে পারেন)
  function defaultFeeItems(s) {
    s = s || {};
    const items = [{ key: 'admission', name: 'ভর্তি ফি', amount: Number(s.admission) || 0, period: 'first', monthly: false }];
    MONTHS.forEach((m, i) => items.push({ key: 'm' + (i + 1), name: m, amount: Number(s.monthly) || 0, period: i < 4 ? 'first' : i < 8 ? 'second' : 'annual', monthly: true }));
    EXAMS.forEach((e) => items.push({ key: 'exam_' + e.key, name: e.short + ' পরীক্ষা ফি', amount: Number(s['exam_' + e.key]) || 0, period: e.key, monthly: false }));
    return items;
  }
  // পুরনো ধাঁচের ডাটা থাকলে নতুন ধাঁচে আনা
  function normalizeFees(f) {
    f = Object.assign({ payments: {}, discounts: {} }, f || {});
    if (!Array.isArray(f.items) || !f.items.length) f.items = defaultFeeItems(f.structure);
    if (f.overrides && !Object.keys(f.discounts).length) {
      Object.keys(f.overrides).forEach((sid) => { const o = f.overrides[sid]; if (o && o.monthly != null) f.discounts[sid] = { type: 'amount', amount: Number(o.monthly) || 0, scope: 'monthly' }; });
    }
    delete f.structure; delete f.overrides;
    return f;
  }
  const DISCOUNTS = [
    { key: '', name: 'পূর্ণ বেতন' },
    { key: 'half', name: 'অর্ধেক বেতন' },
    { key: 'free', name: 'ফ্রি (সম্পূর্ণ মাফ)' },
    { key: 'percent', name: 'নির্দিষ্ট % ছাড়' },
    { key: 'amount', name: 'নির্দিষ্ট মাসিক বেতন' }
  ];
  // একটি ফি-তে শিক্ষার্থীকে কত দিতে হবে (ছাড় হিসাব করে)
  function itemDue(item, discount) {
    const amt = Number(item.amount) || 0;
    const d = discount || {};
    if (!d.type) return amt;
    if (d.scope !== 'all' && !item.monthly) return amt;
    if (d.type === 'free') return 0;
    if (d.type === 'half') return Math.round(amt / 2);
    if (d.type === 'percent') return Math.round(amt * (100 - Math.min(100, Math.max(0, Number(d.percent) || 0))) / 100);
    if (d.type === 'amount') return item.monthly ? Math.max(0, Number(d.amount) || 0) : amt;
    return amt;
  }
  const discountLabel = (d) => {
    if (!d || !d.type) return '';
    if (d.type === 'half') return 'অর্ধেক';
    if (d.type === 'free') return 'ফ্রি';
    if (d.type === 'percent') return (Number(d.percent) || 0) + '% ছাড়';
    if (d.type === 'amount') return 'বেতন ' + (Number(d.amount) || 0);
    return '';
  };
  // একজন শিক্ষার্থীর হিসাব — প্রতি পর্বে কত দেয়, কত দিয়েছে, কত বাকি। খালি ঘর = বাকি।
  function studentFees(items, paid, discount) {
    const p = paid || {};
    const periods = FEE_PERIODS.map((per) => {
      let due = 0, got = 0;
      items.filter((it) => it.period === per.key).forEach((it) => { due += itemDue(it, discount); got += Number(p[it.key]) || 0; });
      return { key: per.key, name: per.name, due, paid: got, balance: Math.max(0, due - got) };
    });
    const due = periods.reduce((a, b) => a + b.due, 0);
    const got = periods.reduce((a, b) => a + b.paid, 0);
    return { periods, due, paid: got, balance: Math.max(0, due - got) };
  }

  global.Calc = { EXAMS, examName, examEn, GRADES, toEn, toBn, num, fix2, passMarkFor, subjectGrade, studentResult, classResults, MONTHS, FEE_PERIODS, periodName, defaultFeeItems, normalizeFees, DISCOUNTS, itemDue, discountLabel, studentFees };
})(typeof window !== 'undefined' ? window : globalThis);
