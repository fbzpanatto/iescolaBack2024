const RA_ALLOWED_CHARS = /[^0-9xX]/g;
const NON_DIGITS = /\D+/;

/** Mantém só dígitos e o DV 'X' (maiúsculo): "125.294.418-4 " -> "1252944184". */
export function sanitizeStudentRa(raw: string): string {
  return raw.replace(RA_ALLOWED_CHARS, '').toUpperCase();
}

/**
 * Converte formatos comuns para DD/MM/AAAA:
 * "27/7/2019", "27-07-2019", "27.07.2019", "27072019", "2019-07-27", "20190727".
 * Se não reconhecer o formato, devolve o valor original sem espaços nas pontas.
 */
export function sanitizeBirthDate(raw: string): string {
  const value = raw.trim();
  const parts = value.split(NON_DIGITS).filter(Boolean);

  if (parts.length === 3) {
    const [first, second, third] = parts;
    return first.length === 4 ? format(third, second, first) : format(first, second, third);
  }

  if (parts.length === 1 && parts[0].length === 8) {
    const digits = parts[0];
    const monthIfYearFirst = Number(digits.slice(4, 6));
    const isYearFirst =
      Number(digits.slice(4, 8)) < 1900 &&
      Number(digits.slice(0, 4)) >= 1900 &&
      monthIfYearFirst >= 1 && monthIfYearFirst <= 12;
    return isYearFirst
      ? format(digits.slice(6, 8), digits.slice(4, 6), digits.slice(0, 4))
      : format(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8));
  }

  return value;
}

function format(day: string, month: string, year: string): string {
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}
