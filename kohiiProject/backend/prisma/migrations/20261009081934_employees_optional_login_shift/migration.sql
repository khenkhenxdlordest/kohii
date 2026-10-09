-- CreateEnum
CREATE TYPE "StaffShift" AS ENUM ('AM', 'PM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "shift" "StaffShift",
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL,
ALTER COLUMN "role" DROP NOT NULL;
