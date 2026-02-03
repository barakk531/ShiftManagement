const db = require("../db");

/**
 * Main entry: saves the full weekly schedule
 */
async function saveWeeklySchedule(workspaceId, weekStartDate, days) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    for (const day of days) {
      const { dayDate, shifts } = day;

      for (const shift of shifts) {
        const {
          shiftTemplateId,
          requiredCount,
          assignedWorkerIds = []
        } = shift;

        if (assignedWorkerIds.length > requiredCount) {
          throw new Error("Assigned workers exceed required count");
        }

        const scheduledShiftId = await upsertScheduledShift(
          conn,
          workspaceId,
          weekStartDate,
          dayDate,
          shiftTemplateId,
          requiredCount
        );

        await replaceAssignments(
          conn,
          scheduledShiftId,
          assignedWorkerIds
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}


async function upsertScheduledShift(
  conn,
  workspaceId,
  weekStartDate,
  dayDate,
  shiftTemplateId,
  requiredCount
) {
  const [result] = await conn.query(
    `
    INSERT INTO scheduled_shifts
      (workspace_id, week_start_date, day_date, shift_template_id, required_count)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      required_count = VALUES(required_count),
      updated_at = CURRENT_TIMESTAMP
    `,
    [workspaceId, weekStartDate, dayDate, shiftTemplateId, requiredCount]
  );

  if (result.insertId) {
    return result.insertId;
  }

  const [[row]] = await conn.query(
    `
    SELECT id FROM scheduled_shifts
    WHERE workspace_id = ?
      AND week_start_date = ?
      AND day_date = ?
      AND shift_template_id = ?
    `,
    [workspaceId, weekStartDate, dayDate, shiftTemplateId]
  );

  return row.id;
}


async function replaceAssignments(
  conn,
  scheduledShiftId,
  workerIds
) {
  await conn.query(
    `DELETE FROM scheduled_shift_assignments
     WHERE scheduled_shift_id = ?`,
    [scheduledShiftId]
  );

  if (!workerIds.length) return;

  const values = workerIds.map(workerId => [
    scheduledShiftId,
    workerId
  ]);

  await conn.query(
    `
    INSERT INTO scheduled_shift_assignments
      (scheduled_shift_id, worker_id)
    VALUES ?
    `,
    [values]
  );
}



module.exports = {
  saveWeeklySchedule
};
