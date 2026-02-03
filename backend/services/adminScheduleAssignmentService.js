// backend/services/adminScheduleAssignmentService.js
//
// Purpose:
// - Assign a worker to a scheduled shift.
// - Creates scheduled_shifts on demand.
// - Enforces admin permissions, capacity, duplicate prevention, and publish lock.

const db = require("../db");
const { assertAdminInWorkspace } = require("./workspaceAdminAccessService");

function todayISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function assignWorkerToShift({
  adminUserId,
  workspaceId,
  weekStartDate,
  dayDate,
  shiftTemplateId,
  workerId,
}) {
  if (!adminUserId) {
    const e = new Error("Missing adminUserId");
    e.status = 401;
    throw e;
  }
  if (!workspaceId) {
    const e = new Error("Missing workspaceId");
    e.status = 422;
    throw e;
  }
  if (!weekStartDate) {
    const e = new Error("Missing weekStartDate");
    e.status = 422;
    throw e;
  }
  if (!dayDate) {
    const e = new Error("Missing dayDate");
    e.status = 422;
    throw e;
  }
  if (!shiftTemplateId) {
    const e = new Error("Missing shiftTemplateId");
    e.status = 422;
    throw e;
  }
  if (!workerId) {
    const e = new Error("Missing workerId");
    e.status = 422;
    throw e;
  }

  await assertAdminInWorkspace(adminUserId, workspaceId);
  // Past-day lock (server-side)
  const dayISO = String(dayDate).slice(0, 10);
  if (dayISO && dayISO < todayISO()) {
  const e = new Error("Cannot assign workers to past days");
  e.status = 409;
  throw e;
  }

  // DEBUG (safe inside function)
  console.log("ASSIGN PARAMS", {
    workspaceId,
    weekStartDate,
    dayDate,
    shiftTemplateId,
    workerId,
  });

  const scheduledShiftId = await getOrCreateScheduledShift({
    workspaceId,
    weekStartDate,
    dayDate,
    shiftTemplateId,
  });

  // Publish lock check (must be AFTER we have scheduledShiftId)
  const [[st]] = await db.query(
    `SELECT status FROM scheduled_shifts WHERE id=? LIMIT 1`,
    [scheduledShiftId]
  );
  if (st?.status === "published") {
    const e = new Error("Week is published; assignments are locked");
    e.status = 409;
    throw e;
  }

  // Prevent duplicate assignments
  const [dup] = await db.query(
    `
    SELECT 1
    FROM scheduled_shift_assignments
    WHERE scheduled_shift_id = ? AND worker_id = ?
    LIMIT 1
    `,
    [scheduledShiftId, workerId]
  );
  if (dup.length > 0) {
    return { scheduledShiftId, alreadyAssigned: true };
  }

  // Capacity check
  const [[cap]] = await db.query(
    `
    SELECT
      ss.required_count AS requiredCount,
      COUNT(ssa.id) AS assignedCount
    FROM scheduled_shifts ss
    LEFT JOIN scheduled_shift_assignments ssa
      ON ssa.scheduled_shift_id = ss.id
    WHERE ss.id = ?
    GROUP BY ss.id
    `,
    [scheduledShiftId]
  );

  const requiredCount = Number(cap?.requiredCount || 0);
  const assignedCount = Number(cap?.assignedCount || 0);

  if (requiredCount > 0 && assignedCount >= requiredCount) {
    const err = new Error("Shift is full");
    err.status = 409;
    throw err;
  }

  // Add assignment
  await db.query(
    `
    INSERT INTO scheduled_shift_assignments (scheduled_shift_id, worker_id)
    VALUES (?, ?)
    `,
    [scheduledShiftId, workerId]
  );

  console.log("ASSIGNED worker", { scheduledShiftId, workerId });

  return { scheduledShiftId, assigned: true };
}

async function getOrCreateScheduledShift({
  workspaceId,
  weekStartDate,
  dayDate,
  shiftTemplateId,
}) {
  // 1) Find existing scheduled shift
  const [[existing]] = await db.query(
    `
    SELECT id
    FROM scheduled_shifts
    WHERE workspace_id = ?
      AND week_start_date = ?
      AND day_date = ?
      AND shift_template_id = ?
    LIMIT 1
    `,
    [workspaceId, weekStartDate, dayDate, shiftTemplateId]
  );

  if (existing?.id) return existing.id;

  // 2) Read required_count from template
  const [[tpl]] = await db.query(
    `
    SELECT required_count AS requiredCount
    FROM daily_shift_templates
    WHERE id = ?
    LIMIT 1
    `,
    [shiftTemplateId]
  );

  const requiredCount = Number(tpl?.requiredCount || 0);

  // 3) Insert scheduled shift (handle duplicate race)
  try {
    const [ins] = await db.query(
      `
      INSERT INTO scheduled_shifts
        (workspace_id, week_start_date, day_date, shift_template_id, required_count, status)
      VALUES (?, ?, ?, ?, ?, 'draft')
      `,
      [workspaceId, weekStartDate, dayDate, shiftTemplateId, requiredCount]
    );
    return ins.insertId;
  } catch (e) {
    // Race -> select again
    const [[after]] = await db.query(
      `
      SELECT id
      FROM scheduled_shifts
      WHERE workspace_id = ?
        AND week_start_date = ?
        AND day_date = ?
        AND shift_template_id = ?
      LIMIT 1
      `,
      [workspaceId, weekStartDate, dayDate, shiftTemplateId]
    );
    if (after?.id) return after.id;
    throw e;
  }
}

module.exports = { assignWorkerToShift };
