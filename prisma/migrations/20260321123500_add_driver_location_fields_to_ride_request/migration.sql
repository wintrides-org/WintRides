ALTER TABLE "RideRequest"
ADD COLUMN "driverLocationSharingStartedAt" TIMESTAMP(3),
ADD COLUMN "driverLocationLastLat" DOUBLE PRECISION,
ADD COLUMN "driverLocationLastLng" DOUBLE PRECISION,
ADD COLUMN "driverLocationAccuracyMeters" DOUBLE PRECISION,
ADD COLUMN "driverLocationLastSharedAt" TIMESTAMP(3);
