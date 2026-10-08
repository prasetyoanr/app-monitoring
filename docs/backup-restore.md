# Database backup and restore

The Excel exports in Reports are for reading, not for recovery. A real backup is a
PostgreSQL dump, and it only counts once a restore has been tested.

## What must be backed up

| Item | Why | How |
| --- | --- | --- |
| PostgreSQL database | Every ticket, account, survey, log, photo and signature (stored as binary) | `bun run db:backup` |
| `BACKUP_CREDENTIAL_ENCRYPTION_KEY` (from `.env`) | Encrypts the Synology passwords in the database. A restored database is unreadable for those fields without the same key | Copy it to a password manager or another safe place. **Never store it next to the dumps.** |
| `.env` (other values) | `DATABASE_URL`, `GEMINI_API_KEY` | Keep a copy in the same safe place |

The `storage/` folder only holds the dumps; uploaded files live in the database.

## Take a backup

```bash
bun run db:backup
```

The script runs `pg_dump` (custom format), checks that the dump can be read back, writes a
`.sha256` checksum, applies retention, and records the result in `backup-status.json`.
It exits with a non-zero code on failure so a scheduler can flag it.

Settings (environment variables or `.env`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKUP_DIR` | `storage/database-backups` | Where dumps are written. Prefer a folder on another disk |
| `BACKUP_COPY_DIR` | _(none)_ | A second location (NAS share, external drive). **Set this**: a backup that only lives on the server is lost together with it |
| `BACKUP_KEEP_DAILY` | `14` | Newest backups to keep |
| `BACKUP_KEEP_WEEKLY` | `8` | Plus the newest backup of each of the last N weeks |
| `PG_BIN` | auto-detected | Folder holding `pg_dump` / `pg_restore` if they are not on PATH |

Retention only deletes files named `<database>-YYYYMMDD-HHMMSS.dump`; other files in the
folder are never touched. `pg_dump` must be the same version as the server or newer.

## Schedule it

Windows (Task Scheduler), every day at 02:00. Adjust the project path:

```powershell
schtasks /Create /TN "GA App Database Backup" /SC DAILY /ST 02:00 /RL HIGHEST ^
  /TR "cmd /c cd /d C:\path\to\app-monitoring && node scripts\db-backup.mjs >> storage\database-backups\backup.log 2>&1"
```

Linux (cron):

```cron
0 2 * * * cd /srv/app-monitoring && node scripts/db-backup.mjs >> storage/database-backups/backup.log 2>&1
```

Check `backup-status.json` (or the log) regularly; a schedule nobody looks at is not a backup.

## Test the restore (do this monthly)

```bash
bun run db:restore-test
```

This restores the newest backup into a throw-away database named `restore_test_<time>`,
verifies the checksum, confirms every table exists, compares row counts with the live
database, and drops the scratch database. It never writes to the live database. The database
user needs permission to create databases; if it does not, run the test as a superuser.

## Restore for real (disaster recovery)

The restore always goes into a **new** database; nothing overwrites the live one.

```bash
bun run db:restore -- --to db_monitoring_restored
bun run db:restore -- --to db_monitoring_restored --file path/to/other.dump
```

Without `--file` it picks the newest backup of this database, judged by the timestamp in the
file name. For an older point in time (for example, data was damaged yesterday), pass
`--file`. The script refuses a name that already exists or is the live database, checks the
checksum, restores, compares row counts, and removes the new database again if the restore
fails halfway.

Then switch the application over:

1. Stop the application so nothing writes during the switch.
2. In `.env`, change the database name at the end of `DATABASE_URL` to the restored one, and
   put the saved `BACKUP_CREDENTIAL_ENCRYPTION_KEY` back.
3. Run `bun run db:migrate` if the application version is newer than the backup.
4. Start the application and check: log in, open a recent ticket with its photo/signature,
   and open Backup User (the encrypted credentials must still decrypt).
5. Keep the old database for a few days before dropping it.

Without the script, the manual equivalent is `createdb NEW_DB` followed by
`pg_restore --no-owner --exit-on-error --host HOST --username USER --dbname NEW_DB file.dump`.

Anything entered after the backup was taken is lost, so the schedule defines how much you can
lose. Daily at night means up to one day.

## Restoring an older dump (for example from the old IT system)

An older dump has an older schema. Never restore it into the database the application already
uses: tables and types already exist (hundreds of "already exists" errors), rows are rejected
by the newer constraints, and the rows that do load (such as `audit_logs`) are appended to the
existing data.

1. Restore it into a **new, empty** database: `bun run db:restore -- --to prodcopy --file path/to/old.dump`
   (or pgAdmin: create an empty database, then Restore with "No owner" and "Clean before restore").
2. Point `DATABASE_URL` at that new database and run `bun run db:migrate`. The migrations
   recorded in the dump tell Drizzle where to continue, so only the missing ones are applied.
3. Check the data, then switch the application over.

To rehearse all of this in one command, without touching any real database:

```bash
bun run db:rehearse-upgrade -- --file path/to/production.dump
```

It restores the dump into a scratch database, runs the migrations on it, checks that no table
lost rows, that every ticket has a service division and every account can still log in, then
drops the scratch database (`--keep` leaves it for inspection). Repeat it with a fresh dump
right before the real upgrade.

A copy of the production dump of 2026-10-07 (16 migrations behind) was upgraded this way in a
test: all 116 tickets, 110 photos and 110 signatures were kept and every ticket received its
service division.

## Before every upgrade

Run `bun run db:backup` right before `bun run db:migrate`, and keep that file until the new
version has been used for a few days.

## Security

Dumps contain personal data and password hashes. Keep the backup folder readable only by the
account that runs the backup, and do not put dumps in a shared or synced folder that others
can open.
