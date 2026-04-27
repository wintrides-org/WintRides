# Pages Directory Structure

## Route Tree

```text
/
├── /
├── /register
├── /signin
├── /verify-email
├── /dashboard
│   ├── /ride-history
│   └── /ride-status
├── /request
│   ├── /immediate
│   ├── /scheduled
│   ├── /group
│   └── /success
├── /driver
│   ├── /dashboard
│   ├── /enable
│   ├── /requests
│   ├── /ride-history
│   └── /upcoming
├── /drivers
│   └── /[id]/reviews
├── /carpool
│   ├── /feed
│   ├── /create
│   └── /[id]
├── /account
│   ├── /profile
│   ├── /driver-info
│   ├── /reviews
│   ├── /payments
│   ├── /preferences
│   └── /signout
├── /help
└── /in-progress
```

## Flow Map

### Public entry flow

- `/` links to `/register` and `/signin`.
- `/register` links back to `/`, links to `/signin`, and routes to `/verify-email` or `/dashboard` depending on registration state.
- `/signin` links back to `/`, links to `/register`, and routes to `/dashboard` by default or to a provided `next` route.
- `/verify-email` links to `/signin` and `/register`, and routes to `/signin` after successful verification.

### Rider dashboard flow

- `/dashboard` is the main rider hub.
- `/dashboard` links to `/account/profile`, `/help`, `/in-progress`, `/dashboard/ride-history`, `/carpool/feed`, `/driver/enable`, and `/driver/dashboard` depending on driver state.
- `/dashboard` opens the request chooser modal via `RequestButton`.
  The modal routes to `/request/immediate`, `/request/scheduled`, or `/request/group`.
- `/dashboard` opens the carpool chooser modal via `?carpoolOptions=1`.
  The modal routes to `/carpool/create?carpoolType=RIDER` or `/carpool/create?carpoolType=DRIVER`.
- `/dashboard` can deep-link into `/dashboard/ride-history?reviewRideId=...#review-...` from the review prompt.

### Request flow

- `/request/immediate`, `/request/scheduled`, and `/request/group` all render through `components/RequestForm.tsx`.
- Each request form back button links to `/dashboard?requestOptions=1`, which reopens the request chooser modal on the dashboard.
- Submitting any request form routes to `/request/success`.
- `/request/success` links back to `/dashboard`.

### Rider ride status and history

- `/dashboard/ride-history` uses `router.back()` in the header back button, so it returns to the previous page in history.
- `/dashboard/ride-history` links to `/drivers/[id]/reviews` for a matched/completed driver review profile and also links to `/dashboard`.
- `/dashboard/ride-status` uses `router.back()` in the header back button and includes links back to `/dashboard`.
- `/drivers/[id]/reviews` uses `router.back()` for return navigation.

### Carpool flow

- `/carpool/feed` links back to `/dashboard`.
- `/carpool/feed` routes carpool creation through `/dashboard?carpoolOptions=1`.
- `/carpool/feed` links into `/carpool/[id]` from each carpool card.
- `/carpool/create` back button links to `/dashboard?carpoolOptions=1`, which reopens the driver/rider chooser modal.
- `/carpool/create` routes to `/carpool/[id]` after successful creation.
- `/carpool/[id]` links back to `/carpool/feed`.
- `/carpool/[id]` can route to `/request/group?...` when converting a locked rider carpool into a group ride request.
- `/carpool/[id]` can route to `/driver/upcoming?lockSuccess=1&rideId=...` when a driver locks a carpool and an associated ride is created.

### Driver flow

- `/driver/enable` links back to `/dashboard`.
- `/driver/enable?mode=update` is the update-license variant of the same page.
- `/driver/dashboard` links back to `/dashboard`.
- `/driver/dashboard` links to `/driver/requests`, `/driver/ride-history`, `/driver/upcoming`, `/account/payments`, `/driver/enable?mode=update`, `/drivers/[id]/reviews`, and some `/in-progress` placeholders.
- `/driver/requests` links back to `/driver/dashboard`.
- `/driver/ride-history` links back to `/driver/dashboard`.
- `/driver/upcoming` links back to `/driver/dashboard` and uses query params to show lock-success state.

### Account and support flow

- Every `/account/*` page is wrapped by `AccountShell`.
- `AccountShell` provides navigation between `/account/profile`, `/account/driver-info`, `/account/reviews`, `/account/payments`, `/account/preferences`, and `/account/signout`.
- `AccountShell` also provides a back button to `/dashboard`.
- `/help` links to `/account/profile`, `/dashboard`, `/help`, and `/in-progress`.

## Modal-Backed Entry Points

- Request chooser: `/dashboard?requestOptions=1`
  This is not a separate page. It is dashboard state used to reopen the request modal.
- Carpool chooser: `/dashboard?carpoolOptions=1`
  This is not a separate page. It is dashboard state used to reopen the carpool role modal.

## Current Notes

- Some pages intentionally use `router.back()` instead of a fixed route.
  That means their destination depends on how the user reached the page.
- Browser back/forward behavior is therefore only partly encoded in this document.
  This file maps explicit links and route transitions currently present in the app.
