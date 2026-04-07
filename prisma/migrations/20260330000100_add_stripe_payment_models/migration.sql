CREATE TYPE "PaymentMethodStatus" AS ENUM ('NONE', 'READY', 'REQUIRES_ACTION', 'ERRORED');
CREATE TYPE "RidePaymentStatus" AS ENUM (
  'PAYMENT_METHOD_MISSING',
  'PENDING_AUTHORIZATION',
  'AUTHORIZATION_SCHEDULED',
  'AUTHORIZED',
  'CAPTURE_PENDING',
  'CAPTURED',
  'CANCELED',
  'REFUNDED',
  'TRANSFER_PENDING',
  'TRANSFERRED',
  'FAILED'
);

ALTER TABLE "User"
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "defaultPaymentMethodId" TEXT,
ADD COLUMN "paymentMethodStatus" "PaymentMethodStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN "paymentMethodBrand" TEXT,
ADD COLUMN "paymentMethodLast4" TEXT,
ADD COLUMN "paymentMethodExpMonth" INTEGER,
ADD COLUMN "paymentMethodExpYear" INTEGER,
ADD COLUMN "stripeConnectedAccountId" TEXT,
ADD COLUMN "stripeConnectOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stripeConnectPayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RideRequest"
ADD COLUMN "carpoolId" TEXT,
ADD COLUMN "quotedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'usd',
ADD COLUMN "paymentAuthorizationDueAt" TIMESTAMP(3),
ADD COLUMN "paymentReadyAt" TIMESTAMP(3);

CREATE TABLE "RidePayment" (
  "id" TEXT NOT NULL,
  "rideRequestId" TEXT NOT NULL,
  "riderId" TEXT NOT NULL,
  "carpoolId" TEXT,
  "status" "RidePaymentStatus" NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "paymentIntentId" TEXT,
  "transferId" TEXT,
  "authorizationScheduledFor" TIMESTAMP(3),
  "authorizationExpiresAt" TIMESTAMP(3),
  "authorizedAt" TIMESTAMP(3),
  "capturedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "transferredAt" TIMESTAMP(3),
  "lastPaymentError" TEXT,
  "cancellationFeeAmount" INTEGER,
  "capturedAmount" INTEGER,
  "transferAmount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RidePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeConnectedAccountId_key" ON "User"("stripeConnectedAccountId");
CREATE UNIQUE INDEX "RideRequest_carpoolId_key" ON "RideRequest"("carpoolId");
CREATE UNIQUE INDEX "RidePayment_paymentIntentId_key" ON "RidePayment"("paymentIntentId");
CREATE UNIQUE INDEX "RidePayment_transferId_key" ON "RidePayment"("transferId");
CREATE UNIQUE INDEX "RidePayment_rideRequestId_riderId_key" ON "RidePayment"("rideRequestId", "riderId");
CREATE INDEX "RideRequest_riderId_idx" ON "RideRequest"("riderId");
CREATE INDEX "RideRequest_acceptedDriverId_idx" ON "RideRequest"("acceptedDriverId");
CREATE INDEX "RidePayment_status_idx" ON "RidePayment"("status");
CREATE INDEX "RidePayment_authorizationScheduledFor_idx" ON "RidePayment"("authorizationScheduledFor");
CREATE INDEX "RidePayment_riderId_idx" ON "RidePayment"("riderId");
CREATE INDEX "RidePayment_carpoolId_idx" ON "RidePayment"("carpoolId");

ALTER TABLE "RideRequest"
ADD CONSTRAINT "RideRequest_riderId_fkey"
FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RideRequest"
ADD CONSTRAINT "RideRequest_acceptedDriverId_fkey"
FOREIGN KEY ("acceptedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RideRequest"
ADD CONSTRAINT "RideRequest_carpoolId_fkey"
FOREIGN KEY ("carpoolId") REFERENCES "Carpool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RidePayment"
ADD CONSTRAINT "RidePayment_rideRequestId_fkey"
FOREIGN KEY ("rideRequestId") REFERENCES "RideRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RidePayment"
ADD CONSTRAINT "RidePayment_riderId_fkey"
FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RidePayment"
ADD CONSTRAINT "RidePayment_carpoolId_fkey"
FOREIGN KEY ("carpoolId") REFERENCES "Carpool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
