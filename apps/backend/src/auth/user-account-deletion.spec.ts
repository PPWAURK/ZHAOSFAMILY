import { deleteUserAccountRecords } from './user-account-deletion';

describe('deleteUserAccountRecords', () => {
  function createPrisma() {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const deleteUser = jest.fn().mockResolvedValue({ id: 42 });
    const tx = {
      user: { updateMany, delete: deleteUser },
      abcStoreInspection: { updateMany },
      abcInspectionMedia: { updateMany },
      inventoryMovement: { updateMany },
      waitingQueueEntry: { updateMany },
      legacyDocument: { updateMany },
      legacyNewsPost: { updateMany },
      legacyRecruitmentRequest: { updateMany },
      legacyEmailVerificationToken: { deleteMany },
      legacyPasswordResetToken: { deleteMany },
      legacyNewsPostRead: { deleteMany },
      legacyUserManagedRestaurant: { deleteMany },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<void>) => callback(tx),
      ),
    };
    return { prisma, tx, deleteUser };
  }

  it('removes account references and the user in one transaction while retaining history', async () => {
    const { prisma, tx, deleteUser } = createPrisma();

    await deleteUserAccountRecords(prisma as never, 42);

    expect(tx.legacyNewsPost.updateMany).toHaveBeenCalledWith({
      where: { createdByUserId: 42 },
      data: { createdByUserId: null },
    });
    expect(tx.legacyRecruitmentRequest.updateMany).toHaveBeenCalledWith({
      where: { processedByUserId: 42 },
      data: { processedByUserId: null },
    });
    expect(tx.legacyEmailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 42 },
    });
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: 42 } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('propagates deletion failure so the caller cannot report success', async () => {
    const { prisma, deleteUser } = createPrisma();
    deleteUser.mockRejectedValueOnce(new Error('foreign key conflict'));

    await expect(deleteUserAccountRecords(prisma as never, 42)).rejects.toThrow(
      'foreign key conflict',
    );
  });
});
