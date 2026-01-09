/* 
This file defines the types and interfaces for carpool coordination in the WintRides application.
These types are used for the group carpool coordination feature.
*/

// Carpool thread status lifecycle
export type CarpoolStatus =
  // | "DRAFT"                  // only creator sees
  | "OPEN"                   // visible, joinable
  | "PENDING_CONFIRMATIONS"  // some joins, not enough confirms
  | "CONFIRMED"              // group is locked-in; details finalizing
  | "COMPLETED"              // ride happened; archived
  | "CANCELED"               // creator cancels; archived
  | "EXPIRED";               // time passed without completion; archived

// Time window for pickup
export type TimeWindow = {
  start: string;  // ISO timestamp or time string
  end: string;   // ISO timestamp or time string
};

// Carpool participant tracking
export interface CarpoolParticipant {
  userId: string;
  joinedAt: string;      // ISO timestamp
  confirmedAt?: string;  // ISO timestamp (only if confirmed)
  isCreator: boolean;
}

// Carpool message for group chat
export interface CarpoolMessage {
  id: string;
  carpoolId: string;
  userId: string;
  content: string;
  createdAt: string;     // ISO timestamp
}

// Main carpool thread interface
export interface CarpoolThread {
  id: string;
  creatorId: string;
  
  // Basic trip info
  destination: string;           // campus-defined place or custom
  date: string;                  // ISO date string (YYYY-MM-DD)
  timeWindow: TimeWindow;        // e.g., 4:30-5:30pm
  pickupArea: string;            // campus pickup point or custom
  
  // Group coordination
  seatsNeeded: number;           // how many additional riders needed
  targetGroupSize: number;       // total group size target (seatsNeeded + creator)
  
  // Status and lifecycle
  status: CarpoolStatus;
  
  // Participant tracking
  participants: CarpoolParticipant[];
  
  // Counts (derived from participants, but cached for performance)
  interestedCount: number;       // number of participants who joined
  confirmedCount: number;         // number of participants who confirmed
  
  // Optional fields
  notes?: string;                // optional free-text notes
  
  // Timestamps
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  lockedAt?: string;             // ISO timestamp (when status became CONFIRMED)
  completedAt?: string;          // ISO timestamp (when status became COMPLETED)
  canceledAt?: string;           // ISO timestamp (when status became CANCELED)
  expiredAt?: string;            // ISO timestamp (when status became EXPIRED)
}

