# iescolaBack2024
 

## Percentual da sala em Avaliações e Simulados

Regra: em `AVL_ITA` (7) e `SIM_ITA` (6; `SIM_4_9` no front), célula sem resposta de aluno elegível conta como erro, ou seja, permanece no denominador. Vale para a tela de gabarito (`GET students`, `TestController.getStudents`) e para o comparativo (`classroom/:id/graphic`, `Helper.classroomDataStructure`), que devem sempre coincidir. Diagnóstica, alfabetização, leitura e fluência não seguem essa regra e não foram alteradas.

- Lista de categorias: `SCORED_TEST_CATEGORIES_IDS` (`src/utils/enums.ts`); fórmula: `Helper.scoreRate`; célula vazia: `Helper.isUnassignedEmptyCell`.
- Elegibilidade (inalterada): ficam fora alunos sem nenhuma resposta, OE/TR e respostas de outra sala.
- Testes: `npm test` (golden master em `tests/__snapshots__/baseline.json`, capturado antes da alteração, mais paridade entre as telas).
