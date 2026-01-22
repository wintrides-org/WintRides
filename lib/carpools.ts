import { prisma } from "@/lib/prisma";
import type { CarpoolThread, CarpoolStatus, CarpoolMessage } from "@/types/carpool";
import type { Prisma } from "@prisma/client";

type CarpoolWithParticipants = Prisma.CarpoolGetPayload<{
  include: { participants: true };
}>;

type CarpoolMessageRecord = Prisma.CarpoolMessageGetPayload<{}>;

type CreateCarpoolInput = {
  creatorId: string;
  destination: string;
  date: string;
  timeWindow: { start: string; end: string };
  pickupArea: string;
  seatsNeeded: number;
  targetGroupSize: number;
  notes?: string;
  status?: CarpoolStatus;
};

function toIso(value?: Date | null) {
  return value ? value.toISOString() : undefined;
}

function toCarpoolThread(carpool: CarpoolWithParticipants): CarpoolThread {
  const participants = carpool.participants.map((participant) => ({
    userId: participant.userId,
    joinedAt: participant.joinedAt.toISOString(),
    confirmedAt: toIso(participant.confirmedAt),
    isCreator: participant.isCreator
  }));

  const confirmedCount = participants.filter((p) => p.confirmedAt).length;

  return {
    id: carpool.id,
    creatorId: carpool.creatorId,
    destination: carpool.destination,
    date: carpool.date,
    timeWindow: {
      start: carpool.timeStart,
      end: carpool.timeEnd
    },
    pickupArea: carpool.pickupArea,
    seatsNeeded: carpool.seatsNeeded,
    targetGroupSize: carpool.targetGroupSize,
    status: carpool.status as CarpoolStatus,
    participants,
    interestedCount: participants.length,
    confirmedCount,
    notes: carpool.notes ?? undefined,
    createdAt: carpool.createdAt.toISOString(),
    updatedAt: carpool.updatedAt.toISOString(),
    lockedAt: toIso(carpool.lockedAt),
    completedAt: toIso(carpool.completedAt),
    canceledAt: toIso(carpool.canceledAt),
    expiredAt: toIso(carpool.expiredAt)
  };
}

function toCarpoolMessage(message: CarpoolMessageRecord): CarpoolMessage {
  return {
    id: message.id,
    carpoolId: message.carpoolId,
    userId: message.userId,
    content: message.content,
    createdAt: message.createdAt.toISOString()
  };
}

export async function getAllCarpools(): Promise<CarpoolThread[]> {
  const carpools = await prisma.carpool.findMany({
    include: { participants: true }
  });

  return carpools.map(toCarpoolThread);
}

export async function getCarpoolById(id: string): Promise<CarpoolThread | undefined> {
  const carpool = await prisma.carpool.findUnique({
    where: { id },
    include: { participants: true }
  });

  return carpool ? toCarpoolThread(carpool) : undefined;
}

export async function createCarpool(input: CreateCarpoolInput): Promise<CarpoolThread> {
  const now = new Date();
  const carpool = await prisma.carpool.create({
    data: {
      creatorId: input.creatorId,
      destination: input.destination,
      date: input.date,
      timeStart: input.timeWindow.start,
      timeEnd: input.timeWindow.end,
      pickupArea: input.pickupArea,
      seatsNeeded: input.seatsNeeded,
      targetGroupSize: input.targetGroupSize,
      status: input.status ?? "OPEN",
      notes: input.notes,
      participants: {
        create: {
          userId: input.creatorId,
          joinedAt: now,
          confirmedAt: now,
          isCreator: true
        }
      }
    },
    include: { participants: true }
  });

  return toCarpoolThread(carpool);
}

export async function addParticipant(carpoolId: string, userId: string): Promise<CarpoolThread | null> {
  const existing = await prisma.carpoolParticipant.findUnique({
    where: { carpoolId_userId: { carpoolId, userId } }
  });

  if (!existing) {
    await prisma.carpoolParticipant.create({
      data: {
        carpoolId,
        userId,
        isCreator: false
      }
    });
  }

  const confirmedCount = await prisma.carpoolParticipant.count({
    where: { carpoolId, confirmedAt: { not: null } }
  });

  const carpool = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  if (!carpool) return null;

  if (carpool.status === "OPEN" && confirmedCount > 0) {
    await prisma.carpool.update({
      where: { id: carpoolId },
      data: { status: "PENDING_CONFIRMATIONS" }
    });
  }

  const refreshed = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  return refreshed ? toCarpoolThread(refreshed) : null;
}

export async function confirmParticipant(carpoolId: string, userId: string): Promise<CarpoolThread | null> {
  const participant = await prisma.carpoolParticipant.findUnique({
    where: { carpoolId_userId: { carpoolId, userId } }
  });

  if (!participant) return null;

  if (!participant.confirmedAt) {
    await prisma.carpoolParticipant.update({
      where: { carpoolId_userId: { carpoolId, userId } },
      data: { confirmedAt: new Date() }
    });
  }

  const confirmedCount = await prisma.carpoolParticipant.count({
    where: { carpoolId, confirmedAt: { not: null } }
  });

  const carpool = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  if (!carpool) return null;

  if (confirmedCount > 0 && carpool.status === "OPEN") {
    await prisma.carpool.update({
      where: { id: carpoolId },
      data: { status: "PENDING_CONFIRMATIONS" }
    });
  }

  const refreshed = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  return refreshed ? toCarpoolThread(refreshed) : null;
}

export async function unconfirmParticipant(carpoolId: string, userId: string): Promise<CarpoolThread | null> {
  const carpool = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  if (!carpool) return null;

  if (carpool.status === "CONFIRMED") {
    return toCarpoolThread(carpool);
  }

  const participant = carpool.participants.find((p) => p.userId === userId);
  if (!participant || !participant.confirmedAt) {
    return toCarpoolThread(carpool);
  }

  await prisma.carpoolParticipant.update({
    where: { carpoolId_userId: { carpoolId, userId } },
    data: { confirmedAt: null }
  });

  const confirmedCount = await prisma.carpoolParticipant.count({
    where: { carpoolId, confirmedAt: { not: null } }
  });

  const nextStatus = confirmedCount === 0 ? "OPEN" : "PENDING_CONFIRMATIONS";

  await prisma.carpool.update({
    where: { id: carpoolId },
    data: { status: nextStatus }
  });

  const refreshed = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  return refreshed ? toCarpoolThread(refreshed) : null;
}

export async function lockCarpool(carpoolId: string, creatorId: string): Promise<CarpoolThread | null> {
  const carpool = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  if (!carpool || carpool.creatorId !== creatorId) return null;

  if (carpool.status !== "PENDING_CONFIRMATIONS" && carpool.status !== "OPEN") {
    return null;
  }

  const updated = await prisma.carpool.update({
    where: { id: carpoolId },
    data: { status: "CONFIRMED", lockedAt: new Date() },
    include: { participants: true }
  });

  return toCarpoolThread(updated);
}

export async function cancelCarpool(carpoolId: string, creatorId: string): Promise<CarpoolThread | null> {
  const carpool = await prisma.carpool.findUnique({
    where: { id: carpoolId },
    include: { participants: true }
  });

  if (!carpool || carpool.creatorId !== creatorId) return null;

  const updated = await prisma.carpool.update({
    where: { id: carpoolId },
    data: { status: "CANCELED", canceledAt: new Date() },
    include: { participants: true }
  });

  return toCarpoolThread(updated);
}

export async function getMessagesByCarpoolId(carpoolId: string): Promise<CarpoolMessage[]> {
  const messages = await prisma.carpoolMessage.findMany({
    where: { carpoolId },
    orderBy: { createdAt: "asc" }
  });

  return messages.map(toCarpoolMessage);
}

export async function addMessage(carpoolId: string, userId: string, content: string): Promise<CarpoolMessage> {
  const message = await prisma.carpoolMessage.create({
    data: {
      carpoolId,
      userId,
      content: content.trim()
    }
  });

  return toCarpoolMessage(message);
}

export function filterCarpools(
  carpools: CarpoolThread[],
  filters: {
    status?: CarpoolStatus[];
    destination?: string;
    date?: string;
  }
): CarpoolThread[] {
  return carpools.filter((carpool) => {
    if (filters.status && !filters.status.includes(carpool.status)) return false;
    if (filters.destination && !carpool.destination.toLowerCase().includes(filters.destination.toLowerCase())) return false;
    if (filters.date && carpool.date !== filters.date) return false;
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
