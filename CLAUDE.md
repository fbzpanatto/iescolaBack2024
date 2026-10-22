# iescolaBack2024

## Stack & Arquitetura
- Backend: Node.js, Express, TypeScript, MySQL.
- Banco: TypeORM (legado, em remoção) e mysql2 (novo padrão).
- Entrypoint: `src/index.ts` (inicia o servidor).
- TypeORM DataSource: `src/data-source.ts`.
- Rotas: `src/routes/`.
- Controllers: `src/controller/`.
- Acesso a dados (mysql2): métodos ficam em `src/controller/genericController.ts`.
- Middlewares: `src/middleware/`.
- Schemas/Validações: `src/schemas/`.
- Models (TypeORM): `src/model/`.
- Pool de conexão mysql2: `src/services/db.ts` (`connectionPool`).
- Formatadores: `src/utils/helpers.ts`.

## Comandos
- Dev: `npm run dev`
- Build: `npm run build`
- Type-check: `npx tsc --noEmit`
- Testes: `npm test`

## Regras do projeto
- NÃO crie código novo usando TypeORM. Toda migração e código novo usam mysql2 puro.
- Antes de migrar um método TypeORM, leia a skill `escolapp-mysql2` para seguir os moldes de query, transação e formatação.
- Nunca faça `SELECT *`.
- Acesso ao banco local é **SOMENTE LEITURA** (SELECT, DESCRIBE, EXPLAIN).