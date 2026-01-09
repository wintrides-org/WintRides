-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('IMMEDIATE', 'SCHEDULED', 'GROUP');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'OPEN', 'MATCHED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RideRequest" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "pickupLabel" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "dropoffLabel" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "pickupNotes" TEXT,
    "partySize" INTEGER NOT NULL,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "carsNeeded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideRequest_status_idx" ON "RideRequest"("status");

-- CreateIndex
CREATE INDEX "RideRequest_pickupAt_idx" ON "RideRequest"("pickupAt");
