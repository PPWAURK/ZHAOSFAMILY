import { RecipesService } from './recipes.service';

describe('RecipesService', () => {
  const findMany = jest.fn();
  const prismaService = {
    recipe: {
      findMany,
    },
  };
  const service = new RecipesService(prismaService as never);

  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it('limits an employee to published recipes assigned to their job role', async () => {
    await service.list(
      {
        id: 1,
        jobRole: 'front-cashier,front-packer',
        permissions: [],
      },
      {},
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'published',
          jobRoles: {
            some: {
              jobRole: { in: ['front-cashier', 'front-packer'] },
            },
          },
        },
      }),
    );
  });

  it('allows management roles to list draft and published recipes', async () => {
    await service.list(
      {
        id: 2,
        jobRole: 'store-manager',
        permissions: [],
      },
      {},
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });

  it('allows system administrators to list every recipe', async () => {
    await service.list(
      {
        id: 3,
        jobRole: 'front-cashier',
        permissions: ['system.permission.manage'],
      },
      {},
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
  });
});
