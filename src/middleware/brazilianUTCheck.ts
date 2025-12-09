import { NextFunction, Request, Response } from "express";

export function checkDatetime (req: Request, res: Response, next: NextFunction) {
  const OPENING_TIME = 7;
  const CLOSING_TIME = 18;
  const TIME_ZONE = 'America/Sao_Paulo';

  const now = new Date();

  const options: Intl.DateTimeFormatOptions = {
    timeZone: TIME_ZONE,
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric'
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);

  // Helper simples para extrair valores
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value;

  const weekdayName = getPart('weekday'); // Ex: "Sat" ou "Sun"
  const hourString = getPart('hour');
  const minuteString = getPart('minute');

  // Conversão segura para número
  const hourInBrazil = parseInt(hourString || '0', 10);
  const minuteInBrazil = parseInt(minuteString || '0', 10);

  // Lógica de Fim de Semana baseada na String (Garantido pelo en-US)
  if (weekdayName === 'Sat' || weekdayName === 'Sun') {
    return res.status(403).json({ status: 403, message: 'Sábados e Domingos bloqueados.'});
  }

  const minutesOfDay = (hourInBrazil * 60) + minuteInBrazil;
  const startAllowed = OPENING_TIME * 60;
  const permittedEnd = CLOSING_TIME * 60;

  if (minutesOfDay < startAllowed || minutesOfDay >= permittedEnd) {
    return res.status(403).json({
      status: 403,
      message: 'Fora do horário permitido.',
      server_time_br: `${hourInBrazil}:${minuteInBrazil}`
    });
  }

  next();
};