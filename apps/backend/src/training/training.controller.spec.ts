import * as fs from 'node:fs';
import { TrainingController } from './training.controller';

jest.mock('node:fs', () => ({
  ...jest.requireActual('node:fs'),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
}));

describe('TrainingController.listBadgeSvgFiles', () => {
  it('returns SVG filenames in stable alphabetical order', () => {
    jest.mocked(fs.existsSync).mockReturnValue(true);
    jest.mocked(fs.readdirSync).mockReturnValue([
      'z-badge.svg',
      'notes.txt',
      'a-badge.svg',
    ] as never);
    const controller = Object.create(
      TrainingController.prototype,
    ) as TrainingController;

    expect(controller.listBadgeSvgFiles()).toEqual([
      'a-badge.svg',
      'z-badge.svg',
    ]);

  });
});
