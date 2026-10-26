// Formata um Date/ISO-string como literal "YYYY-MM-DD HH:MM:SS" usando os componentes UTC,
// ignorando o `timezone` do pool (que só se aplica a parâmetros Date passados ao mysql2 e
// deslocaria a gravação, divergindo do valor cru que o TypeORM sempre gravou).
export function toSqlUtcDateTime(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') { return null }
  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}
