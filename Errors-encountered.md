### Error 1: Failed to load config file "C:\Users\opara\WintRides" as a TypeScript/JavaScript module. Error: PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.

**Fix**
1) Create a Postgres database on Vercel

In your Vercel dashboard → your project → “Storage” → add Postgres.
Vercel will generate connection strings for you.
2) Add env vars to Vercel

In Vercel → Project → Settings → Environment Variables
Add at least:
DATABASE_URL
(If Vercel gives you POSTGRES_URL, you can set DATABASE_URL to the same value.)
3) Bring env vars to local dev

In your repo root, run:
vercel env pull .env
This pulls the same DATABASE_URL locally.
4) Install deps & generate Prisma client

npm install
npx prisma generate
5) Run migrations (create tables)

First time:
npx prisma migrate dev --name init
For later changes:
npx prisma migrate dev --name <change>
6) Deploy
vercel deploy -> vercel deploys and builds directly
Prisma client should generate during build if DATABASE_URL is set.