// backend/services/adminScheduleRemoveAssignmentService.js
//
// Purpose:
// - Remove a worker assignment from a scheduled shift.
// - Enforces admin permissions and publish lock rules.

const db = require("../db");
const { assertAdminInWorkspace } = require("./workspaceAdminAccessService");

function todayISO() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function removeAssignmentByScheduledShiftId(
  adminUserId,
  workspaceId,
  scheduledShiftId,
  workerId
) {
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

  if (!scheduledShiftId || Number(scheduledShiftId) <= 0) {
    const e = new Error("Invalid scheduledShiftId");
    e.status = 422;
    throw e;
  }

  if (!workerId) {
    const e = new Error("Missing workerId");
    e.status = 422;
    throw e;
  }

  // Permission check
  await assertAdminInWorkspace(adminUserId, workspaceId);

  // Check publish lock
  const [[shift]] = await db.query(
    `
    SELECT status, day_date AS dayDate
    FROM scheduled_shifts
    WHERE id = ?
      AND workspace_id = ?
    LIMIT 1
    `,
    [scheduledShiftId, workspaceId]
  );

  if (!shift) {
    const e = new Error("Scheduled shift not found");
    e.status = 404;
    throw e;
  }

  const shiftDayISO = String(shift.dayDate || "").slice(0, 10);

  if (shiftDayISO && shiftDayISO < todayISO()) {
  const e = new Error("Cannot remove workers from past days");
  e.status = 409;
  throw e;
  }

  if (shift.status === "published") {
    const e = new Error("Week is published; assignments are locked");
    e.status = 409;
    throw e;
  }

  // Delete assignment
  const [result] = await db.query(
    `
    DELETE FROM scheduled_shift_assignments
    WHERE scheduled_shift_id = ?
      AND worker_id = ?
    `,
    [scheduledShiftId, workerId]
  );

  if (result.affectedRows === 0) {
    const e = new Error("Assignment not found");
    e.status = 404;
    throw e;
  }

  return {
    removed: true,
    scheduledShiftId,
    workerId,
  };
}

module.exports = {
  removeAssignmentByScheduledShiftId,
};




