/* 
This file defines the types and interface for ride requests in the WintRides application.
The interface is to help with alignment across all platforms on the app
The types defined here define what major attributes of a request are
They are to be used for both frontend and backend development
Later: form validation and API validation will be added
*/


// defines the request types: immediate request, scheduled request, group request
export type RequestType =
    | "IMMEDIATE"
    | "SCHEDULED"
    | "GROUP"

// defines the request statuses: draft, open, matched, canceled, expired
export type RequestStatus =
| "DRAFT"     // user is filling the form
| "OPEN"      // submitted, waiting for driver
| "MATCHED"   // driver accepted
| "COMPLETED" // ride finished
| "CANCELED"  // rider or system canceled
| "EXPIRED";  // no driver accepted in time

// defines reusable pieces: location
export type Location = {
    label: string;   // human-readable name
    address: string;
    // set latitude and longitude as optional to allow shipping for MVP without maps
    latitude?: number;
    longitude?: number; 
  };

// defines the main RideRequest interface
export interface RideRequest { 
    id: string;
    riderId: string;
    acceptedDriverId?: string;

    // Request lifecycle metadata.
    type: RequestType;
    status: RequestStatus;

    pickup: Location;
    dropoff: Location;
    pickupNotes?: string;

    partySize: number;

    // Always present so all request types share the same shape
    pickupAt: string; // ISO timestamp
    // Defaults to 1 for immediate/scheduled requests.
    carsNeeded: number;

    matchedAt?: string;
    createdAt: string;
}
  
  
  
