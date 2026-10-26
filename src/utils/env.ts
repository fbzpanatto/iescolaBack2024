type Env = NodeJS.ProcessEnv

export interface EnvCheck { missing: string[], warnings: string[] }

const REQUIRED_NON_EMPTY = ['SECRET', 'SERVER_PORT', 'DB_HOST', 'DB_USER', 'DB_NAME'] as const
const REQUIRED_DEFINED = ['DB_PASS'] as const
const OPTIONAL = ['EMAIL', 'EMAIL_PASS', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'] as const

export const isDevelopmentEnv = (env: Env = process.env): boolean => env.NODE_ENV === 'development'

export const frontUrlKey = (env: Env = process.env): 'FRONT_URL_DEV' | 'FRONT_URL' => isDevelopmentEnv(env) ? 'FRONT_URL_DEV' : 'FRONT_URL'

const resetUrlKey = (env: Env): 'RESET_URL_DEV' | 'RESET_URL' => isDevelopmentEnv(env) ? 'RESET_URL_DEV' : 'RESET_URL'

const isBlank = (value: string | undefined): boolean => value === undefined || value.trim() === ''

const isValidUrl = (value: string): boolean => {
  try { new URL(value); return true }
  catch { return false }
}

export function checkEnv(env: Env = process.env): EnvCheck {
  const missing: string[] = REQUIRED_NON_EMPTY.filter(key => isBlank(env[key]))

  for (const key of REQUIRED_DEFINED) { if (env[key] === undefined) { missing.push(key) } }

  const frontKey = frontUrlKey(env)
  const frontUrl = env[frontKey]
  if (isBlank(frontUrl) || !isValidUrl(frontUrl as string)) { missing.push(frontKey) }

  const warnings: string[] = [...OPTIONAL, resetUrlKey(env)].filter(key => isBlank(env[key]))

  return { missing, warnings }
}

export function assertRequiredEnv(env: Env = process.env): void {
  const { missing, warnings } = checkEnv(env)

  if (warnings.length) { console.warn(`Variáveis de ambiente opcionais ausentes: ${warnings.join(', ')}`) }

  if (!missing.length) { return }

  console.error(`Variáveis de ambiente obrigatórias ausentes ou inválidas: ${missing.join(', ')}`)
  process.exit(1)
}
