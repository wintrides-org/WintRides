### PROJECT DESCRIPTION
WintRides is a centralized platform that provides reliable, accessible and affordable rides for college students around college towns and to key locations like airports

### SET-UP AND INSTALLATION 

**Technologies used:**
- Cursor, Codex/ChatGPT, Vercel, PostegreSQL, VSCode (primary IDE), Prisma, Git (for version control)

**Tech Stack**

- Next.js (App Router)
- React
- TypeScript
- Prisma ORM + @prisma/adapter-pg (hosts database)
- PostgreSQL
- Tailwind CSS
- bcrypt (password hashing)

**Prerequisites**

- Node.js 20+
- npm
- PostgreSQL database

**Installation & Setup**

1) Clone the repo

`
git clone <https://github.com/wintrides-org/WintRides.git>
cd WintRides
`

2) Install dependencies

`
npm install
`

3) Configure environment variables

`
cp .sample.env .env
` 

4) Set up the database

`
npx prisma migrate deploy
`

For local development you can use:

`
npx prisma migrate dev
`

5) Seed the database***************

There is no Prisma seed script configured yet. If you need sample data, add a seed script or use the app flows to create data.

6) Start the app locally

`
npm run dev
`

Open http://localhost:3000.

**Auth flow note**

- Registration logs an email verification link in the dev server console and returns a verification token in the API response.
- Sign-in requires a verified .edu email

**Common issues**

- DATABASE_URL missing or invalid (check that your .env file exists and is up-to-date)
- Migrations not applied (run 
npx prisma migrate deploy or 
npx prisma migrate dev).
- Node.js version too old (use 20+).
- Email must be a .edu domain for registration.

**Optional: Deploy on Vercel**

The easiest way to deploy this app is to use the [Vercel Platform] from the creators of Next.js.

### Flow Diagrams

**Backend diagram (PostgreSQL + Prisma)**

```
Browser UI (RequestForm)
  |
  | 1) POST /api/requests/quote
  v
Next.js API Route (quote)
  |
  | validates + estimates (no DB write)
  v
Response: quote + ETA/price range

Browser UI
  |
  | 2) POST /api/requests/confirm
  v
Next.js API Route (confirm)
  |
  | Prisma Client (type-safe queries)
  v
Prisma Adapter (@prisma/adapter-pg)
  |
  | uses pg driver
  v
PostgreSQL
  |
  | inserts ride_requests row
  v
Response: created request record
```

