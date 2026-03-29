# WintRides Request Flows (MVP Design Note)

## Backend diagram

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
Supabase-hosted PostgreSQL
  |
  | inserts ride_requests row
  v
Response: created request record
```

## Goal
Support three rider request flows using **one shared backend model** and a **two-step submission UX**:

1) Immediate request (“Request now”)  
2) Scheduled request (“Request ahead”)  
3) Group scheduled request (“Group request”)

The UI differs slightly per flow, but all flows send the same core data shape to the backend.

---

# Request Success Page

## Behavior
- After a successful request (Immediate, Scheduled, Group), redirect to a success page.
- Success page copy:
  - Title: “Congratulations, your request has been successfully placed”
  - Subtext: “We're finding a ride for you. Remember, WintRides gotchyu!”
- Show rainbow-colored confetti on the success page.
- Button: “Go to Home” → routes to `/dashboard`.
- After returning to the dashboard, show a small “Your Rides” card summarizing the ride that was just placed.

## Rider Ride Status & Ride History (MVP plan)
- Rider-facing views mirror driver upcoming/history but filter by riderId.
- Statuses shown: OPEN (pending), MATCHED, COMPLETED, CANCELED, EXPIRED (see next comment below).
- EXPIRED exists in types but is not used for MVP because expiration timing is undefined.
- Ride Status show upcoming rides (OPEN/MATCHED) with visible status label.
- Ride History = completed/canceled rides.

## Request overlap rule (MVP fixed window)
- Prevent a rider from placing overlapping requests on the same day.
- Use a fixed 30-minute window around pickupAt (30 minutes before/after).
- Block new requests if they overlap any existing OPEN or MATCHED request for the rider.
- Implement as a server-side check against all confirmed requests.

## Rider confirmation card (MVP)
- When a driver accepts, show driver name + star rating.
- Provide a link to view driver reviews.

## Rider reviews (MVP)
- Rider can rate + write a review after a completed ride.
- Reviews appear on the driver's bio review page.
- Store reviews in local storage for MVP; move to backend in V2.

## To consider for v2
- Replace localStorage with a rider-scoped API fetch to pull the latest request from the database on the dashboard.
- Reviews should be stored on the backend
- Add an IN_PROGRESS status to track when the ride is in progress: will make more sense when there's a GPS integration to track the ride after pickup and before dropoff

## Review flow implementation notes (files changed)
- wintrides_next_js/app/drivers/[id]/reviews/page.tsx: driver reviews page (localStorage-backed reviews + average rating).
- wintrides_next_js/app/dashboard/ride-history/page.tsx: review form + submit logic for COMPLETED rides; saves reviews to localStorage.
- wintrides_next_js/app/dashboard/page.tsx: rider confirmation card now shows rating + review count + link to reviews page.
- wintrides_next_js/app/api/users/[id]/route.ts: minimal profile API used by confirmation card and reviews page.


## Core principles

### 1) One request model, three UI variants
- The backend receives the same base fields for every request.
- The frontend decides which fields are shown or hidden.
- Defaults for hidden fields are applied by the frontend and enforced by the backend.

### 2) Two-step commit (Quote → Confirm)
Requests are **not finalized immediately**.

1. User submits request details → system returns a **quote**
2. User confirms the quote → payment is charged and driver search begins

This prevents accidental charges and sets clear expectations.

---

## Request types
Every request includes a required `type` field:
- `IMMEDIATE`
- `SCHEDULED`
- `GROUP`

The backend uses `type` to validate required fields and apply defaults.

---

## Shared backend fields (always present)

These fields exist on **every request**, regardless of flow.

### Required
- `type`: `"IMMEDIATE" | "SCHEDULED" | "GROUP"`
- `partySize`: number (≥ 1)
- `pickup`: string (free text, MVP validation)
- `dropoff`: string (free text, MVP validation)
- `pickupAt`: ISO timestamp (always present)
- `carsNeeded`: number (always present)
- `createdAt`: ISO timestamp

### Optional
- `pickupNotes`: string

### Naming note
Use `pickupAt` (neutral) instead of `scheduledFor` so the same field works for immediate and scheduled requests.

---

## Two-step submission flow (applies to ALL request types)

### Step 1: Submit details → Quote
- User fills out the request form and clicks **Submit**
- System returns:
  - Estimated wait time (ETA)
  - Estimated price (or range)
- No payment is charged
- No driver search begins

### Step 2: Confirm → Commit
- User reviews:
  - ETA
  - price
  - request summary
- User can:
  - **Confirm** → charge payment + begin driver search
  - **Edit** → return to form with fields preserved
  - **Cancel** → abandon request

The accept / driver flow begins **only after confirmation**.

---

## UI differences by flow

### 1) Immediate request (“Request now”)

#### User sees:
- Number of riders
- Pickup location (free text)
- Suggested pickup options (campus locations)
- Optional pickup notes
- Destination (free text)

#### User does NOT see:
- Pickup time field
- Number of cars field
- Estimates (shown only after submit)

#### Frontend defaults:
- `type = IMMEDIATE`
- `pickupAt = now + waitBufferMinutes`
- `carsNeeded = 1`

#### MVP validation:
- Pickup and destination required
- Reject all-digit inputs
- Reject very short inputs (e.g. < 3 characters)
- `partySize ≥ 1`

---

### 2) Scheduled request (“Request ahead”)

#### User sees:
- Everything in Immediate request
- Pickup time input (`pickupAt`)

#### User does NOT see:
- Number of cars field
- Estimates until after submit

#### Frontend defaults:
- `type = SCHEDULED`
- `carsNeeded = 1`

#### MVP validation additions:
- `pickupAt` is required
- `pickupAt` must be in the future

---

### 3) Group request (scheduled)

#### User sees:
- Everything in Scheduled request
- Number of cars needed (`carsNeeded`)

#### Frontend defaults:
- `type = GROUP`

#### MVP validation additions:
- `pickupAt` required and in the future
- `carsNeeded ≥ 1`
- `partySize ≥ 1`

---

## Pickup suggestions (MVP / V2)

### MVP
Show clickable suggestions that fill the pickup input:
- Campus Center
- Yolanda King House
- King/Scales House
- Ford Hall
- Seelye Hall
- etc.

User can still type any pickup location manually.

### V2 (low priority)
- Context-aware suggestions (e.g., Amherst area)
- Campus-specific filtering
- Map-backed validation and autocorrection

---

## Refactor plan (build on existing Immediate flow)

The Immediate request page already exists. Do NOT re-implement from scratch.

### Recommended approach
1. Extract the existing Immediate form into a reusable component:
   - `RequestForm.tsx`

2. Keep:
   - Structured UI (labels, spacing, feedback colors)
   - Validation logic
   - Submit + feedback handling

3. Make the form configurable via props:
   - `requestType`
   - `showPickupAt`
   - `showCarsNeeded`

4. Create thin route pages:
   - `/request/immediate` → hides pickupAt + carsNeeded
   - `/request/scheduled` → shows pickupAt
   - `/request/group` → shows pickupAt + carsNeeded

All three reuse the same form component.

---

## Submission behavior (UI stage only)

- Initial submit sends data to a **quote step**
- Quote is displayed to the user
- Final confirmation triggers:
  - payment charge
  - driver search (handled by accept flow)

Error handling:
- Show clear red error text
- Never silently fail

Success handling:
- Clear confirmation UI
- Transition to accept flow state

---

## Not MVP (future)
- Payment retries
- Driver preferences (quiet ride, etc.)
- Recurring requests
- Round trips
- Map-based pickup/dropoff enforcement
- Advanced pricing logic
