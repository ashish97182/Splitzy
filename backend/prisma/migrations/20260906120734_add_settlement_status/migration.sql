/*
  Warnings:

  - Added the required column `status` to the `settlements` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "settlements" ADD COLUMN     "status" VARCHAR NOT NULL;
