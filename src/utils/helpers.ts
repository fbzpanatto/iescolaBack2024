

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'HttpError'; }
}

export class Helper {

  static generateRandomCode(length: number = 8): string {

    const CHARACTERS_SAFE = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

    const charsLength = CHARACTERS_SAFE.length;
    const middle = Math.floor(length / 2);

    const randomString = Array.from({ length: length }, () => {
      const randomIndex = Math.floor(Math.random() * charsLength);
      return CHARACTERS_SAFE.charAt(randomIndex);
    }).join('');

    return randomString.slice(0, middle) + '-' + randomString.slice(middle);
  }

  static generateDateTime(expiresInHours: number = 72, options: Intl.DateTimeFormatOptions = {timeZone: 'America/Sao_Paulo', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'}) {

    const formatter = new Intl.DateTimeFormat('en-US', options);

    const formatToSql = (date: Date): string => {
      const parts = formatter.formatToParts(date);

      const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '00';

      const year = getPart('year');
      const month = getPart('month');
      const day = getPart('day');
      const hour = getPart('hour');
      const minute = getPart('minute');
      const second = getPart('second');

      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    };

    const now = new Date();
    const expirationDate = new Date(now.getTime() + (expiresInHours * 60 * 60 * 1000));

    return { createdAt: formatToSql(now), expiresAt: formatToSql(expirationDate) };
  }

  static parseQueryParam(value: any) {
    if (value === 'null' || value === undefined || value === '') {
      return null;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  };

  // Converte string SQL crua ("YYYY-MM-DD HH:MM:SS") em Date, assumindo UTC —
  // mesma convenção usada no resto do projeto (o pool grava sem deslocamento).
  static toUtcDate(value: string | null | undefined): Date | null {
    if (!value) { return null }
    return new Date(value.replace(' ', 'T') + 'Z')
  }

  static parseDDMMYYYYtoEndOfDayUTC(dateString: string): Date {
    const [day, month, year] = dateString.split('/');

    const numYear = Number(year);
    const numMonth = Number(month); // O mês vem como 1-12
    const numDay = Number(day);

    // O construtor do Date.UTC espera o mês como 0-11, por isso "numMonth - 1"
    return new Date(Date.UTC(numYear, numMonth - 1, numDay, 23, 59, 59));
  }

  static formatDateToDDMMYYYY(dateObject: Date): string {

    // 1. Pega os componentes da data USANDO UTC
    const day = dateObject.getUTCDate();
    const month = dateObject.getUTCMonth() + 1; // +1 porque meses são 0-11
    const year = dateObject.getUTCFullYear();

    // 2. Formata para ter "0" à esquerda (ex: 01, 05, 10)
    // O .padStart(2, '0') garante que o número tenha 2 dígitos
    const dayString = String(day).padStart(2, '0');
    const monthString = String(month).padStart(2, '0');

    // 3. Monta a string final
    return `${dayString}/${monthString}/${year}`;
  }
}