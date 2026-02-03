// backend/services/availabilityService.js
//
// Purpose:
// - Worker next-week bundle + save submission.
// - Works with multi-workspace workers by requiring workspaceId (active workspace).
// - Uses daily_shift_templates (templates per weekday).
//
// Notes:
// - All comments are in English only (per request).

const db = require("../db");
const { DateTime } = require("luxon");
const { v4: uuidv4 } = require("uuid");

// Luxon weekday: 1=Mon ... 7=Sun
// DB day_of_week: 0=Sun ... 6=Sat
function luxonToDbDow(dt) {
  return dt.weekday === 7 ? 0 : dt.weekday;
}

function assert(cond, msg, statusCode = 400) {
  if (!cond) {
    const e = new Error(msg);
    e.statusCode = statusCode;
    throw e;
  }
}

function isAlwaysOpen() {
  return String(process.env.AVAILABILITY_WINDOW_ALWAYS_OPEN || "").toLowerCase() === "true";
}

function isInsideSubmissionWindow(nowTz) {
  if (isAlwaysOpen()) return true;
  // TODO: implement real window rules if needed.
  return true;
}

function getNextWeekSundayStart(nowTz) {
  // "next week" = upcoming Sunday 00:00 (in workspace timezone)
  // If today is Sunday, treat next week as 7 days ahead.
  const startOfToday = nowTz.startOf("day");
  const dbDow = luxonToDbDow(startOfToday); // 0..6
  const daysUntilSunday = (7 - dbDow) % 7;
  const add = daysUntilSunday === 0 ? 7 : daysUntilSunday;
  return startOfToday.plus({ days: add }).startOf("day");
}

function buildHoursByDow(rows) {
  const map = {};
  for (const r of rows || []) {
    map[Number(r.day_of_week)] = r;
  }
  return map;
}

async function getOperatingHours(workspaceId) {
  const [rows] = await db.execute(
    `
    SELECT day_of_week, is_closed, open_time, close_time
    FROM workspace_operating_hours
    WHERE workspace_id = ?
    ORDER BY day_of_week
    `,
    [workspaceId]
  );
  return rows || [];
}

// Uses daily_shift_templates (templates per weekday).
async function getActiveTemplates(workspaceId) {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      day_of_week,
      name,
      start_time,
      end_time,
      required_count,
      sort_order,
      is_active
    FROM daily_shift_templates
    WHERE workspace_id = ? AND is_active = 1
    ORDER BY day_of_week ASC, sort_order ASC, start_time ASC
    `,
    [workspaceId]
  );

  return (rows || []).map((r) => ({
    id: Number(r.id), // INT
    dayOfWeek: Number(r.day_of_week), // 0..6
    name: r.name,
    startTime: r.start_time,
    endTime: r.end_time,
    requiredCount: Number(r.required_count || 1),
    sortOrder: Number(r.sort_order || 0),
  }));
}

async function getOrCreateSubmission({ userId, workspaceId, weekStartDate }) {
  const [found] = await db.execute(
    `
    SELECT id
    FROM availability_submissions
    WHERE user_id = ? AND workspace_id = ? AND week_start_date = ?
    LIMIT 1
    `,
    [userId, workspaceId, weekStartDate]
  );

  if (found && found.length) return found[0].id;

  const id = uuidv4();
  await db.execute(
    `
    INSERT INTO availability_submissions (id, user_id, workspace_id, week_start_date, created_at)
    VALUES (?, ?, ?, ?, NOW())
    `,
    [id, userId, workspaceId, weekStartDate]
  );

  return id;
}

async function loadWorkspaceBasics(workspaceId) {
  const [rows] = await db.execute(
    `
    SELECT id, name, timezone
    FROM workspaces
    WHERE id = ?
    LIMIT 1
    `,
    [workspaceId]
  );
  return rows?.[0] || null;
}

// ========================================================================
// PUBLIC API
// ========================================================================

async function getNextWeekBundle({ userId, workspaceId }) {
  assert(userId, "Unauthorized", 401);
  assert(workspaceId, "No active workspace selected.", 422);

  const ws = await loadWorkspaceBasics(workspaceId);
  assert(ws, "Workspace not found.", 404);

  const tz = ws.timezone || "Asia/Jerusalem";
  const nowTz = DateTime.now().setZone(tz);

  const nextWeekStart = getNextWeekSundayStart(nowTz);
  const weekStartDate = nextWeekStart.toISODate(); // YYYY-MM-DD

  const windowOpen = isInsideSubmissionWindow(nowTz);

  const templates = await getActiveTemplates(workspaceId);

  const hoursRows = await getOperatingHours(workspaceId);
  const hoursByDow = buildHoursByDow(hoursRows);

  const submissionId = await getOrCreateSubmission({
    userId,
    workspaceId,
    weekStartDate,
  });

  const [itemRows] = await db.execute(
    `
    SELECT day_date, shift_template_id, is_available
    FROM availability_items
    WHERE submission_id = ?
    `,
    [submissionId]
  );

  const items = (itemRows || []).map((r) => ({
    dayDate: r.day_date,
    shiftTemplateId: Number(r.shift_template_id), // INT
    isAvailable: !!r.is_available,
  }));

  const templatesByDow = {};
  for (const t of templates) {
    const dow = Number(t.dayOfWeek);
    if (!templatesByDow[dow]) templatesByDow[dow] = [];
    templatesByDow[dow].push(t);
  }

  const days = Array.from({ length: 7 }).map((_, i) => {
    const dt = nextWeekStart.plus({ days: i });
    const date = dt.toISODate();
    const dow = luxonToDbDow(dt);

    const oh = hoursByDow[dow] || {};
    const isClosed = Number(oh.is_closed) === 1;

    return {
      date,
      dayOfWeek: dow,
      isClosed,
      openTime: oh.open_time || null,
      closeTime: oh.close_time || null,
      shifts: templatesByDow[dow] || [],
    };
  });

  return {
    workspace: { id: ws.id, name: ws.name, timezone: tz },
    weekStartDate,
    windowOpen,
    submissionId,
    days,
    items,
  };
}

async function saveNextWeekAvailability({ userId, workspaceId }, payload) {
  assert(userId, "Unauthorized", 401);
  assert(workspaceId, "No active workspace selected.", 422);

  assert(payload && typeof payload === "object", "Invalid payload.", 422);
  assert(
    typeof payload.weekStartDate === "string" && payload.weekStartDate.length >= 10,
    "weekStartDate is required.",
    422
  );
  assert(Array.isArray(payload.items), "items array is required.", 422);

  const ws = await loadWorkspaceBasics(workspaceId);
  assert(ws, "Workspace not found.", 404);

  const tz = ws.timezone || "Asia/Jerusalem";
  const nowTz = DateTime.now().setZone(tz);
  assert(isInsideSubmissionWindow(nowTz), "Submission window is closed.", 403);

  const submissionId = await getOrCreateSubmission({
    userId,
    workspaceId,
    weekStartDate: payload.weekStartDate,
  });

  const templates = await getActiveTemplates(workspaceId);
  const templateIdSet = new Set((templates || []).map((t) => Number(t.id)));

  const normalized = [];
  for (const it of payload.items) {
    assert(it && typeof it === "object", "Invalid item.", 422);
    assert(typeof it.dayDate === "string" && it.dayDate.length >= 10, "dayDate is required.", 422);

    const shiftTemplateId = Number(it.shiftTemplateId);
    assert(Number.isInteger(shiftTemplateId) && shiftTemplateId > 0, "shiftTemplateId must be a number.", 422);
    assert(templateIdSet.has(shiftTemplateId), "shiftTemplateId does not belong to this workspace.", 422);

    normalized.push({
      day_date: it.dayDate,
      shift_template_id: shiftTemplateId, // INT
      is_available: it.isAvailable ? 1 : 0,
    });
  }

  for (const row of normalized) {
    await db.execute(
      `
      INSERT INTO availability_items (id, submission_id, day_date, shift_template_id, is_available)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)
      `,
      [uuidv4(), submissionId, row.day_date, row.shift_template_id, row.is_available]
    );
  }

  return { ok: true, submissionId };
}

module.exports = {
  getNextWeekBundle,
  saveNextWeekAvailability,
};



// // backend/services/availabilityService.js
// // Full ready-to-paste file (Worker next-week bundle + save submission)
// // Assumptions (match your project structure from screenshots):
// // - db pool is exported from: ../db (backend/db/index.js)
// // - workspace helpers exist in: ./workspaceService (getMyWorkspace, getOperatingHours)
// // - You already have: assert(), getNextWeekSundayStart(), isInsideSubmissionWindow(), buildHoursByDow(), getOrCreateSubmission()
// //   If any of these already exist in THIS file, keep your versions and remove duplicates below.

// const db = require("../db"); // <-- if your pool export path differs, change it to: require("../db/index") etc.
// const { DateTime } = require("luxon");
// const { v4: uuidv4 } = require("uuid");

// const { getMyWorkspace, getOperatingHours } = require("./workspaceService");

// // ----------------- small utils -----------------
// function assert(cond, msg, status = 400) {
//   if (!cond) {
//     const e = new Error(msg);
//     e.status = status;
//     throw e;
//   }
// }

// // Luxon weekday: 1=Mon ... 7=Sun
// // DB day_of_week: 0=Sun ... 6=Sat
// function luxonToDbDow(dt) {
//   return dt.weekday === 7 ? 0 : dt.weekday;
// }

// // ----------------- existing helpers you likely already have -----------------
// // If you already have these in this file, delete these duplicates and keep yours.

// function isInsideSubmissionWindow(nowTz) {
//   // Keep your existing logic if you already built a real window.
//   // Default: always open.
//   return true;
// }

// function getNextWeekSundayStart(nowTz) {
//   // "next week" = upcoming Sunday 00:00 (in workspace timezone)
//   // If today is Sunday, we treat "next week" as the coming Sunday (7 days ahead).
//   const startOfToday = nowTz.startOf("day");
//   const dbDow = luxonToDbDow(startOfToday); // 0..6
//   const daysUntilSunday = (7 - dbDow) % 7;
//   const add = daysUntilSunday === 0 ? 7 : daysUntilSunday;
//   return startOfToday.plus({ days: add }).startOf("day");
// }

// function buildHoursByDow(rows) {
//   const map = {};
//   for (const r of rows || []) {
//     map[Number(r.day_of_week)] = r;
//   }
//   return map;
// }

// async function getOrCreateSubmission(dbConn, { userId, workspaceId, weekStartDate }) {
//   const [found] = await dbConn.execute(
//     `SELECT id
//      FROM availability_submissions
//      WHERE user_id = ? AND workspace_id = ? AND week_start_date = ?
//      LIMIT 1`,
//     [userId, workspaceId, weekStartDate]
//   );

//   if (found && found.length) return found[0].id;

//   const id = uuidv4();

//   await dbConn.execute(
//     `INSERT INTO availability_submissions (id, user_id, workspace_id, week_start_date, created_at)
//      VALUES (?, ?, ?, ?, NOW())`,
//     [id, userId, workspaceId, weekStartDate]
//   );

//   return id;
// }


// // ----------------- Daily Shift Templates fetch (IMPORTANT) -----------------
// async function getActiveTemplates(dbConn, workspaceId) {
//   const [rows] = await dbConn.execute(
//     `SELECT
//         id,
//         day_of_week,
//         name,
//         start_time,
//         end_time,
//         required_count,
//         sort_order,
//         is_active
//      FROM daily_shift_templates
//      WHERE workspace_id = ? AND is_active = 1
//      ORDER BY day_of_week ASC, sort_order ASC, start_time ASC`,
//     [workspaceId]
//   );

//   // normalize: also expose .weekday (0-6) for code convenience
//   return (rows || []).map((r) => ({
//     ...r,
//     weekday: Number(r.day_of_week),
//   }));
// }

// // ========================================================================
// //  PUBLIC API
// // ========================================================================

// // WORKER: get next week bundle (days + shifts per-day + existing submission)
// async function getNextWeekBundle(userId) {
//   const ws = await getMyWorkspace(req.user);
//   assert(ws, "No workspace selected.", 422);

//   const tz = ws.timezone || "Asia/Jerusalem";
//   const nowTz = DateTime.now().setZone(tz);

//   const nextWeekStart = getNextWeekSundayStart(nowTz);
//   const weekStartDate = nextWeekStart.toISODate(); // YYYY-MM-DD

//   const windowOpen = isInsideSubmissionWindow(nowTz);

//   // templates
//   const templates = await getActiveTemplates(db, ws.id);

//   // operating hours
//   const hoursRows = await getOperatingHours(ws.id);
//   const hoursByDow = buildHoursByDow(hoursRows);

//   // ensure submission exists
//   const submissionId = await getOrCreateSubmission(db, {
//     userId,
//     workspaceId: ws.id,
//     weekStartDate,
//   });

//   // existing items
//   const [itemRows] = await db.execute(
//     `SELECT day_date, shift_template_id, is_available
//      FROM availability_items
//      WHERE submission_id = ?`,
//     [submissionId]
//   );

//   const items = itemRows || [];

//   // group templates by weekday
//   const templatesByDay = {};
//   for (const t of templates || []) {
//     const dow = Number(t.weekday);
//     if (!templatesByDay[dow]) templatesByDay[dow] = [];
//     templatesByDay[dow].push(t);
//   }

//   // build days (Sun..Sat)
//   const days = Array.from({ length: 7 }).map((_, i) => {
//     const dt = nextWeekStart.plus({ days: i });
//     const date = dt.toISODate();
//     const dow = luxonToDbDow(dt);

//     const oh = hoursByDow[dow] || {};
//     const isClosed = !!oh.is_closed;

//     return {
//       date,
//       dayOfWeek: dow,
//       isClosed,
//       openTime: oh.open_time || null,
//       closeTime: oh.close_time || null,
//       shifts: templatesByDay[dow] || [],
//     };
//   });

//   return {
//     workspace: { id: ws.id, name: ws.name, timezone: tz },
//     weekStartDate,
//     windowOpen,
//     submissionId,
//     days,
//     items,
//     operatingHours: hoursRows,
//   };
// }

// // WORKER: save next week availability
// async function saveNextWeekAvailability(userId, payload) {
//   const dbConn = db;

//   assert(payload && typeof payload === "object", "Invalid payload.", 422);
//   assert(typeof payload.weekStartDate === "string" && payload.weekStartDate.length >= 10, "weekStartDate is required.", 422);
//   assert(Array.isArray(payload.items), "items array is required.", 422);

//   const ws = await getMyWorkspace(req.user);
//   assert(ws, "No workspace selected.", 422);

//   const tz = ws.timezone || "Asia/Jerusalem";
//   const nowTz = DateTime.now().setZone(tz);

//   assert(isInsideSubmissionWindow(nowTz), "Submission window is closed.", 403);

//   // ensure submission exists for that weekStartDate
//   const submissionId = await getOrCreateSubmission(dbConn, {
//     userId,
//     workspaceId: ws.id,
//     weekStartDate: payload.weekStartDate,
//   });

//   // Load valid templates for this workspace (active only)
//   const templates = await getActiveTemplates(dbConn, ws.id);
//   const templateMap = new Map((templates || []).map((t) => [Number(t.id), t])); // KEY = NUMBER

//   // Normalize + validate items
//   const normalized = [];
//   for (const it of payload.items) {
//     assert(it && typeof it === "object", "Invalid item.", 422);
//     assert(typeof it.dayDate === "string" && it.dayDate.length >= 10, "dayDate is required.", 422);

//     const rawId = it.shiftTemplateId;

//     const shiftTemplateId = Number(rawId);
//     assert(Number.isInteger(shiftTemplateId) && shiftTemplateId > 0, "shiftTemplateId must be a valid number string.", 422);

//     const template = templateMap.get(shiftTemplateId);
//     assert(template, "shiftTemplateId does not belong to this workspace (or template inactive).", 422);

//     normalized.push({
//       day_date: it.dayDate,
//       shift_template_id: shiftTemplateId, // NUMBER in DB
//       is_available: it.isAvailable ? 1 : 0,
//     });
//   }

//   // Upsert items (requires UNIQUE KEY on (submission_id, day_date, shift_template_id))
//   for (const row of normalized) {
//     await dbConn.execute(
//       `INSERT INTO availability_items (id, submission_id, day_date, shift_template_id, is_available)
//       VALUES (?, ?, ?, ?, ?)
//       ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)`,
//       [uuidv4(), submissionId, row.day_date, row.shift_template_id, row.is_available]
//     );
//   }

//   return { ok: true, submissionId };
// }

// module.exports = {
//   getNextWeekBundle,
//   saveNextWeekAvailability,
// };
