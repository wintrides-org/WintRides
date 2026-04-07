ALTER TABLE "RideRequest" RENAME COLUMN "riderId" TO "requesterId";

CREATE TABLE "RideRequestParticipant" (
    "id" TEXT NOT NULL,
    "rideRequestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RideRequestParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RideRequestParticipant_rideRequestId_userId_key" ON "RideRequestParticipant"("rideRequestId", "userId");
CREATE INDEX "RideRequestParticipant_rideRequestId_idx" ON "RideRequestParticipant"("rideRequestId");
CREATE INDEX "RideRequestParticipant_userId_idx" ON "RideRequestParticipant"("userId");

ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_requesterId_fkey"
FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RideRequestParticipant" ADD CONSTRAINT "RideRequestParticipant_rideRequestId_fkey"
FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RideRequestParticipant" ADD CONSTRAINT "RideRequestParticipant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RideRequestParticipant" ("id", "rideRequestId", "userId", "isPrimaryContact", "joinedAt")
SELECT gen_random_uuid()::text, "id", "requesterId", true, "createdAt"
FROM "RideRequest";
