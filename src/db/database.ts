import { Database } from "bun:sqlite";
import { PATHS } from "../types/paths.js";
import path from "path";

export class WolverineDB {
  private db: Database;

  constructor() {
    const dbPath = path.join(PATHS.data, "wolverine.db");
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    // Core tables for Lossless Context DAG
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS summaries (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        depth INTEGER DEFAULT 0,
        token_count INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS dag_edges (
        parent_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'summary_to_message' or 'summary_to_summary'
        PRIMARY KEY (parent_id, child_id)
      )
    `);

    console.log("[DB] Wolverine Intelligence DB initialized.");
  }

  run(sql: string, params: any[] = []) {
    return this.db.run(sql, params);
  }

  query(sql: string, params: any[] = []) {
    return this.db.query(sql, params).all();
  }
}

export const db = new WolverineDB();
