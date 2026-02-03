// backend/services/adminScheduleQueryService.js
//
// Read-only query for persisted schedules (scheduled_shifts + assignments + users).
// Returns a FLAT array of shifts:
// [
//   {
//     scheduledShiftId,
//     dayDate,
//     shiftTemplateId,
//     requiredCount,
//     shiftName,
//     startTime,
//     endTime,
//     assignedWorkers: [{ id, workerId, firstName, lastName }]
//   },
//   ...
// ]

const db = require("../db");

function toISODate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    const d = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof value === "string") return value.slice(0, 10);
  return String(value).slice(0, 10);
}

async function getWeeklySchedule(workspaceId, weekStartDate) {
  const [rows] = await db.query(
    `
    SELECT
      ss.id AS scheduledShiftId,
      ss.day_date AS dayDate,
      ss.shift_template_id AS shiftTemplateId,
      ss.required_count AS requiredCount,

      dst.name AS shiftName,
      dst.start_time AS startTime,
      dst.end_time AS endTime,

      u.id AS workerId,
      u.first_name AS firstName,
      u.last_name AS lastName

    FROM scheduled_shifts ss

    JOIN daily_shift_templates dst
      ON dst.id = ss.shift_template_id

    LEFT JOIN scheduled_shift_assignments ssa
      ON ssa.scheduled_shift_id = ss.id

    LEFT JOIN users u
      ON u.id = ssa.worker_id

    WHERE ss.workspace_id = ?
      AND ss.week_start_date = ?

    ORDER BY ss.day_date, dst.start_time
    `,
    [workspaceId, weekStartDate]
  );

  return normalize(rows);
}


function normalize(rows) {
  const map = new Map();

  for (const r of rows) {
    const dayDate = toISODate(r.dayDate);
    const shiftTemplateId = r.shiftTemplateId;
    const key = `${dayDate}_${shiftTemplateId}`;

    if (!map.has(key)) {
      map.set(key, {
        scheduledShiftId: r.scheduledShiftId,
        dayDate,
        shiftTemplateId,
        requiredCount: Number(r.requiredCount || 0),
        shiftName: r.shiftName || "Shift",
        startTime: r.startTime || "",
        endTime: r.endTime || "",
        assignedWorkers: [],
      });
    }

    const shift = map.get(key);

    if (r.workerId) {
      shift.assignedWorkers.push({
        id: r.workerId,
        workerId: r.workerId,
        firstName: r.firstName || "",
        lastName: r.lastName || "",
      });
    }
  }

  return Array.from(map.values());
}


module.exports = { getWeeklySchedule };

// function normalizeFlat(rows) {
//   const shiftMap = new Map();

//   for (const r of rows) {
//     const scheduledShiftId = r.scheduledShiftId;
//     if (!scheduledShiftId) continue;

//     if (!shiftMap.has(String(scheduledShiftId))) {
//       shiftMap.set(String(scheduledShiftId), {
//         scheduledShiftId: r.scheduledShiftId,
//         dayDate: toISODate(r.dayDate),
//         shiftTemplateId: r.shiftTemplateId,
//         requiredCount: Number(r.requiredCount || 0),

//         shiftName: r.shiftName || "Shift",
//         startTime: r.startTime || "",
//         endTime: r.endTime || "",

//         assignedWorkers: [],
//       });
//     }

//     const shift = shiftMap.get(String(scheduledShiftId));

//     if (r.workerId) {
//       shift.assignedWorkers.push({
//         id: r.workerId,
//         workerId: r.workerId,
//         firstName: r.firstName || "",
//         lastName: r.lastName || "",
//       });
//     }
//   }

//   return Array.from(shiftMap.values());
// }

