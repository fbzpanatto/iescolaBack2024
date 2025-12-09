import { NextFunction, Request, Response } from "express";

export default function (req: Request, res: Response, next: NextFunction) {
  const OPENING_TIME = 8;
  const CLOSING_TIME = 22;
  const TIME_ZONE = 'America/Sao_Paulo';

  const CURRENT_DATETIME = new Date();

  const brazilianDateTime = CURRENT_DATETIME.toLocaleString('en-US', { timeZone: TIME_ZONE });

  const brazilianDate = new Date(brazilianDateTime);

  const weekDay = brazilianDate.getDay();
  const currentHour = brazilianDate.getHours();
  const currentMinutes = brazilianDate.getMinutes();

  if (weekDay === 0 || weekDay === 6) {
    return res.status(403).json({ status: 403, message: 'Sábados e Domingos bloqueados.'});
  }

  const minutesOfDay = (currentHour * 60) + currentMinutes;
  const startAllowed = OPENING_TIME * 60;
  const permittedEnd = CLOSING_TIME * 60;

  if (minutesOfDay < startAllowed || minutesOfDay >= permittedEnd) {
    return res.status(403).json({ status: 403, message: 'Fora do horário permitido.' });
  }

  next();
};