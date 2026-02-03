
// backend/db/initDb.js
//
// Purpose:
// - Initialize MySQL schema from schema.sql + safe migrations.
// - Works in local dev and Railway (cloud).
//
// Notes:
// - Retries connection because DB may not be ready at app start.
//

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function columnExists(db, tableName, columnName, dbName) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [dbName, tableName, columnName]
  );
  return rows.length > 0;
}

function resolveDbConfig() {
  const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (MYSQL_URL) {
    return { mode: "url", MYSQL_URL };
  }

  const DB_HOST = process.env.DB_HOST || "localhost";
  const DB_PORT = Number(process.env.DB_PORT || 3306);
  const DB_USER = process.env.DB_USER || "root";
  const DB_PASSWORD = process.env.DB_PASSWORD || "";

  // IMPORTANT:
  // In Railway, DB is often called "railway".
  // In local, you used "events_app".
  const DB_NAME = process.env.DB_NAME || "events_app";

  return {
    mode: "parts",
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
  };
}

async function createPoolFromConfig(cfg) {
  if (cfg.mode === "url") {
    return mysql.createPool(cfg.MYSQL_URL);
  }

  return mysql.createPool({
    host: cfg.DB_HOST,
    port: cfg.DB_PORT,
    user: cfg.DB_USER,
    password: cfg.DB_PASSWORD,
    database: cfg.DB_NAME, // connect directly to the target DB
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });
}

async function initDb() {
  console.log("✅ INITDB VERSION-1: 2026-02-03 retry-enabled");

  const cfg = resolveDbConfig();

  console.log("INIT DB CONFIG", cfg.mode === "url"
    ? { mode: "url", MYSQL_URL_SET: true }
    : {
        mode: "parts",
        DB_HOST: cfg.DB_HOST,
        DB_PORT: cfg.DB_PORT,
        DB_USER: cfg.DB_USER,
        DB_PASSWORD_SET: Boolean(cfg.DB_PASSWORD),
        DB_NAME: cfg.DB_NAME,
      }
  );

  const attempts = Number(process.env.DB_INIT_ATTEMPTS || 30);
  const delayMs = Number(process.env.DB_INIT_DELAY_MS || 2000);

  let pool;

  for (let i = 1; i <= attempts; i++) {
    try {
      pool = await createPoolFromConfig(cfg);

      // Connectivity check
      await pool.query("SELECT 1");

      // Apply schema.sql
      const schemaPath = path.join(__dirname, "schema.sql");
      const sql = fs.readFileSync(schemaPath, "utf8");

      const statements = splitSqlStatements(sql);
      for (const stmt of statements) {
        await pool.query(stmt);
      }

      // SAFE migration: add updated_at only if missing
      const hasUpdatedAt = await columnExists(pool, "availability_submissions", "updated_at", cfg.DB_NAME);
      console.log("hasUpdatedAt?", hasUpdatedAt, "DB_NAME:", cfg.DB_NAME);

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

      // SAFE migration: add users.active_workspace_id + index + FK (if missing)
      const hasActiveWsCol = await columnExists(pool, "users", "active_workspace_id", cfg.DB_NAME);
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
        [cfg.DB_NAME, "users", "idx_users_active_workspace"]
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
        [cfg.DB_NAME, "users", "fk_users_active_workspace"]
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
          if (
            e.code !== "ER_DUP_KEYNAME" &&
            e.code !== "ER_CANT_CREATE_TABLE" &&
            e.code !== "ER_FK_DUP_NAME"
          ) {
            throw e;
          }
        }
      }

      // DEBUG
      try {
        const [cols] = await pool.query("SHOW COLUMNS FROM events");
        console.log(
          "events columns:",
          cols.map((c) => c.Field)
        );
      } catch (e) {
        console.log("events columns debug skipped:", e.code || e.message);
      }

      console.log("✅ DB init OK");
      return pool;
    } catch (err) {
      console.error(`❌ Failed to init DB (attempt ${i}/${attempts})`, {
        code: err.code,
        address: err.address,
        port: err.port,
        syscall: err.syscall,
        message: err.message,
      });

      // Clean up pool between attempts
      try {
        if (pool) await pool.end();
      } catch (_) {}

      if (i === attempts) throw err;
      await sleep(delayMs);
    }
  }
}

module.exports = initDb;




// // --- initDb.js ---

// const fs = require("fs");
// const path = require("path");
// const mysql = require("mysql2/promise");

// const DB_NAME = "events_app";

// function splitSqlStatements(sql) {
//   const cleaned = sql
//     .replace(/\/\*[\s\S]*?\*\//g, "")
//     .split("\n")
//     .map((l) => l.replace(/--.*$/g, "").trim())
//     .filter(Boolean)
//     .join("\n");

//   return cleaned
//     .split(";")
//     .map((s) => s.trim())
//     .filter(Boolean);
// }

// async function columnExists(db, tableName, columnName) {
//   const [rows] = await db.query(
//     `
//     SELECT 1
//     FROM information_schema.COLUMNS
//     WHERE TABLE_SCHEMA = ?
//       AND TABLE_NAME = ?
//       AND COLUMN_NAME = ?
//     LIMIT 1
//     `,
//     [DB_NAME, tableName, columnName]
//   );
//   return rows.length > 0;
// }

// async function initDb() {
//   const pool = mysql.createPool({
//     host: "localhost",
//     user: "root",
//     password: process.env.DB_PASSWORD || "",
//     waitForConnections: true,
//     connectionLimit: 10,
//     multipleStatements: true,
//   });

//   await pool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
//   await pool.query(`USE \`${DB_NAME}\``);

//   const schemaPath = path.join(__dirname, "schema.sql");
//   const sql = fs.readFileSync(schemaPath, "utf8");

//   const statements = splitSqlStatements(sql);
//   for (const stmt of statements) {
//     await pool.query(stmt);
//   }

//   // ✅ SAFE migration: add updated_at only if missing
// const hasUpdatedAt = await columnExists(pool, "availability_submissions", "updated_at");
// console.log("hasUpdatedAt?", hasUpdatedAt, "DB_NAME:", DB_NAME);

// if (!hasUpdatedAt) {
//   try {
//     await pool.query(`
//       ALTER TABLE availability_submissions
//       ADD COLUMN updated_at TIMESTAMP NOT NULL
//         DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
//     `);
//   } catch (e) {
//     if (e.code !== "ER_DUP_FIELDNAME") throw e;
//   }
// }

//   // ✅ SAFE migration: add users.active_workspace_id + index + FK (if missing)
//   const hasActiveWsCol = await columnExists(pool, "users", "active_workspace_id");
//   console.log("hasActiveWorkspaceId?", hasActiveWsCol);

//   if (!hasActiveWsCol) {
//     try {
//       await pool.query(`
//         ALTER TABLE users
//         ADD COLUMN active_workspace_id VARCHAR(36) NULL
//       `);
//     } catch (e) {
//       if (e.code !== "ER_DUP_FIELDNAME") throw e;
//     }
//   }

//   // Create index if missing
//   const [idxRows] = await pool.query(
//     `
//     SELECT 1
//     FROM information_schema.STATISTICS
//     WHERE TABLE_SCHEMA = ?
//       AND TABLE_NAME = ?
//       AND INDEX_NAME = ?
//     LIMIT 1
//     `,
//     [DB_NAME, "users", "idx_users_active_workspace"]
//   );
//   const hasActiveWsIdx = idxRows.length > 0;
//   console.log("hasActiveWorkspaceIndex?", hasActiveWsIdx);

//   if (!hasActiveWsIdx) {
//     try {
//       await pool.query(`CREATE INDEX idx_users_active_workspace ON users(active_workspace_id)`);
//     } catch (e) {
//       if (e.code !== "ER_DUP_KEYNAME") throw e;
//     }
//   }

//   // Create FK if missing
//   const [fkRows] = await pool.query(
//     `
//     SELECT 1
//     FROM information_schema.REFERENTIAL_CONSTRAINTS
//     WHERE CONSTRAINT_SCHEMA = ?
//       AND TABLE_NAME = ?
//       AND CONSTRAINT_NAME = ?
//     LIMIT 1
//     `,
//     [DB_NAME, "users", "fk_users_active_workspace"]
//   );
//   const hasActiveWsFk = fkRows.length > 0;
//   console.log("hasActiveWorkspaceFK?", hasActiveWsFk);

//   if (!hasActiveWsFk) {
//     try {
//       await pool.query(`
//         ALTER TABLE users
//         ADD CONSTRAINT fk_users_active_workspace
//         FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id)
//         ON DELETE SET NULL
//         ON UPDATE CASCADE
//       `);
//     } catch (e) {
//       // If the FK already exists under a different name, ignore common duplicate errors.
//       if (e.code !== "ER_DUP_KEYNAME" && e.code !== "ER_CANT_CREATE_TABLE" && e.code !== "ER_FK_DUP_NAME") {
//         throw e;
//       }
//     }
//   }

//   // DEBUG 
//   const [cols] = await pool.query("SHOW COLUMNS FROM events");
//   console.log(
//     "events columns:",
//     cols.map((c) => c.Field)
//   );

//   return pool;
// }

// module.exports = initDb;







