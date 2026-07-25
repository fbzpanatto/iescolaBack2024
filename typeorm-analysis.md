# Análise de Uso do TypeORM no iescolaBack2024

## Resumo Geral

| Métrica | Quantidade |
|---------|-----------|
| **Controllers com uso direto de TypeORM** | 11 |
| **`AppDataSource.transaction()`** | 27 chamadas |
| **`CONN.save()`** | ~55 chamadas |
| **`CONN.findOne()`** | ~30 chamadas |
| **`CONN.find()`** | ~12 chamadas |
| **`CONN.getRepository()`** | ~15 chamadas |
| **`CONN.createQueryBuilder()`** | 10 chamadas |
| **`CONN.delete()`** | 1 chamada |
| **`CONN.query()`** (SQL raw dentro de transação) | 2 chamadas |

---

## Símbolos TypeORM Importados no Projeto

| Símbolo | Arquivos que importam |
|---------|----------------------|
| `DataSource` | `data-source.ts` |
| `EntityManager` | `genericController.ts`, `teacher.ts`, `student.ts`, `year.ts`, `test.ts` |
| `EntityTarget` | `genericController.ts`, `login.ts`, `transfer.ts`, `skill.ts`, `question.ts`, `user.ts`, `teacher.ts`, `student.ts`, `year.ts`, `StudentQuestion.ts`, `test.ts`, `initialConfigs.ts` + 17 controllers simples |
| `FindManyOptions` | `genericController.ts`, `transfer.ts`, `skill.ts`, `year.ts` |
| `FindOneOptions` | `genericController.ts`, `student.ts` |
| `ObjectLiteral` | `genericController.ts`, `transfer.ts`, `skill.ts`, `StudentQuestion.ts`, `initialConfigs.ts`, `year.ts` |
| `SaveOptions` | `genericController.ts`, `transfer.ts` |
| `DeepPartial` | `genericController.ts`, `transfer.ts` |
| `IsNull` | `genericController.ts`, `transfer.ts`, `student.ts`, `year.ts` |
| `ILike` | `year.ts` |
| `In` | `student.ts` |

---

## `data-source.ts` (Definição da DataSource)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 3 | `import { DataSource } from "typeorm"` | Import do construtor DataSource |
| 6 | `export const AppDataSource = new DataSource({...})` | Cria a DataSource singleton do MySQL |

---

## `index.ts` (Inicialização)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 11 | `import { AppDataSource } from "./data-source"` | Import da AppDataSource |
| 93 | `AppDataSource.initialize()` | Inicializa a conexão TypeORM ao iniciar o servidor |

---

## `controller/genericController.ts` (Base de Todos os Controllers)

### Imports TypeORM (linhas 1-10)

| Linha | Import |
|-------|--------|
| 3 | `EntityManager` |
| 4 | `EntityTarget` |
| 5 | `FindManyOptions` |
| 6 | `FindOneOptions` |
| 7 | `ObjectLiteral` |
| 8 | `SaveOptions` |
| 10 | `import {AppDataSource} from "../data-source"` |

### Operações TypeORM

| Linha | Método | Padrão | Descrição |
|-------|--------|--------|-----------|
| 67 | `get repository()` | `AppDataSource.getRepository(this.entity)` | Cria repository para o tipo de entidade genérica |
| 71 | `findAllWhere()` | `this.repository.find()` | Busca todas as entidades (sem transação) |
| 72 | `findAllWhere()` | `CONN.find(this.entity)` | Busca todas as entidades dentro de transação |
| 79 | `findOneByWhere()` | `this.repository.findOne(options)` | Busca uma entidade por opções (sem transação) |
| 82 | `findOneByWhere()` | `CONN.findOne(this.entity, options)` | Busca uma entidade por opções dentro de transação |
| 90 | `findOneById()` | `this.repository.findOneBy({ id })` | Busca uma entidade por ID (sem transação) |
| 93 | `findOneById()` | `CONN.findOneBy(this.entity, { id })` | Busca uma entidade por ID dentro de transação |
| 100 | `save()` | `this.repository.save(body, options)` | Salva entidade (sem transação) |
| 101 | `save()` | `CONN.save(this.entity, body, options)` | Salva entidade dentro de transação |
| 108 | `updateId()` | `this.repository.findOneBy({ id })` | Busca entidade por ID (sem transação) |
| 111 | `updateId()` | `this.repository.save(dataInDataBase)` | Salva entidade atualizada (sem transação) |
| 114 | `updateId()` | `CONN.findOneBy(this.entity, { id })` | Busca entidade por ID dentro de transação |
| 117 | `updateId()` | `CONN.save(this.entity, dataInDataBase)` | Salva entidade atualizada dentro de transação |

---

## `controller/test.ts` — 8 métodos com TypeORM

### `getFormData()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 242 | `AppDataSource.transaction(async (CONN) => {...})` | Abre transação para dados do formulário de teste |
| 243 | `CONN.find(Discipline)` | Busca todas as disciplinas |
| 244 | `CONN.find(Bimester)` | Busca todos os bimestres |
| 245 | `CONN.find(TestCategory)` | Busca todas as categorias de teste |
| 246 | `CONN.findOneBy(QuestionGroup, { id: 1 })` | Busca grupo de questões padrão |

### `getGraphic()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 457 | `AppDataSource.transaction(async(typeOrmConnection) => {...})` | Abre transação para gráfico de fluência de leitura |
| 470 | `this.getReadingFluencyForGraphic(testId, String(year.id), typeOrmConnection)` | Passa CONN para helper de query |

### `getById()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 628 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para detalhe do teste |
| 632 | `CONN.findOne(Test, { ...op })` | Busca teste com todas as relações |
| 640 | `this.getTestQuestions(test.id, CONN)` | Passa CONN para helper de questões |

### `saveTest()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 650 | `AppDataSource.transaction(async (CONN) => {...})` | Abre transação para criação de teste |
| 659 | `CONN.findOne(Year, { where })` | Valida existência e atividade do ano |
| 663 | `CONN.findOne(Period, { relations, where })` | Busca período com ano e bimestre |
| 675 | `CONN.findOne(Test, { where })` | Verifica teste duplicado (categoria+disciplina+período) |
| 679-693 | `CONN.getRepository(Classroom).createQueryBuilder("classroom")...getMany()` | Query complexa para buscar alunos matriculados nas salas selecionadas |
| 710 | `CONN.save(Test, test)` | Salva nova entidade Test |
| 738 | `CONN.save(Question, questionData)` | Cria nova Question |
| 756 | `CONN.save(QuestionImage, questionImages)` | Salva imagens da questão em lote |
| 772 | `CONN.save(TestQuestion, testQuestions)` | Salva vínculos teste-questão em lote |

### `updateTest()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 787 | `AppDataSource.transaction(async (CONN) => {...})` | Abre transação para atualização de teste |
| 795 | `CONN.findOne(Test, { relations, where })` | Busca teste com person e discipline |
| 810 | `CONN.save(Test, test)` | Salva metadados do teste atualizados |
| 821 | `this.getTestQuestions(test.id, CONN)` | Busca questões atuais dentro da transação |
| 853 | `CONN.save(Question, questionData)` | Cria nova Question para nova questão do teste |
| 870 | `CONN.save(QuestionImage, questionImages)` | Salva imagens da questão |
| 883 | `CONN.save(TestQuestion, {...})` | Salva nova TestQuestion |
| 910 | `CONN.save(TestQuestion, {...})` | Atualiza TestQuestion existente |
| 925 | `CONN.save(Question, {...})` | Atualiza campos de Question |
| 936 | `CONN.save(Skill, {...})` | Atualiza entidade Skill |
| 947 | `CONN.save(QuestionGroup, {...})` | Atualiza QuestionGroup |
| 978 | `CONN.delete(QuestionImage, { id })` | Deleta imagem da questão |
| 987 | `CONN.save(QuestionImage, {...})` | Cria nova imagem da questão |
| 1006 | `CONN.save(QuestionImage, {...})` | Substitui imagem da questão (atualização S3 key) |
| 1021 | `CONN.save(QuestionImage, {...})` | Atualiza ordem/tipo da imagem |
| 1034 | `this.findOneById(id, req, CONN)` | Chama findOneById genérico com CONN |

### `getTest()` (helper)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 1045-1057 | `CONN.getRepository(Test).createQueryBuilder("test")...getOne()` | Query complexa com joins para buscar dados completos do teste |

### `getTestQuestions()` (helper)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 1059-1091 | `CONN.getRepository(TestQuestion).createQueryBuilder("testQuestion")...getMany()` | Query complexa com joins e loadRelationCountAndMap para questões do teste |

### `getReadingFluencyForGraphic()` (helper)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 1094-1123 | `CONN.getRepository(Test).createQueryBuilder("test")...getOne()` | **Query mais complexa do projeto** — 13 joins (Test, Period, Bimester, Year, Discipline, Category, Person, Classroom, School, StudentClassroom, StudentStatus, Student, ReadingFluency, RClassroom, ReadingFluencyExam, ReadingFluencyLevel, StudentPerson) |

---

## `controller/teacher.ts` — 5 métodos com TypeORM

### `teacherForm()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 32 | `AppDataSource.transaction(async (CONN) => {...})` | Abre transação para dados do formulário de professor |
| 37 | `CONN.getRepository(School).find()` | Busca todas as escolas |
| 38 | `CONN.getRepository(Contract).find()` | Busca todos os contratos |

### `getRequestedStudentTransfers()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 104 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para contagem de transferências pendentes |
| 108-118 | `CONN.getRepository(StudentClassroom).createQueryBuilder("studentClassroom")...getCount()` | Conta student-classrooms com transferências pendentes |

### `updateTeacher()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 128 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para atualização de professor |
| 132 | `CONN.findOne(Teacher, { relations, where })` | Busca professor com person.category, person.user, school |
| 157 | `CONN.findOne(Teacher, { where: { email } })` | Verifica duplicidade de email |
| 166 | `CONN.save(User, user)` | Salva credenciais do usuário atualizadas |
| 171 | `this.methods(teacher, CONN, body)` | Passa CONN para dispatcher de métodos por cargo |

### `saveTeacher()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 321 | `AppDataSource.transaction(async (CONN) => {...})` | Abre transação para criação de professor |
| 328 | `CONN.findOne(Teacher, { where: { register } })` | Verifica duplicidade de matrícula |
| 331 | `CONN.findOne(Teacher, { where: { email } })` | Verifica duplicidade de email |
| 334 | `CONN.findOne(PersonCategory, { where })` | Busca categoria de pessoa |
| 337 | `CONN.save(Teacher, ...)` | Salva nova entidade Teacher |
| 340 | `CONN.save(User, {...})` | Salva novo User com credenciais |
| 347 | `CONN.getRepository(Discipline).find()` | Busca todas as disciplinas (cargo master) |
| 348 | `CONN.getRepository(Classroom).find({ where })` | Busca salas por escola (cargo master) |
| 358 | `CONN.save(TeacherClassDiscipline, relationsToSave)` | Salva relações professor-sala-disciplina em lote (master) |
| 368 | `CONN.save(TeacherClassDiscipline, relationsToSave)` | Salva relações professor-sala-disciplina em lote (professor) |

### `changeTeacherMasterSchool()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 219 | `CONN.find(Discipline)` | Busca todas as disciplinas |
| 220 | `CONN.find(Classroom, { where })` | Busca salas por escola |
| 223 | `CONN.getRepository(TeacherClassDiscipline)` | Obtém repository para operações em lote |
| 247 | `CONN.save(Teacher, teacher)` | Salva professor após mudança de escola/categoria |

### `updateTeacherClassesAndDisciplines()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 269 | `CONN.getRepository(TeacherClassDiscipline)` | Obtém repository para gerenciamento de relações |
| 315 | `CONN.save(Teacher, teacher)` | Salva professor após atualização de salas/disciplinas |

---

## `controller/student.ts` — 4 métodos com TypeORM

### `findOneStudentById()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 236 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para busca de aluno |
| 239 | `CONN.findOne(Teacher, { ...options })` | Busca professor para verificar permissões |
| 245 | `this.student(Number(params.id), CONN)` | Chama helper student() com CONN |

### `updateIdWithAuth()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 522 | `AppDataSource.transaction(async (CONN) => {...})` | Abre transação para atualização de aluno |
| 530 | `CONN.findOne(Student, dbStudentOptions)` | Busca aluno com relações completas |
| 532 | `CONN.findOne(Classroom, { where })` | Busca sala de destino |
| 540 | `CONN.findOne(StudentClassroom, {...})` | Busca vínculo aluno-sala ativo |
| 554 | `CONN.findOne(Student, { where: { ra, dv } })` | Verifica duplicidade de RA |
| 563 | `CONN.findOne(Year, { where })` | Busca ano atual |
| 574 | `CONN.findOne(Transfer, pedTransOptions)` | Verifica transferência pendente |
| 587 | `CONN.save(StudentClassroom, {...stClass, endedAt})` | Encerra vínculo aluno-sala antigo |
| 589 | `CONN.find(StudentClassroom, { order, take })` | Busca último número de chamada |
| 593 | `CONN.save(StudentClassroom, {...})` | Cria novo vínculo aluno-sala |
| 606 | `CONN.findOne(TransferStatus, { where })` | Busca status "Aceitada" |
| 607 | `CONN.findOne(Year, { where })` | Busca ano atual |
| 609 | `CONN.save(Transfer, transfer)` | Salva registro de transferência automática |
| 612 | `CONN.save(StudentClassroom, {...})` | Atualiza número de chamada (mesma sala) |
| 622 | `CONN.findOne(State, { where })` | Busca entidade State |
| 626 | `CONN.save(Student, dbStudent)` | Salva dados do aluno atualizados |

### `student()` (helper)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 670-684 | `CONN.createQueryBuilder()...getRawOne()` | Query raw complexa com selects, joins, where, groupBy para dados completos do aluno |

### `setDisabilities()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 643 | `CONN.save(StudentDisability, disabilities)` | Salva novas deficiências em lote |
| 654 | `CONN.save(StudentDisability, studentDisability)` | Salva deficiência encerrada |

### `studentCategory()` / `disabilities()` (helpers)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 660-662 | `AppDataSource.getRepository(PersonCategory).findOne()` / `CONN.findOne(PersonCategory)` | Busca categoria ALUN (com e sem transação) |
| 665-667 | `AppDataSource.getRepository(Disability).findBy()` / `CONN.findBy(Disability)` | Busca deficiências por IDs (com e sem transação) |

### `graduate()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 781 | `AppDataSource.transaction(async (CONN) => {...})` | Abre transação para formatura do aluno |
| 792 | `CONN.findOne(Student, { where })` | Busca aluno para formaturar |
| 798 | `CONN.save(Student, student)` | Salva aluno com active=false |
| 800 | `CONN.findOne(TransferStatus, { where })` | Busca status "Formado" |
| 801 | `CONN.findOne(Year, { where })` | Busca ano por ID |
| 803 | `CONN.save(Transfer, entity)` | Salva registro de transferência de formatura |

---

## `controller/transfer.ts` — 2 métodos com TypeORM

### `saveWithAuth()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 173 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para criação de transferência |
| 177 | `CONN.findOne(Transfer, { where: {...} })` | Busca transferência pendente existente |
| 181 | `CONN.findOne(Classroom, { where: {...} })` | Busca sala atual |
| 182 | `CONN.findOne(Classroom, { relations, where })` | Busca sala de destino com school |
| 189 | `CONN.findOne(Student, { relations, where })` | Busca aluno com person |
| 191-203 | `CONN.getRepository(Teacher).createQueryBuilder("teacher")...getRawMany()` | Query complexa para buscar professores na sala antiga (notificação por email) |
| 219 | `CONN.save(Transfer, transfer)` | Salva nova Transfer |

### `updateIdWithAuth()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 229 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para aceitar/rejeitar/cancelar transferência |
| 233 | `CONN.findOne(Transfer, { relations, where })` | Busca transferência pendente atual |
| 259 | `CONN.save(Transfer, currTransfer)` | Salva transferência cancelada |
| 269 | `CONN.save(Transfer, currTransfer)` | Salva transferência rejeitada |
| 277 | `CONN.findOne(StudentClassroom, { relations, where })` | Busca vínculo aluno-sala ativo |
| 283 | `CONN.find(StudentClassroom, { order, take })` | Busca último número de chamada para nova sala |
| 288 | `CONN.save(StudentClassroom, {...})` | Cria novo vínculo aluno-sala |
| 297 | `CONN.save(StudentClassroom, {...stClass, endedAt})` | Encerra vínculo aluno-sala antigo |
| 303 | `CONN.save(Transfer, currTransfer)` | Salva transferência aceita |

---

## `controller/year.ts` — 3 métodos com TypeORM

### `findAllWhere()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 22 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para listagem de anos |
| 23 | `CONN.find(Year, { relations, order, where: { name: ILike(...) } })` | Busca anos com periods.bimester, ordenados, com busca ILike |

### `saveWithAuth()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 31 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para criação de ano |
| 40-43 | `CONN.getRepository(Year).createQueryBuilder('year')...getRawOne()` | Busca maior nome de ano (número) via query raw |
| 46 | `CONN.find(Bimester)` | Busca todos os bimestres |
| 47 | `CONN.save(Period, {...})` | Salva um novo Period para cada bimestre |

### `updateIdWithAuth()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 56 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para atualização de ano |
| 73-78 | `CONN.getRepository(StudentClassroom).createQueryBuilder('studentClassroom')...getMany()` | Busca student-classrooms ativos para o ano sendo encerrado |
| 79 | `CONN.getRepository(StudentClassroom).save({...register, endedAt})` | Encerra vínculos aluno-sala em lote |
| 91 | `CONN.save(Transfer, item)` | Salva transferências pendentes aceitas |
| 95 | `CONN.save(Year, yearToUpdate)` | Salva ano atualizado |

---

## `controller/StudentQuestion.ts` — 5 métodos com TypeORM

### `updateReadingFluency_backUp()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 27 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para atualização de fluência de leitura (versão backup) |
| 37 | `CONN.findOne(Test, { where })` | Busca teste por ID |
| 41 | `CONN.findOne(ReadingFluency, options)` | Busca registro de fluência existente |
| 44 | `CONN.save(ReadingFluency, {...})` | Cria nova fluência de leitura |
| 49 | `CONN.findOne(StudentClassroom, { where, relations })` | Busca student-classroom para validação |
| 61 | `CONN.save(ReadingFluency, {...})` | Atualiza fluência de leitura existente |

### `updateAlphabetic()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 176 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para atualização alfabética |
| 186 | `CONN.findOne(Test, { where, relations })` | Busca teste por categoria, período, ano, bimestre |
| 194 | `CONN.findOne(Alphabetic, options)` | Busca registro alfabético existente |
| 197 | `CONN.save(Alphabetic, {...})` | Cria novo registro alfabético |
| 202 | `CONN.findOne(StudentClassroom, { where, relations })` | Busca student-classroom para validação |
| 213 | `CONN.save(Alphabetic, {...})` | Atualiza registro alfabético existente |

### `updateAlphabeticFirstLevel()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 226 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para alphabetic first level |
| 235 | `CONN.findOne(AlphabeticFirst, { where })` | Busca alphabetic first existente |
| 238 | `CONN.save(AlphabeticFirst, {...})` | Cria novo alphabetic first |
| 244 | `CONN.save(AlphabeticFirst, {...})` | Atualiza alphabetic first |

### `updateTestStatus()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 276 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para atualização de status do teste |
| 278 | `CONN.findOne(StudentTestStatus, { ...options })` | Busca registro de status do teste |
| 284 | `CONN.save(StudentTestStatus, register)` | Salva status atualizado |

### `alphaStatus()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 293 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para salvar status alfabético |
| 308 | `CONN.save(Alphabetic, newBody)` | Salva ou cria status alfabético |

---

## `controller/login.ts` — 1 método com TypeORM

### `updatePassword()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 94 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para redefinição de senha |
| 101 | `CONN.findOne(User, { relations, where })` | Busca usuário com person.category por email |
| 107 | `CONN.query(checkTokenQuery, [...])` | Query SQL raw para verificar existência de token de reset |
| 115 | `CONN.save(User, user)` | Salva senha do usuário atualizada |
| 118 | `CONN.query('DELETE FROM token_reset...')` | SQL raw DELETE para invalidar token |

---

## `controller/question.ts` — 2 métodos com TypeORM

### `isOwner()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 16 | `AppDataSource.transaction(async(CONN)=> {...})` | Abre transação para verificação de propriedade |
| 21 | `CONN.findOne(Question, { relations, where })` | Busca questão com person para verificar ownership |

### `allQuestions()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 39 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para listagem de questões |
| 40-51 | `CONN.getRepository(Question).createQueryBuilder("question")...getMany()` | Query complexa com leftJoinAndSelect, loadRelationCountAndMap e where para listar questões com relações |

---

## `controller/skill.ts` — 1 método com TypeORM

### `findAllWhere()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 15 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para listagem de skills |
| 18 | `CONN.find(Skill, { ...options })` | Busca skills filtradas por classroomCategory e discipline |

---

## `controller/user.ts` — 1 método com TypeORM

### `save()`

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 12 | `AppDataSource.transaction(async(CONN) => {...})` | Abre transação para salvar usuário |
| 13 | `CONN.save(User, body)` | Salva nova entidade User |

---

## `controller/initialConfigs.ts`

### `get entity()` (getter)

| Linha | Padrão | Descrição |
|-------|--------|-----------|
| 7 | `AppDataSource.getRepository(this.entityName)` | Obtém repository para um tipo de entidade |

---

## Controllers que NÃO usam TypeORM direto

Estes controllers usam apenas os methods `q*` do GenericController (mysql2 via connectionPool):

`bimester`, `classroom`, `classroomCategory`, `discipline`, `disability`, `history`, `lesson`, `person`, `personCategory`, `report`, `school`, `state`, `studentClassroom`, `studentDisabilities`, `studentMerge`, `studentTest`, `teacherClassDiscipline`, `teacherClassrooms`, `token`, `training`, `testCategory`

---

## Prioridade Sugerida para Migração

| Prioridade | Controller | Operações TypeORM | Observação |
|-----------|-----------|-------------------|------------|
| 1 | `test.ts` | ~40 operações | Maior volume, queries mais complexas |
| 2 | `student.ts` | ~25 operações | Muitas transações e validações |
| 3 | `teacher.ts` | ~25 operações | CRUD complexo com relações |
| 4 | `transfer.ts` | ~15 operações | Lógica de negócio crítica |
| 5 | `year.ts` | ~10 operações | Encerramento de ano com cascata |
| 6 | `StudentQuestion.ts` | ~15 operações | Padrão repetitivo (upsert) |
| 7 | `login.ts` | 5 operações | Simples, mas sensível (senha) |
| 8 | `question.ts` | 3 operações | Poucas operações |
| 9 | `skill.ts` | 2 operações | Simples |
| 10 | `user.ts` | 1 operação | Simples |
| 11 | `genericController.ts` | Base | Refatorar methods base por último |
