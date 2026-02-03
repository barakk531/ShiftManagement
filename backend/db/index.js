// backend/db/index.js
const mysql = require("mysql2/promise");

const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL;

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "events_app";
const DB_PORT = Number(process.env.DB_PORT || 3306);

if (MYSQL_URL) {
  console.log("DB CONFIG", { mode: "url", MYSQL_URL_SET: true });
} else {
  console.log("DB CONFIG", {
    mode: "parts",
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD_SET: Boolean(DB_PASSWORD),
    DB_NAME,
  });
}

const pool = MYSQL_URL
  ? mysql.createPool(MYSQL_URL)
  : mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });

module.exports = pool;






// // backend/db/index.js
// const mysql = require("mysql2/promise");

// const DB_HOST = process.env.DB_HOST || "localhost";
// const DB_USER = process.env.DB_USER || "root";
// const DB_PASSWORD = process.env.DB_PASSWORD || "";
// const DB_NAME = process.env.DB_NAME || "events_app";

// console.log("DB CONFIG", {
//   DB_HOST,
//   DB_USER,
//   DB_PASSWORD_SET: Boolean(DB_PASSWORD),
//   DB_NAME,
// });

// const pool = mysql.createPool({
//   host: DB_HOST,
//   user: DB_USER,
//   password: DB_PASSWORD,
//   database: DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
// });

// module.exports = pool;

