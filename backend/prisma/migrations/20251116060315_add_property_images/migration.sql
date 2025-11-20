-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "images" TEXT[];

-- CreateIndex
CREATE INDEX "Property_images_idx" ON "Property"("images");
