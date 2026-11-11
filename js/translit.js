// বাংলা লেখা থেকে ইংরেজি (নাম, বিষয়, শ্রেণি)। প্রচলিত নামের তালিকা আগে দেখা হয়,
// না পেলে উচ্চারণ অনুযায়ী ইংরেজি করা হয়। ফলাফল সবসময় এডিট করা যায়।
(function (global) {
  'use strict';
  const NAMES = {
    'মুহাম্মদ': 'Muhammad', 'মুহাম্মাদ': 'Muhammad', 'মোহাম্মদ': 'Mohammad', 'মোহাম্মাদ': 'Mohammad', 'মোঃ': 'Md.', 'মো:': 'Md.', 'মো.': 'Md.', 'মোহাঃ': 'Md.',
    'আব্দুল': 'Abdul', 'আবদুল': 'Abdul', 'আব্দুর': 'Abdur', 'আবদুর': 'Abdur', 'আব্দুল্লাহ': 'Abdullah', 'আবদুল্লাহ': 'Abdullah', 'আবু': 'Abu', 'বকর': 'Bakar', 'বক্কর': 'Bakkar',
    'রহমান': 'Rahman', 'রাহমান': 'Rahman', 'রহিম': 'Rahim', 'করিম': 'Karim', 'কাদের': 'Kader', 'কাদির': 'Kadir', 'হামিদ': 'Hamid', 'হালিম': 'Halim', 'মালেক': 'Malek', 'মজিদ': 'Mojid', 'আজিজ': 'Aziz', 'জব্বার': 'Jabbar', 'সাত্তার': 'Sattar', 'গফুর': 'Gafur', 'কাইয়ুম': 'Kaiyum', 'বারী': 'Bari', 'বারি': 'Bari', 'হাই': 'Hai', 'খালেক': 'Khalek', 'লতিফ': 'Latif', 'রশিদ': 'Rashid', 'হক': 'Haque', 'হাকিম': 'Hakim', 'ওয়াহাব': 'Wahab', 'মান্নান': 'Mannan', 'শুক্কুর': 'Shukkur', 'শুকুর': 'Shukur',
    'ইসলাম': 'Islam', 'হোসেন': 'Hossain', 'হোসাইন': 'Hossain', 'হুসাইন': 'Hussain', 'হাসান': 'Hasan', 'হাছান': 'Hasan', 'হাসান': 'Hasan', 'আলম': 'Alam', 'উদ্দিন': 'Uddin', 'উদ্দীন': 'Uddin', 'উল্লাহ': 'Ullah', 'উল্লা': 'Ullah', 'আল': 'Al', 'বিন': 'Bin', 'বিনতে': 'Binte', 'মিয়া': 'Mia', 'মিঞা': 'Mia', 'শেখ': 'Sheikh', 'চৌধুরী': 'Chowdhury', 'সরকার': 'Sarkar', 'খান': 'Khan', 'ভূঁইয়া': 'Bhuiyan', 'সিকদার': 'Sikder', 'তালুকদার': 'Talukder',
    'সিদ্দিক': 'Siddique', 'সিদ্দিকী': 'Siddiqui', 'সিদ্দিকা': 'Siddika', 'ছিদ্দিক': 'Siddique', 'ফারুক': 'Faruk', 'ওমর': 'Omar', 'উমর': 'Umar', 'ওসমান': 'Osman', 'আলী': 'Ali', 'আলি': 'Ali', 'হামজা': 'Hamza', 'বিলাল': 'Bilal', 'খালিদ': 'Khalid', 'জাহিদ': 'Zahid', 'জাহেদ': 'Zahed', 'জাবের': 'Jaber', 'জুবায়ের': 'Zubayer', 'যুবায়ের': 'Zubayer', 'যায়েদ': 'Zayed', 'জায়েদ': 'Zayed', 'সাঈদ': 'Sayeed', 'সাইদ': 'Saeed', 'সাআদ': 'Saad', 'সা\'দ': 'Saad',
    'ইব্রাহিম': 'Ibrahim', 'ইব্রাহীম': 'Ibrahim', 'ইউসুফ': 'Yusuf', 'ইউছুফ': 'Yusuf', 'ইয়াসিন': 'Yasin', 'ইয়াছিন': 'Yasin', 'ইমরান': 'Imran', 'ইদ্রিস': 'Idris', 'ইসমাইল': 'Ismail', 'ইসহাক': 'Ishaq', 'ইয়াকুব': 'Yakub', 'ইলিয়াস': 'Ilias', 'ইমাম': 'Imam', 'ইমন': 'Emon', 'ইরফান': 'Irfan', 'ইশতিয়াক': 'Ishtiaq', 'ইয়াসাদ': 'Yasad', 'আয়ান': 'Ayan', 'আরাফ': 'Araf', 'আরাফাত': 'Arafat', 'আদিব': 'Adib', 'আবরার': 'Abrar', 'আফনান': 'Afnan', 'আরিয়ান': 'Ariyan', 'আসিফ': 'Asif', 'আহমেদ': 'Ahmed', 'আহমদ': 'Ahmad', 'আহমাদ': 'Ahmad', 'আনাস': 'Anas', 'আমির': 'Amir', 'আমিন': 'Amin', 'আরিফ': 'Arif', 'আশরাফ': 'Ashraf', 'আসাদ': 'Asad', 'আইয়ুব': 'Ayub', 'আইয়ুব': 'Ayub',
    'মাহমুদ': 'Mahmud', 'মাহমুদুল': 'Mahmudul', 'ফাহিম': 'Fahim', 'তাহের': 'Taher', 'জাফর': 'Jafar', 'নুর': 'Nur', 'নূর': 'Noor', 'নুরুল': 'Nurul', 'নূরুল': 'Nurul', 'শফিকুল': 'Shafiqul', 'রফিকুল': 'Rafiqul', 'সাইফুল': 'Saiful', 'আমিনুল': 'Aminul', 'মিজানুর': 'Mizanur', 'মিজান': 'Mizan', 'হাবিব': 'Habib', 'হাবিবুর': 'Habibur', 'হাবিবুল্লাহ': 'Habibullah', 'রাশেদ': 'Rashed', 'রায়হান': 'Rayhan', 'রাইহান': 'Raihan', 'রবিউল': 'Rabiul', 'রাবেয়া': 'Rabeya', 'রাকিব': 'Rakib', 'রাসেল': 'Rasel', 'রিয়াদ': 'Riyad', 'রিফাত': 'Rifat', 'রেজাউল': 'Rezaul', 'রেজা': 'Reza', 'মাহফুজ': 'Mahfuz', 'মাসুদ': 'Masud', 'মামুন': 'Mamun', 'মারুফ': 'Maruf', 'মুনির': 'Munir', 'মুস্তাফিজ': 'Mustafiz', 'মোস্তফা': 'Mostafa', 'মুস্তাফা': 'Mustafa', 'মুসা': 'Musa', 'মিরাজ': 'Miraj', 'মুবিন': 'Mubin', 'মুহিব': 'Muhib', 'নাঈম': 'Nayeem', 'নাইম': 'Naim', 'নাজমুল': 'Nazmul', 'নাসির': 'Nasir', 'নাহিদ': 'Nahid', 'নাফিস': 'Nafis', 'সাকিব': 'Sakib', 'সাব্বির': 'Sabbir', 'সজিব': 'Sajib', 'শাহিন': 'Shahin', 'শাহীন': 'Shahin', 'শাকিল': 'Shakil', 'শরীফ': 'Sharif', 'শরিফ': 'Sharif', 'সালমান': 'Salman', 'সালাহউদ্দিন': 'Salahuddin', 'সোহেল': 'Sohel', 'তানভীর': 'Tanvir', 'তাওহীদ': 'Tawhid', 'তামিম': 'Tamim', 'তারেক': 'Tarek', 'তারিক': 'Tariq', 'তুষার': 'Tushar', 'তাহমিদ': 'Tahmid', 'ফয়সাল': 'Faysal', 'ফজলুল': 'Fazlul', 'ফজলু': 'Fazlu', 'ফরহাদ': 'Farhad', 'ফেরদৌস': 'Ferdous', 'বাবুল': 'Babul', 'জসিম': 'Jasim', 'জামাল': 'Jamal', 'কামাল': 'Kamal', 'কবির': 'Kabir', 'জাকির': 'Zakir', 'জিয়াউর': 'Ziaur', 'জুনায়েদ': 'Junayed', 'মাহির': 'Mahir', 'মাহী': 'Mahi', 'মিনহাজ': 'Minhaj', 'মুনতাসির': 'Muntasir', 'তুর্কি': 'Turki', 'তুর্কী': 'Turki', 'হাবীব': 'Habib', 'হারুন': 'Harun', 'হেলাল': 'Helal', 'দেলোয়ার': 'Delowar', 'আনোয়ার': 'Anwar', 'আনোয়ারুল': 'Anwarul', 'বাহাদুর': 'Bahadur', 'আফসার': 'Afsar', 'আকবর': 'Akbar', 'এনামুল': 'Enamul', 'এমদাদুল': 'Emdadul', 'ওবায়দুল': 'Obaidul', 'কামরুল': 'Kamrul', 'খোরশেদ': 'Khorshed', 'গোলাম': 'Golam', 'জহির': 'Zahir', 'জহিরুল': 'Zahirul', 'নজরুল': 'Nazrul', 'নাজিম': 'Nazim', 'বেলাল': 'Belal', 'মনির': 'Monir', 'মনিরুল': 'Monirul', 'মহিউদ্দিন': 'Mohiuddin', 'মোজাম্মেল': 'Mozammel', 'রুহুল': 'Ruhul', 'আমিন': 'Amin', 'শহিদুল': 'Shahidul', 'শামসুল': 'Shamsul', 'সিরাজ': 'Siraj', 'সিরাজুল': 'Sirajul', 'হাফিজ': 'Hafiz', 'হাফেজ': 'Hafez', 'মাওলানা': 'Mawlana', 'মৌলভী': 'Moulvi', 'ক্বারী': 'Qari', 'কারী': 'Qari', 'হাজী': 'Haji', 'ডাঃ': 'Dr.',
    'আক্তার': 'Akter', 'আকতার': 'Akter', 'আক্তারী': 'Aktari', 'খাতুন': 'Khatun', 'বেগম': 'Begum', 'ফাতেমা': 'Fatema', 'ফাতিমা': 'Fatima', 'আয়েশা': 'Ayesha', 'আয়শা': 'Ayesha', 'জান্নাত': 'Jannat', 'জান্নাতুল': 'Jannatul', 'ফেরদাউস': 'Ferdous', 'মাওয়া': 'Mawa', 'নুসরাত': 'Nusrat', 'জাহান': 'Jahan', 'সুমাইয়া': 'Sumaiya', 'সুমাইয়া': 'Sumaiya', 'তাসনিম': 'Tasnim', 'তাহমিনা': 'Tahmina', 'মারিয়া': 'Maria', 'মরিয়ম': 'Maryam', 'মারিয়াম': 'Mariyam', 'খাদিজা': 'Khadija', 'হাফসা': 'Hafsa', 'জয়নব': 'Zaynab', 'যয়নব': 'Zaynab', 'রুকাইয়া': 'Rukaiya', 'উম্মে': 'Umme', 'হাবিবা': 'Habiba', 'সাদিয়া': 'Sadia', 'সাফা': 'Safa', 'মারওয়া': 'Marwa', 'তাইবা': 'Taiba', 'তাহিয়া': 'Tahia', 'মাহিয়া': 'Mahia', 'নাফিসা': 'Nafisa', 'নাজনীন': 'Naznin', 'নাজমা': 'Nazma', 'শারমিন': 'Sharmin', 'সুলতানা': 'Sultana', 'সোলতানা': 'Sultana', 'রাজিয়া': 'Razia', 'রহিমা': 'Rahima', 'হালিমা': 'Halima', 'আমেনা': 'Amena', 'আসমা': 'Asma', 'ইসরাত': 'Israt', 'ইশরাত': 'Ishrat', 'মিম': 'Mim', 'মীম': 'Mim', 'মুনা': 'Muna', 'তানিয়া': 'Tania', 'আফরা': 'Afra', 'আবরা': 'Abra', 'রিয়া': 'Riya', 'মনি': 'Moni', 'মেহরীমা': 'Mehrima', 'রামিশা': 'Ramisha', 'নাজিফা': 'Nazifa', 'নাজলা': 'Najla', 'ফাতেমী': 'Fatemi', 'জাওয়াদ': 'Jawad', 'রাবেয়া': 'Rabeya', 'মাহমুদা': 'Mahmuda', 'আরিফা': 'Arifa', 'সামিয়া': 'Samia', 'সানজিদা': 'Sanjida', 'শাহনাজ': 'Shahnaz', 'রুবিনা': 'Rubina', 'ফারজানা': 'Farzana', 'তাসলিমা': 'Taslima', 'মাহফুজা': 'Mahfuza', 'আশরাফুল': 'Ashraful', 'রাফি': 'Rafi', 'রাফসান': 'Rafsan', 'মাহিন': 'Mahin', 'সামি': 'Sami', 'সুবাহ': 'Subah', 'মাহিম': 'Mahim', 'সায়েহান': 'Sayehan', 'আয়ান': 'Ayan', 'রাবিইল': 'Rabiil', 'আদিব': 'Adib', 'নুশাইবা': 'Nushaiba', 'মিরাজ': 'Miraj', 'মিনহা': 'Minha', 'মোমিন': 'Momin', 'আরা': 'Ara', 'মান': 'Man', 'সামি': 'Sami', 'বাকিয়া': 'Bakia'
  };
  const SUBJECT_PHRASES = [
    ['বাংলাদেশ ও বিশ্বপরিচয়', 'Bangladesh & Global Studies'], ['বাংলাদেশ ও বিশ্ব পরিচয়', 'Bangladesh & Global Studies'], ['বা: বি: প:', 'Bangladesh & Global Studies'], ['বা: বি: প', 'Bangladesh & Global Studies'], ['বা: বিশ্ব: পরিচয়', 'Bangladesh & Global Studies'],
    ['সাধারণ জ্ঞান', 'General Knowledge'], ['পরিবেশ পরিচিতি', 'Environmental Studies'], ['শারীরিক শিক্ষা', 'Physical Education'], ['ইসলাম শিক্ষা', 'Islamic Studies'], ['ইসলামিক শিক্ষা', 'Islamic Studies'], ['আসমাউল হুসনা', 'Asmaul Husna'], ['কুরআন মাজিদ', 'Holy Quran'], ['কোরআন মাজিদ', 'Holy Quran'], ['হাদিস শরিফ', 'Hadith Sharif'], ['হাদীস শরিফ', 'Hadith Sharif'], ['হাদিস শরীফ', 'Hadith Sharif'], ['হাদীস শরীফ', 'Hadith Sharif'], ['সমাজ ও বিজ্ঞান', 'Social Science'], ['১ম পত্র', '1st Paper'], ['২য় পত্র', '2nd Paper'], ['1ম পত্র', '1st Paper'], ['2য় পত্র', '2nd Paper']
  ];
  const SUBJECT_WORDS = {
    'বাংলা': 'Bangla', 'ইংরেজি': 'English', 'ইংরেজী': 'English', 'গণিত': 'Mathematics', 'অংক': 'Mathematics', 'আরবি': 'Arabic', 'আরবী': 'Arabic', 'কুরআন': 'Quran', 'কোরআন': 'Quran', 'আমপারা': 'Ampara', 'হাদিস': 'Hadith', 'হাদীস': 'Hadith', 'আকাইদ': 'Aqaid', 'আক্বাইদ': 'Aqaid', 'ফিকহ': 'Fiqh', 'ফিকাহ': 'Fiqh', 'ফিক্হ': 'Fiqh', 'বিজ্ঞান': 'Science', 'আইসিটি': 'ICT', 'কম্পিউটার': 'Computer', 'তাজভীদ': 'Tajweed', 'তাজবীদ': 'Tajweed', 'মাখরাজ': 'Makhraj', 'কালিমা': 'Kalima', 'মাসায়েল': 'Masail', 'মাসাইল': 'Masail', 'সালাত': 'Salat', 'আদ.সালাত': 'Ad-Salat', 'মাসনূনাহ': 'Masnunah', 'মাসনূনাহ্': 'Masnunah', 'লেখা': 'Writing', 'মৌখিক': '(Oral)', 'ও': '&', 'এবং': '&', 'চিত্রাঙ্কন': 'Drawing', 'কৃষি': 'Agriculture', 'সমাজ': 'Social Studies', 'ইতিহাস': 'History', 'ভূগোল': 'Geography', 'নৈতিক': 'Moral', 'শিক্ষা': 'Education', 'উর্দু': 'Urdu', 'ফার্সি': 'Persian', 'নাহু': 'Nahw', 'সরফ': 'Sarf', 'তাফসীর': 'Tafsir', 'সীরাত': 'Seerah', 'দোয়া': 'Dua', 'দুআ': 'Dua', 'হিফজ': 'Hifz', 'নাজেরা': 'Nazera', '১ম': '1st', '২য়': '2nd', '৩য়': '3rd', '1ম': '1st', '2য়': '2nd', '3য়': '3rd', 'পত্র': 'Paper'
  };
  const ORDINAL = { 'প্রথম': 'One', 'দ্বিতীয়': 'Two', 'তৃতীয়': 'Three', 'চতুর্থ': 'Four', 'পঞ্চম': 'Five', 'ষষ্ঠ': 'Six', 'সপ্তম': 'Seven', 'অষ্টম': 'Eight', 'নবম': 'Nine', 'দশম': 'Ten', 'একাদশ': 'Eleven', 'দ্বাদশ': 'Twelve' };
  const CLASS_WORDS = { 'নার্সারি': 'Nursery', 'নার্সারী': 'Nursery', 'কে.জি': 'KG', 'কেজি': 'KG', 'কে.জি.': 'KG', 'প্লে': 'Play', 'শিশু': 'Shishu', 'হিফজ': 'Hifz', 'নাজেরা': 'Nazera', 'দাখিল': 'Dakhil', 'ইবতেদায়ী': 'Ebtedayee' };

  // ===== উচ্চারণ অনুযায়ী ইংরেজি =====
  const CONS = { 'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng', 'চ': 'ch', 'ছ': 'ch', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n', 'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n', 'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n', 'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm', 'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h', '\u09DC': 'r', '\u09DD': 'rh', '\u09DF': 'y', 'ৎ': 't' };
  const VOW = { 'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou' };
  const SIGN = { 'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou' };
  const OTHER = { 'ং': 'ng', 'ঃ': 'h', 'ঁ': '' };
  const DIG = '০১২৩৪৫৬৭৮৯';
  const norm = (w) => String(w).normalize('NFD').replace(/\u09AF\u09BC/g, '\u09DF').replace(/\u09A1\u09BC/g, '\u09DC').replace(/\u09A2\u09BC/g, '\u09DD');
  function phonetic(word) {
    // য়/ড়/ঢ় একক অক্ষর হিসেবে ধরা (কখনো নুকতা আলাদা থাকে)
    const ch = Array.from(norm(word));
    let out = '';
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i], n1 = ch[i + 1], n2 = ch[i + 2];
      if (DIG.includes(c)) { out += DIG.indexOf(c); continue; }
      if (VOW[c]) { out += (c === 'অ' ? 'a' : VOW[c]); continue; }
      if (OTHER[c] != null) { out += OTHER[c]; continue; }
      if (SIGN[c]) { out += SIGN[c]; continue; }
      if (c === '্') continue;
      if (CONS[c]) {
        // য-ফলা (্য) → y, ব-ফলা (্ব) বাদ
        if (c === 'য' && ch[i - 1] === '্') { out += out.endsWith('y') ? '' : 'y'; } else if (c === 'ব' && ch[i - 1] === '্') { /* ব-ফলা */ } else out += CONS[c];
        if (n1 && (SIGN[n1] || n1 === '্')) continue;
        // শব্দের শেষে অন্তর্নিহিত স্বর থাকে না
        if (!n1 || !CONS[n1]) continue;
        // শব্দের প্রথম ব্যঞ্জন 'a' পায়; মাঝের ব্যঞ্জন পায় না যদি পরের ব্যঞ্জনে কার থাকে
        const firstCons = out.replace(/[^a-z]/gi, '').length === CONS[c].length || i === 0;
        if (firstCons || !(n2 && SIGN[n2])) out += 'a';
        continue;
      }
      out += c;
    }
    return out;
  }
  const fixKeys = (o) => { Object.keys(o).forEach((k) => { const n = norm(k); if (n !== k) o[n] = o[k]; }); };
  fixKeys(NAMES); fixKeys(SUBJECT_WORDS); fixKeys(ORDINAL); fixKeys(CLASS_WORDS); fixKeys(CONS);
  const cap = (w) => w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  const hasBn = (s) => /[ঀ-৿]/.test(s || '');

  function name(bn) {
    if (!bn || !hasBn(bn)) return (bn || '').trim();
    return bn.trim().split(/\s+/).map((w) => {
      const clean = norm(w.replace(/[,()]/g, ''));
      if (NAMES[clean]) return NAMES[clean];
      if (/^(মোঃ|মো:|মো\.)/.test(clean) && clean.length > 3) return 'Md. ' + cap(phonetic(clean.replace(/^(মোঃ|মো:|মো\.)/, '')));
      return cap(phonetic(clean));
    }).join(' ').replace(/\s+/g, ' ').trim();
  }
  function subject(bn) {
    if (!bn || !hasBn(bn)) return (bn || '').trim();
    let s = ' ' + norm(bn).trim().replace(/\s+/g, ' ') + ' ';
    const parts = [];
    SUBJECT_PHRASES.forEach(([b0, e]) => { const b = norm(b0); if (s.includes(b)) { s = s.split(b).join(' \u0000' + parts.length + '\u0000 '); parts.push(e); } });
    const words = s.trim().split(/\s+/).map((w) => {
      const m = w.match(/^\u0000(\d+)\u0000$/); if (m) return parts[Number(m[1])];
      const clean = norm(w.replace(/[-–]/g, ''));
      return SUBJECT_WORDS[clean] || SUBJECT_WORDS[norm(w)] || (hasBn(w) ? cap(phonetic(w)) : w);
    });
    return words.join(' ').replace(/\s+&\s+&/g, ' &').replace(/\s+/g, ' ').trim();
  }
  function className(bn) {
    if (!bn || !hasBn(bn)) return (bn || '').trim();
    const t = norm(bn.trim().replace(/\s+/g, ' '));
    const m = t.match(/^(\S+)\s*(শ্রেণি|শ্রেণী|জামাত)$/);
    if (m && ORDINAL[m[1]]) return 'Class ' + ORDINAL[m[1]];
    if (CLASS_WORDS[t]) return CLASS_WORDS[t];
    return t.split(' ').map((w) => CLASS_WORDS[w] || ORDINAL[w] || (w === 'শ্রেণি' || w === 'শ্রেণী' ? 'Class' : cap(phonetic(w)))).join(' ');
  }
  global.Translit = { name, subject, className, phonetic, hasBn };
})(typeof window !== 'undefined' ? window : globalThis);
