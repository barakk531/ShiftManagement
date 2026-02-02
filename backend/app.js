

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const initDb = require("./db/initDb");

const eventRoutes = require("./routes/events");
const authRoutes = require("./routes/auth");
const forumRoutes = require("./routes/forum");
const historyRoutes = require("./routes/history");
const shiftSwapsRoutes = require("./routes/shiftSwaps");

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
app.use((req, res, next) => {
  console.log("REQ:", req.method, req.url);
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/forum", forumRoutes);
app.use("/history", historyRoutes);
app.use("/shift-swaps", shiftSwapsRoutes);



// Global error handler (always return JSON)
app.use((error, req, res, next) => {
  const status = error.status || 500;
  const message = error.message || 'Something went wrong.';
  res.status(status).json({ message });
});


// Init DB and then start server
initDb()
  .then((pool) => {
    console.log("✅ Connected to MySQL");

    app.locals.db = pool;

    app.listen(8080, () => {
      console.log("🚀 Server running on port 8080");
    });
  })
  .catch((err) => {
    console.error("❌ Failed to init DB", err);
    process.exit(1);
  });






// Init DB and then start server
// initDb()
//   .then(() => {
//     console.log("✅ Connected to MySQL");

//     app.listen(8080, () => {
//       console.log("🚀 Server running on port 8080");
//     });
//   })
//   .catch((err) => {
//     console.error("Failed to initialize DB:", err);
//     process.exit(1);
//   });


