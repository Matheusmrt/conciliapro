-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpira" TIMESTAMP(3);
