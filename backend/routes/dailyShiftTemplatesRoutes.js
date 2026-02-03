

// routes/dailyShiftTemplatesRoutes.js
const express = require("express");
const { requireAuth, requireRole } = require("../util/rbac");
const { getMyWorkspace } = require("../services/workspaceService");

const daily = require("../services/dailyShiftTemplatesService");

const router = express.Router();

// helper
function getUserId(req) {
  // JWT payload uses userId
  return req.user?.userId;
}

// GET /daily-shifts
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(404).json({ message: "No workspace selected." });

    const result = await daily.listByWorkspaceGrouped(ws.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /daily-shifts/:dayOfWeek
router.get("/:dayOfWeek", requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(404).json({ message: "No workspace selected." });

    const rows = await daily.listByDay(ws.id, req.params.dayOfWeek);
    res.json({
      workspaceId: ws.id,
      dayOfWeek: Number(req.params.dayOfWeek),
      templates: rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /daily-shifts/:dayOfWeek  (Admin)
router.post("/:dayOfWeek", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(404).json({ message: "No workspace selected." });

    const created = await daily.createForDay(ws.id, req.params.dayOfWeek, req.body);
    res.status(201).json({ template: created });
  } catch (err) {
    next(err);
  }
});

// PUT /daily-shifts/:id  (Admin)
router.put("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(404).json({ message: "No workspace selected." });

    const updated = await daily.updateById(ws.id, req.params.id, req.body);
    res.json({ template: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /daily-shifts/:id (Admin)
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(404).json({ message: "No workspace selected." });

    await daily.deleteById(ws.id, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// error handler
router.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Server error" });
});

module.exports = router;
