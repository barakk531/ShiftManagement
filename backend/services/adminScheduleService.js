/**
 * Schedule Service
 *
 * Purpose:
 * Builds the admin weekly schedule view (availability + persisted assignments).
 *
 * Responsibilities:
 * - Load workspace for the admin
 * - Load daily shift templates for the workspace
 * - Load worker availability submissions/items for the requested week
 * - Load persisted schedule assignments (scheduled_shifts + scheduled_shift_assignments)
 * - Merge everything into the AdminScheduleBuilder UI shape
 *
 * Not responsible for:
 * - Persisting schedules (POST /admin/schedule/week handles saving)
 * - Validating assignment rules (handled in the save layer)
 */

const db = require("../db");
const { getWeeklySchedule } = require("./adminScheduleQueryService");
const { getWeekStatus } = require("./scheduledWeekPublishService");

function toISODate(value) {
  if (!value) return "";

  if (value instanceof Date) {
    const d = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return String(value).slice(0, 10);
}


function parseISODateToUTC(iso) {
  const s = String(iso || "").slice(0, 10);
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUTCDateToISO(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateStr, days) {
  const d = parseISODateToUTC(dateStr);
  if (!d) return "";
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return formatUTCDateToISO(d);
}

function getDayOfWeek(dateStr) {
  const d = parseISODateToUTC(dateStr);
  if (!d) return 0;
  return d.getUTCDay(); // 0=Sun ... 6=Sat
}

function toISODateFromDate(d) {
  // Treat Date as UTC date-only
  return formatUTCDateToISO(d);
}

function normalizeToSundayIso(dateStr) {
  const d = parseISODateToUTC(dateStr);
  if (!d) return "";
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  d.setUTCDate(d.getUTCDate() - dow);
  return formatUTCDateToISO(d);
}


// function addDays(dateStr, days) {
//   const d = new Date(dateStr + "T00:00:00");
//   d.setDate(d.getDate() + days);
//   return d.toISOString().slice(0, 10);
// }

// function getDayOfWeek(dateStr) {
//   return new Date(dateStr + "T00:00:00").getDay(); // 0=Sun ... 6=Sat
// }

function assertNotUndefined(label, value) {
  if (value === undefined) {
    const err = new Error(`${label} is undefined`);
    err.code = "BIND_UNDEFINED";
    throw err;
  }
}

// function toISODateFromDate(d) {
//   return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
// }

// function normalizeToSundayIso(dateStr) {
//   const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
//   const day = d.getDay(); // 0=Sun..6=Sat
//   d.setDate(d.getDate() - day);
//   return toISODateFromDate(d);
// }
async function resolveAdminWorkspace(adminUserId) {
  const adminId = String(adminUserId || "");
  if (!adminId) return null;

  const [rows] = await db.execute(
    `
    SELECT w.id, w.name, w.timezone
    FROM workspaces w
    INNER JOIN workspace_admins wa ON wa.workspace_id = w.id
    WHERE wa.admin_id = ?
    LIMIT 1
    `,
    [adminId]
  );

  return rows?.[0] || null;
}

async function getAdminWeekScheduleView(adminUserId, weekStartDate) {
  console.log("ADMIN SVC LOADED", { adminUserId, weekStartDate });

  const workspace = await resolveAdminWorkspace(adminUserId);
  if (!workspace) {
    const err = new Error("Forbidden: admin has no workspace");
    err.statusCode = 403;
    throw err;
  }


  const workspaceId = workspace.id;
  if (!workspaceId) {
    const err = new Error("Workspace id is missing");
    err.code = "WORKSPACE_ID_MISSING";
    throw err;
  }

  const weekStart = normalizeToSundayIso(weekStartDate);
  if (!weekStart) {
    const err = new Error("weekStartDate is invalid");
    err.code = "INVALID_WEEK_START";
    throw err;
  }

  assertNotUndefined("workspaceId", workspaceId);
  assertNotUndefined("weekStart", weekStart);
  const weekStatus = await getWeekStatus(workspaceId, weekStart);

  // 1) Load templates (admin-defined shift templates per weekday)
  const [templates] = await db.execute(
    `
    SELECT
      id,
      day_of_week,
      name,
      start_time,
      end_time,
      sort_order,
      required_count
    FROM daily_shift_templates
    WHERE workspace_id = ?
      AND is_active = 1
    ORDER BY day_of_week, sort_order, start_time
    `,
    [workspaceId]
  );

  // 2) Load worker submissions for the week
  const [submissions] = await db.execute(
    `
    SELECT
      s.id AS submission_id,
      s.user_id,
      s.week_start_date,
      s.status,
      s.created_at,
      u.first_name,
      u.last_name
    FROM availability_submissions s
    JOIN users u ON u.id = s.user_id
    WHERE s.workspace_id = ?
      AND s.week_start_date = ?
    ORDER BY u.last_name, u.first_name
    `,
    [workspaceId, weekStart]
  );

  // 3) Load available items (only if there are submissions)
  let availabilityItems = [];
  if (submissions.length > 0) {
    const [rows] = await db.execute(
      `
      SELECT
        ai.day_date,
        ai.shift_template_id,
        u.id AS user_id,
        u.first_name,
        u.last_name
      FROM availability_items ai
      JOIN availability_submissions s ON s.id = ai.submission_id
      JOIN users u ON u.id = s.user_id
      WHERE s.workspace_id = ?
        AND s.week_start_date = ?
        AND ai.is_available = 1
      `,
      [workspaceId, weekStart]
    );
    availabilityItems = rows;
  }

  // 4) Load persisted assignments for this week (scheduled_shifts + assignments)
  // getWeeklySchedule returns array of: { dayDate, shiftTemplateId, requiredCount, assignedWorkers: [...] }
// 4) Load persisted assignments for this week (scheduled_shifts + assignments)
// getWeeklySchedule returns array of: { scheduledShiftId, dayDate, shiftTemplateId, requiredCount, assignedWorkers: [...] }
  const scheduled = await getWeeklySchedule(workspaceId, weekStart);

  // Map key: "YYYY-MM-DD_<shiftTemplateId>" -> { scheduledShiftId, assignedWorkers }
  const scheduledMap = new Map(
    scheduled.map((s) => [
      `${s.dayDate}_${s.shiftTemplateId}`,
      {
        scheduledShiftId: s.scheduledShiftId,
        assignedWorkers: s.assignedWorkers || [],
      },
    ])
  );

  // 5) Build days + shifts view
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dayOfWeek = getDayOfWeek(date);

    const dayTemplates = templates.filter(
      (t) => Number(t.day_of_week) === Number(dayOfWeek)
    );

    const shifts = dayTemplates.map((t) => {
      const availableWorkers = availabilityItems
        .filter(
          (ai) =>
            toISODate(ai.day_date) === date &&
            Number(ai.shift_template_id) === Number(t.id)
        )
        .map((ai) => ({
          id: ai.user_id,
          firstName: ai.first_name,
          lastName: ai.last_name,
        }));

      const persisted = scheduledMap.get(`${date}_${t.id}`) || null;
      const scheduledShiftId = persisted?.scheduledShiftId || null;
      const assignedWorkers = persisted?.assignedWorkers || [];

      return {
        scheduledShiftId, // important for remove (X)
        template: {
          id: t.id,
          name: t.name,
          startTime: t.start_time,
          endTime: t.end_time,
          sortOrder: t.sort_order,
        },
        requiredCount: t.required_count,
        availableWorkers,
        assignedWorkers,
      };
    });

    days.push({ date, dayOfWeek, shifts });
  }
  

  const submittedWorkers = submissions.map((s) => ({
    id: s.user_id,
    firstName: s.first_name,
    lastName: s.last_name,
    submissionId: s.submission_id,
    status: s.status,
    createdAt: s.created_at,
  }));

  return {
    workspace: {
      id: workspaceId,
      name: workspace.name,
      timezone: workspace.timezone,
    },
    weekStartDate: weekStart,
    weekStatus,
    submittedWorkers,
    days,
  };
}

module.exports = { getAdminWeekScheduleView };
