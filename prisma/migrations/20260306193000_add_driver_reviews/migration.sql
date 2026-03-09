ALTER TABLE "DriverInfo"
ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ratingSum" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "RideRequest"
ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "DriverReview" (
    "id" TEXT NOT NULL,
    "rideRequestId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "reviewText" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DriverReview_rideRequestId_key" ON "DriverReview"("rideRequestId");
CREATE INDEX "DriverReview_driverId_createdAt_idx" ON "DriverReview"("driverId", "createdAt");
CREATE INDEX "DriverReview_riderId_createdAt_idx" ON "DriverReview"("riderId", "createdAt");

ALTER TABLE "DriverReview"
ADD CONSTRAINT "DriverReview_rideRequestId_fkey" FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverReview"
ADD CONSTRAINT "DriverReview_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverReview"
ADD CONSTRAINT "DriverReview_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
