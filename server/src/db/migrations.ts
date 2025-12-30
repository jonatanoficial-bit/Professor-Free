import fs from "node:fs";
import path from "node:path";
import type sqlite3 from "sqlite3";
import { run } from "./sqlite";

export async function migrate(db: sqlite3.Database) {
  const schemaPath = path.resolve(process.cwd(), "src/db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  // executa em bloco simples (SQLite aceita múltiplos statements via run? não. Então divide por ';')
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length);

  for (const st of statements) {
    await run(db, st + ";");
  }
}