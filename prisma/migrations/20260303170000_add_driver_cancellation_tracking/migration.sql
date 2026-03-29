ALTER TABLE "DriverInfo"
ADD COLUMN "acceptedRidesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "canceledRidesCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "RideRequest"
ADD COLUMN "driverCancelReason" TEXT;
