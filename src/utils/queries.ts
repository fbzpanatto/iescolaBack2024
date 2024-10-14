import { ResultSetHeader, format } from 'mysql2';
import { PoolConnection } from 'mysql2/promise';

export interface WhereConditions { [key: string]: any }
export interface JoinCondition { column1: string, column2: string }
export interface JoinClause { table: string, alias: string, conditions: JoinCondition[] }

export const selectJoinsWhere = async (conn: PoolConnection, baseTable: string, baseAlias: string, selectFields: string[], whereConditions: WhereConditions, joins: JoinClause[] = []) => {

  const selectClause = selectFields.join(', ');

  const whereClause = Object.keys(whereConditions).length > 0 ? 'WHERE ' + Object.keys(whereConditions).map(key => `${baseAlias}.${key}=?`).join(' AND ') : '';

  const joinClause = joins.map(join => {
    const joinConditions = join.conditions.map(condition => `${condition.column1} = ${condition.column2}`).join(' AND ');
    return `LEFT JOIN ${join.table} AS ${join.alias} ON ${joinConditions}`;
  }).join(' ');

  const queryString = `
    SELECT ${selectClause}
    FROM ${baseTable} AS ${baseAlias}
    ${joinClause}
    ${whereClause}
  `;

  const values = Object.values(whereConditions);

  const [results] = await conn.query(format(queryString, values));

  return results;
};