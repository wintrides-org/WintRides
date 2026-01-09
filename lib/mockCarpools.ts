/* 
Mock data store for carpool coordination.
This is an in-memory store that persists during dev server session.
Structure is designed to easily swap with database calls later.
*/

import type { CarpoolThread, CarpoolStatus, CarpoolParticipant, CarpoolMessage } from "@/types/carpool";

// In-memory stores
let carpools: CarpoolThread[] = [];
let messages: CarpoolMessage[] = [];

// Helper to generate IDs
function generateId(): string {
  return `carpool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize with seed data
function seedData() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);

  carpools = [
    {
      id: "carpool_1",
      creatorId: "user_creator1",
      destination: "Boston Airport",
      date: tomorrow.toISOString().split('T')[0],
      timeWindow: {
        start: "16:30",
        end: "17:30"
      },
      pickupArea: "Campus Center",
      seatsNeeded: 2,
      targetGroupSize: 3,
      status: "OPEN",
      participants: [
        {
          userId: "user_creator1",
          joinedAt: now.toISOString(),
          confirmedAt: now.toISOString(),
          isCreator: true
        }
      ],
      interestedCount: 1,
      confirmedCount: 1,
      notes: "Looking for 2 more people to split the ride cost!",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    },
    {
      id: "carpool_2",
      creatorId: "user_creator2",
      destination: "New York City",
      date: dayAfter.toISOString().split('T')[0],
      timeWindow: {
        start: "08:00",
        end: "09:00"
      },
      pickupArea: "Ford Hall",
      seatsNeeded: 3,
      targetGroupSize: 4,
      status: "OPEN",
      participants: [
        {
          userId: "user_creator2",
          joinedAt: now.toISOString(),
          confirmedAt: now.toISOString(),
          isCreator: true
        }
      ],
      interestedCount: 1,
      confirmedCount: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
  ];

  messages = [
    {
      id: "msg_1",
      carpoolId: "carpool_1",
      userId: "user_creator1",
      content: "Hey! Looking for 2 more people to share the ride to Boston Airport on Friday.",
      createdAt: now.toISOString()
    }
  ];
}

// Initialize seed data on first load
if (carpools.length === 0) {
  seedData();
}

// CRUD Operations

export function getAllCarpools(): CarpoolThread[] {
  return [...carpools];
}

export function getCarpoolById(id: string): CarpoolThread | undefined {
  return carpools.find(c => c.id === id);
}

export function createCarpool(data: Omit<CarpoolThread, "id" | "createdAt" | "updatedAt" | "participants" | "interestedCount" | "confirmedCount">): CarpoolThread {
  const now = new Date().toISOString();
  const creator: CarpoolParticipant = {
    userId: data.creatorId,
    joinedAt: now,
    confirmedAt: now, // Creator is automatically confirmed
    isCreator: true
  };

  const carpool: CarpoolThread = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    participants: [creator],
    interestedCount: 1,
    confirmedCount: 1, // Creator counts as confirmed
    status: data.status || "OPEN"
  };

  carpools.push(carpool);
  return carpool;
}

export function updateCarpool(id: string, updates: Partial<CarpoolThread>): CarpoolThread | null {
  const index = carpools.findIndex(c => c.id === id);
  if (index === -1) return null;

  carpools[index] = {
    ...carpools[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return carpools[index];
}

export function addParticipant(carpoolId: string, userId: string): CarpoolThread | null {
  const carpool = getCarpoolById(carpoolId);
  if (!carpool) return null;

  // Check if already a participant
  if (carpool.participants.some(p => p.userId === userId)) {
    return carpool;
  }

  const now = new Date().toISOString();
  const newParticipant: CarpoolParticipant = {
    userId,
    joinedAt: now,
    isCreator: false
  };

  carpool.participants.push(newParticipant);
  carpool.interestedCount = carpool.participants.length;
  carpool.updatedAt = now;

  // Update status if needed
  if (carpool.status === "OPEN" && carpool.confirmedCount > 0) {
    carpool.status = "PENDING_CONFIRMATIONS";
  }

  return carpool;
}

export function confirmParticipant(carpoolId: string, userId: string): CarpoolThread | null {
  const carpool = getCarpoolById(carpoolId);
  if (!carpool) return null;

  const participant = carpool.participants.find(p => p.userId === userId);
  if (!participant) return null;

  if (participant.confirmedAt) {
    // Already confirmed
    return carpool;
  }

  const now = new Date().toISOString();
  participant.confirmedAt = now;
  carpool.confirmedCount = carpool.participants.filter(p => p.confirmedAt).length;
  carpool.updatedAt = now;

  // Update status based on confirmed count
  if (carpool.confirmedCount > 0 && carpool.confirmedCount < carpool.targetGroupSize) {
    carpool.status = "PENDING_CONFIRMATIONS";
  } else if (carpool.confirmedCount >= carpool.targetGroupSize) {
    // Ready to lock, but don't auto-lock (creator must lock)
    carpool.status = "PENDING_CONFIRMATIONS";
  }

  return carpool;
}

export function unconfirmParticipant(carpoolId: string, userId: string): CarpoolThread | null {
  const carpool = getCarpoolById(carpoolId);
  if (!carpool) return null;

  const participant = carpool.participants.find(p => p.userId === userId);
  if (!participant || !participant.confirmedAt) return carpool;

  // Can't unconfirm if status is CONFIRMED (locked)
  if (carpool.status === "CONFIRMED") {
    return carpool;
  }

  participant.confirmedAt = undefined;
  carpool.confirmedCount = carpool.participants.filter(p => p.confirmedAt).length;
  carpool.updatedAt = new Date().toISOString();

  // Update status
  if (carpool.confirmedCount === 0) {
    carpool.status = "OPEN";
  } else {
    carpool.status = "PENDING_CONFIRMATIONS";
  }

  return carpool;
}

export function lockCarpool(carpoolId: string, creatorId: string): CarpoolThread | null {
  const carpool = getCarpoolById(carpoolId);
  if (!carpool || carpool.creatorId !== creatorId) return null;

  if (carpool.status !== "PENDING_CONFIRMATIONS" && carpool.status !== "OPEN") {
    return null; // Can only lock from these states
  }

  const now = new Date().toISOString();
  carpool.status = "CONFIRMED";
  carpool.lockedAt = now;
  carpool.updatedAt = now;

  return carpool;
}

export function cancelCarpool(carpoolId: string, creatorId: string): CarpoolThread | null {
  const carpool = getCarpoolById(carpoolId);
  if (!carpool || carpool.creatorId !== creatorId) return null;

  const now = new Date().toISOString();
  carpool.status = "CANCELED";
  carpool.canceledAt = now;
  carpool.updatedAt = now;

  return carpool;
}

// Message operations

export function getMessagesByCarpoolId(carpoolId: string): CarpoolMessage[] {
  return messages.filter(m => m.carpoolId === carpoolId).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function addMessage(carpoolId: string, userId: string, content: string): CarpoolMessage {
  const now = new Date().toISOString();
  const message: CarpoolMessage = {
    id: generateMessageId(),
    carpoolId,
    userId,
    content: content.trim(),
    createdAt: now
  };

  messages.push(message);
  return message;
}

// Filtering and sorting helpers

export function filterCarpools(
  carpools: CarpoolThread[],
  filters: {
    status?: CarpoolStatus[];
    destination?: string;
    date?: string;
  }
): CarpoolThread[] {
  return carpools.filter(c => {
    if (filters.status && !filters.status.includes(c.status)) return false;
    if (filters.destination && !c.destination.toLowerCase().includes(filters.destination.toLowerCase())) return false;
    if (filters.date && c.date !== filters.date) return false;
    return true;
  });
}

export function sortCarpoolsBySoonest(carpools: CarpoolThread[]): CarpoolThread[] {
  return [...carpools].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.timeWindow.start.localeCompare(b.timeWindow.start);
  });
}

