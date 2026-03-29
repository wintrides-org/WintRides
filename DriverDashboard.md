# Driver Dashboard MVP Notes

## Core sections
- Profile card with photo, name, ratings, and reviews.
- Alerts for the driver.
- Your Rides section with Ride History and Upcoming Ride Appointments.
- Ride Requests section for new and pending ride requests.
- Payment Information section with edit actions.

## Interactions
- "New Pings" card is collapsible via chevron.
- "Payment Information" card is collapsible via chevron.
- Availability toggle has OFF and ON states with matching status copy.
- If availability is ON, show ping requests; if OFF, hide ping requests.

## Navigation
- "Offer a Ride" and "Take me to driver dashboard" on the main dashboard route drivers to the driver dashboard.
- Non-drivers are routed to the "Become a driver" page instead.
- "Become a driver" routes to the enable page for non-drivers; drivers see a brief modal and then redirect to the driver dashboard.

## Driver check
- A user is considered a driver once they complete the "Become a driver" form, which creates driverInfo.
- The dashboard uses the session endpoint's isDriver flag (derived from driverInfo) to gate routing.

## Notes
- Driver dashboard still shows the thank-you confetti intro for drivers.
- The modal redirect delay is 3 seconds.
