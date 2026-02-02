const express = require("express");
const { checkAuth } = require("../util/auth");

const {
  getEventsByUserForMonth,
  getMonthlySummaryForUser,
  getEventByIdForUser,
  createEventForUser,
  updateEventForUser,
  deleteEventForUser,
} = require("../db/eventService");

const router = express.Router();

// Protect everything below this line
router.use(checkAuth);

function getYearMonth(req) {
  const now = new Date();
  const year = Number(req.query.year) || now.getFullYear();
  const month = Number(req.query.month) || (now.getMonth() + 1);
  return { year, month };
}

function sendError(res, err, fallbackMessage) {
  const status = err.status || 500;
  return res.status(status).json({
    message: err.message || fallbackMessage,
  });
}

// GET /events -> events of CURRENT month (default) for the logged-in user
router.get("/", async (req, res) => {
  try {
    const userId = req.token?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const { year, month } = getYearMonth(req);
    const events = await getEventsByUserForMonth(userId, year, month);

    return res.json({ year, month, events });
  } catch (err) {
    return sendError(res, err, "Could not fetch events.");
  }
});

// GET /events/summary -> summary of CURRENT month (default)
router.get("/summary", async (req, res) => {
  try {
    const userId = req.token?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const { year, month } = getYearMonth(req);
    const summary = await getMonthlySummaryForUser(userId, year, month);

    return res.json({ year, month, summary });
  } catch (err) {
    return sendError(res, err, "Could not fetch summary.");
  }
});

// GET /events/:id -> only if belongs to user
router.get("/:id", async (req, res) => {
  try {
    const userId = req.token?.userId;
    const eventId = req.params.id;

    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const event = await getEventByIdForUser(eventId, userId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    return res.json({ event });
  } catch (err) {
    return sendError(res, err, "Could not fetch event.");
  }
});

// POST /events -> create new event for user
router.post("/", async (req, res) => {
  try {
    const userId = req.token?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const created = await createEventForUser(req.body, userId);
    return res.status(201).json({ event: created });
  } catch (err) {
    // this will correctly return 422 if your service throws err.status = 422
    return sendError(res, err, "Could not save shift.");
  }
});

// PUT /events/:id -> update only if belongs to user
router.put("/:id", async (req, res) => {
  try {
    const userId = req.token?.userId;
    const eventId = req.params.id;

    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const ok = await updateEventForUser(eventId, req.body, userId);
    if (!ok) return res.status(404).json({ message: "Event not found." });

    const updated = await getEventByIdForUser(eventId, userId);
    return res.status(200).json({ event: updated });
  } catch (err) {
    return sendError(res, err, "Could not update shift.");
  }
});

// DELETE /events/:id -> delete only if belongs to user
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.token?.userId;
    const eventId = req.params.id;

    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const ok = await deleteEventForUser(eventId, userId);
    if (!ok) return res.status(404).json({ message: "Event not found." });

    return res.status(200).json({ message: "Event deleted." });
  } catch (err) {
    return sendError(res, err, "Could not delete event.");
  }
});

module.exports = router;
