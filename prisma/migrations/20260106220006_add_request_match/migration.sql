ALTER TABLE "RideRequest"
ADD COLUMN "acceptedDriverId" TEXT,
ADD COLUMN "matchedAt" TIMESTAMP(3);

CREATE INDEX "RideRequest_acceptedDriverId_idx" ON "RideRequest"("acceptedDriverId");
