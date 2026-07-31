/**
 * Imprime no stdout (uma linha de JSON) uma sessão válida de um usuário ADMN
 * real do banco local: { token, role, person, expiresIn }. Uso isolado: consumido
 * pelo helper de auth do Playwright (iescolaFront2024/e2e/support/auth.ts) pra
 * pular a tela de login nos testes de UI, sem precisar da senha em texto puro de
 * ninguém — só lê o banco local e assina com o mesmo SECRET do backend.
 *
 * Uso: npx ts-node scripts/regression/print-admin-token.ts
 */
import 'dotenv/config';
import { connectionPool } from '../../src/services/db';
import { mintAdminSession } from './lib/auth';

mintAdminSession()
  .then(session => { process.stdout.write(JSON.stringify(session)); })
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => connectionPool.end());
