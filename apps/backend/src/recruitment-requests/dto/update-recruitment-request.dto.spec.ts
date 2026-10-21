import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRecruitmentRequestDto } from './update-recruitment-request.dto';

async function validatePublication(value: unknown): Promise<string[]> {
  const dto = plainToInstance(UpdateRecruitmentRequestDto, {
    isPublished: value,
  });
  const errors = await validate(dto);

  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('UpdateRecruitmentRequestDto', () => {
  it('accepts publication and withdrawal values', async () => {
    expect(await validatePublication(true)).toEqual([]);
    expect(await validatePublication(false)).toEqual([]);
  });

  it('rejects null and non-boolean publication values', async () => {
    expect(await validatePublication(null)).not.toEqual([]);
    expect(await validatePublication('true')).not.toEqual([]);
  });
});
