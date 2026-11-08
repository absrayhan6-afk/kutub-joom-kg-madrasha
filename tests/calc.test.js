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

// মেধাক্রম: সমান নম্বর হলে একই মেধাক্রম, নতুন রোল আলাদা; ফেল করা শেষে
const st = [{ id: 1, roll: '1' }, { id: 2, roll: '2' }, { id: 3, roll: '3' }, { id: 4, roll: '4' }];
const r = C.classResults(st, subs, { 1: { a: 85, b: 45 }, 2: { a: 78, b: 30 }, 3: { a: 100, b: 5 }, 4: { a: 85, b: 45 } });
assert.deepStrictEqual(r.map((x) => [x.student.id, x.rank, x.newRoll]), [[1, 1, 1], [4, 1, 2], [2, 3, 3], [3, 4, 4]]);

// হিসাব: তিন পর্বে বাকি
const fee = C.studentFees({ admission: 500, monthly: 150, exam_first: 100, exam_second: 100, exam_annual: 100 }, { admission: 500, m1: 150, m2: 150, exam_first: 100 });
assert.deepStrictEqual(fee.periods.map((p) => p.balance), [300, 700, 700]);
assert.strictEqual(fee.balance, 1700);
// বেতন মাফ
assert.strictEqual(C.studentFees({ admission: 0, monthly: 150 }, {}, { monthly: 0 }).balance, 0);

console.log('All calculation tests passed');
