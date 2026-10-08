import 'reflect-metadata';
import { validate } from 'class-validator';
import { RecordInspectionDto } from './fill-operations-score.dto';

describe('RecordInspectionDto', () => {
  it('accepts the quarterly S grade', async () => {
    const dto = Object.assign(new RecordInspectionDto(), { grade: 'S' });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an unsupported grade', async () => {
    const dto = Object.assign(new RecordInspectionDto(), { grade: 'D' });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints).toEqual(
      expect.objectContaining({ isIn: 'INVALID_GRADE' }),
    );
  });
});
