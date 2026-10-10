import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || './data/data.db';
const SCHEMA_PATH = path.join(process.cwd(), 'src', 'db', 'schema.sql');

export let db;

export async function initDb() {
  const isNew = !fs.existsSync(DB_PATH);

  // создаём папку data/, если её нет
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await db.exec(schema);

  console.log(isNew ? `[db] создана новая БД: ${DB_PATH}` : `[db] подключено к ${DB_PATH}`);
}

export const query = (sql, params = []) => db.all(sql, params);
export const queryOne = (sql, params = []) => db.get(sql, params);
export const execute = (sql, params = []) => db.run(sql, params);

export const insert = async (sql, params = []) => {
  const result = await db.run(sql, params);
  return result.lastID;
};

export async function transaction(fn) {
  await db.exec('BEGIN');
  try {
    const result = await fn(db);
    await db.exec('COMMIT');
    return result;
  } catch (err) {
    await db.exec('ROLLBACK');
    throw err;
  }
}