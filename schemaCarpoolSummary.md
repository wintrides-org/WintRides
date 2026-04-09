# Carpool Merge Naming Changes

This document summarizes the naming and model changes introduced during the carpool/request-participant work so merge conflicts are easier to resolve.

## Purpose

The request model was changed from a single-rider ownership model to a requester-plus-participants model so one ride can represent a full carpool group.

## Core Rename

### Ride Request Ownership

- Old: `RideRequest.riderId`
- New: `RideRequest.requesterId`

Meaning:

- before, the ride request was treated as belonging to one rider
- now, the ride has one requester/creator, while rider membership is handled separately through participant rows

## New Ride Participant Model

### New Model

- `RideRequestParticipant`

Purpose:

- stores the riders attached to a ride
- allows one ride to represent multiple riders from a carpool

### New Fields on `RideRequestParticipant`

- `rideRequestId`
- `userId`
- `isPrimaryContact`
- `joinedAt`

Meaning:

- `isPrimaryContact = true` marks the requester inside the participant set

## New/Updated Relations

### On `User`

- `rideRequestsCreated`
  - rides the user created/requested
- `rideParticipations`
  - rides the user participates in

### On `RideRequest`

- `requester`
  - relation to the user who created the ride
- `participants`
  - relation to `RideRequestParticipant`
- `sourceCarpoolId`
  - optional foreign key linking the ride to its carpool origin
- `sourceCarpool`
  - relation to the carpool that produced the ride

### On `Carpool`

- `rideRequests`
  - reverse relation to rides created from that carpool

## Carpool Naming Additions

### New Enum

- `CarpoolType`
  - `RIDER`
  - `DRIVER`

### New Field

- `Carpool.carpoolType`

Meaning:

- every carpool now carries a type
- the lock flow branches based on that type

### Frontend Type Update

- `CarpoolThread.carpoolType`

## Request Flow Payload Additions

### New Payload Field

- `sourceCarpoolId`

Meaning:

- used when a ride request is created from a carpool
- lets the backend identify the source carpool and create ride participant rows from confirmed carpool members

## Request API Query Param Rename

### Rider-Scoped Ride Visibility

- Old query param: `riderId`
- New query param: `participantId`

Meaning:

- before, rider-facing ride queries assumed one ride belonged to one rider
- now, rider-facing ride queries return rides where the user is a participant

Example:

- Old:
  - `/api/requests?status=OPEN,MATCHED&riderId=USER_ID`
- New:
  - `/api/requests?status=OPEN,MATCHED&participantId=USER_ID`

## Important Clarification

### `riderId` Still Exists in Some Places

Not every `riderId` in the codebase was renamed.

Example:

- `DriverReview.riderId` still exists

Meaning there:

- the rider who wrote the review

So:

- `RideRequest.riderId` was renamed to `requesterId`
- but `riderId` in `DriverReview` is still valid and unchanged

## Summary Table

- `RideRequest.riderId` -> `RideRequest.requesterId`
- request query param `riderId` -> `participantId`
- added `RideRequestParticipant`
- added `RideRequestParticipant.isPrimaryContact`
- added `User.rideRequestsCreated`
- added `User.rideParticipations`
- added `RideRequest.participants`
- added `RideRequest.sourceCarpoolId`
- added `RideRequest.sourceCarpool`
- added `Carpool.rideRequests`
- added `CarpoolType`
- added `Carpool.carpoolType`
- added `CarpoolThread.carpoolType`
- added request payload field `sourceCarpoolId`

## Merge Note

If you see code still using `riderId` on `RideRequest`, that is old naming and should likely be updated to `requesterId` or participant-based logic depending on the context. If you see `riderId` on `DriverReview`, that is expected and should not be renamed as part of this change.
