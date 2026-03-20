import { Database } from "bun:sqlite";
import { PATHS } from "../types/paths.js";
import path from "path";

/**
 * Core database management class for Wolverine Intelligence.
 * Handles persistence for messages, summaries, and the Context DAG (Directed Acyclic Graph).
 */
export class WolverineDB {
  private db: Database;

  /**
   * Initializes the database connection and triggers schema setup.
   */
  constructor() {
    const dbPath = path.join(PATHS.data, "wolverine.db");
    this.db = new Database(dbPath);
    this.init();
  }

  /**
   * Initializes the database schema, creating necessary tables if they do not exist.
   * Tables include:
   * - messages: Stores individual chat messages.
   * - summaries: Stores distilled context summaries.
   * - dag_edges: Manages relationships between messages and summaries.
   * 
   * @private
   */
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

  /**
   * Executes a SQL command that does not return data (e.g., INSERT, UPDATE, DELETE).
   * 
   * @param sql - The SQL statement to execute.
   * @param params - Optional parameters to bind to the SQL statement.
   * @returns The result of the execution.
   */
  run(sql: string, params: any[] = []) {
    return this.db.run(sql, params);
  }

  /**
   * Executes a SQL query and returns all matching rows.
   * 
   * @param sql - The SQL query to execute.
   * @param params - Optional parameters to bind to the SQL statement.
   * @returns An array of result rows.
   */
  query(sql: string, params: any[] = []) {
    return this.db.query(sql).all(...params);
  }
}

export const db = new WolverineDB();
