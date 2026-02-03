const db = require("../db");
const { getMyWorkspace } = require("./workspaceService");

function isoDay(dateStr) {
  return String(dateStr).slice(0, 10);
}

async function saveAdminWeekSchedule(adminUserId, weekStartDate, days) {
  if (!Array.isArray(days)) {
    const e = new Error("days must be an array");
    e.statusCode = 422;
    throw e;
  }

  const workspace = await getMyWorkspace(adminUserId);
  if (!workspace) {
    const e = new Error("Workspace not found");
    e.statusCode = 404;
    throw e;
  }

  const workspaceId = workspace?.id || workspace?.workspace_id || workspace?.workspaceId;
  if (!workspaceId) {
    const e = new Error("Workspace id is missing");
    e.statusCode = 500;
    throw e;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let upsertedShifts = 0;
    let insertedAssignments = 0;

    for (const day of days) {
      const dayDate = isoDay(day.dayDate);
      const shifts = Array.isArray(day.shifts) ? day.shifts : [];

      for (const s of shifts) {
        const shiftTemplateId = Number(s.shiftTemplateId);
        const requiredCount = Number(s.requiredCount || 0);
        const assignedWorkerIds = Array.isArray(s.assignedWorkerIds) ? s.assignedWorkerIds : [];

        if (!shiftTemplateId || !dayDate) continue;

        if (requiredCount >= 0 && assignedWorkerIds.length > requiredCount) {
          const e = new Error(
            `Assigned workers (${assignedWorkerIds.length}) exceed requiredCount (${requiredCount}) for template ${shiftTemplateId} on ${dayDate}`
          );
          e.statusCode = 422;
          throw e;
        }

        // Upsert scheduled_shifts (requires UNIQUE KEY on workspace_id, week_start_date, day_date, shift_template_id)
        const [result] = await conn.execute(
          `
          INSERT INTO scheduled_shifts (
            workspace_id, week_start_date, day_date, shift_template_id, required_count, status
          )
          VALUES (?, ?, ?, ?, ?, 'draft')
          ON DUPLICATE KEY UPDATE
            id = LAST_INSERT_ID(id),
            required_count = VALUES(required_count),
            updated_at = CURRENT_TIMESTAMP
          `,
          [workspaceId, weekStartDate, dayDate, shiftTemplateId, requiredCount]
        );

        const scheduledShiftId = result.insertId;
        upsertedShifts += 1;

        // Replace assignments for this scheduled shift
        await conn.execute(
          `DELETE FROM scheduled_shift_assignments WHERE scheduled_shift_id = ?`,
          [scheduledShiftId]
        );

        for (const workerId of assignedWorkerIds) {
          await conn.execute(
            `INSERT INTO scheduled_shift_assignments (scheduled_shift_id, worker_id) VALUES (?, ?)`,
            [scheduledShiftId, workerId]
          );
          insertedAssignments += 1;
        }
      }
    }

    await conn.commit();

    return {
      weekStartDate,
      upsertedShifts,
      insertedAssignments,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { saveAdminWeekSchedule };
