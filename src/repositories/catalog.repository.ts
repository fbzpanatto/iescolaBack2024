import { qState, qTransferStatus, qUserTeacher } from "../interfaces/interfaces";
import { Discipline } from "../model/Discipline";
import { ClassroomCategory } from "../model/ClassroomCategory";
import { Contract } from "../model/Contract";
import { CLASSROOM_CATEGORIES, PER_CAT } from "../utils/enums";
import { connectionPool } from "../services/db";
import { PersonCategory } from "../model/PersonCategory";
import { TestCategory } from "../model/TestCategory";
import { State } from "../model/State";
import { Disability } from "../model/Disability";

class CatalogRepository {

  async qTestCategory(testCategoryId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =
        `
          SELECT *
          FROM test_category AS tg
          WHERE tg.id = ?
        `

      const [ queryResult ] = await conn.query(query, [testCategoryId])
      return (queryResult as TestCategory[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTransferStatus(statusId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
          SELECT *
          FROM transfer_status AS ts
          WHERE ts.id = ?
      `

      const [ queryResult ] = await conn.query(query, [statusId])
      return (queryResult as qTransferStatus[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qClassroomShift() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
          SELECT cs.id, cs.name
          FROM classroom_shift AS cs
        `

      const [ queryResult ] = await conn.query(query)
      return queryResult as { id: number, name: string }[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qState(stateId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT *
        FROM state
        WHERE state.id = ?
      `

      const [ queryResult ] = await conn.query(query, [stateId])
      return (queryResult as qState[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qDiscipline(disciplineId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT *
        FROM discipline AS d
        WHERE d.id = ?
      `

      const [ queryResult ] = await conn.query(query, [disciplineId])

      return (queryResult as Discipline[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qQuestionGroups() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT * FROM question_group`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<ClassroomCategory>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qContracts() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM contract ORDER BY id DESC`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<Contract>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Usado no form de professor (dropdown de escola). Só as colunas que o frontend
  // realmente lê (id, name, shortName) — o TypeORM devolvia inep/active também, mas
  // nenhuma tela consome esses dois campos aqui.
  async qAllSchools() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name, shortName FROM school`
      const [ queryResult ] = await conn.query(query)
      return queryResult as Array<{ id: number, name: string, shortName: string }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStates() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT * FROM state`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<State>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qDisabilities() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT ds.id, ds.name, ds.official FROM disability ds ORDER BY ds.official DESC, ds.name ASC`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<Disability>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qClassroomCategories(condition: boolean = false) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      let query: string; let queryParams: any[];

      if (condition) {
        const categoriesToIgnore = [CLASSROOM_CATEGORIES.ENC];
        query = `SELECT id, name FROM classroom_category WHERE id NOT IN (?)`;
        queryParams = [categoriesToIgnore];
      } else {
        const categoriesToInclude = [CLASSROOM_CATEGORIES.PEBI, CLASSROOM_CATEGORIES.PEBII];
        query = `SELECT id, name FROM classroom_category WHERE id IN (?)`;
        queryParams = [categoriesToInclude];
      }

      const [ queryResult ] = await conn.query(query, queryParams);
      return queryResult as Array<ClassroomCategory>;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qDisciplines() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM discipline`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<Discipline>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async findPersonCategories(excludeIds: number[]){
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query = `SELECT * FROM person_category WHERE id NOT IN (?)`;
      const [result] = await conn.query(query, [excludeIds]);
      return result as Array<PersonCategory>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qGetAllDisciplines(qUserTeacher: qUserTeacher, teacherDisciplines: { id: number, disciplines: number[] }){
    let conn;
    try {
      conn = await connectionPool.getConnection()

      let query = `
        SELECT
          discipline.id AS id,
          discipline.name AS name,
          discipline.shortName AS shortName
        FROM discipline
      `;
      const params: any[] = [];
      const isProfessor = qUserTeacher.person.category.id === PER_CAT.PROF;

      if (isProfessor) {
        if (!teacherDisciplines.disciplines || teacherDisciplines.disciplines.length === 0) { return [] }
        query += ` WHERE discipline.id IN (?)`;
        params.push(teacherDisciplines.disciplines);
      }

      const [result] = await conn.query(query, params);
      return result as Array<Discipline>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const catalogRepository = new CatalogRepository()
