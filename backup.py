"""Consistent SQLite backup; run on the backend host, never put backups in Git."""
import argparse
from pathlib import Path
import sqlite3
from server import DB

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('destination', help='Private backup file outside the public website')
    args = parser.parse_args()
    dest = Path(args.destination).resolve()
    if dest == Path(DB).resolve():
        parser.error('Backup destination must differ from the database')
    if not Path(DB).exists():
        parser.error('Database does not exist; set DATABASE_PATH if needed')
    if dest.exists():
        parser.error('Backup file already exists; choose a new timestamped filename')
    dest.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as source, sqlite3.connect(dest) as target:
        source.backup(target)
    dest.chmod(0o600)
    print('Backup completed.')
