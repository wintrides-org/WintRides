# Accept Logic (MVP)

## Scope
Implement the driver "Accept" flow with clear UI states.

## MVP steps
- Rider places a request.
- Request payload is stored in the database.
- Requests page shows all `OPEN` requests; the first 2–3 show in “New Pings,” with a “View All” button linking to the Requests page.
- Driver dashboard “New Ride Requests” pulls the top 3 latest OPEN requests from the Requests list.
- Accept from “New Ride Requests” performs the same action as Accept on the Requests page.
- After Accept, show a confirmation card on the driver’s end.
- Driver clicks Accept → server performs atomic update: if status is `OPEN`, set to `MATCHED` and store `acceptedDriverId`. It should disappear from the "Requests" page
- If status is already `MATCHED`, return error: “Sorry, the request was already accepted by another driver.”
- Create a notification record for the rider when a request is accepted.
- Rider is notified and the card should show up under "Your Rides" and in the "Upcoming Rides" page for the driver
- Driver sees accepted request move to “Upcoming” (card style change), while it disappears from other drivers’ request lists. 
- Status lifecycle after match: `ARRIVED` → `IN_PROGRESS` → `COMPLETED`.
- Payment capture: show UI indicating payment was captured (visual only for MVP).
- Completed rides move from Upcoming to Ride History.


## To consider for v2
- Pull pay/price from backend instead of UI estimate.
- Driver availability check before accept (must be ON + verified).
- Deliver rider notifications via UI polling or real-time updates (WebSocket).
- Rider confirmation view with driver profile, vehicle details, and ETA.
- Cancellation flow (driver/rider) and fallback re‑listing logic.
- Map/Navigation failures + fallback directions.
- Ratings/reviews after completion.
- Audit logging and metrics for acceptance events.
- Rate limiting for accept attempts to reduce abuse.

# Cancellation Logic

## Behaviour: Rider's cancellation
Rider: Clicks on “Cancel Ride” on confirmation card

If status == OPEN | EXPIRED 
- display the confirmation modal: “Are you sure you want to cancel?”
- change status of ride from “OPEN” to “CANCELED” and populate fields “canceled_at”, “canceled_by” in requests DB (might create a “CANCELED” db in future)
- move ride from “Upcoming Rides” to “Ride History” on frontend
- remove ride from driver’s UI view of requested rides
***Ensure all requested rides queries only fetch active statuses, OPEN (and in a few cases, MATCHED)***

If status == MATCHED
- display the confirmation modal: “Are you sure you want to cancel?” with subtext “You’ll be changed 50% of the transaction”
- do all of same things as under “status = OPEN | EXPIRED” 
- ping driver via
    - text: “Ride to ____ has been CANCELED. You’ll be paid 50% of the original ride in compensation. Thanks for your service!”
- flag the ride in “Upcoming Rides” as CANCELED and highlight it with red for 1 day after cancellation. Then remove it from Upcoming Rides
- for now, charge rider 50% of the cost and use that to compensate driver

### Security
- Add a one-time cancel safety check
- Ensure the cancellation requester is a valid signed-in user whose id matches ride requester
- Future: create a “request_events” or “cancellation_events” db that tracks (who canceled, when, old status, new status, reason)

## Behaviour: Driver's cancellation
Driver: 
- Keep, in addition to ratings, a “Canceled Rides” count (a new column in driver’s info?)
- Display the count, as a percentage of all rides accepted by the driver, on the driver’s bio (in the “Reviews” page)
- If friver clicks on “Cancel ride”
- display confirmation modal that shows “Are you sure you want to cancel?” with a subtext: "Canceling will reflect on your profile. We discourage canceling on riders but we understand that things happen.” There should be two buttons “Cancel Ride” and “Go Back”
- The modal should also have a “Comment box” for riders to enter the reason for cancellation. Driver must enter at least 15 characters in the box (don’t show that unless they enter less) for the “Cancel Ride” button to ‘activate’
    - Activated “Cancel Ride” button follows our button modals
    - Deactivated “Cancel Ride” button is grey and shows driver the error: “Reason for cancelation is unclear/too short”
    - The comment should be stored in the backend with the ride as one payload→ might need to create a “Canceled Rides” database
If they continue to cancel ride by clicking the "Cancel Ride" confirmation button,
- increment “Canceled Rides” count on the backend
- send a text to the rider about the cancellation: “Your driver canceled, we’re sorry about this. We’re working hard to find you a new driver ASAP”
- change the status from “MATCHED” to “OPEN”
- Initiate the “Accept flow” again: i.e. show it under “Ride Requests” on available drivers’ pages. It should be prioritized (be added to top of the list)
- If rider cancels after the driver canceled on them, follow all steps under “Rider cancels” when “status == OPEN|EXPIRED”

### Security
- Add a one-time cancel safety check
- Ensure the cancellation requester is a valid signed-in user whose id matches ride requester
- Driver can only cancel when ride is “MATCHED” (will revisit in future when we’re strengthening advanced security)
- Future: create a “request_events” or “cancellation_events” db that tracks (who canceled, when, old status, new status, reason)

## Active vs Inactive statuses (what shows what?)
### Active Queries
- Rider dashboard upcoming rides: status=OPEN,MATCHED
- Rider Ride Status page (upcoming requests): status=OPEN,MATCHED
- Driver Requests page (request queue): status=OPEN
- Driver dashboard “New Ride Requests”: status=OPEN
- Driver upcoming rides: status=MATCHED
- Driver dashboard “Upcoming” section: status=MATCHED
### Non-active queries (intentional history views)
- Rider Ride History page: status=COMPLETED,CANCELED
- Driver Ride History page: status=COMPLETED
