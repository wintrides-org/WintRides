-- CreateEnum
CREATE TYPE "CarpoolStatus" AS ENUM ('OPEN', 'PENDING_CONFIRMATIONS', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Carpool" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timeStart" TEXT NOT NULL,
    "timeEnd" TEXT NOT NULL,
    "pickupArea" TEXT NOT NULL,
    "seatsNeeded" INTEGER NOT NULL,
    "targetGroupSize" INTEGER NOT NULL,
    "status" "CarpoolStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "Carpool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarpoolParticipant" (
    "id" TEXT NOT NULL,
    "carpoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "isCreator" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CarpoolParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarpoolMessage" (
    "id" TEXT NOT NULL,
    "carpoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarpoolMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Carpool_status_idx" ON "Carpool"("status");

-- CreateIndex
CREATE INDEX "Carpool_date_idx" ON "Carpool"("date");

-- CreateIndex
CREATE INDEX "Carpool_destination_idx" ON "Carpool"("destination");

-- CreateIndex
CREATE INDEX "Carpool_creatorId_idx" ON "Carpool"("creatorId");

-- CreateIndex
CREATE INDEX "CarpoolParticipant_userId_idx" ON "CarpoolParticipant"("userId");

-- CreateIndex
CREATE INDEX "CarpoolParticipant_carpoolId_idx" ON "CarpoolParticipant"("carpoolId");

-- CreateIndex
CREATE UNIQUE INDEX "CarpoolParticipant_carpoolId_userId_key" ON "CarpoolParticipant"("carpoolId", "userId");

-- CreateIndex
CREATE INDEX "CarpoolMessage_carpoolId_idx" ON "CarpoolMessage"("carpoolId");

-- CreateIndex
CREATE INDEX "CarpoolMessage_createdAt_idx" ON "CarpoolMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "CarpoolParticipant" ADD CONSTRAINT "CarpoolParticipant_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "Carpool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarpoolMessage" ADD CONSTRAINT "CarpoolMessage_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "Carpool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
