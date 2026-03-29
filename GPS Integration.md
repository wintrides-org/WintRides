# GPS Integration

This document captures the finalized phased plan for GPS and location support in WintRides.

## Goal

Introduce GPS functionality in stages so the product gains real-time coordination, routing intelligence, and trip-state awareness without making phone GPS the sole source of truth.

Core principle:

- Pickup and drop-off pins remain the authoritative trip locations.
- Phone GPS is supporting data that improves coordination, confidence, and automation.

## Phase 1: Phone GPS + Map View

This phase enables:

1. Live location sharing between rider and driver
   - Rider phone GPS, if consented to, is shared with the driver.
   - Driver phone GPS is shared with the rider.
2. Map view showing both parties
   - Driver sees rider location on a map.
   - Rider sees driver location on a map.
3. Pickup coordination
   - Helps the driver locate the rider when pickup addresses are vague.
   - Helps the rider locate the approaching driver.
4. Navigation assistance
   - Driver or rider can open navigation to pickup from their current location.
   - Driver can also navigate to the rider's drop-off location.
   - This avoids manually typing addresses into navigation apps.
5. Handling third-party bookings
   - If a ride is booked for someone else, the rider phone GPS may not represent the actual rider location.
   - In these cases, the pickup pin remains the authoritative meeting point.
   - GPS from the booking device is treated only as optional data.

## Phase 2: Routing, ETA, and Geofencing

### Routing and ETA

Routing services calculate:

- Estimated travel time
- Estimated arrival time
- Route distance

This enables:

- Better wait time estimates for riders
- Better trip pricing estimates

### Geofencing

Geofencing detects when a device enters or exits a defined area.

Examples of how it can be used:

- Detect when the driver is near the pickup
- Detect when the driver is near the drop-off
- Support trip state transitions such as arrival

Routing and geofencing serve different purposes:

- Routing and ETA predict travel time and route
- Geofencing detects when a device enters or leaves a defined location boundary

## Phase 3: Background Trip Tracking

During an active ride:

- The driver's phone location continues updating even if the app is not actively open.
- The system can track the trip path and ride progress.

This enables:

- In-progress ride monitoring
- Safety awareness
- Trip validation

## Scope Note

The follow-on rider completion logic uses GPS as supporting evidence, not as the only completion trigger. That downstream logic is intentionally separate from this document, but it follows the same principle: authoritative pins first, device GPS second.
