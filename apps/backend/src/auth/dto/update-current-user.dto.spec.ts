import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCurrentUserDto } from './update-current-user.dto';

describe('UpdateCurrentUserDto', () => {
  it('accepts a true mobile onboarding completion value', async () => {
    const errors = await validate(
      plainToInstance(UpdateCurrentUserDto, {
        completedMobileOnboarding: true,
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it.each([false, 'true', 1])(
    'rejects %p as a mobile onboarding completion value',
    async (completedMobileOnboarding) => {
      const errors = await validate(
        plainToInstance(UpdateCurrentUserDto, { completedMobileOnboarding }),
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]?.constraints).toMatchObject({
        equals: 'INVALID_MOBILE_ONBOARDING_COMPLETION',
      });
    },
  );
});
