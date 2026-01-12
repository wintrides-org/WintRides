### WintRides is a centralized platform that provides reliable, accessible and affordable rides for college students around college towns and to key locations like airports

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Prisma ORM + @prisma/adapter-pg
- PostgreSQL
- Tailwind CSS
- bcrypt

### Technologies used: 
- Cursor, Codex/ChatGPT, Vercel, PostegreSQL, VSCode (primary IDE), Prima, Git (for version control)

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL database

## Installation & Setup

1) Clone the repo

`ash
git clone <your-repo-url>
cd WintRides
`

2) Install dependencies

`ash
npm install
`

3) Configure environment variables

Create a .env file in the project root with:

`ash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"
`

4) Set up the database

`ash
npx prisma migrate deploy
`

For local development you can use:

`ash
npx prisma migrate dev
`

5) Seed the database***************

There is no Prisma seed script configured yet. If you need sample data, add a seed script or use the app flows to create data.

6) Start the app locally

`ash
npm run dev
`

Open http://localhost:3000.

## Auth flow note

- Registration logs an email verification link in the dev server console and returns a verification token in the API response.
- Sign-in requires a verified .edu email

## Common issues

- DATABASE_URL missing or invalid.
- Migrations not applied (run 
npx prisma migrate deploy or 
npx prisma migrate dev).
- Node.js version too old (use 20+).
- Email must be a .edu domain for registration.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backend diagram (PostgreSQL + Prisma)

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


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform] from the creators of Next.js.



