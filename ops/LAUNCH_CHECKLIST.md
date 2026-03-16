# Veloro First Launch Checklist

This file is written for a first production launch and assumes you already created the admin user.

## 1. Choose where the app will live

You need two services:

- a place to host the website
- a PostgreSQL database

If you already use Supabase for the database, that part is fine.

## 2. Collect the two values you must have

Before the app can run in production, you need:

- `DATABASE_URL`
  This comes from your PostgreSQL or Supabase project.
- `APP_URL`
  This is the real web address people will use, for example `https://portal.yourdomain.com`.

## 3. Fill in your production environment values

Start from:

- `.env.production.example`

That file shows every setting you may need. For a first launch, the required values are:

- `DATABASE_URL`
- `APP_URL`

Everything else can wait unless you specifically want it now.

## 4. Run the beginner-friendly setup check

From the project folder:

```bash
npm run launch:check
```

This command tells you:

- which required values are present
- which optional values are still missing
- whether a local backup already exists

## 5. Take a database backup before deploying

From the project folder:

```bash
npm run db:backup
```

This creates:

- a `.dump` backup file
- a `.dump.json` metadata file

Keep both files somewhere safe.

## 6. Apply database migrations

From the project folder:

```bash
npx prisma migrate deploy
```

This makes sure the live database matches the code.

## 7. Run the safety checks

From the project folder:

```bash
npm run lint
npm test
npm run build
npm run perf:budgets
```

These commands confirm the code still passes the quality checks before launch.

## 8. Deploy the app

Upload the project to your hosting provider and add the environment variables there.

At minimum, add:

- `DATABASE_URL`
- `APP_URL`

If your hosting provider asks for a start command, use:

```bash
npm start
```

If it asks for a build command, use:

```bash
npm run build
```

## 9. Check the live site after deployment

After the site is live, test:

1. login
2. dashboard
3. products page
4. settings page
5. one API-backed table to confirm data appears

If you want the automated smoke test in GitHub Actions, also set:

- `SMOKE_BASE_URL`
- `SMOKE_EMPLOYEE_ID`
- `SMOKE_PASSWORD`

## 10. Optional things you can postpone

These do not block the first launch if you want to keep things simple:

- webhook alerts
- smoke-test secrets in GitHub
- custom retention values
- hiding "coming soon" sections with feature flags

## Recommended order for you

If you want the simplest path, do the steps in this order:

1. Set `DATABASE_URL`
2. Set `APP_URL`
3. Run `npm run launch:check`
4. Run `npm run db:backup`
5. Run `npx prisma migrate deploy`
6. Run `npm run build`
7. Deploy
