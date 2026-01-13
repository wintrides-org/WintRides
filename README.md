## Table of contents
- [Project Description](#project-description)
  - [Addressing Mobility](#wintrides-services)
- [Usage Instructions](#usage-instructions)
  - [Create an Account/Sign-in flow](#create-an-accountsign-in-flow)
  - [Request a Ride](#request-a-ride)
  - [Offer a Ride](#offer-a-ride)
- [SET-UP AND INSTALLATION](#set-up-and-installation)
  - [Technologies used](#technologies-used)
  - [Tech Stack](#tech-stack)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
  - [Auth flow note](#auth-flow-note)
  - [Common issues](#common-issues)
  - [Optional: Deploy on Vercel](#optional-deploy-on-vercel)
- [Flow Diagrams](#flow-diagrams)
  - [Backend diagram (PostgreSQL + Prisma)](#backend-diagram-postgresql--prisma)
- [Pages Directory Structure](#pages-directory-structure)


### Project Description
__WintRides__ is a centralized platform that provides reliable, accessible and affordable rides for college students in rural and surburban campuses. It improves mobility for students on these campuses by providing a smooth way to request, offer and share rides around rural college towns and to key locations like airports.

## Addressing the Problem of Mobility with WintRides
Requesting rides from fellow students is not a novel culture on college campuses in rural and suburban areas, as many rural campuses have little accessibility to traditional ride-sharing platforms like Uber and Lyft. However, the process usually involves asking for help on multiple messaging platforms or asking friends using direct word-of-mouth, making the hustle for rides a connection game. 
By providing a centralized platform where students can request, offer, and share rides, WintRides eliminates the hassle associated with ridesharing and increases mobility on and off campus for students in rural and suburban college campuses. 

**WintRides Services**

WintRides offers 3 major services:
1) Request Service: Allows students to find a driver either for immediate and scheduled appointments or group events
2) Offer Service: Allows students to pick up ride appointments, enabling them to offer rides to other students and get paid
3) Share Service: Allows students to ride together with peers, fostering a greater sense of safety while making the ride more affordable through shared fare costs.

### Usage Instructions
To use the platform, a user takes the following steps
## Create an Account/Sign-in flow
  - Click on the production link: https://wint-rides-blond.vercel.app/ (app works best in light mode)
  - Complete the instructions to create an account or skip to sign in if account has been created already. If interested in becoming a driver, indicate that during account creation
  - Enter your username and password to sign in
  - You'll be taken to the dashboard

## Request a Ride
  Given you are on the dashboard,
  - Click on the "Request a Ride" button on the dashboard
  - Choose a request type from the inline modal that pops up 
  - Complete the associated form
  - Review the quote and submit
  - Go back to your dashboard: there should be a card "Your Rides" with the confirmation details

## Offer a Ride
Given you are on the dashboard,
  - Navigate to the dashboard
  - If you have not signed up to become a driver, click on the "Become a Driver" button
  - Click on the "Offer a Ride" or "Take me to Driver Dashboard" button
  - When on the driver dashboard, you'll see new ride requests in the "New Ride Requests" card. Click on "View All" to view all requests

  *Note that for the purposes of this demo, you are able to accept a ride you requested. We implemented this permission to allow the judges view the implementation end-to-end.*
  - To accept a ride, click "Accept"
  - Refresh the page and you'll see the details of your accepted ride in the "Upcoming Requests" card on your driver dashbaord
  - Click View --> Then Click Navigate to navigate to the pickup location
  - Click on the "Complete" button when the ride is completed

  *Note that the Complete logic for v2 is that we use GPS to track if the rider and driver actually got to the destination. We allow the driver to mark the ride as completed for the MVP used for the hackathon.*

### Share a Ride
Given you are on the dashboard,
- Click on the "Create Carpool Request to start a rideshare request feed
OR
- Click on the "Join Available Carpool" to see available rideshare requests that you can join
- If you clicked on the "Create Carpool Request" form, complete the associated form and you'll be taken to the carpool feed with details about the status of your rideshare
- If you clicked on "Join Available Carpool", you'll be taken to the carpool feeds with details about available carpools
- Click a carpool feed to view more details about it
- Click on "Join Carpool" to join an available carpool request
- You can utilize the chat option to text other ridesharers


Here are instructions to set-up and test code on local machine: 
### SET-UP AND INSTALLATION 

**Tech Stack**

- Next.js (App Router)
- React
- TypeScript
- Prisma ORM + @prisma/adapter-pg (hosts database)
- PostgreSQL
- Tailwind CSS
- bcrypt (password hashing)

**Other Technologies used:**

- AI integrations: Cursor, Codex/ChatGPT
- Git (for version control)
- VSCode (primary IDE)
- Vercel (app deployment platform)

**Prerequisites**

- Git
- Node.js v20+ (includes npm)
- PostgreSQL database

**Installation & Setup**

1) Clone the repo

`ash
git clone https://github.com/wintrides-org/WintRides.git
cd WintRides
`

2) Install dependencies

**A. *Install Node.js (Windows/mac)***

1) Run the Node.js LTS installer appropriate to your machine from https://nodejs.org.
2) Close and reopen PowerShell/Terminal.
3) Verify:

`ash
node -v
npm -v
`

**B. *Configure environment variables***

`ash
cp .sample.env .env
`

**C. *Install other relevant dependencies***

`ash
npm install
`

4) Set up the database

For local development you can use:

`ash
npx prisma migrate dev
`

Else, do: 

`ash
npx prisma migrate deploy
`

6) Start the app locally (optional: can deploy on vercel)

`ash
npm run dev
`

Open http://localhost:3000.


7) Create sample data in the database

Use the app flows to create data. Instructions to navigate through the app can be found in the **Usage instructions** section 

**Authentication flow note**

- Email verification is currently **simulated** for development and testing.
- Upon registration (sign-up), a verification link is logged in the dev server console, and a verification token is returned in the API response.
- A user is considered “verified” if their email ends with **`.edu`**. The system does **not** yet verify that the email address actually exists.
- Future versions of this app will implement real email delivery and stronger verification by sending a verification link to the user’s email and validating it upon click.
- Note that the current implementation of sign-in is restricted to users with a **verified `.edu` email address**.

**Common issues**

- DATABASE_URL missing or invalid (check that your .env file exists and is up-to-date)
- Migrations not applied (run 
npx prisma migrate deploy or 
npx prisma migrate dev).
- Node.js version too old (use v20+).

### Additional Notes 

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

**Pages Directory Structure**
```
/
├── (landing) /
├── /register
├── /signin
├── /verify-email
├── /dashboard
├── /request
│   ├── /immediate
│   ├── /scheduled
│   ├── /group
│   └── /success
├── /driver
│   ├── /dashboard
│   ├── /requests
│   ├── /upcoming
│   ├── /ride-history
│   └── /enable
├── /carpool
│   ├── /feed
│   ├── /create
│   └── /[id]
└── /in-progress
```



