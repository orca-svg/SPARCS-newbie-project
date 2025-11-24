-- CreateIndex
CREATE INDEX `Post_clubId_isNotice_createdAt_idx` ON `Post`(`clubId`, `isNotice`, `createdAt`);
