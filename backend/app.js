

require("dotenv").config();


const express = require("express");
const cors = require("cors");

const initDb = require("./db/initDb");

const eventRoutes = require("./routes/events");
const authRoutes = require("./routes/auth");
const forumRoutes = require("./routes/forum");

console.log("🔥 app.js started");

const app = express();

// Parse JSON bodies
app.use(express.json());

// ✅ CORS routes
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ preflight (OPTIONS)
app.options("*", cors());

// Routes
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/forum", forumRoutes);

// Init DB and then start server
initDb()
  .then(() => {
    console.log("✅ Connected to MySQL");

    app.listen(8080, () => {
      console.log("🚀 Server running on port 8080");
    });
  })
  .catch((err) => {
    console.error("Failed to initialize DB:", err);
    process.exit(1);
  });







// const initDb = require("./db/initDb");

// console.log('🔥 app.js started');

// const bodyParser = require('body-parser');
// const express = require('express');
// const cors = require("cors");

// const eventRoutes = require('./routes/events');
// const authRoutes = require('./routes/auth');

// const app = express();

// app.use("/forum", require("./routes/forum"));

// const pool = require('./db');





// app.use(cors({
//   origin: "http://localhost:3000",
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));

// app.options("*", cors());


// (async () => {
//   try {
//     const conn = await pool.getConnection();
//     console.log('✅ Connected to MySQL');
//     conn.release();
//   } catch (err) {
//     console.error('❌ MySQL connection failed:', err.message);
//   }
// })();


// app.use(bodyParser.json());
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
//   next();
// });

// app.use(authRoutes);

// app.use('/events', eventRoutes);

// app.use((error, req, res, next) => {
//   const status = error.status || 500;
//   const message = error.message || 'Something went wrong.';
//   res.status(status).json({ message: message });
// });



// initDb().catch(err => {
//   console.error("Failed to initialize DB:", err);
//   process.exit(1);
// });


// app.listen(8080, () => {
//   console.log('🚀 Server running on port 8080');
// });

// // app.listen(8080);
