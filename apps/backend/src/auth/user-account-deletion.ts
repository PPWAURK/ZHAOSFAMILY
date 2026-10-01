import type { PrismaClient } from '@prisma/client';

export async function deleteUserAccountRecords(
  prisma: PrismaClient,
  userId: number,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // Legacy tables have no Prisma relation, so their user references need
      // explicit cleanup before deleting the account.
      await tx.user.updateMany({
        where: { accountReviewedByUserId: userId },
        data: { accountReviewedByUserId: null },
      });
      await tx.abcStoreInspection.updateMany({
        where: { inspectedByUserId: userId },
        data: { inspectedByUserId: null },
      });
      await tx.abcInspectionMedia.updateMany({
        where: { uploadedByUserId: userId },
        data: { uploadedByUserId: null },
      });
      await tx.inventoryMovement.updateMany({
        where: { userId },
        data: { userId: null },
      });
      await tx.waitingQueueEntry.updateMany({
        where: { createdByUserId: userId },
        data: { createdByUserId: null },
      });
      await tx.legacyDocument.updateMany({
        where: { uploadedByUserId: userId },
        data: { uploadedByUserId: null },
      });
      await tx.legacyNewsPost.updateMany({
        where: { createdByUserId: userId },
        data: { createdByUserId: null },
      });
      await tx.legacyRecruitmentRequest.updateMany({
        where: { createdByUserId: userId },
        data: { createdByUserId: null },
      });
      await tx.legacyRecruitmentRequest.updateMany({
        where: { processedByUserId: userId },
        data: { processedByUserId: null },
      });
      await tx.legacyEmailVerificationToken.deleteMany({ where: { userId } });
      await tx.legacyPasswordResetToken.deleteMany({ where: { userId } });
      await tx.legacyNewsPostRead.deleteMany({ where: { userId } });
      await tx.legacyUserManagedRestaurant.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 30_000 },
  );
}
