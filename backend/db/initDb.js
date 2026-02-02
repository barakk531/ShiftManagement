


// backend/db/initDb.js
const fs = require("fs");
const path = require("path");
const db = require("../db");

async function initDb() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    await db.query(stmt);
  }

  console.log("Database schema is ready");
}

module.exports = initDb;
