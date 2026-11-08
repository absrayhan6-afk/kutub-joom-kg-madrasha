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

  const DEFAULT_CLASSES = ['নার্সারি', 'কে.জি', 'প্রথম শ্রেণি', 'দ্বিতীয় শ্রেণি', 'তৃতীয় শ্রেণি', 'চতুর্থ শ্রেণি', 'পঞ্চম শ্রেণি', 'ষষ্ঠ শ্রেণি', 'সপ্তম শ্রেণি', 'অষ্টম শ্রেণি']
    .map((name, i) => ({ id: 'c' + (i + 1), name, order: i + 1 }));

  const DEFAULT_SETTINGS = {
    name: 'কুতুবজোম ইসলামিয়া কে.জি এন্ড প্রি-ক্যাডেট মাদ্রাসা',
    nameEn: 'KUTUB JOOM ISLAMIA KG & PRE-CADET MADRASHA',
    address: 'কুতুবজোম, মহেশখালী, কক্সবাজার',
    established: '২০০৭',
    slogan1: 'ইসলামের আলোয়',
    slogan2: 'গড়ি সুন্দর ভবিষ্যৎ',
    phone: '01833857316',
    email: 'absrayhan57316@gmail.com',
    facebook: 'https://www.facebook.com/kutubJoomIslamia2007',
    devName: 'Abs Rayhan',
    devFullName: 'Abu Bakar Siddique Rayhan',
    devPhone: '01978974436',
    devEmail: 'absrayhan57316@gmail.com',
    devFacebook: '',
    devQuote: 'একটি আধুনিক শিক্ষা ব্যবস্থার জন্য প্রযুক্তির সঠিক ব্যবহার অপরিহার্য',
    activeYear: String(new Date().getFullYear()),
    admissionTitle: 'ভর্তি বিজ্ঞপ্তি ২০২৭',
    admissionBody: 'কুরআন শিক্ষা • হাদিস ও ইসলামিক শিক্ষা • কম্পিউটার শিক্ষা • ইংরেজি ভাষা শিক্ষা • বাংলা ও সাধারণ শিক্ষা • আধুনিক পাঠদান পদ্ধতি',
    admissionDeadline: '৩১ জানুয়ারি ২০২৭',
    admissionOpen: true
  };

  // ================= ডেমো (ব্রাউজার) স্টোর =================
  function demoStore() {
    const KEY = 'kjm-demo-v1';
    let db;
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* স্টোরেজ বন্ধ থাকলে শুধু মেমরিতে থাকবে */ } };
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    if (!db) { db = seed(); save(); }
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(KEY + '-s') || 'null'); } catch (e) { /* ignore */ }
    const listeners = [];
    const setSession = (u) => { session = u; try { sessionStorage.setItem(KEY + '-s', JSON.stringify(u)); } catch (e) { /* ignore */ } listeners.forEach((f) => f(u)); };
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const need = (role) => { if (!session) throw new Error('আগে লগইন করুন।'); if (role && session.role !== role) throw new Error('এই কাজের অনুমতি শুধু প্রিন্সিপালের।'); };
    const canClass = (c) => { need(); if (session.role !== 'principal' && !(session.classIds || []).includes(c)) throw new Error('এই শ্রেণির অনুমতি আপনার নেই।'); };

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
      async deleteStudent(id) { need('principal'); db.students = db.students.filter((s) => s.id !== id); save(); },
      async listUsers() { need(); return clone(db.users.map((u) => Object.assign({}, u, { password: undefined }))); },
      async createTeacher(t) { need('principal'); if (db.users.some((u) => u.userId.toLowerCase() === t.userId.toLowerCase())) throw new Error('এই User ID আগে থেকেই আছে।'); db.users.push({ id: uid(), name: t.name, userId: t.userId, password: t.password, role: 'teacher', classIds: t.classIds || [], active: true }); save(); },
      async updateUser(u) { need('principal'); const x = db.users.find((y) => y.id === u.id); if (x) { Object.assign(x, { name: u.name, classIds: u.classIds, active: u.active }); save(); } },
      async deleteUser(id) { need('principal'); const x = db.users.find((y) => y.id === id); if (x && x.role === 'principal') throw new Error('প্রিন্সিপালের অ্যাকাউন্ট মোছা যাবে না।'); db.users = db.users.filter((u) => u.id !== id); save(); },
      async needsSetup() { return false; },
      async login(userId, password) {
        const u = db.users.find((x) => x.userId.toLowerCase() === String(userId).trim().toLowerCase() && x.password === password && x.active);
        if (!u) throw new Error('User ID অথবা Password সঠিক নয়।');
        const p = { id: u.id, name: u.name, userId: u.userId, role: u.role, classIds: u.classIds || [] }; setSession(p); return p;
      },
      async logout() { setSession(null); },
      current() { return session; },
      onAuth(cb) { listeners.push(cb); setTimeout(() => cb(session), 0); },
      async changePassword(cur, next) { need(); const u = db.users.find((x) => x.id === session.id); if (!u || u.password !== cur) throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়।'); u.password = next; save(); },
      async getMarks(y, e, c) { need(); return clone(db.marks[marksId(y, e, c)] || { entries: {}, published: false }); },
      async saveMarks(y, e, c, entries) { canClass(c); const id = marksId(y, e, c); const cur = db.marks[id] || {}; if (cur.published) throw new Error('ফলাফল প্রকাশিত। নম্বর বদলাতে আগে প্রকাশ বাতিল করুন।'); db.marks[id] = { year: String(y), exam: e, classId: c, entries: clone(entries), published: false, updatedAt: Date.now() }; save(); },
      async publish(y, e, c, results) {
        need('principal'); const id = marksId(y, e, c);
        db.marks[id] = Object.assign(db.marks[id] || { entries: {} }, { published: true, publishedAt: Date.now() });
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
      async getFees(y, c) { need('principal'); return clone(db.fees[`${y}_${c}`] || { structure: {}, payments: {}, overrides: {} }); },
      async saveFees(y, c, data) { need('principal'); db.fees[`${y}_${c}`] = clone(Object.assign({ year: String(y), classId: c }, data)); save(); },
      async exportAll() { need('principal'); const d = clone(db); d.users = d.users.map((u) => Object.assign(u, { password: undefined })); return d; },
      async resetDemo() { db = seed(); save(); setSession(null); }
    };
  }

  function seed() {
    const year = String(new Date().getFullYear());
    const subjectsFor = {
      c1: ['আরবি লেখা', 'হাদিস শরীফ মৌখিক', 'ইংরেজি', 'কুরআন ও আমপারা মৌখিক', 'বাংলা', 'গণিত'],
      c2: ['আরবি লেখা', 'হাদিস শরীফ মৌখিক', 'ইংরেজি', 'কুরআন মৌখিক', 'বাংলা', 'গণিত'],
      default: ['কুরআন মাজিদ', 'আরবি', 'বাংলা', 'ইংরেজি', 'গণিত', 'আকাইদ ও ফিকহ']
    };
    const subjects = [];
    DEFAULT_CLASSES.forEach((c) => (subjectsFor[c.id] || subjectsFor.default).forEach((n, i) =>
      subjects.push({ id: c.id + 's' + (i + 1), classId: c.id, name: n, full: 100, pass: 33, order: i + 1 })));
    const names = ['মুহাম্মদ আব্দুল্লাহ', 'ফাতিমা আক্তার', 'আয়েশা সিদ্দিকা', 'ইব্রাহিম খলিল', 'মারজান হোসেন', 'সুমাইয়া ইসলাম', 'ফাহিম মাহমুদ', 'যায়েদ বিন হাসান'];
    const fathers = ['আব্দুর রহিম', 'নুরুল ইসলাম', 'মোহাম্মদ ইউসুফ', 'আবু তাহের', 'জাফর আলম', 'শফিকুল ইসলাম', 'আব্দুল করিম', 'হাসান মাহমুদ'];
    const students = names.map((n, i) => ({ id: 'st' + (i + 1), year, classId: 'c1', name: n, father: fathers[i], roll: String(i + 1), reg: String(26101 + i), phone: '' }));
    const pattern = [[92, 95, 88, 96, 90, 94], [85, 90, 78, 92, 88, 95], [80, 86, 74, 88, 82, 90], [75, 80, 68, 85, 77, 84], [70, 78, 62, 80, 72, 76], [66, 72, 58, 75, 70, 68], [55, 60, 45, 66, 58, 52], [48, 52, 30, 60, 45, 40]];
    const marks = {}; const results = {}; const published = {};
    ['first', 'second', 'annual'].forEach((ex, k) => {
      const entries = {};
      students.forEach((s, i) => { entries[s.id] = {}; subjects.filter((x) => x.classId === 'c1').forEach((sub, j) => { entries[s.id][sub.id] = Math.min(100, pattern[i][j] + (k === 1 ? 2 : k === 2 ? 3 : 0) - ((i + j) % 3)); }); });
      const id = marksId(year, ex, 'c1');
      const pub = ex !== 'annual';
      marks[id] = { year, exam: ex, classId: 'c1', entries, published: pub };
      if (pub) {
        const subs = subjects.filter((x) => x.classId === 'c1');
        C.classResults(students, subs, entries).forEach((r) => { const snap = snapshot(r, ex, year, 'নার্সারি'); results[resultId(year, ex, 'c1', snap.roll, snap.reg)] = snap; });
        published[id] = Date.now();
      }
    });
    const payments = {};
    students.forEach((s, i) => { payments[s.id] = { admission: 500 }; for (let m = 1; m <= 10 - (i % 4); m++) payments[s.id]['m' + m] = 150; payments[s.id].exam_first = 100; if (i % 3 !== 2) payments[s.id].exam_second = 100; });
    return {
      settings: {}, images: {}, classes: DEFAULT_CLASSES, subjects, students,
      users: [
        { id: 'u1', name: 'প্রিন্সিপাল', userId: 'principal', password: 'demo1234', role: 'principal', classIds: [], active: true },
        { id: 'u2', name: 'মাওলানা আব্দুল করিম', userId: 'teacher', password: 'demo1234', role: 'teacher', classIds: ['c1'], active: true }
      ],
      marks, results, published,
      notices: [
        { id: 'n1', title: 'বার্ষিক পরীক্ষার সময়সূচি প্রকাশ', body: 'বার্ষিক পরীক্ষা ২০২৬ এর সময়সূচি অফিস থেকে সংগ্রহ করুন। পরীক্ষার আগে সকল বকেয়া পরিশোধ করতে হবে।', date: year + '-11-01', pinned: true },
        { id: 'n2', title: 'ভর্তি বিজ্ঞপ্তি ২০২৭', body: 'নার্সারি থেকে অষ্টম শ্রেণি পর্যন্ত ভর্তি চলছে। ভর্তির শেষ সময় ৩১ জানুয়ারি ২০২৭।', date: year + '-10-15', pinned: false },
        { id: 'n3', title: 'দ্বিতীয় সাময়িক পরীক্ষার ফলাফল প্রকাশিত', body: 'ওয়েবসাইটে রোল ও রেজিস্ট্রেশন নম্বর দিয়ে ফলাফল দেখা যাচ্ছে।', date: year + '-09-25', pinned: false }
      ],
      fees: { [`${year}_c1`]: { year, classId: 'c1', structure: { admission: 500, monthly: 150, exam_first: 100, exam_second: 100, exam_annual: 100 }, payments, overrides: {} } }
    };
  }

  // প্রকাশের সময় অভিভাবকদের জন্য ফলাফলের স্থায়ী কপি
  function snapshot(r, exam, year, className) {
    return {
      name: r.student.name, father: r.student.father || '', roll: C.toEn(r.student.roll), reg: C.toEn(r.student.reg),
      className, exam, year: String(year), rows: r.rows.map((x) => ({ name: x.name, full: x.full, mark: x.mark, grade: x.grade, gp: x.gp })),
      total: r.total, full: r.full, average: r.average, percentage: r.percentage, gpa: r.gpa, grade: r.grade, passed: r.passed,
      rank: r.rank, newRoll: exam === 'annual' ? r.newRoll : null, publishedAt: Date.now()
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
    const data = (snap) => (snap.exists() ? snap.data() : null);
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
        const p = data(await getDoc(doc(db, 'users', u.uid)).catch(() => null) || { exists: () => false });
        if (p && p.active) profile = Object.assign({ id: u.uid }, p);
        else await authMod.signOut(auth);
      }
      ready(); listeners.forEach((f) => f(profile));
    });
    const need = (role) => { if (!profile) throw new Error('আগে লগইন করুন।'); if (role && profile.role !== role) throw new Error('এই কাজের অনুমতি শুধু প্রিন্সিপালের।'); };
    const fbError = (e) => {
      const m = String(e && (e.code || e.message) || e);
      if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(m)) return new Error('User ID অথবা Password সঠিক নয়।');
      if (/email-already-in-use/.test(m)) return new Error('এই User ID আগে থেকেই আছে।');
      if (/weak-password/.test(m)) return new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      if (/permission-denied/.test(m)) return new Error('এই কাজের অনুমতি নেই।');
      if (/too-many-requests/.test(m)) return new Error('অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।');
      if (/network|unavailable/.test(m)) return new Error('ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না।');
      return e instanceof Error ? e : new Error(m);
    };
    const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { throw fbError(e); } };

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
      saveStudents: wrap(async (arr) => { need('principal'); for (let i = 0; i < arr.length; i += 400) { const b = writeBatch(db); arr.slice(i, i + 400).forEach((s) => { s.id = s.id || uid(); b.set(doc(db, 'students', s.id), s); }); await b.commit(); } }),
      deleteStudent: wrap(async (id) => { need('principal'); await deleteDoc(doc(db, 'students', id)); }),
      listUsers: wrap(async () => { need(); return all(collection(db, 'users')); }),
      createTeacher: wrap(async (t) => {
        need('principal');
        // দ্বিতীয় অ্যাপ দিয়ে অ্যাকাউন্ট খোলা হয়, যাতে প্রিন্সিপাল লগআউট না হন
        const second = appMod.initializeApp(config, 'create-' + uid());
        const sAuth = authMod.getAuth(second);
        try {
          const cred = await authMod.createUserWithEmailAndPassword(sAuth, email(t.userId), t.password);
          await setDoc(doc(db, 'users', cred.user.uid), { name: t.name, userId: t.userId.trim(), role: 'teacher', classIds: t.classIds || [], active: true });
          await authMod.signOut(sAuth);
        } finally { await appMod.deleteApp(second); }
      }),
      updateUser: wrap(async (u) => { need('principal'); await updateDoc(doc(db, 'users', u.id), { name: u.name, classIds: u.classIds || [], active: !!u.active }); }),
      deleteUser: wrap(async (id) => { need('principal'); if (id === profile.id) throw new Error('নিজের অ্যাকাউন্ট মোছা যাবে না।'); await deleteDoc(doc(db, 'users', id)); }),
      needsSetup: wrap(async () => !(await getDoc(doc(db, 'public', 'setup'))).exists()),
      setupPrincipal: wrap(async (userId, password, name) => {
        // সেটআপ চলার সময় লগইন-অবস্থার পরিবর্তন উপেক্ষা করা হয় (প্রোফাইল তখনো লেখা হয়নি)
        settingUp = true;
        let cred;
        try {
          cred = await authMod.createUserWithEmailAndPassword(auth, email(userId), password);
        } catch (e) { settingUp = false; throw e; }
        const b = writeBatch(db);
        b.set(doc(db, 'users', cred.user.uid), { name: name || 'প্রিন্সিপাল', userId: userId.trim(), role: 'principal', classIds: [], active: true });
        b.set(doc(db, 'public', 'setup'), { done: true, at: Date.now() });
        b.set(doc(db, 'public', 'catalog'), { classes: DEFAULT_CLASSES, published: {} }, { merge: true });
        try { await b.commit(); } finally { settingUp = false; }
        profile = { id: cred.user.uid, name: name || 'প্রিন্সিপাল', userId, role: 'principal', classIds: [], active: true };
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
      getMarks: wrap(async (y, e, c) => { need(); return data(await getDoc(doc(db, 'marks', marksId(y, e, c)))) || { entries: {}, published: false }; }),
      saveMarks: wrap(async (y, e, c, entries) => {
        need(); const ref = doc(db, 'marks', marksId(y, e, c)); const cur = data(await getDoc(ref));
        if (cur && cur.published) throw new Error('ফলাফল প্রকাশিত। নম্বর বদলাতে আগে প্রকাশ বাতিল করুন।');
        await setDoc(ref, { year: String(y), exam: e, classId: c, entries, published: false, updatedAt: Date.now() });
      }),
      publish: wrap(async (y, e, c, results) => {
        need('principal'); const id = marksId(y, e, c);
        const old = await all(query(collection(db, 'results'), where('key', '==', id))).catch(() => []);
        const ops = [];
        old.forEach((r) => ops.push((b) => b.delete(doc(db, 'results', r.id))));
        results.forEach((r) => ops.push((b) => b.set(doc(db, 'results', resultId(y, e, c, r.roll, r.reg)), Object.assign({ key: id }, r))));
        ops.push((b) => b.update(doc(db, 'marks', id), { published: true, publishedAt: Date.now() }));
        ops.push((b) => b.set(doc(db, 'public', 'catalog'), { published: { [id]: Date.now() } }, { merge: true }));
        for (let i = 0; i < ops.length; i += 450) { const b = writeBatch(db); ops.slice(i, i + 450).forEach((f) => f(b)); await b.commit(); }
      }),
      unpublish: wrap(async (y, e, c) => {
        need('principal'); const id = marksId(y, e, c);
        const old = await all(query(collection(db, 'results'), where('key', '==', id)));
        const ops = old.map((r) => (b) => b.delete(doc(db, 'results', r.id)));
        ops.push((b) => b.update(doc(db, 'marks', id), { published: false }));
        ops.push((b) => b.update(doc(db, 'public', 'catalog'), { ['published.' + id]: fs.deleteField() }));
        for (let i = 0; i < ops.length; i += 450) { const b = writeBatch(db); ops.slice(i, i + 450).forEach((f) => f(b)); await b.commit(); }
      }),
      listNotices: wrap(async () => (await all(collection(db, 'notices'))).sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (b.date > a.date ? 1 : -1))),
      saveNotice: wrap(async (n) => { need('principal'); n = Object.assign({ id: uid() }, n); await setDoc(doc(db, 'notices', n.id), n); return n; }),
      deleteNotice: wrap(async (id) => { need('principal'); await deleteDoc(doc(db, 'notices', id)); }),
      getFees: wrap(async (y, c) => { need('principal'); return data(await getDoc(doc(db, 'fees', `${y}_${c}`))) || { structure: {}, payments: {}, overrides: {} }; }),
      saveFees: wrap(async (y, c, d) => { need('principal'); await setDoc(doc(db, 'fees', `${y}_${c}`), Object.assign({ year: String(y), classId: c }, d)); }),
      exportAll: wrap(async () => {
        need('principal'); const out = {};
        for (const name of ['subjects', 'students', 'users', 'marks', 'notices', 'fees']) out[name] = await all(collection(db, name));
        out.settings = data(await getDoc(doc(db, 'public', 'settings')));
        out.catalog = data(await getDoc(doc(db, 'public', 'catalog')));
        return out;
      })
    };
    // findResult: রেজাল্ট না পেলে null
    api.findResult = async (q) => {
      try { const s = await getDoc(doc(db, 'results', resultId(q.year, q.exam, q.classId, q.roll, q.reg))); return s.exists() ? s.data() : null; }
      catch (e) { throw fbError(e); }
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
  global.StoreUtil = { snapshot, marksId, resultId, DEFAULT_SETTINGS, DEFAULT_CLASSES };
})(window);
