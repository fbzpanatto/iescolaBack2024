import cors from "cors";
import { RequestHandler } from "express";
import { frontUrlKey } from "../utils/env";

export const allowedFrontOrigin = (env: NodeJS.ProcessEnv = process.env): string => new URL(env[frontUrlKey(env)] as string).origin

export const corsMiddleware = (env: NodeJS.ProcessEnv = process.env): RequestHandler => cors({ origin: allowedFrontOrigin(env), optionsSuccessStatus: 200 })
