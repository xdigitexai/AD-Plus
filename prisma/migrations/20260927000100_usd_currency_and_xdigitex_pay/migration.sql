-- Switch the application currency to USD and add Xdigitex Pay payment state.

-- AlterTable defaults
ALTER TABLE "Workspace" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "Campaign" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "Plan" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- Existing EUR rows follow the new currency
UPDATE "Workspace" SET "currency" = 'USD' WHERE "currency" = 'EUR';
UPDATE "Campaign" SET "currency" = 'USD' WHERE "currency" = 'EUR';
UPDATE "Plan" SET "currency" = 'USD' WHERE "currency" = 'EUR';
UPDATE "Payment" SET "currency" = 'USD' WHERE "currency" = 'EUR';
UPDATE "Invoice" SET "currency" = 'USD' WHERE "currency" = 'EUR';
UPDATE "ConversionEvent" SET "currency" = 'USD' WHERE "currency" = 'EUR';
UPDATE "ExternalAdAccount" SET "currency" = 'USD' WHERE "currency" = 'EUR';

-- AlterTable Payment: gateway state
ALTER TABLE "Payment"
    ADD COLUMN "gateway" TEXT,
    ADD COLUMN "providerStatus" TEXT,
    ADD COLUMN "fee" DECIMAL(14,2),
    ADD COLUMN "netAmount" DECIMAL(14,2),
    ADD COLUMN "phone" TEXT,
    ADD COLUMN "redirectUrl" TEXT;

-- CreateIndex
CREATE INDEX "Payment_provider_status_idx" ON "Payment"("provider", "status");

-- CreateTable PaymentEvent (idempotency ledger for provider webhooks)
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" TEXT NOT NULL,
    "providerReference" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "fee" DECIMAL(14,2),
    "netAmount" DECIMAL(14,2),
    "currency" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_provider_providerReference_event_key" ON "PaymentEvent"("provider", "providerReference", "event");

-- CreateIndex
CREATE INDEX "PaymentEvent_providerReference_idx" ON "PaymentEvent"("providerReference");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
