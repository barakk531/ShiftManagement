// backend/services/workspaceService.js
//
// Purpose:
// - Workspace access and selection logic.
// - Workers can belong to multiple workspaces via workspace_workers.
// - Admins are linked to exactly one workspace via workspace_admins.
// - Active workspace for a user is tracked by users.active_workspace_id.
//
// Notes:
// - All comments are in English only (per request).

const { v4: uuidv4 } = require("uuid");
const db = require("../db");

function presetTemplates(industryType) {
  if (industryType === "office") {
    return [
      { name: "Morning", start: "08:00:00", end: "13:30:00", required: 2 },
      { name: "Afternoon", start: "13:30:00", end: "19:00:00", required: 2 },
    ];
  }

  if (industryType === "restaurant") {
    return [
      { name: "Prep", start: "06:00:00", end: "11:00:00", required: 2 },
      { name: "Lunch", start: "11:00:00", end: "17:00:00", required: 3 },
      { name: "Dinner", start: "17:00:00", end: "01:00:00", required: 4 }, // crosses midnight
    ];
  }

  if (industryType === "casino") {
    return [
      { name: "Morning", start: "08:00:00", end: "16:00:00", required: 4 },
      { name: "Evening", start: "16:00:00", end: "00:00:00", required: 4 },
      { name: "Night", start: "00:00:00", end: "08:00:00", required: 4 },
    ];
  }

  return [{ name: "Shift A", start: "09:00:00", end: "17:00:00", required: 1 }];
}

// ------------------------------------------------------------
// Workspace resolution
// ------------------------------------------------------------

async function getMyWorkspace(user) {
  if (!user) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  const userId = String(user.userId || "");
  const role = String(user.role || "").toLowerCase();

  if (!userId) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  // Admin: resolve via workspace_admins (admin_id is UUID string)
  if (role === "admin") {
    const [rows] = await db.execute(
      `
      SELECT w.*
      FROM workspaces w
      INNER JOIN workspace_admins wa ON wa.workspace_id = w.id
      WHERE wa.admin_id = ?
      LIMIT 1
      `,
      [userId]
    );

    return rows?.[0] || null;
  }

  // Worker: resolve via users.active_workspace_id
  const [rows] = await db.execute(
    `
    SELECT w.*
    FROM workspaces w
    INNER JOIN users u ON u.active_workspace_id = w.id
    WHERE u.id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows?.[0] || null;
}

async function setActiveWorkspace(userId, workspaceId) {
  const uid = String(userId || "");
  if (!uid) return false;

  const [res] = await db.execute(
    `
    UPDATE users
    SET active_workspace_id = ?
    WHERE id = ?
    `,
    [workspaceId, uid]
  );

  const affectedRows = Number(res?.affectedRows || 0);
  return affectedRows > 0;
}

// ------------------------------------------------------------
// Worker workspace selection (Select Workspace flow)
// ------------------------------------------------------------

async function listAvailableWorkspacesForWorker(userId) {
  const uid = String(userId || "");
  if (!uid) return [];

  const [rows] = await db.execute(
    `
    SELECT
      w.id,
      w.name,
      w.industry_type,
      w.timezone,
      w.created_at,
      ww.status AS membership_status
    FROM workspaces w
    LEFT JOIN workspace_workers ww
      ON ww.workspace_id = w.id
     AND ww.worker_id = ?
    ORDER BY w.name ASC
    `,
    [uid]
  );

  return rows || [];
}

async function joinWorkspaceAsWorker(userId, workspaceId) {
  const uid = String(userId || "");
  if (!uid) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  const [wrows] = await db.execute(`SELECT id FROM workspaces WHERE id = ? LIMIT 1`, [workspaceId]);
  if (!wrows?.[0]) {
    const err = new Error("Workspace not found");
    err.statusCode = 404;
    throw err;
  }

  const [existing] = await db.execute(
    `
    SELECT workspace_id, status
    FROM workspace_workers
    WHERE worker_id = ? AND workspace_id = ?
    LIMIT 1
    `,
    [uid, workspaceId]
  );

  if (!existing?.[0]) {
    await db.execute(
      `
      INSERT INTO workspace_workers (id, worker_id, workspace_id, status)
      VALUES (?, ?, ?, 'active')
      `,
      [uuidv4(), uid, workspaceId]
    );
  } else if (existing[0].status !== "active") {
    await db.execute(
      `
      UPDATE workspace_workers
      SET status = 'active'
      WHERE worker_id = ? AND workspace_id = ?
      `,
      [uid, workspaceId]
    );
  }

  await setActiveWorkspace(uid, workspaceId);

  const [rows] = await db.execute(`SELECT * FROM workspaces WHERE id = ? LIMIT 1`, [workspaceId]);
  return rows?.[0] || null;
}

// ------------------------------------------------------------
// Workspace creation (Admin)
// ------------------------------------------------------------

async function assertAdminOwnsWorkspace(adminUserId, workspaceId) {
  const adminId = String(adminUserId || "");
  if (!adminId) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  const [rows] = await db.execute(
    `
    SELECT w.id
    FROM workspaces w
    INNER JOIN workspace_admins wa ON wa.workspace_id = w.id
    WHERE w.id = ? AND wa.admin_id = ?
    LIMIT 1
    `,
    [workspaceId, adminId]
  );

  if (!rows || rows.length === 0) {
    const err = new Error("Forbidden: you do not own this workspace.");
    err.statusCode = 403;
    throw err;
  }
}

async function createWorkspace({ adminUserId, name, industryType, timezone }) {
  const adminId = String(adminUserId || "");
  if (!adminId) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  const [existing] = await db.execute(
    `
    SELECT w.id
    FROM workspaces w
    INNER JOIN workspace_admins wa ON wa.workspace_id = w.id
    WHERE wa.admin_id = ?
    LIMIT 1
    `,
    [adminId]
  );

  if (existing?.[0]) {
    return { alreadyExists: true, workspaceId: existing[0].id };
  }

  const workspaceId = uuidv4();

  await db.execute(
    `
    INSERT INTO workspaces (id, name, industry_type, timezone, created_by_admin_id)
    VALUES (?, ?, ?, ?, ?)
    `,
    [workspaceId, name, industryType || "other", timezone || "Asia/Jerusalem", adminId]
  );

  await db.execute(
    `
    INSERT INTO workspace_admins (id, workspace_id, admin_id)
    VALUES (?, ?, ?)
    `,
    [uuidv4(), workspaceId, adminId]
  );

  await setActiveWorkspace(adminId, workspaceId);

  // Create DAILY shift templates (per weekday) from preset templates.
  // This matches your schema: daily_shift_templates(required_count, day_of_week, ...)
  const templates = presetTemplates(industryType || "other");

  for (let dow = 0; dow <= 6; dow += 1) {
    for (let i = 0; i < templates.length; i += 1) {
      const t = templates[i];

      await db.execute(
        `
        INSERT INTO daily_shift_templates
          (workspace_id, day_of_week, name, start_time, end_time, sort_order, required_count, is_active)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [workspaceId, dow, t.name, t.start, t.end, i, Number(t.required || 1)]
      );
    }
  }

  return { workspaceId, templatesCount: templates.length * 7 };
}

// ------------------------------------------------------------
// Templates (legacy) - keep only if your UI/routes still use shift_templates
// If you fully migrated to daily_shift_templates, you can remove this later.
// ------------------------------------------------------------

async function getShiftTemplates(workspaceId) {
  const [rows] = await db.execute(
    `
    SELECT id, name, start_time, end_time, required_workers, is_active
    FROM shift_templates
    WHERE workspace_id = ? AND is_active = 1
    ORDER BY start_time
    `,
    [workspaceId]
  );
  return rows;
}

// ------------------------------------------------------------
// Workspace lists
// ------------------------------------------------------------

async function listWorkspaces() {
  const [rows] = await db.execute(
    `
    SELECT id, name, industry_type, timezone
    FROM workspaces
    ORDER BY created_at DESC
    `
  );
  return rows;
}

// ------------------------------------------------------------
// Operating hours
// ------------------------------------------------------------

async function upsertOperatingHours(workspaceId, hoursArray) {
  for (const h of hoursArray) {
    const dayOfWeek = Number(h.dayOfWeek);
    const isClosed = h.isClosed ? 1 : 0;
    const openTime = isClosed ? null : h.openTime;
    const closeTime = isClosed ? null : h.closeTime;

    const [existing] = await db.execute(
      `
      SELECT id
      FROM workspace_operating_hours
      WHERE workspace_id = ? AND day_of_week = ?
      LIMIT 1
      `,
      [workspaceId, dayOfWeek]
    );

    if (existing[0]) {
      await db.execute(
        `
        UPDATE workspace_operating_hours
        SET is_closed = ?, open_time = ?, close_time = ?
        WHERE id = ?
        `,
        [isClosed, openTime, closeTime, existing[0].id]
      );
    } else {
      await db.execute(
        `
        INSERT INTO workspace_operating_hours
          (id, workspace_id, day_of_week, is_closed, open_time, close_time)
        VALUES
          (?, ?, ?, ?, ?, ?)
        `,
        [uuidv4(), workspaceId, dayOfWeek, isClosed, openTime, closeTime]
      );
    }
  }
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
  return rows;
}

module.exports = {
  getMyWorkspace,
  createWorkspace,
  listWorkspaces,

  listAvailableWorkspacesForWorker,
  joinWorkspaceAsWorker,
  setActiveWorkspace,

  getShiftTemplates,

  assertAdminOwnsWorkspace,

  upsertOperatingHours,
  getOperatingHours,
};





// // backend/services/workspaceService.js
// //
// // Purpose:
// // - Workspace access and selection logic.
// // - Workers can belong to multiple workspaces via workspace_workers.
// // - Admins are linked to exactly one workspace via workspace_admins.
// // - Active workspace for a user is tracked by users.active_workspace_id.
// //
// // Notes:
// // - All comments are in English only (per request).

// const { v4: uuidv4 } = require("uuid");
// const db = require("../db");

// function presetTemplates(industryType) {
//   if (industryType === "office") {
//     return [
//       { name: "Morning", start: "08:00:00", end: "13:30:00", required: 2 },
//       { name: "Afternoon", start: "13:30:00", end: "19:00:00", required: 2 },
//     ];
//   }

//   if (industryType === "restaurant") {
//     return [
//       { name: "Prep", start: "06:00:00", end: "11:00:00", required: 2 },
//       { name: "Lunch", start: "11:00:00", end: "17:00:00", required: 3 },
//       { name: "Dinner", start: "17:00:00", end: "01:00:00", required: 4 }, // crosses midnight
//     ];
//   }

//   if (industryType === "casino") {
//     return [
//       { name: "Morning", start: "08:00:00", end: "16:00:00", required: 4 },
//       { name: "Evening", start: "16:00:00", end: "00:00:00", required: 4 },
//       { name: "Night", start: "00:00:00", end: "08:00:00", required: 4 },
//     ];
//   }

//   return [{ name: "Shift A", start: "09:00:00", end: "17:00:00", required: 1 }];
// }

// // ------------------------------------------------------------
// // Workspace resolution
// // ------------------------------------------------------------

// async function getMyWorkspace(user) {
//   if (!user) {
//     const err = new Error("Unauthorized");
//     err.statusCode = 401;
//     throw err;
//   }

//   const userId = Number(user.userId);
//   const role = String(user.role || "").toLowerCase();

//   // Admin: resolve via workspace_admins
//   if (role === "admin") {
//     const [rows] = await db.execute(
//       `
//       SELECT w.*
//       FROM workspaces w
//       INNER JOIN workspace_admins wa ON wa.workspace_id = w.id
//       WHERE wa.admin_id = ?
//       LIMIT 1
//       `,
//       [userId]
//     );

//     return rows?.[0] || null;
//   }

//   // Worker: resolve via users.active_workspace_id
//   const [rows] = await db.execute(
//     `
//     SELECT w.*
//     FROM workspaces w
//     INNER JOIN users u ON u.active_workspace_id = w.id
//     WHERE u.id = ?
//     LIMIT 1
//     `,
//     [userId]
//   );

//   return rows?.[0] || null;
// }

// async function setActiveWorkspace(userId, workspaceId) {
//   const uid = Number(userId);

//   const [res] = await db.execute(
//     `
//     UPDATE users
//     SET active_workspace_id = ?
//     WHERE id = ?
//     `,
//     [workspaceId, uid]
//   );

//   const affectedRows = Number(res?.affectedRows || 0);
//   return affectedRows > 0;
// }

// // ------------------------------------------------------------
// // Worker workspace selection (Select Workspace flow)
// // ------------------------------------------------------------

// async function listAvailableWorkspacesForWorker(userId) {
//   const uid = Number(userId);

//   const [rows] = await db.execute(
//     `
//     SELECT
//       w.id,
//       w.name,
//       w.industry_type,
//       w.timezone,
//       w.created_at,
//       ww.status AS membership_status
//     FROM workspaces w
//     LEFT JOIN workspace_workers ww
//       ON ww.workspace_id = w.id
//      AND ww.worker_id = ?
//     ORDER BY w.name ASC
//     `,
//     [uid]
//   );

//   return rows || [];
// }

// async function joinWorkspaceAsWorker(userId, workspaceId) {
//   const uid = Number(userId);

//   // Ensure workspace exists
//   const [wrows] = await db.execute(`SELECT id FROM workspaces WHERE id = ? LIMIT 1`, [workspaceId]);
//   if (!wrows?.[0]) {
//     const err = new Error("Workspace not found");
//     err.statusCode = 404;
//     throw err;
//   }

//   // Upsert membership in workspace_workers
//   const [existing] = await db.execute(
//     `
//     SELECT workspace_id, status
//     FROM workspace_workers
//     WHERE worker_id = ? AND workspace_id = ?
//     LIMIT 1
//     `,
//     [uid, workspaceId]
//   );

//   if (!existing?.[0]) {
//     await db.execute(
//       `
//       INSERT INTO workspace_workers (worker_id, workspace_id, status)
//       VALUES (?, ?, 'active')
//       `,
//       [uid, workspaceId]
//     );
//   } else if (existing[0].status !== "active") {
//     await db.execute(
//       `
//       UPDATE workspace_workers
//       SET status = 'active'
//       WHERE worker_id = ? AND workspace_id = ?
//       `,
//       [uid, workspaceId]
//     );
//   }

//   // Set active workspace on user
//   await setActiveWorkspace(uid, workspaceId);

//   // Return workspace
//   const [rows] = await db.execute(`SELECT * FROM workspaces WHERE id = ? LIMIT 1`, [workspaceId]);
//   return rows?.[0] || null;
// }

// // ------------------------------------------------------------
// // Workspace creation (Admin)
// // ------------------------------------------------------------

// async function assertAdminOwnsWorkspace(adminUserId, workspaceId) {
//   const adminId = Number(adminUserId);

//   const [rows] = await db.execute(
//     `
//     SELECT w.id
//     FROM workspaces w
//     INNER JOIN workspace_admins wa ON wa.workspace_id = w.id
//     WHERE w.id = ? AND wa.admin_id = ?
//     LIMIT 1
//     `,
//     [workspaceId, adminId]
//   );

//   if (!rows || rows.length === 0) {
//     const err = new Error("Forbidden: you do not own this workspace.");
//     err.statusCode = 403;
//     throw err;
//   }
// }

// async function createWorkspace({ adminUserId, name, industryType, timezone }) {
//   const adminId = Number(adminUserId);

//   // Admin can have only one workspace: check via workspace_admins
//   const [existing] = await db.execute(
//     `
//     SELECT w.id
//     FROM workspaces w
//     INNER JOIN workspace_admins wa ON wa.workspace_id = w.id
//     WHERE wa.admin_id = ?
//     LIMIT 1
//     `,
//     [adminId]
//   );

//   if (existing?.[0]) {
//     return { alreadyExists: true, workspaceId: existing[0].id };
//   }

//   const workspaceId = uuidv4();

//   await db.execute(
//     `
//     INSERT INTO workspaces (id, name, industry_type, timezone, created_by_admin_id)
//     VALUES (?, ?, ?, ?, ?)
//     `,
//     [workspaceId, name, industryType || "other", timezone || "Asia/Jerusalem", adminId]
//   );

//   // Attach admin to workspace via workspace_admins (id must be provided)
//   await db.execute(
//     `
//     INSERT INTO workspace_admins (id, workspace_id, admin_id)
//     VALUES (?, ?, ?)
//     `,
//     [uuidv4(), workspaceId, adminId]
//   );

//   // Optional: set admin active workspace too (harmless, helps /workspaces/me if you ever reuse it)
//   await setActiveWorkspace(adminId, workspaceId);

//   // Create shift templates from preset
//   const templates = presetTemplates(industryType || "other");
//   for (const t of templates) {
//     await db.execute(
//       `
//       INSERT INTO shift_templates
//       (id, workspace_id, name, start_time, end_time, required_workers, is_active)
//       VALUES (?, ?, ?, ?, ?, ?, 1)
//       `,
//       [uuidv4(), workspaceId, t.name, t.start, t.end, t.required]
//     );
//   }

//   return { workspaceId, templatesCount: templates.length };
// }

// // ------------------------------------------------------------
// // Templates
// // ------------------------------------------------------------

// async function getShiftTemplates(workspaceId) {
//   const [rows] = await db.execute(
//     `
//     SELECT id, name, start_time, end_time, required_workers, is_active
//     FROM shift_templates
//     WHERE workspace_id = ? AND is_active = 1
//     ORDER BY start_time
//     `,
//     [workspaceId]
//   );
//   return rows;
// }

// // ------------------------------------------------------------
// // Workspace lists
// // ------------------------------------------------------------

// async function listWorkspaces() {
//   const [rows] = await db.execute(
//     `
//     SELECT id, name, industry_type, timezone
//     FROM workspaces
//     ORDER BY created_at DESC
//     `
//   );
//   return rows;
// }

// // ------------------------------------------------------------
// // Operating hours
// // ------------------------------------------------------------

// async function upsertOperatingHours(workspaceId, hoursArray) {
//   for (const h of hoursArray) {
//     const dayOfWeek = Number(h.dayOfWeek);
//     const isClosed = h.isClosed ? 1 : 0;
//     const openTime = isClosed ? null : h.openTime;
//     const closeTime = isClosed ? null : h.closeTime;

//     const [existing] = await db.execute(
//       `
//       SELECT id
//       FROM workspace_operating_hours
//       WHERE workspace_id = ? AND day_of_week = ?
//       LIMIT 1
//       `,
//       [workspaceId, dayOfWeek]
//     );

//     if (existing[0]) {
//       await db.execute(
//         `
//         UPDATE workspace_operating_hours
//         SET is_closed = ?, open_time = ?, close_time = ?
//         WHERE id = ?
//         `,
//         [isClosed, openTime, closeTime, existing[0].id]
//       );
//     } else {
//       await db.execute(
//         `
//         INSERT INTO workspace_operating_hours
//         (id, workspace_id, day_of_week, is_closed, open_time, close_time)
//         VALUES (?, ?, ?, ?, ?, ?)
//         `,
//         [uuidv4(), workspaceId, dayOfWeek, isClosed, openTime, closeTime]
//       );
//     }
//   }
// }

// async function getOperatingHours(workspaceId) {
//   const [rows] = await db.execute(
//     `
//     SELECT day_of_week, is_closed, open_time, close_time
//     FROM workspace_operating_hours
//     WHERE workspace_id = ?
//     ORDER BY day_of_week
//     `,
//     [workspaceId]
//   );
//   return rows;
// }

// module.exports = {
//   // workspace core
//   getMyWorkspace,
//   createWorkspace,
//   listWorkspaces,

//   // worker membership + active workspace
//   listAvailableWorkspacesForWorker,
//   joinWorkspaceAsWorker,
//   setActiveWorkspace,

//   // templates
//   getShiftTemplates,

//   // admin ownership
//   assertAdminOwnsWorkspace,

//   // operating hours
//   upsertOperatingHours,
//   getOperatingHours,
// };
