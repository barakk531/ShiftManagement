// backend/services/publishedScheduleService.js
//
// Purpose:
// - Returns the published schedule for the current user (worker/admin).
// - Only includes shifts from weeks that are published.
// - For the "my schedule" view: returns only shifts assigned to the current user.

const db = require("../db");
const { getMyWorkspace } = require("./workspaceService");

function toISODate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
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

function addDays(iso, days) {
  const s = String(iso || "").slice(0, 10);
  const [y, m, d] = s.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

async function getPublishedMyScheduleWeek(user, weekStartDateRaw) {
  const ws = await getMyWorkspace(user);
  if (!ws?.id) {
    const err = new Error("Forbidden: user has no workspace");
    err.statusCode = 403;
    throw err;
  }

  const weekStart = normalizeToSundayIso(weekStartDateRaw);
  if (!weekStart) {
    const err = new Error("weekStartDate is required (YYYY-MM-DD)");
    err.statusCode = 422;
    throw err;
  }

  const workspaceId = String(ws.id);
  const userId = String(user?.userId || "");
  if (!userId) {
    const err = new Error("Missing user id");
    err.statusCode = 401;
    throw err;
  }

  // Pull only PUBLISHED scheduled shifts where current user is assigned.
  const [rows] = await db.query(
    `
    SELECT
      ss.day_date,
      ss.id AS scheduled_shift_id,
      ss.shift_template_id,
      ss.required_count,
      dst.name AS template_name,
      dst.start_time,
      dst.end_time
    FROM scheduled_shifts ss
    JOIN scheduled_shift_assignments ssa ON ssa.scheduled_shift_id = ss.id
    JOIN daily_shift_templates dst ON dst.id = ss.shift_template_id
    WHERE ss.workspace_id = ?
      AND ss.week_start_date = ?
      AND ss.status = 'published'
      AND ssa.worker_id = ?
    ORDER BY ss.day_date, dst.sort_order, dst.start_time
    `,
    [workspaceId, weekStart, userId]
  );

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const shifts = rows
      .filter((r) => toISODate(r.day_date) === date)
      .map((r) => ({
        scheduledShiftId: r.scheduled_shift_id,
        template: {
          id: r.shift_template_id,
          name: r.template_name,
          startTime: r.start_time,
          endTime: r.end_time,
        },
      }));

    days.push({ date, shifts });
  }

  return {
    workspace: { id: workspaceId, name: ws.name || "", timezone: ws.timezone || "" },
    weekStartDate: weekStart,
    isPublished: true,
    days,
  };
}

module.exports = { getPublishedMyScheduleWeek };
