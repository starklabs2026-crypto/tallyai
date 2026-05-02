-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "LedgerNature" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('SALES', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('DEBTOR', 'CREDITOR', 'BOTH');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tallyCompanyName" TEXT,
    "syncToken" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SyncStatus" NOT NULL,
    "recordsUpserted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nature" "LedgerNature" NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "narration" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "partyName" TEXT,
    "ledgerEntries" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,
    "type" "PartyType" NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(18,2),
    "creditDays" INTEGER,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutstandingBill" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "amount" DECIMAL(18,2) NOT NULL,
    "pendingAmount" DECIMAL(18,2) NOT NULL,
    "type" "BillType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutstandingBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT,
    "unit" TEXT,
    "openingQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "closingQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "rate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_syncToken_key" ON "Company"("syncToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "SyncLog_companyId_syncedAt_idx" ON "SyncLog"("companyId", "syncedAt");

-- CreateIndex
CREATE INDEX "Ledger_companyId_asOfDate_idx" ON "Ledger"("companyId", "asOfDate");

-- CreateIndex
CREATE INDEX "Ledger_companyId_nature_idx" ON "Ledger"("companyId", "nature");

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_companyId_name_key" ON "Ledger"("companyId", "name");

-- CreateIndex
CREATE INDEX "Voucher_companyId_date_idx" ON "Voucher"("companyId", "date");

-- CreateIndex
CREATE INDEX "Voucher_companyId_voucherType_date_idx" ON "Voucher"("companyId", "voucherType", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_companyId_voucherNumber_key" ON "Voucher"("companyId", "voucherNumber");

-- CreateIndex
CREATE INDEX "Party_companyId_asOfDate_idx" ON "Party"("companyId", "asOfDate");

-- CreateIndex
CREATE INDEX "Party_companyId_type_idx" ON "Party"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Party_companyId_name_key" ON "Party"("companyId", "name");

-- CreateIndex
CREATE INDEX "OutstandingBill_companyId_type_dueDate_idx" ON "OutstandingBill"("companyId", "type", "dueDate");

-- CreateIndex
CREATE INDEX "OutstandingBill_companyId_partyId_idx" ON "OutstandingBill"("companyId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "OutstandingBill_companyId_billNumber_type_key" ON "OutstandingBill"("companyId", "billNumber", "type");

-- CreateIndex
CREATE INDEX "StockItem_companyId_asOfDate_idx" ON "StockItem"("companyId", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_companyId_name_key" ON "StockItem"("companyId", "name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutstandingBill" ADD CONSTRAINT "OutstandingBill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutstandingBill" ADD CONSTRAINT "OutstandingBill_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
