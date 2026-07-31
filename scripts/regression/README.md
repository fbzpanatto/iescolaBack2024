# Regressão de API + banco — migração question↔skill

Primeira automação de teste do projeto (até aqui tudo era manual — ver skill
`question-skill-nn`, seção "Protocolo de teste"). **Não substitui** o roteiro
manual ponta a ponta; é uma rede de segurança rápida pra regressão da migração
e de tudo que ela toca (`diffsStrict`, `imagesModified`, trava de
compartilhamento — ver "Código intocável" na skill).

Scripts standalone, sem framework de teste novo — Node/TypeScript rodando
contra o servidor local e o banco local, com asserts simples e saída
passou/falhou.

## Pré-requisitos

- `npm run dev` rodando (servidor local respondendo na porta do `SERVER_PORT`
  do `.env`, default 5000).
- Banco local com pelo menos uma prova existente (usa uma prova real só pra
  derivar contexto válido — disciplina, categoria, pessoa, período — não
  precisa ser a prova 240 especificamente, mas cai nela primeiro se existir).
- Pelo menos um usuário com `person.categoryId = 1` (ADMN) no banco local.

## Scripts

```bash
npx ts-node scripts/regression/question-skill.regression.ts
```
Script principal (PARTE 1 do pedido original). Cria sua própria prova e 5
questões sintéticas (prefixo `ZQA_`), exercita `updateTest` via chamada HTTP
real contra o servidor local, confere o banco, e **apaga tudo que criou** no
final (`finally`), mesmo se algum assert falhar. Roda de novo sem problema —
não deixa lixo entre execuções.

Cobre:
1. Retrocompatibilidade — payload sem `skills` não mexe em `question_skill`
   nem em `question.updatedAt`.
2. Adicionar habilidades a questão não compartilhada — sincronização +
   recálculo de `question.skillId` (1ª em ordem alfabética) + irmãs intocadas.
3. Trava de questão compartilhada — tentativa de alterar `skills` é ignorada
   silenciosamente (200, mas nada muda no banco).
4. Payload malformado — id não-inteiro e id inexistente, ambos 400, rollback
   completo (nem `test.updatedAt` avança).
5. Rota genérica `POST/PUT /question` bloqueada (405).
6. Regressão do `diffsStrict` — salvar sem alterar nada não avança
   `updatedAt` de nenhuma questão nem `test_question`.
7. Regressão de imagens — salvar sem `imagesModified` não mexe em
   `question_image`.

```bash
npx ts-node scripts/regression/print-admin-token.ts
```
Imprime uma linha de JSON (`{ token, role, person, expiresIn }`) com uma
sessão de um usuário ADMN real do banco local. Não é pra rodar direto — é
consumido pelo `e2e/support/auth.ts` do `iescolaFront2024` pra autenticar os
testes de UI sem precisar da senha de ninguém.

```bash
npx ts-node scripts/regression/e2e-fixtures.ts
```
Também não é pra rodar direto normalmente — consumido por
`e2e/support/fixtures-db.ts` do `iescolaFront2024`. Garante (sem duplicar se já
existir) dois cenários que os testes de UI precisam: uma questão em 2+ provas,
e uma questão com 2+ habilidades **e título único** no banco (títulos se
repetem entre questões reais — precisa ser único pra localizar a linha certa
no picker via texto). Ao contrário do script principal, **não limpa o que
cria** — é estado de apoio pra rodar os testes de UI quantas vezes precisar.

## lib/

`lib/auth.ts` — `mintAdminToken()` (usado pelo script principal) e
`mintAdminSession()` (usado por `print-admin-token.ts`), ambos lendo o banco
local pra achar um usuário ADMN real em vez de usar credenciais fixas.

## Por que `scripts/` está fora do `tsconfig.json` principal

`rootDir` do projeto é `./src` — sem o `exclude` em `tsconfig.json`, `tsc
--noEmit`/`npm run build` quebrariam com "File is not under 'rootDir'". `ts-node`
continua rodando os scripts normalmente mesmo excluídos do `tsc` do projeto.
