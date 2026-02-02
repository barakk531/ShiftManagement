const express = require("express");
const router = express.Router();

const { checkAuth } = require("../util/auth");
const historyService = require("../db/historyService");

// Protect everything below this line
router.use(checkAuth);

router.get("/years", async (req, res, next) => {
  try {
    const userId = req.token?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const years = await historyService.getAvailableYears(userId);
    return res.json({ years });
  } catch (err) {
    next(err);
  }
});

router.get("/months", async (req, res, next) => {
  try {
    const userId = req.token?.userId;
    const year = Number(req.query.year);

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    if (!year) {
      return res.status(400).json({ message: "year is required" });
    }

    const months = await historyService.getAvailableMonths(userId, year);
    return res.json({ months });
  } catch (err) {
    next(err);
  }
});

router.get("/events", async (req, res, next) => {
  try {
    const userId = req.token?.userId;
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    if (!year || !month) {
      return res.status(400).json({ message: "year and month are required" });
    }

    const events = await historyService.getEventsForMonth(userId, year, month);
    return res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const userId = req.token?.userId;
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    if (!year || !month) {
      return res.status(400).json({ message: "year and month are required" });
    }

    const summary = await historyService.getMonthSummary(userId, year, month);
    return res.json({ summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
