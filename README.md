# ApexVote

## Database setup

Local development uses `database.sqlite`. Production deployments use Turso so that accounts, sessions, applications, and votes persist across Vercel Function instances.

1. Create a Turso database, either through the [Turso Vercel Marketplace integration](https://vercel.com/marketplace/tursocloud) or the Turso CLI.
2. Add these environment variables to the Vercel project for Production (and Preview if needed):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_INITIAL_PASSWORD` — the password for the initial `admin` account on a new database.
3. Redeploy. The application creates its schema and default voting positions on first use.

Choose a strong `ADMIN_INITIAL_PASSWORD` and keep it private. Do not put Turso credentials in source control.

The existing local SQLite database is not copied to Turso automatically. If it contains accounts or votes that must be retained, migrate them to Turso before switching the production deployment.
