

// backend/routes/adminSchedule.js
//
// Purpose:
// - Admin schedule endpoints (read + write).
// - Guarantees a stable response shape for the frontend.
// - Adds "Publish week" support + staffing gap ("missingWorkers").
//
// Notes:
// - All comments are in English only (per request).

const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../util/rbac");

const queryService = require("../services/adminScheduleQueryService"); // kept for backward compatibility/legacy shapes
const { getAdminWeekScheduleView } = require("../services/adminScheduleService");
const { assertAdminInWorkspace } = require("../services/workspaceAdminAccessService");
const { getMyWorkspace } = require("../services/workspaceService");
const { getWeekStatus, publishWeek, unpublishWeek } = require("../services/scheduledWeekPublishService");

const router = express.Router();

function toISODate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function statusFromError(err) {
  return err?.statusCode || err?.status || 500;
}


function normalizeToSundayIso(dateStr) {
  const s = String(dateStr || "").slice(0, 10);
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

function normalizeScheduleToDays(scheduleLike) {
  // Accept multiple possible shapes from legacy services:
  // 1) { weekStartDate, days: [...] }
  // 2) { schedule: [...] } where schedule is already days array
  // 3) days array directly
  // 4) flat shifts array -> group by dayDate

  if (!scheduleLike) return { weekStartDate: "", days: [] };

  // Case 1: already final shape
  if (scheduleLike.days && Array.isArray(scheduleLike.days)) {
    return {
      weekStartDate: toISODate(scheduleLike.weekStartDate || scheduleLike.weekStart || ""),
      days: scheduleLike.days.map((d) => ({
        date: toISODate(d.date || d.dayDate || d.day_date || ""),
        shifts: Array.isArray(d.shifts) ? d.shifts : [],
      })),
    };
  }

  // Case 2: wrapped as { schedule: [...] }
  if (scheduleLike.schedule && Array.isArray(scheduleLike.schedule)) {
    return {
      weekStartDate: toISODate(scheduleLike.weekStartDate || scheduleLike.weekStart || ""),
      days: scheduleLike.schedule.map((d) => ({
        date: toISODate(d.date || d.dayDate || d.day_date || ""),
        shifts: Array.isArray(d.shifts) ? d.shifts : [],
      })),
    };
  }

  // Case 3: scheduleLike is days array directly
  if (Array.isArray(scheduleLike) && scheduleLike.length && typeof scheduleLike[0] === "object") {
    // Heuristic: if it has "shifts", treat as days array
    if (Array.isArray(scheduleLike[0].shifts)) {
      return {
        weekStartDate: "",
        days: scheduleLike.map((d) => ({
          date: toISODate(d.date || d.dayDate || d.day_date || ""),
          shifts: Array.isArray(d.shifts) ? d.shifts : [],
        })),
      };
    }

    // Case 4: flat shifts array -> group by dayDate
    const byDate = new Map();
    for (const s of scheduleLike) {
      const dayDate = toISODate(s.dayDate || s.day_date || s.date || "");
      if (!dayDate) continue;
      if (!byDate.has(dayDate)) byDate.set(dayDate, []);
      byDate.get(dayDate).push(s);
    }

    const days = Array.from(byDate.entries()).map(([date, shifts]) => ({
      date,
      shifts,
    }));

    days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { weekStartDate: "", days };
  }

  return { weekStartDate: "", days: [] };
}

// Helpers to calculate weekly staffing gaps and determine publish status
async function getMissingWorkersCount(workspaceId, weekStartDate) {
  const [rows] = await db.query(
    `
    SELECT
      COALESCE(SUM(GREATEST(ss.required_count - COALESCE(a.assignedCount, 0), 0)), 0) AS missingWorkers
    FROM scheduled_shifts ss
    LEFT JOIN (
      SELECT scheduled_shift_id, COUNT(*) AS assignedCount
      FROM scheduled_shift_assignments
      GROUP BY scheduled_shift_id
    ) a ON a.scheduled_shift_id = ss.id
    WHERE ss.workspace_id = ?
      AND ss.week_start_date = ?
    `,
    [workspaceId, weekStartDate]
  );

  return Number(rows?.[0]?.missingWorkers || 0);
}

// async function getWeekStatus(workspaceId, weekStartDate) {
//   const [rows] = await db.query(
//     `
//     SELECT
//       CASE WHEN SUM(ss.status = 'published') > 0 THEN 'published' ELSE 'draft' END AS weekStatus
//     FROM scheduled_shifts ss
//     WHERE ss.workspace_id = ?
//       AND ss.week_start_date = ?
//     `,
//     [workspaceId, weekStartDate]
//   );

//   return rows?.[0]?.weekStatus || "draft";
// }

// GET /admin/schedule/week?workspaceId=...&weekStartDate=YYYY-MM-DD
// GET /admin/schedule/week?weekStartDate=YYYY-MM-DD
router.get("/week", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const adminUserId = req.user?.userId;
    const { weekStartDate } = req.query;

    if (!adminUserId) return res.status(401).json({ message: "Missing user id" });
    if (!weekStartDate) return res.status(422).json({ message: "weekStartDate is required" });

    // Main view (templates + submissions + persisted assignments)
    const view = await getAdminWeekScheduleView(adminUserId, weekStartDate);

    const workspaceId = String(view?.workspace?.id || "");
    if (!workspaceId) {
      return res.status(500).json({ message: "Workspace id missing from schedule view" });
    }

    // Publish metadata
    const weekStart = normalizeToSundayIso(weekStartDate);
    const weekStatusObj = await getWeekStatus(workspaceId, weekStart);
    const weekStatus = weekStatusObj.status;
    const missingWorkers = await getMissingWorkersCount(workspaceId, weekStart);


    return res.json({
      weekStartDate: toISODate(view.weekStartDate || weekStartDate),
      days: view.days || [],
      submittedWorkers: view.submittedWorkers || [],
      workspace: view.workspace || null,
      weekStatus,
      missingWorkers,
    });
    } catch (err) {
    console.error("GET /admin/schedule/week failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(statusFromError(err)).json({ message: err.message || "Failed to load admin schedule" });
    }
});

// router.get("/week", requireAuth, requireRole("admin"), async (req, res) => {
//   try {
//     const adminUserId = req.user?.userId;
//     const { workspaceId, weekStartDate } = req.query;

//     if (!adminUserId) return res.status(401).json({ message: "Missing user id" });
//     if (!workspaceId) return res.status(422).json({ message: "workspaceId is required" });
//     if (!weekStartDate) return res.status(422).json({ message: "weekStartDate is required" });

//     // Main view (templates + submissions + persisted assignments)
//     const view = await getAdminWeekScheduleView(adminUserId, weekStartDate);

//     // Publish metadata is derived from persisted scheduled_shifts (not from templates)
//     const weekStatus = await getWeekStatus(String(workspaceId), String(weekStartDate));
//     const missingWorkers = await getMissingWorkersCount(String(workspaceId), String(weekStartDate));

//     return res.json({
//       weekStartDate: toISODate(view.weekStartDate || weekStartDate),
//       days: view.days || [],
//       submittedWorkers: view.submittedWorkers || [],
//       workspace: view.workspace || null,
//       weekStatus,
//       missingWorkers,
//     });
//   } catch (err) {
//     console.error("GET /admin/schedule/week failed:", err);
//     return res.status(err.status || 500).json({ message: err.message || "Failed to load admin schedule" });
//   }
// });

// POST /admin/schedule/assignment
// Body: { workspaceId, weekStartDate, dayDate, shiftTemplateId, userId | workerId }
router.post("/assignment", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const adminUserId = req.user?.userId;

    const { workspaceId, weekStartDate, dayDate, shiftTemplateId } = req.body;
    const workerId = String(req.body?.workerId || req.body?.userId || "");

    if (!adminUserId) return res.status(401).json({ message: "Missing user id" });
    if (!workspaceId) return res.status(422).json({ message: "workspaceId is required" });
    if (!weekStartDate) return res.status(422).json({ message: "weekStartDate is required" });
    if (!dayDate) return res.status(422).json({ message: "dayDate is required" });
    if (!shiftTemplateId) return res.status(422).json({ message: "shiftTemplateId is required" });
    if (!workerId) return res.status(422).json({ message: "Missing workerId" });

    // Dynamic import to support ESM service (top-level await)
    const mod = await import("../services/adminScheduleAssignmentService.js");
    const assignWorkerToShift =
      mod.assignWorkerToShift || mod.default?.assignWorkerToShift;

    if (typeof assignWorkerToShift !== "function") {
      return res.status(500).json({ message: "Assign service export not found" });
    }

    const result = await assignWorkerToShift({
      adminUserId,
      workspaceId,
      weekStartDate,
      dayDate,
      shiftTemplateId,
      workerId,
    });

    return res.status(200).json(result);
    } catch (err) {
    return res.status(statusFromError(err)).json({ message: err.message || "Failed to assign worker" });
    }
});


// DELETE /admin/schedule/assignment
// Body: { workspaceId, scheduledShiftId, workerId }
router.delete("/assignment", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const adminUserId = req.user?.userId;

    const workspaceId = String(req.body?.workspaceId || "");
    const scheduledShiftId = Number(req.body?.scheduledShiftId);
    const workerId = String(req.body?.workerId || "");

    if (!adminUserId) return res.status(401).json({ message: "Missing user id" });
    if (!workspaceId) return res.status(422).json({ message: "workspaceId is required" });
    if (!Number.isFinite(scheduledShiftId) || scheduledShiftId <= 0) {
      return res.status(422).json({ message: "scheduledShiftId must be a positive number" });
    }
    if (!workerId) return res.status(422).json({ message: "workerId is required" });

    // Dynamic import to support ESM service (top-level await)
    const mod = await import("../services/adminScheduleRemoveAssignmentService.js");
    const removeAssignmentByScheduledShiftId = mod.removeAssignmentByScheduledShiftId || mod.default?.removeAssignmentByScheduledShiftId;

    if (typeof removeAssignmentByScheduledShiftId !== "function") {
      return res.status(500).json({ message: "Remove assignment service export not found" });
    }

    const result = await removeAssignmentByScheduledShiftId(
      adminUserId,
      workspaceId,
      scheduledShiftId,
      workerId
    );

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("DELETE /admin/schedule/assignment failed:", err);
    const status = err.status || err?.statusCode || 500;
    return res.status(status).json({ message: err.message || "Failed to remove assignment" });
  }
});


// POST /admin/schedule/week/publish
// Body: { workspaceId, weekStartDate }
// Publishes (locks) the week. Publishing is allowed even if missingWorkers > 0.
// router.post("/week/publish", requireAuth, requireRole("admin"), async (req, res) => {
//   try {
//     const adminUserId = req.user?.userId;
//     const { workspaceId, weekStartDate } = req.body;

//     if (!adminUserId) return res.status(401).json({ message: "Missing user id" });
//     if (!workspaceId) return res.status(422).json({ message: "workspaceId is required" });
//     if (!weekStartDate) return res.status(422).json({ message: "weekStartDate is required" });

//     await assertAdminInWorkspace(adminUserId, String(workspaceId));

//     const missingWorkers = await getMissingWorkersCount(String(workspaceId), String(weekStartDate));

//     await db.query(
//       `UPDATE scheduled_shifts SET status='published' WHERE workspace_id=? AND week_start_date=?`,
//       [workspaceId, weekStartDate]
//     );

//     return res.json({ ok: true, weekStatus: "published", missingWorkers });
//     } catch (err) {
//     return res.status(statusFromError(err)).json({ message: err.message || "Failed to publish week" });
//     }
// });

// POST /admin/schedule/week/unpublish
// Body: { workspaceId, weekStartDate }
// Unpublishes (unlocks) the week so edits are allowed again.
// router.post("/week/unpublish", requireAuth, requireRole("admin"), async (req, res) => {
//   try {
//     const adminUserId = req.user?.userId;
//     const { workspaceId, weekStartDate } = req.body;

//     if (!adminUserId) return res.status(401).json({ message: "Missing user id" });
//     if (!workspaceId) return res.status(422).json({ message: "workspaceId is required" });
//     if (!weekStartDate) return res.status(422).json({ message: "weekStartDate is required" });

//     await assertAdminInWorkspace(adminUserId, String(workspaceId));

//     await db.query(
//       `UPDATE scheduled_shifts SET status='draft' WHERE workspace_id=? AND week_start_date=?`,
//       [workspaceId, weekStartDate]
//     );

//     const missingWorkers = await getMissingWorkersCount(String(workspaceId), String(weekStartDate));

//     return res.json({ ok: true, weekStatus: "draft", missingWorkers });
//     } catch (err) {
//     return res.status(statusFromError(err)).json({ message: err.message || "Failed to unpublish week" });
//     }
// });




// ------------------------------------------------------------
// ADMIN: publish a week schedule (makes it visible to users)
// POST /admin/schedule/week/publish
// body: { weekStartDate: "YYYY-MM-DD" }
// ------------------------------------------------------------
router.post("/week/publish", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const weekStartDateRaw = req.body?.weekStartDate;
    const weekStartDate = normalizeToSundayIso(weekStartDateRaw);

    if (!weekStartDate) {
      return res.status(422).json({ message: "weekStartDate is required (YYYY-MM-DD)" });
    }

    const ws = await getMyWorkspace(req.user);
    if (!ws?.id) return res.status(403).json({ message: "Forbidden: admin has no workspace" });

    const status = await publishWeek(ws.id, weekStartDate, req.user.userId);
    return res.json({ weekStatus: status });
  } catch (err) {
    console.error("❌ POST /admin/schedule/week/publish failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// ADMIN: unpublish a week schedule (reverts to draft)
// POST /admin/schedule/week/unpublish
// body: { weekStartDate: "YYYY-MM-DD" }
// ------------------------------------------------------------
router.post("/week/unpublish", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const weekStartDateRaw = req.body?.weekStartDate;
    const weekStartDate = normalizeToSundayIso(weekStartDateRaw);

    if (!weekStartDate) {
      return res.status(422).json({ message: "weekStartDate is required (YYYY-MM-DD)" });
    }

    const ws = await getMyWorkspace(req.user);
    if (!ws?.id) return res.status(403).json({ message: "Forbidden: admin has no workspace" });

    const status = await unpublishWeek(ws.id, weekStartDate);
    return res.json({ weekStatus: status });
  } catch (err) {
    console.error("❌ POST /admin/schedule/week/unpublish failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;





