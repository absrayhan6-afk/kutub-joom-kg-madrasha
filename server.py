"""Result system: Python 3.12+, SQLite, no third-party dependencies."""
import csv
import hashlib
import hmac
import io
import json
import math
import os
from pathlib import Path
import secrets
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent
DB = os.environ.get('DATABASE_PATH', str(ROOT / 'data' / 'results.sqlite3'))
LOCK = threading.RLock()
LIMITS = {}
GRADES = [(80, 'A+', 5), (70, 'A', 4), (60, 'A-', 3.5), (50, 'B', 3), (40, 'C', 2), (33, 'D', 1), (0, 'F', 0)]


def fail(message, code=400):
    raise Problem(message, code)


class Problem(Exception):
    def __init__(self, message, code=400):
        super().__init__(message)
        self.code = code


def text(value, name, maxlen=120):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > maxlen:
        fail(f'{name}: required, maximum {maxlen} characters')
    return value.strip()


def number(value, name, low, high, integer=False):
    if isinstance(value, bool) or value is None or isinstance(value, (dict, list)) or str(value).strip() == '':
        fail(f'{name}: valid number required')
    try:
        n = float(value)
    except (ValueError, TypeError):
        fail(f'{name}: valid number required')
    if not math.isfinite(n) or not low <= n <= high or (integer and n != int(n)):
        fail(f'{name}: must be between {low} and {high}')
    return int(n) if integer else n


def digits(value):
    return str(value).translate(str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')).strip()


def password_hash(password, salt=None):
    if not isinstance(password, str) or len(password) < 12 or len(password) > 256:
        fail('Password must contain 12–256 characters')
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return salt + ':' + digest


def password_ok(password, stored):
    try:
        salt, _ = stored.split(':')
        return hmac.compare_digest(password_hash(password, salt), stored)
    except (ValueError, Problem, TypeError):
        return False


def connect():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def initialize():
    Path(DB).parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),body TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT DEFAULT CURRENT_TIMESTAMP,user_id TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL);
        ''')
        conn.execute('INSERT OR IGNORE INTO state VALUES(1,?)', (json.dumps({'classes': [], 'students': [], 'subjects': [], 'exams': [], 'marks': []}),))
        if not conn.execute('SELECT 1 FROM users LIMIT 1').fetchone():
            pwd = os.environ.get('ADMIN_PASSWORD', '')
            if not pwd:
                raise RuntimeError('First start requires ADMIN_PASSWORD (12+ characters); no default password exists.')
            conn.execute('INSERT INTO users VALUES(?,?,?,?,?,1)', ('principal', 'Principal', os.environ.get('ADMIN_USERNAME', 'principal').lower(), password_hash(pwd), 'principal'))


def state(conn):
    return json.loads(conn.execute('SELECT body FROM state WHERE id=1').fetchone()[0])


def find(rows, identity):
    item = next((r for r in rows if r['id'] == identity), None)
    if item is None:
        fail('Record not found', 404)
    return item


def require(user, *roles):
    if user['role'] not in roles:
        fail('You do not have permission for this action', 403)


def subjects_for(data, exam):
    return [s for s in data['subjects'] if s['classId'] == exam['classId']]


def students_for(data, exam):
    return [s for s in data['students'] if s['classId'] == exam['classId']]


def grade(percent, passed=True):
    if not passed:
        return 'F', 0
    return next((label, gp) for minimum, label, gp in GRADES if percent >= minimum)


def results(data, exam, require_approved=True):
    subjects = subjects_for(data, exam)
    students = students_for(data, exam)
    if not subjects or not students:
        fail('Add at least one subject and student before calculating results')
    records = []
    marks = {(m['studentId'], m['subjectId']): m for m in data['marks'] if m['examId'] == exam['id']}
    for student in students:
        detail = []
        for subject in subjects:
            mark = marks.get((student['id'], subject['id']))
            if mark is None or (require_approved and mark['status'] != 'approved'):
                fail(f"Incomplete/unapproved marks: {student['name']} / {subject['name']}")
            value = number(mark['value'], 'Marks', 0, subject['maximum'])
            pct = value / subject['maximum'] * 100
            passed = value >= subject['passMark']
            letter, gp = grade(pct, passed)
            # A subject cannot be passed with the failing grade even if its custom pass mark is below 33%.
            passed = passed and gp > 0
            detail.append({'subject': subject['name'], 'marks': value, 'maximum': subject['maximum'], 'passMark': subject['passMark'], 'grade': letter, 'gp': gp, 'passed': passed})
        total = sum(m['marks'] for m in detail)
        maximum = sum(m['maximum'] for m in detail)
        passed = all(m['passed'] for m in detail)
        gpa = sum(m['gp'] for m in detail) / len(detail) if passed else 0
        records.append({'studentId': student['id'], 'name': student['name'], 'oldRoll': student['oldRoll'], 'className': find(data['classes'], exam['classId'])['name'], 'section': find(data['classes'], exam['classId'])['section'], 'examName': exam['name'], 'year': exam['year'], 'marks': detail, 'total': total, 'maximum': maximum, 'average': total / len(detail), 'percentage': total / maximum * 100, 'gpa': gpa, 'grade': grade(gpa_to_percent(gpa), passed)[0], 'passed': passed})
    def score(r):
        return (r['passed'], r['gpa'], r['total']) if exam['ranking'] == 'gpa' else (r['passed'], r['total'], r['gpa'])
    records.sort(key=lambda r: (*(-float(v) for v in score(r)), int(r['oldRoll']), r['studentId']))
    previous = None
    for i, row in enumerate(records, 1):
        current = score(row)
        row['rank'] = previous_rank if current == previous else i
        row['newRoll'] = i
        previous, previous_rank = current, row['rank']
    return records


def gpa_to_percent(gpa):
    return next((percent for percent, _, points in GRADES if gpa >= points), 0)


def frozen(data, class_id):
    if any(e['classId'] == class_id and e['status'] != 'draft' for e in data['exams']):
        fail('Class roster and subjects are frozen while an exam is locked/published. Use a new class/section for the next cohort.')


def mutate(conn, user, body):
    action = text(body.get('action'), 'Action')
    data = state(conn)
    obj = body.get('data', {})
    if not isinstance(obj, dict):
        fail('Data must be an object')
    uid = secrets.token_hex(8)
    if action == 'user.save':
        require(user, 'principal')
        name = text(obj.get('name'), 'Name')
        username = text(obj.get('username'), 'Username', 60).lower()
        role = obj.get('role')
        if role not in ('teacher', 'viewer', 'principal'):
            fail('Invalid role')
        identity = obj.get('id')
        if identity:
            old = conn.execute('SELECT * FROM users WHERE id=?', (identity,)).fetchone()
            if not old:
                fail('User not found', 404)
            active = 1 if obj.get('active', True) else 0
            if old['role'] == 'principal' and (role != 'principal' or not active):
                count = conn.execute("SELECT count(*) FROM users WHERE role='principal' AND active=1 AND id<>?", (identity,)).fetchone()[0]
                if not count:
                    fail('At least one active Principal is required')
            pwd = password_hash(obj['password']) if obj.get('password') else old['password']
            conn.execute('UPDATE users SET name=?,username=?,password=?,role=?,active=? WHERE id=?', (name, username, pwd, role, active, identity))
            conn.execute('DELETE FROM sessions WHERE user_id=?', (identity,))
        else:
            conn.execute('INSERT INTO users VALUES(?,?,?,?,?,1)', (uid, name, username, password_hash(obj.get('password')), role))
    elif action == 'password':
        old = conn.execute('SELECT password FROM users WHERE id=?', (user['id'],)).fetchone()[0]
        if not password_ok(obj.get('current'), old):
            fail('Current password is incorrect', 403)
        conn.execute('UPDATE users SET password=? WHERE id=?', (password_hash(obj.get('password')), user['id']))
        conn.execute('DELETE FROM sessions WHERE user_id=?', (user['id'],))
    elif action in ('class.save', 'student.save', 'subject.save', 'exam.save'):
        require(user, 'principal')
        kind = action.split('.')[0]
        bucket = {'class': 'classes', 'student': 'students', 'subject': 'subjects', 'exam': 'exams'}[kind]
        identity = obj.get('id', uid)
        old = find(data[bucket], identity) if obj.get('id') else None
        record = {'id': identity, 'name': text(obj.get('name'), 'Name')}
        if kind == 'class':
            if old:
                frozen(data, identity)
            record['section'] = text(obj.get('section') or 'A', 'Section', 40)
            if any(c['id'] != identity and (c['name'], c['section']) == (record['name'], record['section']) for c in data['classes']):
                fail('Class and section already exist')
        else:
            class_id = obj.get('classId')
            find(data['classes'], class_id)
            record['classId'] = class_id
            if kind != 'exam':
                frozen(data, class_id)
                if old:
                    frozen(data, old['classId'])
                if old and old['classId'] != class_id:
                    fail('Class cannot be changed; create a new record instead')
            if kind == 'student':
                record['oldRoll'] = number(digits(obj.get('oldRoll', '')), 'Old roll', 1, 999999, True)
                if any(s['id'] != identity and s['classId'] == class_id and s['oldRoll'] == record['oldRoll'] for s in data['students']):
                    fail('Old roll must be unique in this class/section')
            elif kind == 'subject':
                record['maximum'] = number(obj.get('maximum'), 'Maximum marks', 1, 1000)
                record['passMark'] = number(obj.get('passMark'), 'Pass mark', 0, record['maximum'])
                if record['passMark'] < record['maximum'] * .33:
                    fail('Pass mark must be at least 33% of maximum')
                teacher = conn.execute("SELECT id FROM users WHERE id=? AND role='teacher' AND active=1", (obj.get('teacherId'),)).fetchone()
                if not teacher:
                    fail('Assign an active teacher')
                record['teacherId'] = teacher[0]
                if any(s['id'] != identity and s['classId'] == class_id and s['name'].casefold() == record['name'].casefold() for s in data['subjects']):
                    fail('Subject already exists in this class')
                if old and any(m['subjectId'] == identity for m in data['marks']) and any(old[k] != record[k] for k in ('name', 'maximum', 'passMark')):
                    fail('Subject name/full marks/pass mark cannot be changed after marks entry; teacher reassignment is allowed while the class is open')
            else:
                if old and (old['status'] != 'draft' or any(m['examId'] == identity for m in data['marks'])):
                    fail('Exam with marks or a locked/published exam cannot be changed')
                record['year'] = number(digits(obj.get('year', '')), 'Year', 2000, 2200, True)
                record['ranking'] = obj.get('ranking', 'total')
                if record['ranking'] not in ('total', 'gpa'):
                    fail('Ranking must be total or gpa')
                record['status'] = 'draft'
                if any(e['id'] != identity and (e['classId'], e['year'], e['name'].casefold()) == (class_id, record['year'], record['name'].casefold()) for e in data['exams']):
                    fail('Exam already exists')
        if old:
            data[bucket][data[bucket].index(old)] = record
        else:
            data[bucket].append(record)
    elif action.endswith('.delete'):
        require(user, 'principal')
        kind = action.split('.')[0]
        bucket = {'class': 'classes', 'student': 'students', 'subject': 'subjects', 'exam': 'exams'}.get(kind)
        if not bucket:
            fail('Unknown action')
        record = find(data[bucket], obj.get('id'))
        frozen(data, record['id'] if kind == 'class' else record['classId'])
        if kind == 'class' and any(r['classId'] == record['id'] for key in ('students', 'subjects', 'exams') for r in data[key]):
            fail('Class has dependent records')
        key = kind + 'Id'
        if kind != 'class' and any(m[key] == record['id'] for m in data['marks']):
            fail('Record has marks and cannot be deleted')
        data[bucket].remove(record)
    elif action in ('marks.save', 'marks.submit', 'marks.approve', 'marks.return'):
        require(user, 'principal', 'teacher')
        exam = find(data['exams'], obj.get('examId'))
        subject = find(data['subjects'], obj.get('subjectId'))
        if subject['classId'] != exam['classId']:
            fail('Subject does not belong to this exam')
        if exam['status'] != 'draft':
            fail('Exam is locked; marks cannot be changed', 409)
        if user['role'] == 'teacher' and subject['teacherId'] != user['id']:
            fail('This subject is not assigned to you', 403)
        if action in ('marks.approve', 'marks.return'):
            require(user, 'principal')
        rows = [m for m in data['marks'] if m['examId'] == exam['id'] and m['subjectId'] == subject['id']]
        if action == 'marks.save':
            entries = obj.get('entries')
            if not isinstance(entries, list) or not entries:
                fail('Marks entries required')
            seen = set()
            for entry in entries:
                student = find(data['students'], entry.get('studentId'))
                if student['classId'] != exam['classId'] or student['id'] in seen:
                    fail('Invalid or duplicate student')
                seen.add(student['id'])
                value = number(entry.get('value'), 'Marks', 0, subject['maximum'])
                old = next((m for m in rows if m['studentId'] == student['id']), None)
                if old and old['status'] != 'draft':
                    fail('Submitted/approved marks must be returned by Principal before editing', 409)
                if old:
                    old['value'] = value
                else:
                    data['marks'].append({'examId': exam['id'], 'subjectId': subject['id'], 'studentId': student['id'], 'value': value, 'status': 'draft'})
        else:
            students = students_for(data, exam)
            if not students or len(rows) != len(students):
                fail('Enter marks for every student first')
            expected = {'marks.submit': 'draft', 'marks.approve': 'submitted'}
            if action in expected and any(m['status'] != expected[action] for m in rows):
                fail('Invalid submission state', 409)
            if action == 'marks.return':
                reason = text(obj.get('reason'), 'Return reason', 500)
                if any(m['status'] not in ('submitted', 'approved') for m in rows):
                    fail('Only submitted or approved marks can be returned', 409)
                for m in rows:
                    m['note'] = reason
            for m in rows:
                m['status'] = {'marks.submit': 'submitted', 'marks.approve': 'approved', 'marks.return': 'draft'}[action]
    elif action in ('exam.lock', 'exam.publish', 'exam.reopen'):
        require(user, 'principal')
        exam = find(data['exams'], obj.get('id'))
        if action == 'exam.lock':
            if exam['status'] != 'draft':
                fail('Only draft exams can be locked')
            exam['snapshot'] = results(data, exam)
            exam['status'] = 'locked'
        elif action == 'exam.publish':
            if exam['status'] != 'locked':
                fail('Lock and approve the complete exam before publishing')
            exam['status'] = 'published'
        else:
            if exam['status'] == 'draft':
                fail('Exam is already open')
            exam['status'] = 'draft'
            exam.pop('snapshot', None)
            for m in data['marks']:
                if m['examId'] == exam['id']:
                    m['status'] = 'draft'
                    m['note'] = 'Exam reopened by Principal; review and submit again'
    else:
        fail('Unknown action')
    conn.execute('UPDATE state SET body=? WHERE id=1', (json.dumps(data, ensure_ascii=False, allow_nan=False),))
    safe_detail = {k: v for k, v in obj.items() if k not in ('password', 'current', 'entries')}
    conn.execute('INSERT INTO audit(user_id,action,detail) VALUES(?,?,?)', (user['id'], action, json.dumps(safe_detail, ensure_ascii=False)))
    return {'ok': True}


def safe_user(row):
    return {k: row[k] for k in ('id', 'name', 'username', 'role', 'active')}


def staff_state(conn, user):
    data = state(conn)
    if user['role'] == 'teacher':
        subjects = [s for s in data['subjects'] if s['teacherId'] == user['id']]
        ids = {s['id'] for s in subjects}
        classes = {s['classId'] for s in subjects}
        data = {**data, 'subjects': subjects, 'classes': [c for c in data['classes'] if c['id'] in classes], 'students': [s for s in data['students'] if s['classId'] in classes], 'exams': [{k: v for k, v in e.items() if k != 'snapshot'} for e in data['exams'] if e['classId'] in classes], 'marks': [m for m in data['marks'] if m['subjectId'] in ids]}
    data['users'] = [safe_user(r) for r in conn.execute('SELECT * FROM users ORDER BY name')] if user['role'] == 'principal' else []
    data['audit'] = [dict(r) for r in conn.execute('SELECT at,user_id,action,detail FROM audit ORDER BY id DESC LIMIT 100')] if user['role'] == 'principal' else []
    data['me'] = safe_user(user)
    return data


class Handler(BaseHTTPRequestHandler):
    server_version = 'Madrasha'

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def log_message(self, fmt, *args):
        # Never log query strings (guardian search parameters) or authorization data.
        pass

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Cache-Control', 'no-store')
        origin = self.headers.get('Origin', '')
        allowed = os.environ.get('ALLOWED_ORIGINS', '').split(',')
        if origin and origin in allowed:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        super().end_headers()

    def reply(self, value, code=200, mime='application/json; charset=utf-8'):
        self.response = (value, code, mime)

    def emit_response(self, value, code, mime):
        payload = json.dumps(value, ensure_ascii=False, allow_nan=False).encode() if mime.startswith('application/json') else value
        self.send_response(code)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        self.end_headers()

    def limited(self, group, maximum, seconds):
        key = (self.client_address[0], group)
        now = time.monotonic()
        window, count = LIMITS.get(key, (now, 0))
        if now - window >= seconds:
            window, count = now, 0
        LIMITS[key] = (window, count + 1)
        if len(LIMITS) > 10000:
            for k, (started, _) in list(LIMITS.items()):
                if now - started > 3600:
                    LIMITS.pop(k, None)
        if count >= maximum:
            fail('Too many requests. Try again later.', 429)

    def user(self, conn):
        token = self.headers.get('Authorization', '').removeprefix('Bearer ')
        hashed = hashlib.sha256(token.encode()).hexdigest()
        row = conn.execute('SELECT users.* FROM sessions JOIN users ON sessions.user_id=users.id WHERE sessions.token=? AND expires>? AND users.active=1', (hashed, time.time())).fetchone()
        if row is None:
            fail('Please sign in again', 401)
        return row

    def do_GET(self):
        self.handle_request(False)

    def do_POST(self):
        self.handle_request(True)

    def handle_request(self, post):
        try:
            with LOCK:
                with connect() as conn:
                    self.route(conn, post)
        except Problem as exc:
            self.reply({'error': str(exc)}, exc.code)
        except sqlite3.IntegrityError:
            self.reply({'error': 'Username or record already exists'}, 409)
        except (KeyError, TypeError, ValueError, AttributeError):
            self.reply({'error': 'Invalid request or data format'}, 400)
        except Exception:
            self.reply({'error': 'Server error; contact the administrator'}, 500)
        self.emit_response(*self.response)

    def route(self, conn, post):
        path = urlsplit(self.path).path
        query = parse_qs(urlsplit(self.path).query)
        if not path.startswith('/api/'):
            if post:
                fail('Not found', 404)
            static = {'/': 'index.html', '/index.html': 'index.html', '/result.html': 'result.html', '/app.html': 'app.html', '/ui.js': 'ui.js', '/styles.css': 'styles.css', '/config.js': 'config.js', '/logo.jpg': 'logo.jpg'}
            file = static.get(path)
            if not file or not (ROOT / file).is_file():
                fail('Not found', 404)
            mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg'}[Path(file).suffix]
            return self.reply((ROOT / file).read_bytes(), mime=mime)
        body = {}
        if post:
            length = number(self.headers.get('Content-Length'), 'Content length', 1, 1048576, True)
            try:
                body = json.loads(self.rfile.read(length))
            except (json.JSONDecodeError, UnicodeError):
                fail('Invalid JSON')
            if not isinstance(body, dict):
                fail('JSON object required')
        if path == '/api/health' and not post:
            return self.reply({'ok': True})
        if path == '/api/login' and post:
            self.limited('login', 15, 300)
            username = text(body.get('username'), 'Username', 60).lower()
            row = conn.execute('SELECT * FROM users WHERE username=? AND active=1', (username,)).fetchone()
            stored = row['password'] if row else password_hash('dummy-password-value', '00' * 16)
            if not password_ok(body.get('password'), stored) or row is None:
                fail('Incorrect username or password', 401)
            token = secrets.token_urlsafe(32)
            conn.execute('DELETE FROM sessions WHERE expires<?', (time.time(),))
            conn.execute('INSERT INTO sessions VALUES(?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), row['id'], time.time() + 28800))
            return self.reply({'token': token, 'user': safe_user(row)})
        if path == '/api/public/catalog' and not post:
            data = state(conn)
            exams = [e for e in data['exams'] if e['status'] == 'published']
            class_ids = {e['classId'] for e in exams}
            return self.reply({'institution': 'কুতুবজোম ইসলামিয়া কে.জি এন্ড প্রি-ক্যাডেট মাদ্রাসা', 'classes': [c for c in data['classes'] if c['id'] in class_ids], 'exams': [{k: e[k] for k in ('id', 'classId', 'name', 'year')} for e in exams]})
        if path == '/api/public/search' and post:
            self.limited('search', 120, 60)
            data = state(conn)
            exam = next((e for e in data['exams'] if e['id'] == body.get('examId') and e['status'] == 'published'), None)
            roll = digits(body.get('oldRoll', ''))
            if not roll.isdigit():
                fail('Enter a valid old roll (English or Bangla digits)')
            row = next((r for r in exam.get('snapshot', []) if r['oldRoll'] == int(roll)), None) if exam else None
            if row is None:
                fail('এই তথ্য দিয়ে প্রকাশিত ফলাফল পাওয়া যায়নি।', 404)
            return self.reply(row)
        user = self.user(conn)
        if path == '/api/logout' and post:
            token = self.headers.get('Authorization', '').removeprefix('Bearer ')
            conn.execute('DELETE FROM sessions WHERE token=?', (hashlib.sha256(token.encode()).hexdigest(),))
            return self.reply({'ok': True})
        if path == '/api/state' and not post:
            return self.reply(staff_state(conn, user))
        if path == '/api/action' and post:
            return self.reply(mutate(conn, user, body))
        if path == '/api/report' and not post:
            require(user, 'principal', 'viewer')
            data = state(conn)
            exam = find(data['exams'], query.get('examId', [''])[0])
            rows = exam['snapshot'] if exam['status'] != 'draft' else results(data, exam)
            if query.get('format') == ['csv']:
                out = io.StringIO()
                writer = csv.writer(out)
                writer.writerow(['Name', 'Class', 'Section', 'Year', 'Exam', 'Old Roll', 'New Roll', 'Rank', 'Total', 'Maximum', 'Percentage', 'GPA', 'Result'])
                for r in rows:
                    vals = [r[k] for k in ('name', 'className', 'section', 'year', 'examName', 'oldRoll', 'newRoll', 'rank', 'total', 'maximum', 'percentage', 'gpa')] + ['PASS' if r['passed'] else 'FAIL']
                    writer.writerow(["'" + v if isinstance(v, str) and v.startswith(('=', '+', '-', '@', '\t', '\r')) else v for v in vals])
                return self.reply(('\ufeff' + out.getvalue()).encode(), mime='text/csv; charset=utf-8')
            stats = []
            for i, mark in enumerate(rows[0]['marks']):
                values = [r['marks'][i]['marks'] for r in rows]
                stats.append({'subject': mark['subject'], 'highest': max(values), 'lowest': min(values), 'average': sum(values) / len(values)})
            return self.reply({'rows': rows, 'subjects': stats, 'grades': GRADES, 'status': exam['status']})
        fail('Not found', 404)


if __name__ == '__main__':
    initialize()
    host, port = os.environ.get('HOST', '127.0.0.1'), int(os.environ.get('PORT', '8000'))
    print(f'Result system listening on http://{host}:{port}', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
