const { validateJSONToken } = require("../util/auth");


const express = require("express");
const jwt = require("jsonwebtoken");
const { DateTime } = require("luxon");

const router = express.Router();

const TZ = "Asia/Jerusalem";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.JWT_KEY ||
  process.env.TOKEN_KEY ||
  process.env.ACCESS_TOKEN_SECRET;

function requireJwt(req, res, next) {
  const header = req.get("Authorization") || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Not authenticated (missing Bearer token)." });
  }

  if (!JWT_SECRET) {
    
    console.error("[shift-swaps] JWT secret missing. Check backend .env");
    return res.status(500).json({ message: "Server JWT secret is not configured." });
  }

  try {
    console.log("[shift-swaps] got token len:", token.length);
    const payload = validateJSONToken(token);
    req.user = payload;
    next();
  } catch (err) {
    console.error("[shift-swaps] JWT verify failed:", err.name, err.message);
    return res.status(401).json({
      message: "Invalid or expired token.",
      reason: err.name, // TokenExpiredError / JsonWebTokenError
    });
  }
}



// Compute current board window: Sat 20:00 -> Sat 20:00 (Israel time)
function getBoardWindow(now = DateTime.now().setZone(TZ)) {
  // Luxon weekday: Mon=1 ... Sat=6 ... Sun=7
  let start = now.set({
    weekday: 6,
    hour: 20,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  // If we haven't reached Sat 20:00 yet, go back a week
  if (start > now) start = start.minus({ weeks: 1 });

  const end = start.plus({ weeks: 1 });
  return { start, end };
}

function fmt(dt) {
  return dt.toFormat("yyyy-LL-dd HH:mm:ss");
}

// delete the post that not relevant
async function cleanupExpiredShiftSwaps(db, now) {
  const { start } = getBoardWindow(now);

  await db.query(
    `
    DELETE FROM shift_swaps
    WHERE week_end_at <= ?
       OR shift_start_at < ?
    `,
    [fmt(start), fmt(now)]
  );
}

// GET /shift-swaps  -> current board posts (shared across users)
router.get("/", requireJwt, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const now = DateTime.now().setZone(TZ);
    const { start, end } = getBoardWindow(now);

    await cleanupExpiredShiftSwaps(db, now);

    const [rows] = await db.query(
      `
      SELECT
        ss.id,
        COALESCE(NULLIF(CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)), ' '), u.email) AS author,
        ss.message AS body,
        ss.shift_start_at AS shiftStartAt
      FROM shift_swaps ss
      JOIN users u ON u.id = ss.user_id
      WHERE ss.week_start_at = ?
        AND ss.week_end_at = ?
        AND ss.shift_start_at >= ?
      ORDER BY ss.shift_start_at ASC, ss.id DESC
      `,
      [fmt(start), fmt(end), fmt(now)]
    );

    res.json({ posts: rows });
  } catch (err) {
    next(err);
  }
});

// POST /shift-swaps  -> create new post (for current board only)
router.post("/", requireJwt, async (req, res, next) => {
  try {
    const db = req.app.locals.db;

    const { message, shiftStartAt } = req.body;

    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return res.status(422).json({ message: "Message is required (min 3 chars)." });
    }
    if (!shiftStartAt) {
      return res.status(422).json({ message: "shiftStartAt is required." });
    }

    const now = DateTime.now().setZone(TZ);

    await cleanupExpiredShiftSwaps(db, now);

    const { start, end } = getBoardWindow(now);

    // input from frontend: "YYYY-MM-DDTHH:mm" (datetime-local) or ISO
    const shiftDt = DateTime.fromISO(shiftStartAt, { zone: TZ });
    if (!shiftDt.isValid) {
      return res.status(422).json({ message: "Invalid shiftStartAt." });
    }

    // hide old posts => don't allow creating in the past
    if (shiftDt < now) {
      return res.status(422).json({ message: "Shift time is in the past." });
    }

    // enforce current board window (keeps UX simple)
    if (shiftDt < start || shiftDt >= end) {
      return res.status(422).json({
        message: "Shift must be within the current board window (Sat 20:00 -> Sat 20:00).",
      });
    }

    const userId = req.user.userId;

    const [result] = await db.query(
      `
      INSERT INTO shift_swaps (user_id, message, shift_start_at, week_start_at, week_end_at)
      VALUES (?, ?, ?, ?, ?)
      `,
      [userId, message.trim(), fmt(shiftDt), fmt(start), fmt(end)]
    );

    res.status(201).json({
      post: {
        id: result.insertId,
        author: req.user.firstName && req.user.lastName ? `${req.user.firstName} ${req.user.lastName}` : (req.user.email || "User"),
        body: message.trim(),
        shiftStartAt: fmt(shiftDt),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /shift-swaps/:id -> details (current board only)
router.get("/:id", requireJwt, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const now = DateTime.now().setZone(TZ);

    await cleanupExpiredShiftSwaps(db, now);

    const { start, end } = getBoardWindow(now);

    const [rows] = await db.query(
      `
      SELECT
        ss.id,
        COALESCE(NULLIF(CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)), ' '), u.email) AS author,
        ss.message AS body,
        ss.shift_start_at AS shiftStartAt
      FROM shift_swaps ss
      JOIN users u ON u.id = ss.user_id
      WHERE ss.id = ?
        AND ss.week_start_at = ?
        AND ss.week_end_at = ?
      LIMIT 1
      `,
      [req.params.id, fmt(start), fmt(end)]
    );

    if (!rows.length) return res.status(404).json({ post: null });

    res.json({ post: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
