const MEETING_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseMeetingDate(observation: string | null | undefined): string | null {
  if (!observation) { return null }

  const match = MEETING_DATE_PATTERN.exec(observation);
  if (!match) { return null }

  const [, day, month, year] = match;
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) { return null }

  return `${year}-${month}-${day}`;
}
