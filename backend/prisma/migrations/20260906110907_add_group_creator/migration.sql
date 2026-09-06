/*
  Warnings:

  - Added the required column `createdBy` to the `groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `groups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "createdBy" UUID NOT NULL,
ADD COLUMN     "description" VARCHAR NOT NULL;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
