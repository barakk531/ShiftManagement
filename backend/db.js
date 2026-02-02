

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'bk1994', 
  database: 'events_app',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
