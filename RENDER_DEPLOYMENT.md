# Render Deployment Instructions

## Important: Update Render Start Command

After deploying these changes, you **MUST** update the start command in Render dashboard to:

```bash
npm run start:prod
```

This will:
1. Run database migrations (`db:push:prod`)
2. Then start the server

## Alternative: Manual Migration

If you prefer to keep the current start command, you can manually run migrations in Render's shell:

```bash
npm run db:push:prod
```

## What Changed

- Created PostgreSQL-specific schema (`shared/schema-postgres.ts`)
- Database now uses proper PostgreSQL types (UUID, timestamp, boolean)
- Migration script runs automatically before server start with `start:prod`

## Troubleshooting

If you see 502 errors after deployment:
1. Check Render logs for database connection errors
2. Verify `DATABASE_URL` environment variable is set
3. Manually run `npm run db:push:prod` in Render shell
4. Restart the service
