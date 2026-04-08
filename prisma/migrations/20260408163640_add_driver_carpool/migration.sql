-- DropForeignKey
ALTER TABLE "RideRequest" DROP CONSTRAINT "RideRequest_riderId_fkey";

-- RenameIndex
ALTER INDEX "RideRequest_riderId_idx" RENAME TO "RideRequest_requesterId_idx";
