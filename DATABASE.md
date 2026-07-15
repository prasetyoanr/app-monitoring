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

6. Create or reset the administrator login. Without an argument, this command
   generates a strong temporary password and prints it once:

   ```bash
   bun run db:create-admin
   ```

   To supply the password without committing it, set
   `INITIAL_ADMIN_PASSWORD` in the server environment before running the
   command. The password must contain 6 to 128 characters, including at least
   one letter and one number. A longer password is strongly recommended.

7. Optionally inspect the database:

   ```bash
   bun run db:studio
   ```

## Security notes

- QR approval URLs must contain a random, short-lived token. Only its SHA-256
  hash is stored in `troubleshooting_approvals`.
- Login passwords use Node.js scrypt with an individual random salt. Plaintext
  login passwords are never stored in PostgreSQL.
- Login sessions expire after eight hours. Only a SHA-256 hash of the random
  session token is stored in PostgreSQL; the browser cookie is HttpOnly,
  SameSite=Lax, and Secure in production.
- Client signatures are stored as binary data so they can be included in the
  exported troubleshooting document.
- Backup password information is operational descriptive text, not an
  application login credential. Do not use this field for real account secrets.
- Database credentials belong in server-only environment variables. Do not
  prefix them with `NEXT_PUBLIC_`.
