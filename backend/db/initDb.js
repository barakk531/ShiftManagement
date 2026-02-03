// --- initDb.js ---

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const DB_NAME = "events_app";

function splitSqlStatements(sql) {
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/--.*$/g, "").trim())
    .filter(Boolean)
    .join("\n");

  return cleaned
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function columnExists(db, tableName, columnName) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [DB_NAME, tableName, columnName]
  );
  return rows.length > 0;
}

async function initDb() {
  const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });

  await pool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await pool.query(`USE \`${DB_NAME}\``);

  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  const statements = splitSqlStatements(sql);
  for (const stmt of statements) {
    await pool.query(stmt);
  }

  // ✅ SAFE migration: add updated_at only if missing
const hasUpdatedAt = await columnExists(pool, "availability_submissions", "updated_at");
console.log("hasUpdatedAt?", hasUpdatedAt, "DB_NAME:", DB_NAME);

if (!hasUpdatedAt) {
  try {
    await pool.query(`
      ALTER TABLE availability_submissions
      ADD COLUMN updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  } catch (e) {
    if (e.code !== "ER_DUP_FIELDNAME") throw e;
  }
}

  // ✅ SAFE migration: add users.active_workspace_id + index + FK (if missing)
  const hasActiveWsCol = await columnExists(pool, "users", "active_workspace_id");
  console.log("hasActiveWorkspaceId?", hasActiveWsCol);

  if (!hasActiveWsCol) {
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN active_workspace_id VARCHAR(36) NULL
      `);
    } catch (e) {
      if (e.code !== "ER_DUP_FIELDNAME") throw e;
    }
  }

  // Create index if missing
  const [idxRows] = await pool.query(
    `
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
    `,
    [DB_NAME, "users", "idx_users_active_workspace"]
  );
  const hasActiveWsIdx = idxRows.length > 0;
  console.log("hasActiveWorkspaceIndex?", hasActiveWsIdx);

  if (!hasActiveWsIdx) {
    try {
      await pool.query(`CREATE INDEX idx_users_active_workspace ON users(active_workspace_id)`);
    } catch (e) {
      if (e.code !== "ER_DUP_KEYNAME") throw e;
    }
  }

  // Create FK if missing
  const [fkRows] = await pool.query(
    `
    SELECT 1
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = ?
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
    LIMIT 1
    `,
    [DB_NAME, "users", "fk_users_active_workspace"]
  );
  const hasActiveWsFk = fkRows.length > 0;
  console.log("hasActiveWorkspaceFK?", hasActiveWsFk);

  if (!hasActiveWsFk) {
    try {
      await pool.query(`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_active_workspace
        FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `);
    } catch (e) {
      // If the FK already exists under a different name, ignore common duplicate errors.
      if (e.code !== "ER_DUP_KEYNAME" && e.code !== "ER_CANT_CREATE_TABLE" && e.code !== "ER_FK_DUP_NAME") {
        throw e;
      }
    }
  }

  // DEBUG 
  const [cols] = await pool.query("SHOW COLUMNS FROM events");
  console.log(
    "events columns:",
    cols.map((c) => c.Field)
  );

  return pool;
}

module.exports = initDb;







