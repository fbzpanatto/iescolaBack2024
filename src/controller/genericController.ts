import {
  DeepPartial,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral,
  SaveOptions
} from "typeorm";
import {Request} from "express";
import {connectionPool} from "../services/db";

// Config usada pelo GenericController para atender findAllWhere/findOneByWhere/findOneById/save/updateId
// via mysql2 puro (sem CONN de transação TypeORM). `selectColumns` replica exatamente a projeção
// default do TypeORM (todas as @Column exceto as marcadas `select: false`). `relations` mapeia
// nome da propriedade de relação (ex: "category") para a coluna de FK real (ex: "categoryId")
export interface GenericTableConfig {
  table: string
  selectColumns: string[]
  relations?: Record<string, string>
  // Colunas TINYINT que o TypeORM expunha como boolean e o mysql2 devolve cru como 0/1.
  booleanColumns?: string[]
  // Colunas DATETIME que o TypeORM expunha como Date e o mysql2 devolve cru como string
  // "YYYY-MM-DD HH:MM:SS" (pool usa dateStrings: true). Necessário para o contrato com o frontend.
  dateColumns?: string[]
}

export class GenericController<T> {
  constructor(private entity: EntityTarget<ObjectLiteral>, private tableConfig?: GenericTableConfig) {}

  private requireTableConfig(): GenericTableConfig {
    if (!this.tableConfig) { throw new Error(`GenericController: tableConfig não configurado para ${String(this.entity)}`) }
    return this.tableConfig
  }

  // Corrige, apenas na forma devolvida ao cliente, os tipos que o SELECT cru do mysql2 não preserva:
  // TINYINT -> boolean e DATETIME (string "YYYY-MM-DD HH:MM:SS") -> Date. Não afeta o que é gravado no banco.
  protected normalizeRow<R extends Record<string, any>>(row: R): R {
    if (!row) { return row }
    const mutableRow = row as Record<string, any>
    const { booleanColumns = [], dateColumns = [] } = this.tableConfig ?? {}
    for (const col of booleanColumns) {
      if (mutableRow[col] !== undefined && mutableRow[col] !== null) { mutableRow[col] = mutableRow[col] === 1 || mutableRow[col] === true }
    }
    for (const col of dateColumns) {
      const value = mutableRow[col]
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
        mutableRow[col] = new Date(value.replace(' ', 'T') + 'Z')
      }
    }
    return row
  }

  // Converte um body/entidade em memória para pares coluna->valor prontos para INSERT/UPDATE,
  // traduzindo relações (ex: { category: { id: 5 } }) para a coluna de FK (categoryId: 5).
  private toColumnValues(body: ObjectLiteral): Record<string, any> {
    const relations = this.tableConfig?.relations ?? {}
    const out: Record<string, any> = {}
    for (const key of Object.keys(body)) {
      const value = (body as any)[key]
      if (value === undefined) { continue }
      if (key in relations) { out[relations[key]] = (value && typeof value === 'object') ? value.id : value; continue }
      out[key] = value
    }
    return out
  }

  async findAllWhere(_: FindManyOptions<ObjectLiteral> | undefined = {}, request?: Request) {
    try {
      const { table, selectColumns } = this.requireTableConfig()
      let conn;
      try {
        conn = await connectionPool.getConnection();
        const [rows] = await conn.query(`SELECT ${selectColumns.join(', ')} FROM ${table}`);
        return { status: 200, data: (rows as any[]).map(row => this.normalizeRow(row)) }
      } finally { if (conn) { conn.release() } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneByWhere(options: FindOneOptions<ObjectLiteral>) {
    try {
      const { table, selectColumns } = this.requireTableConfig()
      const where = (options?.where ?? {}) as Record<string, any>
      const keys = Object.keys(where)
      const clause = keys.map(k => where[k] === null ? `${k} IS NULL` : `${k} = ?`).join(' AND ')
      const params = keys.filter(k => where[k] !== null).map(k => where[k])
      let conn;
      try {
        conn = await connectionPool.getConnection();
        const sql = `SELECT ${selectColumns.join(', ')} FROM ${table}` + (clause ? ` WHERE ${clause}` : '') + ' LIMIT 1';
        const [rows] = await conn.query(sql, params);
        const result = (rows as any[])[0]
        if (!result) { return { status: 404, message: "Data not found" } } return { status: 200, data: result }
      } finally { if (conn) { conn.release() } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneById(id: number | string, body: ObjectLiteral) {
    try {
      const { table, selectColumns } = this.requireTableConfig()
      let conn;
      try {
        conn = await connectionPool.getConnection();
        const [rows] = await conn.query(`SELECT ${selectColumns.join(', ')} FROM ${table} WHERE id = ? LIMIT 1`, [id]);
        const result = this.normalizeRow((rows as any[])[0])
        if (!result) { return { status: 404, message: "Data not found" } } return { status: 200, data: result }
      } finally { if (conn) { conn.release() } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {
      const { table } = this.requireTableConfig()
      const columnValues = this.toColumnValues(body as ObjectLiteral)
      const id = (body as any).id
      let conn;
      try {
        conn = await connectionPool.getConnection();
        if (id) {
          const keys = Object.keys(columnValues).filter(k => k !== 'id')
          const setClause = keys.map(k => `${k} = ?`).join(', ')
          await conn.query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...keys.map(k => columnValues[k]), id]);
          return { status: 201, data: body }
        }
        const keys = Object.keys(columnValues)
        const placeholders = keys.map(() => '?').join(', ')
        const [result] = await conn.query(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, keys.map(k => columnValues[k]));
        return { status: 201, data: { ...body, id: (result as any).insertId } }
      } finally { if (conn) { conn.release() } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateId(id: number | string, body: ObjectLiteral) {
    try {
      const { table, selectColumns } = this.requireTableConfig()
      let conn;
      try {
        conn = await connectionPool.getConnection();
        const [rows] = await conn.query(`SELECT ${selectColumns.join(', ')} FROM ${table} WHERE id = ? LIMIT 1`, [id]);
        const dataInDataBase = (rows as any[])[0]
        if (!dataInDataBase) { return { status: 404, message: "Data not found" } }
        for (const key in body) { dataInDataBase[key] = body[key] }
        const columnValues = this.toColumnValues(dataInDataBase)
        const keys = Object.keys(columnValues).filter(k => k !== 'id')
        const setClause = keys.map(k => `${k} = ?`).join(', ')
        await conn.query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...keys.map(k => columnValues[k]), id]);
        return { status: 200, data: this.normalizeRow(dataInDataBase) }
      } finally { if (conn) { conn.release() } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}