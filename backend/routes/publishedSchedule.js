// backend/routes/publishedSchedule.js
//
// Purpose:
// - User-facing "Published schedule" endpoint.
// - Returns only the logged-in user's assigned shifts for a published week.
//
// Notes:
// - All comments are in English only (per request).

const express = require("express");
const { requireAuth } = require("../util/rbac");
const { getMyWorkspace } = require("../services/workspaceService");

const db = require("../db");
const router = express.Router();

function normalizeToSundayIso(dateStr) {
  const s = String(dateStr || "").slice(0, 10);
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

// GET /published-schedule/week?weekStartDate=YYYY-MM-DD
router.get("/week", requireAuth, async (req, res) => {
  try {
    const userId = String(req.user?.userId || "");
    const weekStartDate = normalizeToSundayIso(req.query?.weekStartDate);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!weekStartDate) return res.status(422).json({ message: "weekStartDate is required (YYYY-MM-DD)" });

    const ws = await getMyWorkspace(req.user);
    if (!ws?.id) return res.status(403).json({ message: "Forbidden: no workspace" });

    // Return only user's assignments, only if the week is published
    const [rows] = await db.query(
      `
      SELECT
        ss.week_start_date,
        ss.day_date,
        ss.id AS scheduled_shift_id,
        ss.required_count,
        ss.status,
        dst.id AS shift_template_id,
        dst.name AS shift_name,
        dst.start_time,
        dst.end_time,
        w.id AS workspace_id,
        w.name AS workspace_name
      FROM scheduled_shift_assignments ssa
      JOIN scheduled_shifts ss ON ss.id = ssa.scheduled_shift_id
      JOIN daily_shift_templates dst ON dst.id = ss.shift_template_id
      JOIN workspaces w ON w.id = ss.workspace_id
      WHERE ss.workspace_id = ?
        AND ss.week_start_date = ?
        AND ss.status = 'published'
        AND ssa.worker_id = ?
      ORDER BY ss.day_date ASC, dst.start_time ASC
      `,
      [String(ws.id), String(weekStartDate), String(userId)]
    );

    // Group by day_date for easy UI
    const byDay = new Map();
    for (const r of rows || []) {
      const day = String(r.day_date).slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push({
        scheduledShiftId: r.scheduled_shift_id,
        shiftTemplateId: r.shift_template_id,
        name: r.shift_name,
        startTime: r.start_time,
        endTime: r.end_time,
      });
    }

    const days = Array.from(byDay.entries()).map(([date, shifts]) => ({ date, shifts }));

    return res.json({
      workspace: { id: ws.id, name: ws.name, timezone: ws.timezone },
      weekStartDate,
      weekStatus: "published",
      days,
    });
  } catch (err) {
    console.error("GET /published-schedule/week failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err?.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;
