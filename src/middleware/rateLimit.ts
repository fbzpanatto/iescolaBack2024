import { Request, Response } from "express";
import { rateLimit, RateLimitExceededEventHandler, RateLimitRequestHandler } from "express-rate-limit";

export const TOO_MANY_ATTEMPTS_MESSAGE = 'Muitas tentativas. Tente novamente em alguns minutos.'

const FIFTEEN_MINUTES = 15 * 60 * 1000
const ONE_HOUR = 60 * 60 * 1000

const emailKey = (req: Request): string => String(req.body?.email ?? '').trim().toLowerCase()

const tooManyAttempts: RateLimitExceededEventHandler = (_req, res, _next, options) => {
  res.status(options.statusCode).json({ status: options.statusCode, message: TOO_MANY_ATTEMPTS_MESSAGE })
}

const isNotClientError = (_req: Request, res: Response): boolean => res.statusCode < 400 || res.statusCode >= 500

export const loginLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  keyGenerator: emailKey,
  skipSuccessfulRequests: true,
  requestWasSuccessful: isNotClientError,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooManyAttempts
})

export const resetPasswordLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: ONE_HOUR,
  limit: 5,
  keyGenerator: emailKey,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooManyAttempts
})
