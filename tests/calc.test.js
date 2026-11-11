// গ্রেড, GPA, মেধাক্রম ও হিসাবের টেস্ট: node tests/calc.test.js
const assert = require('assert');
globalThis.window = globalThis;
require('../js/calc.js');
const C = globalThis.Calc;

// বিষয়ভিত্তিক গ্রেড (বোর্ডের নিয়ম)
assert.deepStrictEqual(C.subjectGrade(80, 100, 33), { grade: 'A+', gp: 5 });
assert.deepStrictEqual(C.subjectGrade(79, 100, 33), { grade: 'A', gp: 4 });
assert.deepStrictEqual(C.subjectGrade(33, 100, 33), { grade: 'D', gp: 1 });
assert.deepStrictEqual(C.subjectGrade(32, 100, 33), { grade: 'F', gp: 0 });
assert.deepStrictEqual(C.subjectGrade(40, 50, 16.5), { grade: 'A+', gp: 5 }); // ৫০ নম্বরের বিষয়ে শতাংশ

// এক বিষয়ে ফেল করলে GPA 0, গ্রেড F
const subs = [{ id: 'a', name: 'A', full: 100, pass: 33 }, { id: 'b', name: 'B', full: 50, pass: 16.5 }];
const fail = C.studentResult(subs, { a: 95, b: 10 });
assert.strictEqual(fail.passed, false); assert.strictEqual(fail.gpa, 0); assert.strictEqual(fail.grade, 'F');
// গড় GPA
const ok = C.studentResult(subs, { a: 78, b: 30 }); // A(4) + A-(3.5)
assert.strictEqual(ok.gpa, 3.75); assert.strictEqual(ok.grade, 'A-'); assert.strictEqual(ok.total, 108);
// বাংলা সংখ্যাও গ্রহণযোগ্য
assert.strictEqual(C.studentResult(subs, { a: '৮০', b: '৪০' }).gpa, 5);
// নম্বর বাকি থাকলে উত্তীর্ণ নয়
assert.strictEqual(C.studentResult(subs, { a: 90 }).missing, 1);

// মেধাক্রম: সমান নম্বর হলে একই মেধাক্রম, নতুন রোল আলাদা
const st = [{ id: 1, roll: '1' }, { id: 2, roll: '2' }, { id: 3, roll: '3' }, { id: 4, roll: '4' }];
const r = C.classResults(st, subs, { 1: { a: 85, b: 45 }, 2: { a: 78, b: 30 }, 3: { a: 100, b: 5 }, 4: { a: 85, b: 45 } });
// শিক্ষার্থী 3: এক বিষয়ে অকৃতকার্য → বিশেষ বিবেচনা, মোট নম্বর বেশি হলেও সবার শেষে
assert.deepStrictEqual(r.map((x) => [x.student.id, x.status, x.rank, x.newRoll]), [[1, 'pass', 1, 1], [4, 'pass', 1, 2], [2, 'pass', 3, 3], [3, 'special', 4, 4]]);
// 3 বিষয়ে অকৃতকার্য → ফেল, রোল/মেধাক্রম নেই
const subs3 = [{ id: 'a', full: 100, pass: 33 }, { id: 'b', full: 100, pass: 33 }, { id: 'c', full: 100, pass: 33 }, { id: 'd', full: 100, pass: 33 }];
const r3 = C.classResults([{ id: 1, roll: '1' }, { id: 2, roll: '2' }, { id: 3, roll: '3' }], subs3, { 1: { a: 10, b: 10, c: 10, d: 99 }, 2: { a: 20, b: 20, c: 90, d: 90 }, 3: { a: 50, b: 50, c: 50, d: 50 } });
assert.deepStrictEqual(r3.map((x) => [x.student.id, x.status, x.rank]), [[3, 'pass', 1], [2, 'special', 2], [1, 'fail', null]]);
assert.strictEqual(r3[2].promoted, false); assert.strictEqual(r3[1].promoted, true);
// উপস্থিতি
assert.deepStrictEqual(C.attendance(90, 85), { total: 90, present: 85, absent: 5 });
assert.strictEqual(C.attendance('', 5), null);

// হিসাব: তিন পর্বে বাকি (খালি ঘর = বাকি)
const items = C.defaultFeeItems({ admission: 500, monthly: 150, exam_first: 100, exam_second: 100, exam_annual: 100 });
const fee = C.studentFees(items, { admission: 500, m1: 150, m2: 150, exam_first: 100 });
assert.deepStrictEqual(fee.periods.map((p) => p.balance), [300, 700, 700]);
assert.strictEqual(fee.balance, 1700);
// ছাড়: ফ্রি, অর্ধেক, শতাংশ, নির্দিষ্ট বেতন
assert.strictEqual(C.studentFees(items, {}, { type: 'free', scope: 'monthly' }).due, 500 + 300);
assert.strictEqual(C.studentFees(items, {}, { type: 'half', scope: 'monthly' }).due, 500 + 900 + 300);
assert.strictEqual(C.studentFees(items, {}, { type: 'free', scope: 'all' }).due, 0);
assert.strictEqual(C.studentFees(items, {}, { type: 'percent', percent: 20, scope: 'monthly' }).due, 500 + 1440 + 300);
assert.strictEqual(C.studentFees(items, {}, { type: 'amount', amount: 100, scope: 'monthly' }).due, 500 + 1200 + 300);
// মাস অন্য হিসাবে সরানো যায়: ৪ মাসের জায়গায় ৬ মাস
const moved = items.map((it) => (it.key === 'm5' || it.key === 'm6') ? Object.assign({}, it, { period: 'first' }) : it);
assert.strictEqual(C.studentFees(moved, {}).periods[0].due, 500 + 900 + 100);
// পুরনো ডাটা নতুন ধাঁচে
const norm = C.normalizeFees({ structure: { monthly: 150 }, overrides: { s1: { monthly: 0 } } });
assert.strictEqual(norm.items.length, 16); assert.strictEqual(norm.discounts.s1.amount, 0);
// সংখ্যা ইংরেজিতে
assert.strictEqual(C.toBn(2026), '2026'); assert.strictEqual(C.toEn('২০২৬'), '2026');
assert.strictEqual(C.passMarkFor(50), 16.5);

console.log('All calculation tests passed');
