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

  return pool;
}

module.exports = initDb;






// // backend/db/initDb.js
// const fs = require("fs");
// const path = require("path");
// const db = require("../db");

// async function initDb() {
//   const schemaPath = path.join(__dirname, "schema.sql");
//   const schema = fs.readFileSync(schemaPath, "utf8");

//   const statements = schema
//     .split(";")
//     .map((s) => s.trim())
//     .filter((s) => s.length > 0 && !s.startsWith("--"));

//   for (const stmt of statements) {
//     await db.query(stmt);
//   }

//   console.log("Database schema is ready");
// }

// module.exports = initDb;
