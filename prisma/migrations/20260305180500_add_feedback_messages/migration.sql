-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('ISSUE', 'IDEA');

-- CreateTable
CREATE TABLE "FeedbackMessage" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "kind" "FeedbackKind" NOT NULL,
    "pagePath" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackMessage_createdById_createdAt_idx" ON "FeedbackMessage"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackMessage_kind_createdAt_idx" ON "FeedbackMessage"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackMessage_createdAt_idx" ON "FeedbackMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
