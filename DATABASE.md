# PostgreSQL database

The application uses Drizzle ORM with PostgreSQL through `node-postgres`.

## Local setup

1. Create a PostgreSQL database and a dedicated application user.
2. Copy `.env.example` to `.env` and replace the sample password and host.
3. Generate a migration after changing `src/db/schema.ts`:

   ```bash
   bun run db:generate
   ```

4. Apply committed migrations:

   ```bash
   bun run db:migrate
   ```

5. Add the non-sensitive demo data:

   ```bash
   bun run db:seed
   ```

6. Optionally inspect the database:

   ```bash
   bun run db:studio
   ```

## Security notes

- QR approval URLs must contain a random, short-lived token. Only its SHA-256
  hash is stored in `troubleshooting_approvals`.
- Client signatures are stored as binary data so they can be included in the
  exported troubleshooting document.
- Backup password information is operational descriptive text, not an
  application login credential. Do not use this field for real account secrets.
- Database credentials belong in server-only environment variables. Do not
  prefix them with `NEXT_PUBLIC_`.
