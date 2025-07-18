import mysql from 'mysql2/promise'
import dotenv from 'dotenv';
dotenv.config();

export const connectionPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
  timezone: '-03:00'
});

export async function dbConn() {
  const connection = await connectionPool.getConnection();
  await connection.query("SET time_zone = '-03:00'");
  return connection;
}