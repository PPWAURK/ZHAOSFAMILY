import { BadRequestException } from '@nestjs/common';

const PARIS_TIME_ZONE = 'Europe/Paris';

export type PlatformMonthRange = {
  month: string;
  startsAt: Date;
  endsAt: Date;
};

function getParisPart(date: Date, part: 'year' | 'month'): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);

  return Number(parts.find((item) => item.type === part)?.value);
}

function createUtcMonthStart(
  year: number,
  monthIndex: number,
  hour: number,
): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, 1);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

function getParisMonthStart(year: number, monthIndex: number): Date {
  const probe = createUtcMonthStart(year, monthIndex, 12);
  const offsetLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: PARIS_TIME_ZONE,
    timeZoneName: 'shortOffset',
  })
    .formatToParts(probe)
    .find((part) => part.type === 'timeZoneName')?.value;
  const offset = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offsetLabel ?? '');

  if (!offset) {
    throw new Error('PARIS_TIME_ZONE_OFFSET_UNAVAILABLE');
  }

  const sign = offset[1] === '+' ? 1 : -1;
  const minutes = Number(offset[2]) * 60 + Number(offset[3] ?? 0);
  return new Date(
    createUtcMonthStart(year, monthIndex, 0).getTime() -
      sign * minutes * 60_000,
  );
}

export function createPlatformMonthRange(month?: string): PlatformMonthRange {
  const now = new Date();
  const resolvedMonth =
    month ??
    `${getParisPart(now, 'year')}-${String(getParisPart(now, 'month')).padStart(2, '0')}`;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(resolvedMonth)) {
    throw new BadRequestException('MONTH_INVALID');
  }

  const [year, monthNumber] = resolvedMonth.split('-').map(Number);
  return {
    month: resolvedMonth,
    startsAt: getParisMonthStart(year, monthNumber - 1),
    endsAt: getParisMonthStart(year, monthNumber),
  };
}
