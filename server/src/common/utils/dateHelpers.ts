export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

export function startOfVietnamCalendarDay(date: Date): Date {
  const vietnamDate = addHours(date, 7);
  return new Date(Date.UTC(vietnamDate.getUTCFullYear(), vietnamDate.getUTCMonth(), vietnamDate.getUTCDate(), 0, 0, 0, 0));
}

export function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
