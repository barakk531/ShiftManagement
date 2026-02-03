

require("dotenv").config();
console.log("RESEND KEY EXISTS:", !!process.env.RESEND_API_KEY);
console.log("RESEND KEY PREFIX:", (process.env.RESEND_API_KEY || "").slice(0, 3));
console.log("RESEND KEY LENGTH:", (process.env.RESEND_API_KEY || "").length);
console.log("KEY CHECK:", process.env.RESEND_API_KEY.slice(0, 8), process.env.RESEND_API_KEY.length);

const express = require("express");
const cors = require("cors");
const initDb = require("./db/initDb");

const eventRoutes = require("./routes/events");
const authRoutes = require("./routes/auth");
const forumRoutes = require("./routes/forum");
const historyRoutes = require("./routes/history");
const shiftSwapsRoutes = require("./routes/shiftSwaps");

const workspaceRoutes = require("./routes/workspaces");
const availabilityRoutes = require("./routes/availability");
const shiftTemplatesRoutes = require("./routes/shiftTemplatesRoutes");
const dailyShiftTemplatesRoutes = require("./routes/dailyShiftTemplatesRoutes");
const adminScheduleRouter = require("./routes/adminSchedule");
const publishedScheduleRoutes = require("./routes/publishedSchedule");

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
app.use("/workspaces", workspaceRoutes);
app.use("/availability", availabilityRoutes);
app.use("/shift-templates", shiftTemplatesRoutes);
app.use("/daily-shifts", dailyShiftTemplatesRoutes);
app.use("/admin/schedule", adminScheduleRouter);
app.use("/published-schedule", publishedScheduleRoutes);



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




