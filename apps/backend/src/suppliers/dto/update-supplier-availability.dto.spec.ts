import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateSupplierAvailabilityDto } from './update-supplier-availability.dto';

describe('UpdateSupplierAvailabilityDto', () => {
  it('accepts an empty selected restaurant list', async () => {
    const dto = plainToInstance(UpdateSupplierAvailabilityDto, {
      scope: 'selected',
      restaurantIds: [],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects duplicate restaurant ids', async () => {
    const dto = plainToInstance(UpdateSupplierAvailabilityDto, {
      scope: 'selected',
      restaurantIds: [2, 2],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'restaurantIds')).toBe(
      true,
    );
  });

  it('rejects an unsupported scope', async () => {
    const dto = plainToInstance(UpdateSupplierAvailabilityDto, {
      scope: 'future',
      restaurantIds: [],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'scope')).toBe(true);
  });
});
