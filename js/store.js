// ডাটা সংরক্ষণের স্তর।
// js/config.js-এ Firebase তথ্য দেওয়া থাকলে Firebase (আসল ডাটাবেস) ব্যবহার হয়,
// না থাকলে ব্রাউজারে নমুনা ডাটা দিয়ে "ডেমো মোড" চলে।
(function (global) {
  'use strict';
  const C = global.Calc;
  const STAFF_DOMAIN = 'staff.kutubjoom.app'; // User ID → Firebase ইমেইল
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const marksId = (y, e, c) => `${y}_${e}_${c}`;
  const resultId = (y, e, c, roll, reg) => `${y}_${e}_${c}_${C.toEn(roll)}_${C.toEn(reg).replace(/[^0-9A-Za-z-]/g, '')}`;
  const ROLES = { principal: 'প্রিন্সিপাল', teacher: 'শিক্ষক', office: 'অফিস / কম্পিউটার' };
  // অফিস কর্মচারী আইডি কার্ডের জন্য শুধু এই তথ্যগুলো বদলাতে পারবেন
  const CARD_FIELDS = ['nameEn', 'fatherEn', 'address', 'phone', 'blood'];

  const DEFAULT_CLASSES = [
    ['নার্সারি', 'Nursery'], ['কে.জি', 'KG'], ['প্রথম শ্রেণি', 'Class One'], ['দ্বিতীয় শ্রেণি', 'Class Two'], ['তৃতীয় শ্রেণি', 'Class Three'],
    ['চতুর্থ শ্রেণি', 'Class Four'], ['পঞ্চম শ্রেণি', 'Class Five'], ['ষষ্ঠ শ্রেণি', 'Class Six'], ['সপ্তম শ্রেণি', 'Class Seven'], ['অষ্টম শ্রেণি', 'Class Eight']
  ].map((n, i) => ({ id: 'c' + (i + 1), name: n[0], nameEn: n[1], order: i + 1 }));

  const DEFAULT_SETTINGS = {
    name: 'কুতুবজোম ইসলামিয়া কে.জি এন্ড প্রি-ক্যাডেট মাদ্রাসা',
    nameEn: 'KUTUBJOOM ISLAMIA K.G & PRE-CADET MADRASAH',
    address: 'কুতুবজোম, মহেশখালী, কক্সবাজার',
    addressEn: "Nayapara, Kutubjom, Maheshkhali, Cox's Bazar",
    established: '2007',
    slogan1: 'ইসলামের আলোয়',
    slogan2: 'গড়ি সুন্দর ভবিষ্যৎ',
    f1t: 'শিক্ষা', f1d: 'দ্বীন ও দুনিয়ার সমন্বয়',
    f2t: 'শৃঙ্খলা', f2d: 'সুশৃঙ্খল ও নিয়মিত পরিবেশ',
    f3t: 'আধুনিক শিক্ষা', f3d: 'কুরআন, নৈতিক শিক্ষা ও প্রি-ক্যাডেট প্রশিক্ষণ',
    f4t: 'উত্তম চরিত্র', f4d: 'আদর্শ মানুষ গড়াই আমাদের লক্ষ্য',
    phone: '01833857316',
    email: 'absrayhan57316@gmail.com',
    facebook: 'https://www.facebook.com/kutubJoomIslamia2007',
    devName: 'Abs Rayhan',
    devFullName: 'Abu Bakar Siddique Rayhan',
    devPhone: '01978974436',
    devEmail: 'absrayhan57316@gmail.com',
    devFacebook: 'https://www.facebook.com/abubakkersiddeke.rayhan',
    devQuote: 'একটি আধুনিক শিক্ষা ব্যবস্থার জন্য প্রযুক্তির সঠিক ব্যবহার অপরিহার্য',
    activeYear: String(new Date().getFullYear()),
    archivedYears: [],
    admissionTitle: 'ভর্তি বিজ্ঞপ্তি 2027',
    admissionBody: 'কুরআন শিক্ষা • হাদিস ও ইসলামিক শিক্ষা • কম্পিউটার শিক্ষা • ইংরেজি ভাষা শিক্ষা • বাংলা ও সাধারণ শিক্ষা • আধুনিক পাঠদান পদ্ধতি',
    admissionDeadline: '31 জানুয়ারি 2027',
    admissionOpen: true
  };

  // প্রকাশের সময় অভিভাবকদের জন্য ফলাফলের স্থায়ী কপি (মার্কশিট ইংরেজিতে দেখায়)
  function snapshot(r, exam, year, cls) {
    cls = cls || {};
    const st = r.student;
    return {
      name: st.name, nameEn: st.nameEn || '', father: st.father || '', fatherEn: st.fatherEn || '',
      roll: C.toEn(st.roll), reg: C.toEn(st.reg),
      className: cls.name || '', classNameEn: cls.nameEn || cls.name || '', exam, year: String(year),
      rows: r.rows.map((x) => ({ name: x.name, nameEn: x.nameEn || '', full: x.full, mark: x.mark, grade: x.grade, gp: x.gp })),
      total: r.total, full: r.full, average: r.average, percentage: r.percentage, gpa: r.gpa, grade: r.grade, passed: r.passed,
      rank: r.rank, publishedAt: Date.now()
    };
  }

  // ================= ডেমো (ব্রাউজার) স্টোর =================
  function demoStore() {
    const KEY = 'kjm-demo-v2';
    let db;
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* স্টোরেজ বন্ধ বা পূর্ণ থাকলে শুধু মেমরিতে থাকবে */ } };
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db) { db = seed(); save(); }
    db.photos = db.photos || {};
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(KEY + '-s') || 'null'); } catch (e) { /* ignore */ }
    const listeners = [];
    const setSession = (u) => { session = u; try { sessionStorage.setItem(KEY + '-s', JSON.stringify(u)); } catch (e) { /* ignore */ } listeners.forEach((f) => f(u)); };
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const need = (...roles) => { if (!session) throw new Error('আগে লগইন করুন।'); if (roles.length && !roles.includes(session.role)) throw new Error('এই কাজের অনুমতি আপনার নেই।'); };
    const canClass = (c) => { need(); if (session.role === 'principal') return; if (session.role !== 'teacher' || !(session.classIds || []).includes(c)) throw new Error('এই শ্রেণির অনুমতি আপনার নেই।'); };
    const pub = (u) => { const x = Object.assign({}, u); delete x.password; return x; };

    return {
      mode: 'demo',
      async getSettings() { return Object.assign({}, DEFAULT_SETTINGS, clone(db.settings)); },
      async saveSettings(s) { need('principal'); db.settings = Object.assign({}, db.settings, s); save(); },
      async getImages() { return clone(db.images || {}); },
      async saveImages(img) { need('principal'); db.images = Object.assign({}, db.images, img); save(); },
      async getCatalog() { return { classes: clone(db.classes), published: clone(db.published || {}) }; },
      async saveClasses(classes) { need('principal'); db.classes = clone(classes); save(); },
      async listSubjects(classId) { need(); return clone(db.subjects.filter((s) => !classId || s.classId === classId).sort((a, b) => a.order - b.order)); },
      async saveSubject(s) { need('principal'); s = Object.assign({ id: uid() }, s); const i = db.subjects.findIndex((x) => x.id === s.id); if (i >= 0) db.subjects[i] = s; else db.subjects.push(s); save(); return s; },
      async deleteSubject(id) { need('principal'); db.subjects = db.subjects.filter((s) => s.id !== id); save(); },
      async listStudents(q) { need(); q = q || {}; return clone(db.students.filter((s) => (!q.year || s.year === String(q.year)) && (!q.classId || s.classId === q.classId))); },
      async saveStudent(s) { need('principal'); s = Object.assign({ id: uid() }, s); const i = db.students.findIndex((x) => x.id === s.id); if (i >= 0) db.students[i] = s; else db.students.push(s); save(); return s; },
      async saveStudents(arr) { need('principal'); arr.forEach((s) => { s.id = s.id || uid(); const i = db.students.findIndex((x) => x.id === s.id); if (i >= 0) db.students[i] = s; else db.students.push(s); }); save(); },
      async updateStudentCard(id, fields) { need('principal', 'office'); const s = db.students.find((x) => x.id === id); if (!s) throw new Error('শিক্ষার্থী পাওয়া যায়নি।'); CARD_FIELDS.forEach((k) => { if (k in fields) s[k] = fields[k]; }); save(); },
      async deleteStudent(id) { need('principal'); db.students = db.students.filter((s) => s.id !== id); delete db.photos[id]; save(); },
      async getPhotos(ids) { need(); const out = {}; ids.forEach((id) => { if (db.photos[id]) out[id] = db.photos[id]; }); return out; },
      async savePhoto(id, url) { need('principal', 'office'); if (url) db.photos[id] = url; else delete db.photos[id]; save(); },
      async listUsers() { need(); return clone(db.users.map(pub)); },
      async createUser(t) { need('principal'); if (db.users.some((u) => u.userId.toLowerCase() === t.userId.toLowerCase())) throw new Error('এই User ID আগে থেকেই আছে।'); db.users.push({ id: uid(), name: t.name, userId: t.userId, password: t.password, role: t.role || 'teacher', phone: t.phone || '', photo: t.photo || '', classIds: t.classIds || [], active: true }); save(); },
      async updateUser(u) {
        need('principal'); const x = db.users.find((y) => y.id === u.id); if (!x) return;
        ['name', 'phone', 'photo', 'classIds'].forEach((k) => { if (k in u) x[k] = u[k]; });
        if (x.role !== 'principal' && 'active' in u) x.active = u.active;
        save(); if (session && session.id === x.id) setSession(Object.assign({}, session, pub(x)));
      },
      async deleteUser(id) { need('principal'); const x = db.users.find((y) => y.id === id); if (x && x.role === 'principal') throw new Error('প্রিন্সিপালের অ্যাকাউন্ট মোছা যাবে না।'); db.users = db.users.filter((u) => u.id !== id); save(); },
      async needsSetup() { return false; },
      async login(userId, password) {
        const u = db.users.find((x) => x.userId.toLowerCase() === String(userId).trim().toLowerCase() && x.password === password);
        if (!u) throw new Error('User ID অথবা Password সঠিক নয়।');
        if (!u.active) throw new Error('এই অ্যাকাউন্টটি বন্ধ করা আছে। প্রিন্সিপালের সাথে যোগাযোগ করুন।');
        const p = pub(u); setSession(p); return p;
      },
      async logout() { setSession(null); },
      current() { return session; },
      onAuth(cb) { listeners.push(cb); setTimeout(() => cb(session), 0); },
      async changePassword(cur, next) { need(); const u = db.users.find((x) => x.id === session.id); if (!u || u.password !== cur) throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়।'); u.password = next; save(); },
      async getMarks(y, e, c) { need('principal', 'teacher'); return clone(db.marks[marksId(y, e, c)] || { entries: {}, published: false }); },
      async saveMarks(y, e, c, entries) { canClass(c); const id = marksId(y, e, c); const cur = db.marks[id] || {}; if (cur.published) throw new Error('ফলাফল প্রকাশিত। নম্বর বদলাতে আগে প্রকাশ বাতিল করুন।'); db.marks[id] = { year: String(y), exam: e, classId: c, entries: clone(entries), published: false, updatedAt: Date.now() }; save(); },
      async publish(y, e, c, results) {
        need('principal'); const id = marksId(y, e, c);
        db.marks[id] = Object.assign(db.marks[id] || { year: String(y), exam: e, classId: c, entries: {} }, { published: true, publishedAt: Date.now() });
        Object.keys(db.results).filter((k) => k.startsWith(id + '_')).forEach((k) => delete db.results[k]);
        results.forEach((r) => { db.results[resultId(y, e, c, r.roll, r.reg)] = clone(r); });
        db.published = db.published || {}; db.published[id] = Date.now(); save();
      },
      async unpublish(y, e, c) {
        need('principal'); const id = marksId(y, e, c);
        if (db.marks[id]) db.marks[id].published = false;
        Object.keys(db.results).filter((k) => k.startsWith(id + '_')).forEach((k) => delete db.results[k]);
        if (db.published) delete db.published[id]; save();
      },
      async findResult(q) { const r = db.results[resultId(q.year, q.exam, q.classId, q.roll, q.reg)]; return r ? clone(r) : null; },
      async listNotices() { return clone((db.notices || []).slice().sort((a, b) => (b.pinned - a.pinned) || (b.date > a.date ? 1 : -1))); },
      async saveNotice(n) { need('principal'); n = Object.assign({ id: uid() }, n); const i = db.notices.findIndex((x) => x.id === n.id); if (i >= 0) db.notices[i] = n; else db.notices.push(n); save(); return n; },
      async deleteNotice(id) { need('principal'); db.notices = db.notices.filter((n) => n.id !== id); save(); },
      async getFees(y, c) { need('principal'); return C.normalizeFees(clone(db.fees[`${y}_${c}`] || {})); },
      async saveFees(y, c, data) { need('principal'); db.fees[`${y}_${c}`] = clone(Object.assign({}, data, { year: String(y), classId: c })); save(); },
      async exportAll() { need('principal'); const d = clone(db); d.users = d.users.map(pub); return d; },
      async resetDemo() { db = seed(); save(); setSession(null); }
    };
  }

  function seed() {
    const year = String(new Date().getFullYear());
    const subjectsFor = {
      c1: [['আরবি লেখা', 'Arabic Writing'], ['হাদিস শরীফ মৌখিক', 'Hadith (Oral)'], ['ইংরেজি', 'English'], ['কুরআন ও আমপারা মৌখিক', 'Quran & Ampara (Oral)'], ['বাংলা', 'Bangla'], ['গণিত', 'Mathematics']],
      c2: [['আরবি লেখা', 'Arabic Writing'], ['হাদিস শরীফ মৌখিক', 'Hadith (Oral)'], ['ইংরেজি', 'English'], ['কুরআন মৌখিক', 'Quran (Oral)'], ['বাংলা', 'Bangla'], ['গণিত', 'Mathematics']],
      default: [['কুরআন মাজিদ', 'Holy Quran'], ['আরবি', 'Arabic'], ['বাংলা', 'Bangla'], ['ইংরেজি', 'English'], ['গণিত', 'Mathematics'], ['আকাইদ ও ফিকহ', "Aqaid & Fiqh"]]
    };
    const subjects = [];
    DEFAULT_CLASSES.forEach((c) => (subjectsFor[c.id] || subjectsFor.default).forEach((n, i) =>
      subjects.push({ id: c.id + 's' + (i + 1), classId: c.id, name: n[0], nameEn: n[1], full: 100, pass: 33, order: i + 1 })));
    const people = [
      ['মুহাম্মদ আব্দুল্লাহ', 'Muhammad Abdullah', 'আব্দুর রহিম', 'Abdur Rahim'], ['ফাতিমা আক্তার', 'Fatima Akter', 'নুরুল ইসলাম', 'Nurul Islam'],
      ['আয়েশা সিদ্দিকা', 'Ayesha Siddika', 'মোহাম্মদ ইউসুফ', 'Mohammad Yusuf'], ['ইব্রাহিম খলিল', 'Ibrahim Khalil', 'আবু তাহের', 'Abu Taher'],
      ['মারজান হোসেন', 'Marjan Hossain', 'জাফর আলম', 'Jafar Alam'], ['সুমাইয়া ইসলাম', 'Sumaiya Islam', 'শফিকুল ইসলাম', 'Shafiqul Islam'],
      ['ফাহিম মাহমুদ', 'Fahim Mahmud', 'আব্দুল করিম', 'Abdul Karim'], ['যায়েদ বিন হাসান', 'Zayed Bin Hasan', 'হাসান মাহমুদ', 'Hasan Mahmud']
    ];
    const students = people.map((n, i) => ({ id: 'st' + (i + 1), year, classId: 'c1', name: n[0], nameEn: n[1], father: n[2], fatherEn: n[3], roll: String(i + 1), reg: String(26101 + i), phone: '0181000000' + i, address: "Kutubjoom, Maheshkhali" }));
    const pattern = [[92, 95, 88, 96, 90, 94], [85, 90, 78, 92, 88, 95], [80, 86, 74, 88, 82, 90], [75, 80, 68, 85, 77, 84], [70, 78, 62, 80, 72, 76], [66, 72, 58, 75, 70, 68], [55, 60, 45, 66, 58, 52], [48, 52, 30, 60, 45, 40]];
    const marks = {}; const results = {}; const published = {};
    const cls = DEFAULT_CLASSES[0];
    ['first', 'second', 'annual'].forEach((ex, k) => {
      const entries = {};
      students.forEach((s, i) => { entries[s.id] = {}; subjects.filter((x) => x.classId === 'c1').forEach((sub, j) => { entries[s.id][sub.id] = Math.min(100, pattern[i][j] + (k === 1 ? 2 : k === 2 ? 3 : 0) - ((i + j) % 3)); }); });
      const id = marksId(year, ex, 'c1');
      const isPub = ex !== 'annual';
      marks[id] = { year, exam: ex, classId: 'c1', entries, published: isPub };
      if (isPub) {
        C.classResults(students, subjects.filter((x) => x.classId === 'c1'), entries).forEach((r) => { const snap = snapshot(r, ex, year, cls); results[resultId(year, ex, 'c1', snap.roll, snap.reg)] = snap; });
        published[id] = Date.now();
      }
    });
    const payments = {};
    students.forEach((s, i) => { payments[s.id] = { admission: 500 }; for (let m = 1; m <= 10 - (i % 4); m++) payments[s.id]['m' + m] = 150; payments[s.id].exam_first = 100; if (i % 3 !== 2) payments[s.id].exam_second = 100; });
    return {
      settings: {}, images: {}, classes: DEFAULT_CLASSES, subjects, students, photos: {},
      users: [
        { id: 'u1', name: 'মাওলানা আব্দুল হামিদ', userId: 'principal', password: 'demo1234', role: 'principal', phone: '01833857316', photo: '', classIds: [], active: true },
        { id: 'u2', name: 'মাওলানা আব্দুল করিম', userId: 'teacher', password: 'demo1234', role: 'teacher', phone: '01700000001', photo: '', classIds: ['c1'], active: true },
        { id: 'u3', name: 'মোহাম্মদ রাশেদ', userId: 'office', password: 'demo1234', role: 'office', phone: '01700000002', photo: '', classIds: [], active: true }
      ],
      marks, results, published,
      notices: [
        { id: 'n1', title: 'বার্ষিক পরীক্ষার সময়সূচি প্রকাশ', body: 'বার্ষিক পরীক্ষা ' + year + ' এর সময়সূচি অফিস থেকে সংগ্রহ করুন। পরীক্ষার আগে সকল বকেয়া পরিশোধ করতে হবে।', date: year + '-11-01', pinned: true },
        { id: 'n2', title: 'ভর্তি বিজ্ঞপ্তি 2027', body: 'নার্সারি থেকে অষ্টম শ্রেণি পর্যন্ত ভর্তি চলছে। ভর্তির শেষ সময় 31 জানুয়ারি 2027।', date: year + '-10-15', pinned: false },
        { id: 'n3', title: 'দ্বিতীয় সাময়িক পরীক্ষার ফলাফল প্রকাশিত', body: 'ওয়েবসাইটে রোল ও রেজিস্ট্রেশন নম্বর দিয়ে ফলাফল দেখা যাচ্ছে।', date: year + '-09-25', pinned: false }
      ],
      fees: { [`${year}_c1`]: { year, classId: 'c1', items: C.defaultFeeItems({ admission: 500, monthly: 150, exam_first: 100, exam_second: 100, exam_annual: 100 }), payments, discounts: { st7: { type: 'half', scope: 'monthly' } } } }
    };
  }

  // ================= Firebase স্টোর =================
  async function firebaseStore(config) {
    const V = '10.12.2';
    const appMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const authMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
    const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
    const app = appMod.initializeApp(config);
    const auth = authMod.getAuth(app);
    const db = fs.getFirestore(app);
    const { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, writeBatch, updateDoc } = fs;
    const email = (userId) => `${String(userId).trim().toLowerCase()}@${STAFF_DOMAIN}`;
    const data = (snap) => (snap && snap.exists() ? snap.data() : null);
    const all = async (q) => (await getDocs(q)).docs.map((d) => Object.assign({ id: d.id }, d.data()));
    let profile = null;
    const listeners = [];
    let ready;
    const readyP = new Promise((r) => { ready = r; });
    let settingUp = false;

    authMod.onAuthStateChanged(auth, async (u) => {
      if (settingUp) return;
      profile = null;
      if (u) {
        const p = data(await getDoc(doc(db, 'users', u.uid)).catch(() => null));
        if (p && p.active) profile = Object.assign({ id: u.uid }, p);
        else await authMod.signOut(auth);
      }
      ready(); listeners.forEach((f) => f(profile));
    });
    const need = (...roles) => { if (!profile) throw new Error('আগে লগইন করুন।'); if (roles.length && !roles.includes(profile.role)) throw new Error('এই কাজের অনুমতি আপনার নেই।'); };
    const fbError = (e) => {
      const m = String(e && (e.code || e.message) || e);
      if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(m)) return new Error('User ID অথবা Password সঠিক নয়।');
      if (/email-already-in-use/.test(m)) return new Error('এই User ID আগে থেকেই আছে।');
      if (/weak-password/.test(m)) return new Error('পাসওয়ার্ড কমপক্ষে 6 অক্ষরের হতে হবে।');
      if (/permission-denied/.test(m)) return new Error('এই কাজের অনুমতি নেই।');
      if (/too-many-requests/.test(m)) return new Error('অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।');
      if (/network|unavailable/.test(m)) return new Error('ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না।');
      if (/longer than|exceeds the maximum/.test(m)) return new Error('ছবি বা ডাটা খুব বড়। ছোট ছবি ব্যবহার করুন।');
      return e instanceof Error ? e : new Error(m);
    };
    const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { throw fbError(e); } };
    const commitOps = async (ops) => { for (let i = 0; i < ops.length; i += 450) { const b = writeBatch(db); ops.slice(i, i + 450).forEach((f) => f(b)); await b.commit(); } };

    const api = {
      mode: 'firebase',
      getSettings: wrap(async () => Object.assign({}, DEFAULT_SETTINGS, data(await getDoc(doc(db, 'public', 'settings'))) || {})),
      saveSettings: wrap(async (s) => { need('principal'); await setDoc(doc(db, 'public', 'settings'), s, { merge: true }); }),
      getImages: wrap(async () => data(await getDoc(doc(db, 'public', 'images'))) || {}),
      saveImages: wrap(async (img) => { need('principal'); await setDoc(doc(db, 'public', 'images'), img, { merge: true }); }),
      getCatalog: wrap(async () => { const c = data(await getDoc(doc(db, 'public', 'catalog'))) || {}; return { classes: c.classes || DEFAULT_CLASSES, published: c.published || {} }; }),
      saveClasses: wrap(async (classes) => { need('principal'); await setDoc(doc(db, 'public', 'catalog'), { classes }, { merge: true }); }),
      listSubjects: wrap(async (classId) => { need(); const q = classId ? query(collection(db, 'subjects'), where('classId', '==', classId)) : collection(db, 'subjects'); return (await all(q)).sort((a, b) => a.order - b.order); }),
      saveSubject: wrap(async (s) => { need('principal'); s = Object.assign({ id: uid() }, s); await setDoc(doc(db, 'subjects', s.id), s); return s; }),
      deleteSubject: wrap(async (id) => { need('principal'); await deleteDoc(doc(db, 'subjects', id)); }),
      listStudents: wrap(async (q) => {
        need(); q = q || {}; const conds = [];
        if (q.year) conds.push(where('year', '==', String(q.year)));
        if (q.classId) conds.push(where('classId', '==', q.classId));
        return all(conds.length ? query(collection(db, 'students'), ...conds) : collection(db, 'students'));
      }),
      saveStudent: wrap(async (s) => { need('principal'); s = Object.assign({ id: uid() }, s); await setDoc(doc(db, 'students', s.id), s); return s; }),
      saveStudents: wrap(async (arr) => { need('principal'); await commitOps(arr.map((s) => { s.id = s.id || uid(); return (b) => b.set(doc(db, 'students', s.id), s); })); }),
      updateStudentCard: wrap(async (id, fields) => { need('principal', 'office'); const d = {}; CARD_FIELDS.forEach((k) => { if (k in fields) d[k] = fields[k]; }); await updateDoc(doc(db, 'students', id), d); }),
      deleteStudent: wrap(async (id) => { need('principal'); await deleteDoc(doc(db, 'students', id)); await deleteDoc(doc(db, 'photos', id)).catch(() => {}); }),
      getPhotos: wrap(async (ids) => {
        need(); const out = {};
        await Promise.all(ids.map(async (id) => { const p = data(await getDoc(doc(db, 'photos', id))); if (p && p.url) out[id] = p.url; }));
        return out;
      }),
      savePhoto: wrap(async (id, url) => { need('principal', 'office'); if (url) await setDoc(doc(db, 'photos', id), { url, at: Date.now() }); else await deleteDoc(doc(db, 'photos', id)); }),
      listUsers: wrap(async () => { need(); return all(collection(db, 'users')); }),
      createUser: wrap(async (t) => {
        need('principal');
        // দ্বিতীয় অ্যাপ দিয়ে অ্যাকাউন্ট খোলা হয়, যাতে প্রিন্সিপাল লগআউট না হন
        const second = appMod.initializeApp(config, 'create-' + uid());
        const sAuth = authMod.getAuth(second);
        try {
          const cred = await authMod.createUserWithEmailAndPassword(sAuth, email(t.userId), t.password);
          await setDoc(doc(db, 'users', cred.user.uid), { name: t.name, userId: t.userId.trim(), role: t.role === 'office' ? 'office' : 'teacher', phone: t.phone || '', photo: t.photo || '', classIds: t.classIds || [], active: true });
          await authMod.signOut(sAuth);
        } finally { await appMod.deleteApp(second); }
      }),
      updateUser: wrap(async (u) => {
        need('principal'); const d = {};
        ['name', 'phone', 'photo', 'classIds'].forEach((k) => { if (k in u) d[k] = u[k]; });
        if ('active' in u && u.id !== profile.id) d.active = !!u.active;
        await updateDoc(doc(db, 'users', u.id), d);
        if (u.id === profile.id) { Object.assign(profile, d); listeners.forEach((f) => f(profile)); }
      }),
      deleteUser: wrap(async (id) => { need('principal'); if (id === profile.id) throw new Error('নিজের অ্যাকাউন্ট মোছা যাবে না।'); await deleteDoc(doc(db, 'users', id)); }),
      needsSetup: wrap(async () => !(await getDoc(doc(db, 'public', 'setup'))).exists()),
      setupPrincipal: wrap(async (userId, password, name) => {
        // সেটআপ চলার সময় লগইন-অবস্থার পরিবর্তন উপেক্ষা করা হয় (প্রোফাইল তখনো লেখা হয়নি)
        settingUp = true;
        let cred;
        try { cred = await authMod.createUserWithEmailAndPassword(auth, email(userId), password); } catch (e) { settingUp = false; throw e; }
        const p = { name: name || 'প্রিন্সিপাল', userId: userId.trim(), role: 'principal', phone: '', photo: '', classIds: [], active: true };
        const b = writeBatch(db);
        b.set(doc(db, 'users', cred.user.uid), p);
        b.set(doc(db, 'public', 'setup'), { done: true, at: Date.now() });
        b.set(doc(db, 'public', 'catalog'), { classes: DEFAULT_CLASSES, published: {} }, { merge: true });
        try { await b.commit(); } finally { settingUp = false; }
        profile = Object.assign({ id: cred.user.uid }, p);
        listeners.forEach((f) => f(profile));
        return profile;
      }),
      login: wrap(async (userId, password) => {
        await authMod.signInWithEmailAndPassword(auth, email(userId), password);
        const p = data(await getDoc(doc(db, 'users', auth.currentUser.uid)));
        if (!p || !p.active) { await authMod.signOut(auth); throw new Error('এই অ্যাকাউন্টটি বন্ধ করা আছে। প্রিন্সিপালের সাথে যোগাযোগ করুন।'); }
        profile = Object.assign({ id: auth.currentUser.uid }, p); return profile;
      }),
      logout: wrap(async () => { await authMod.signOut(auth); }),
      current() { return profile; },
      onAuth(cb) { listeners.push(cb); readyP.then(() => cb(profile)); },
      changePassword: wrap(async (cur, next) => {
        need(); const u = auth.currentUser;
        await authMod.reauthenticateWithCredential(u, authMod.EmailAuthProvider.credential(u.email, cur));
        await authMod.updatePassword(u, next);
      }),
      getMarks: wrap(async (y, e, c) => { need('principal', 'teacher'); return data(await getDoc(doc(db, 'marks', marksId(y, e, c)))) || { entries: {}, published: false }; }),
      saveMarks: wrap(async (y, e, c, entries) => {
        need('principal', 'teacher'); const ref = doc(db, 'marks', marksId(y, e, c)); const cur = data(await getDoc(ref));
        if (cur && cur.published) throw new Error('ফলাফল প্রকাশিত। নম্বর বদলাতে আগে প্রকাশ বাতিল করুন।');
        await setDoc(ref, { year: String(y), exam: e, classId: c, entries, published: false, updatedAt: Date.now() });
      }),
      publish: wrap(async (y, e, c, results) => {
        need('principal'); const id = marksId(y, e, c);
        const old = await all(query(collection(db, 'results'), where('key', '==', id)));
        const ops = old.map((r) => (b) => b.delete(doc(db, 'results', r.id)));
        results.forEach((r) => ops.push((b) => b.set(doc(db, 'results', resultId(y, e, c, r.roll, r.reg)), Object.assign({ key: id }, r))));
        ops.push((b) => b.set(doc(db, 'marks', id), { year: String(y), exam: e, classId: c, published: true, publishedAt: Date.now() }, { merge: true }));
        ops.push((b) => b.set(doc(db, 'public', 'catalog'), { published: { [id]: Date.now() } }, { merge: true }));
        await commitOps(ops);
      }),
      unpublish: wrap(async (y, e, c) => {
        need('principal'); const id = marksId(y, e, c);
        const old = await all(query(collection(db, 'results'), where('key', '==', id)));
        const ops = old.map((r) => (b) => b.delete(doc(db, 'results', r.id)));
        ops.push((b) => b.set(doc(db, 'marks', id), { published: false }, { merge: true }));
        ops.push((b) => b.update(doc(db, 'public', 'catalog'), { ['published.' + id]: fs.deleteField() }));
        await commitOps(ops);
      }),
      findResult: async (q) => {
        try { const s = await getDoc(doc(db, 'results', resultId(q.year, q.exam, q.classId, q.roll, q.reg))); return s.exists() ? s.data() : null; }
        catch (e) { throw fbError(e); }
      },
      listNotices: wrap(async () => (await all(collection(db, 'notices'))).sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (b.date > a.date ? 1 : -1))),
      saveNotice: wrap(async (n) => { need('principal'); n = Object.assign({ id: uid() }, n); await setDoc(doc(db, 'notices', n.id), n); return n; }),
      deleteNotice: wrap(async (id) => { need('principal'); await deleteDoc(doc(db, 'notices', id)); }),
      getFees: wrap(async (y, c) => { need('principal'); return C.normalizeFees(data(await getDoc(doc(db, 'fees', `${y}_${c}`))) || {}); }),
      saveFees: wrap(async (y, c, d) => { need('principal'); await setDoc(doc(db, 'fees', `${y}_${c}`), Object.assign({}, d, { year: String(y), classId: c })); }),
      exportAll: wrap(async () => {
        need('principal'); const out = {};
        for (const name of ['subjects', 'students', 'users', 'marks', 'notices', 'fees']) out[name] = await all(collection(db, name));
        out.settings = data(await getDoc(doc(db, 'public', 'settings')));
        out.catalog = data(await getDoc(doc(db, 'public', 'catalog')));
        return out;
      })
    };
    return api;
  }

  let storePromise = null;
  global.getStore = function () {
    if (!storePromise) {
      const cfg = global.FIREBASE_CONFIG;
      storePromise = (cfg && cfg.apiKey) ? firebaseStore(cfg) : Promise.resolve(demoStore());
    }
    return storePromise;
  };
  global.StoreUtil = { snapshot, marksId, resultId, DEFAULT_SETTINGS, DEFAULT_CLASSES, ROLES, CARD_FIELDS };
})(window);
