ALTER TABLE "RideRequest"
ADD COLUMN "sourceCarpoolId" TEXT;

CREATE INDEX "RideRequest_sourceCarpoolId_idx" ON "RideRequest"("sourceCarpoolId");

ALTER TABLE "RideRequest"
ADD CONSTRAINT "RideRequest_sourceCarpoolId_fkey"
FOREIGN KEY ("sourceCarpoolId") REFERENCES "Carpool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
