# KUTUB JOOM KG MADRASHA Result System

বাংলা guardian portal ও Principal / Teacher / Office result management system.

**Important:** GitHub stores the source code. GitHub Pages can display the frontend, but cannot run Python or the database. Live login, shared results and cross-device search require the backend below. The frontend clearly reports when the backend is missing; it never substitutes localStorage results.

## Included

- `app.html`: responsive staff dashboard; Principal, assigned-subject Teacher, read-only Office/Viewer.
- `index.html`: guardian search by class/section, exam year, exam/term and old roll. English and Bangla roll digits supported. `result.html` preserves the previous URL.
- `server.py`: Python 3.12+ HTTP API and SQLite database, no third-party Python packages.
- Principal manages classes/sections, students, teachers/viewers, subjects and exams; assigns each subject to an active teacher.
- Teacher saves draft marks → submits entire subject → Principal approves or returns with a reason → Principal locks complete exam → publishes immutable result snapshot.
- Reopening an exam withdraws it from guardian search and resets all marks to draft for reapproval.
- Validates missing, non-numeric, negative, out-of-range and non-finite marks; checks duplicate class/section, rolls, subjects and exams.
- Normalizes subject marks to percentages for grades, calculates total, average marks, percentage, grade, GPA and pass/fail.
- Merit/new roll: choose total-then-GPA or GPA-then-total per exam. PASS students rank first; exact score ties share competition merit positions (1, 1, 3). Unique new rolls break ties by ascending old roll.
- Reports: merit list, individual marksheets, subject highest/lowest/average, grading table; UTF-8 CSV and browser Print / Save PDF.
- Password hashing, expiring/revocable sessions, server-enforced permissions, login/search request limits, audit history and consistent database backup utility.

## Run locally (computer)

1. Install Python 3.12 or newer.
2. In the project folder, set a strong first Principal password and start:

```bash
export ADMIN_USERNAME=principal
export ADMIN_PASSWORD='REPLACE-WITH-YOUR-OWN-LONG-UNIQUE-PASSWORD'
python server.py
```

Windows PowerShell:

```powershell
$env:ADMIN_USERNAME='principal'
$env:ADMIN_PASSWORD='REPLACE-WITH-YOUR-OWN-LONG-UNIQUE-PASSWORD'
python server.py
```

Open `http://127.0.0.1:8000/app.html` for staff and `http://127.0.0.1:8000/` for guardians. There is **no built-in/default password**. On later starts the existing database account is retained; changing the environment variable does not reset its password. Use the dashboard to change/reset passwords.

For phones on the same trusted local network, set `HOST=0.0.0.0`, allow port 8000 in the computer firewall, and open `http://COMPUTER-LAN-IP:8000/` on the phone. For Internet use, serve behind an HTTPS reverse proxy; never expose plaintext logins to the Internet.

## First-use workflow

1. Principal signs in. Add **Classes** and sections.
2. Add teacher accounts under **Users** (12+ character passwords); Office uses Viewer role.
3. Add **Students** with unique old rolls within each class/section.
4. Add **Subjects**, full marks, pass marks and assigned teacher.
5. Add **Exams**: name/term, class/section, year and ranking method.
6. Teacher signs in → **Marks** → select exam/subject → save complete marks → submit.
7. Principal → **Marks** → approve each submitted subject, or return it with a reason.
8. Principal → **Exams** → lock → publish. Guardians can now search from any device connected to this server.
9. **Reports** gives merit lists, statistics, CSV and individual marksheets. Select a student and use **Print this marksheet** to save only that marksheet as PDF.

Submitted/approved subject marks cannot be edited until returned. Locked/published exams cannot be edited until explicitly reopened. A class roster and its subjects are frozen while any exam in that class is locked/published. Use a new class/section record (for example section `A-2027`) for a new student cohort. Student IDs keep old rolls separate from calculated new rolls; publishing never overwrites old rolls.

## Grade policy

| Percentage | Grade | GPA |
|---|---|---|
| 80+ | A+ | 5.00 |
| 70–<80 | A | 4.00 |
| 60–<70 | A- | 3.50 |
| 50–<60 | B | 3.00 |
| 40–<50 | C | 2.00 |
| 33–<40 | D | 1.00 |
| <33 | F | 0.00 |

Subject full marks may differ (for example 50 and 100); subject GPA uses normalized percentages. Subject pass marks must be at least 33% of full marks and may be higher. Any failed subject makes overall GPA 0 and overall grade F. Otherwise overall GPA is the unweighted mean of subject grade points; overall grade uses GPA bands (5=A+, 4=A, 3.5=A-, 3=B, 2=C, 1=D). Percentage is total / combined full marks × 100; average marks is total / subject count. No rounding occurs before pass/rank decisions; display uses two decimals. Optional subjects, attendance, practical/written subparts and weighted GPA are not implemented.

## Deploy a shared Internet server

Use a persistent server that supports Python or Docker. This repository does not provision a hosting account or domain.

Docker:

1. Copy the repository to the server.
2. Create a private `.env` (never commit it):

```dotenv
ADMIN_USERNAME=principal
ADMIN_PASSWORD=REPLACE-WITH-YOUR-OWN-LONG-UNIQUE-PASSWORD
```

3. Run `docker compose up -d --build`.
4. Put an HTTPS reverse proxy in front of `127.0.0.1:8000` and forward to it. The proxy must preserve Authorization headers. The container uses a persistent `results-data` volume. Never remove that volume when updating.
5. Open the HTTPS URL, sign in, and change the first password. Keep `.env` private. Limit infrastructure access and back up the database regularly.

For a non-Docker server set `HOST`, `PORT` and `DATABASE_PATH` and run `python server.py` as a supervised process behind HTTPS. Database storage must persist across restarts and redeployments. Run **one server process/replica** for this SQLite implementation. Request limits use the directly connected IP; behind a proxy they apply to the shared proxy IP. Add per-client throttling at the trusted reverse proxy for larger deployments. The app deliberately does not trust arbitrary forwarded IP headers.

### Optional GitHub Pages frontend

Same-origin server hosting needs no configuration. To use GitHub Pages for the frontend:

1. Deploy the HTTPS backend as above.
2. Set `window.API_BASE = 'https://YOUR-BACKEND-HOST';` in `config.js` (no trailing slash).
3. Set backend environment `ALLOWED_ORIGINS=https://absrayhan6-afk.github.io` (comma-separated exact origins if multiple).
4. Enable GitHub Pages from the `main` branch/root in repository Settings if desired.

Never put passwords, session tokens, private student data or database backups in this public repository. Guardian lookup intentionally exposes a published marksheet to someone who knows the exam and old roll, as requested; it does not expose staff, draft marks or the class roster. Only this institution is hosted by this deployment; it is not a multi-institution directory.

## Persistence and backups

Default database: `data/results.sqlite3` (ignored by Git). Accounts, marks, exam snapshots and audit history live there, never in browser localStorage. Sessions last eight hours and are stored hashed in the database; the browser keeps its bearer token in sessionStorage until sign out/tab close.

Run on the backend host:

```bash
python backup.py /PRIVATE-BACKUP-DIRECTORY/results-2026-10-29.sqlite3
```

For Docker, execute the same Python script against `/app/data/results.sqlite3` from an environment with the volume mounted (the minimal runtime image does not include the backup script). To restore, stop the application, preserve a copy of the current database, restore the backup to `DATABASE_PATH`, remove any stale `-wal`/`-shm` files while stopped, and restart. Database backups include private records and must remain access-controlled. Test restores before relying on a backup policy.

Previous localStorage data is not automatically imported: it has no reliable approval or ownership information. Existing browser-only records must be reviewed and entered through the new workflow. The original repository contained no server database or student dataset.

## Checks

```bash
python -m unittest discover -s tests -v
node --check ui.js
node tests/test_ui.cjs
```

Tests cover API authentication, role/subject boundaries, duplicate rolls, atomic rollback, invalid marks, approval/lock/publish/reopen, cross-device public API, grade normalization, both ranking modes, ties, reports, CSV and revoked sessions. CI repeats these on pushes and pull requests. HTML escaping is also checked with the actual frontend renderer. Full visual browser QA could not run in the build environment because the browser download was unavailable. Docker deployment and a real HTTPS host need to be verified in the chosen hosting environment.
