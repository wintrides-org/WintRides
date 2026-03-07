-- Stores one Stripe connected account mapping per local user (driver/seller).
CREATE TABLE "StripeConnectedAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StripeConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- Stores each platform-level Stripe product and which connected account receives funds.
CREATE TABLE "StripeProductMapping" (
  "id" TEXT NOT NULL,
  "stripeProductId" TEXT NOT NULL,
  "stripePriceId" TEXT NOT NULL,
  "connectedAccountId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StripeProductMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeConnectedAccount_userId_key" ON "StripeConnectedAccount"("userId");
CREATE UNIQUE INDEX "StripeConnectedAccount_stripeAccountId_key" ON "StripeConnectedAccount"("stripeAccountId");
CREATE UNIQUE INDEX "StripeProductMapping_stripeProductId_key" ON "StripeProductMapping"("stripeProductId");
CREATE INDEX "StripeProductMapping_connectedAccountId_idx" ON "StripeProductMapping"("connectedAccountId");
CREATE INDEX "StripeProductMapping_createdByUserId_idx" ON "StripeProductMapping"("createdByUserId");

ALTER TABLE "StripeConnectedAccount"
ADD CONSTRAINT "StripeConnectedAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeProductMapping"
ADD CONSTRAINT "StripeProductMapping_connectedAccountId_fkey"
FOREIGN KEY ("connectedAccountId") REFERENCES "StripeConnectedAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeProductMapping"
ADD CONSTRAINT "StripeProductMapping_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
