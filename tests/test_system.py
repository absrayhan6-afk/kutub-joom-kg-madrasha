import importlib.util
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

spec = importlib.util.spec_from_file_location('server', Path(__file__).resolve().parents[1] / 'server.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class SystemTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        server.DB = str(Path(cls.tmp.name) / 'test.sqlite3')
        os.environ['ADMIN_PASSWORD'] = 'test-principal-strong-password'
        server.initialize()
        cls.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.base = 'http://127.0.0.1:' + str(cls.http.server_port)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.tmp.cleanup()

    def request(self, path, data=None, token=None, status=200):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        req = urllib.request.Request(self.base + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
        try:
            response = urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            response = e
        self.assertEqual(response.status, status, response.read().decode() if response.status != status else '')
        raw = response.read()
        return json.loads(raw) if 'application/json' in response.headers.get('Content-Type', '') else raw

    def login(self, username, password):
        return self.request('/api/login', {'username': username, 'password': password})['token']

    def action(self, action, data, token, status=200):
        return self.request('/api/action', {'action': action, 'data': data}, token, status)

    def test_end_to_end_and_regressions(self):
        self.request('/api/state', status=401)
        self.request('/server.py', status=404)
        self.request('/data/results.sqlite3', status=404)
        self.request('/api/login', {'username': 'principal', 'password': 'wrong'}, status=401)
        principal = self.login('principal', 'test-principal-strong-password')
        self.action('class.save', {'name': 'Class 1', 'section': 'A'}, principal)
        data = self.request('/api/state', token=principal)
        class_id = data['classes'][0]['id']
        for username, role in [('teacher1', 'teacher'), ('teacher2', 'teacher'), ('office', 'viewer')]:
            self.action('user.save', {'name': username, 'username': username, 'password': 'strong-test-password', 'role': role}, principal)
        data = self.request('/api/state', token=principal)
        users = {u['username']: u['id'] for u in data['users']}
        t1 = self.login('teacher1', 'strong-test-password')
        t2 = self.login('teacher2', 'strong-test-password')
        viewer = self.login('office', 'strong-test-password')
        self.action('class.save', {'name': 'Forbidden'}, t1, 403)
        self.action('class.save', {'name': 'Forbidden'}, viewer, 403)
        self.action('user.save', {'id': 'principal', 'name': 'P', 'username': 'principal', 'role': 'viewer'}, principal, 400)
        for name, roll in [('<img src=x onerror=alert(1)>', '১'), ('Second', 2), ('Failing', 3)]:
            self.action('student.save', {'name': name, 'classId': class_id, 'oldRoll': roll}, principal)
        self.action('student.save', {'name': 'Duplicate', 'classId': class_id, 'oldRoll': 1}, principal, 400)
        self.action('subject.save', {'name': 'Bangla', 'classId': class_id, 'maximum': 100, 'passMark': 33, 'teacherId': users['teacher1']}, principal)
        self.action('subject.save', {'name': 'English', 'classId': class_id, 'maximum': 50, 'passMark': 16.5, 'teacherId': users['teacher2']}, principal)
        self.action('exam.save', {'name': 'Annual', 'classId': class_id, 'year': '২০২৬', 'ranking': 'total'}, principal)
        data = self.request('/api/state', token=principal)
        exam = data['exams'][0]['id']
        students = [s['id'] for s in data['students']]
        bangla, english = [s['id'] for s in data['subjects']]
        scoped = self.request('/api/state', token=t1)
        self.assertEqual(len(scoped['subjects']), 1)
        self.assertEqual(scoped['users'], [])
        self.action('marks.save', {'examId': exam, 'subjectId': english, 'entries': [{'studentId': students[0], 'value': 40}]}, t1, 403)
        self.action('exam.publish', {'id': exam}, principal, 400)
        self.action('exam.lock', {'id': exam}, principal, 400)
        self.assertEqual(self.request('/api/public/catalog')['exams'], [])
        for value in ['', 'abc', None, 101, -1, 'NaN', True]:
            self.action('marks.save', {'examId': exam, 'subjectId': bangla, 'entries': [{'studentId': students[0], 'value': value}]}, t1, 400)
        self.action('marks.save', {'examId': exam, 'subjectId': bangla, 'entries': [{'studentId': students[0], 'value': 80}, {'studentId': students[1], 'value': 'bad'}]}, t1, 400)
        self.assertEqual(self.request('/api/state', token=principal)['marks'], [])  # Atomic rollback
        for subject, teacher, values in [(bangla, t1, [80, 80, 20]), (english, t2, [40, 40, 45])]:
            self.action('marks.save', {'examId': exam, 'subjectId': subject, 'entries': [{'studentId': s, 'value': v} for s, v in zip(students, values)]}, teacher)
            self.action('marks.approve', {'examId': exam, 'subjectId': subject}, principal, 409)
            self.action('marks.submit', {'examId': exam, 'subjectId': subject}, teacher)
            self.action('marks.approve', {'examId': exam, 'subjectId': subject}, teacher, 403)
            self.action('marks.save', {'examId': exam, 'subjectId': subject, 'entries': [{'studentId': students[0], 'value': 30}]}, teacher, 409)
            self.action('marks.approve', {'examId': exam, 'subjectId': subject}, principal)
        self.action('marks.return', {'examId': exam, 'subjectId': bangla, 'reason': 'Check the marks'}, principal)
        self.action('exam.lock', {'id': exam}, principal, 400)
        self.action('marks.submit', {'examId': exam, 'subjectId': bangla}, t1)
        self.action('marks.approve', {'examId': exam, 'subjectId': bangla}, principal)
        self.action('exam.lock', {'id': exam}, principal)
        self.action('marks.save', {'examId': exam, 'subjectId': bangla, 'entries': [{'studentId': students[0], 'value': 90}]}, t1, 409)
        self.action('student.save', {'name': 'New student', 'classId': class_id, 'oldRoll': 4}, principal, 400)
        self.action('exam.publish', {'id': exam}, principal)
        self.assertEqual(len(self.request('/api/public/catalog')['exams']), 1)
        result = self.request('/api/public/search', {'examId': exam, 'oldRoll': '১'})
        self.assertEqual(result['gpa'], 5)
        self.assertEqual(result['percentage'], 80)
        self.assertEqual(result['rank'], 1)
        self.assertEqual(result['newRoll'], 1)
        result2 = self.request('/api/public/search', {'examId': exam, 'oldRoll': 2})
        self.assertEqual(result2['rank'], 1)
        self.assertEqual(result2['newRoll'], 2)
        failed = self.request('/api/public/search', {'examId': exam, 'oldRoll': 3})
        self.assertFalse(failed['passed'])
        self.assertEqual(failed['gpa'], 0)
        self.assertEqual(failed['grade'], 'F')
        self.request('/api/public/search', {'examId': exam, 'oldRoll': 999}, status=404)
        self.request('/api/report?examId=' + exam, token=t1, status=403)
        report = self.request('/api/report?examId=' + exam, token=viewer)
        self.assertEqual(report['subjects'][0]['lowest'], 20)
        self.assertEqual(report['subjects'][1]['highest'], 45)
        self.assertIn(b'Old Roll', self.request('/api/report?examId=' + exam + '&format=csv', token=viewer))
        # Guardian public API is independent of any staff session or localStorage.
        self.assertNotIn('teacherId', result)
        # Reopening explicitly withdraws public data and invalidates all approvals.
        self.action('exam.reopen', {'id': exam}, principal)
        self.request('/api/public/search', {'examId': exam, 'oldRoll': 1}, status=404)
        self.assertTrue(all(m['status'] == 'draft' for m in self.request('/api/state', token=principal)['marks']))
        self.action('password', {'current': 'strong-test-password', 'password': 'new-strong-test-password'}, t1)
        self.request('/api/state', token=t1, status=401)
        self.login('teacher1', 'new-strong-test-password')
        self.request('/api/logout', {}, viewer)
        self.request('/api/state', token=viewer, status=401)

    def test_calculation_edges_and_ranking_modes(self):
        base = {'classes': [{'id': 'c', 'name': 'Class', 'section': 'A'}], 'students': [{'id': 's', 'name': 'S', 'classId': 'c', 'oldRoll': 1}], 'subjects': [{'id': 'a', 'name': 'A', 'classId': 'c', 'maximum': 50, 'passMark': 16.5}], 'marks': []}
        exam = {'id': 'e', 'classId': 'c', 'name': 'Exam', 'year': 2026, 'ranking': 'gpa'}
        with self.assertRaises(server.Problem):
            server.results(base, exam)
        for value in ['', 'abc', -1, 51, float('nan')]:
            base['marks'] = [{'examId': 'e', 'studentId': 's', 'subjectId': 'a', 'value': value, 'status': 'approved'}]
            with self.assertRaises(server.Problem):
                server.results(base, exam)
        base['marks'][0]['value'] = 40
        self.assertEqual(server.results(base, exam)[0]['gpa'], 5)
        base['students'] = []
        with self.assertRaises(server.Problem):
            server.results(base, exam)
        # Total mode and GPA mode must yield different order for these distributions.
        data = {'classes': base['classes'], 'students': [{'id': 'x', 'name': 'X', 'classId': 'c', 'oldRoll': 1}, {'id': 'y', 'name': 'Y', 'classId': 'c', 'oldRoll': 2}], 'subjects': [{'id': k, 'name': k, 'classId': 'c', 'maximum': 100, 'passMark': 33} for k in ('a','b')], 'marks': [{'examId':'e','studentId':s,'subjectId':k,'value':v,'status':'approved'} for s, vals in [('x', [100, 69]), ('y', [80,80])] for k,v in zip(('a','b'), vals)]}
        exam['ranking'] = 'total'
        self.assertEqual(server.results(data, exam)[0]['studentId'], 'x')
        exam['ranking'] = 'gpa'
        self.assertEqual(server.results(data, exam)[0]['studentId'], 'y')


if __name__ == '__main__':
    unittest.main()
