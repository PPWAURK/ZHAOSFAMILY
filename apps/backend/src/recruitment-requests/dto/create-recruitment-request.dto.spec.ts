import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRecruitmentRequestDto } from './create-recruitment-request.dto';

async function validateDto(input: unknown): Promise<string[]> {
  const dto = plainToInstance(CreateRecruitmentRequestDto, input);
  const errors = await validate(dto);

  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreateRecruitmentRequestDto', () => {
  it('accepts valid recruitment request input', async () => {
    const errors = await validateDto({
      contractType: 'full_time',
      position: 'waiter',
      headcount: 1,
      notes: 'Need one person',
    });

    expect(errors).toEqual([]);
  });

  it('rejects invalid contract type, position and headcount', async () => {
    const errors = await validateDto({
      contractType: 'temporary',
      position: 'cashier',
      headcount: 0,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'INVALID_CONTRACT_TYPE',
        'INVALID_RECRUITMENT_POSITION',
        'INVALID_HEADCOUNT',
      ]),
    );
  });
});
