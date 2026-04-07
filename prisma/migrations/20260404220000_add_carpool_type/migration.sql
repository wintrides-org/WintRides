CREATE TYPE "CarpoolType" AS ENUM ('RIDER', 'DRIVER');

ALTER TABLE "Carpool"
ADD COLUMN "carpoolType" "CarpoolType" NOT NULL DEFAULT 'RIDER';
