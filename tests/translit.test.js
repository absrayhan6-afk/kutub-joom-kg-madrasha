// বাংলা থেকে ইংরেজি নামের টেস্ট: node tests/translit.test.js
const assert = require('assert');
globalThis.window = globalThis;
require('../js/translit.js');
const T = globalThis.Translit;
assert.strictEqual(T.name('মোহাম্মদ কামাল উদ্দিন'), 'Mohammad Kamal Uddin');
assert.strictEqual(T.name('সুরাইয়া আক্তার'), 'Suraiya Akter');
assert.strictEqual(T.name('মোঃ মিরাজ'), 'Md. Miraj');
assert.strictEqual(T.name('রেজাউল করিম'), 'Rezaul Karim');
assert.strictEqual(T.name('Already English'), 'Already English');
assert.strictEqual(T.subject('হাদিস শরীফ মৌখিক'), 'Hadith Sharif (Oral)');
assert.strictEqual(T.subject('বাংলা ১ম পত্র'), 'Bangla 1st Paper');
assert.strictEqual(T.subject('সাধারণ জ্ঞান'), 'General Knowledge');
assert.strictEqual(T.className('নবম শ্রেণি'), 'Class Nine');
assert.strictEqual(T.className('কে.জি'), 'KG');
console.log('All transliteration tests passed');
