// services/dailyShiftTemplatesService.js
const db = require("../db"); 

function assertDayOfWeek(dayOfWeek) {
  const n = Number(dayOfWeek);
  if (!Number.isInteger(n) || n < 0 || n > 6) {
    const err = new Error("dayOfWeek must be an integer between 0 and 6.");
    err.status = 422;
    throw err;
  }
  return n;
}

function normalizeTime(t) {
  if (typeof t !== "string") return null;
  const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!m) return null;
  const hh = m[1], mm = m[2], ss = m[3] ?? "00";
  return `${hh}:${mm}:${ss}`;
}

function toBoolInt(v, defaultVal = 1) {
  if (v === undefined || v === null || v === "") return defaultVal;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(v);
  return n ? 1 : 0;
}

async function listByWorkspaceGrouped(workspaceId) {
  const [rows] = await db.query(
    `
    SELECT id, day_of_week, name, start_time, end_time, sort_order, required_count, is_active
    FROM daily_shift_templates
    WHERE workspace_id = ?
    ORDER BY day_of_week ASC, sort_order ASC, start_time ASC
    `,
    [workspaceId]
  );

  const days = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of rows) {
    days[r.day_of_week].push(r);
  }
  return { workspaceId, days };
}

async function listByDay(workspaceId, dayOfWeek) {
  const dow = assertDayOfWeek(dayOfWeek);
  const [rows] = await db.query(
    `
    SELECT id, day_of_week, name, start_time, end_time, sort_order, required_count, is_active
    FROM daily_shift_templates
    WHERE workspace_id = ? AND day_of_week = ?
    ORDER BY sort_order ASC, start_time ASC
    `,
    [workspaceId, dow]
  );
  return rows;
}

async function createForDay(workspaceId, dayOfWeek, payload) {
  const dow = assertDayOfWeek(dayOfWeek);

  const name = String(payload?.name ?? "").trim();
  if (name.length < 2) {
    const err = new Error("name is required (min 2 chars).");
    err.status = 422;
    throw err;
  }

  const startTime = normalizeTime(payload?.startTime);
  const endTime = normalizeTime(payload?.endTime);
  if (!startTime || !endTime) {
    const err = new Error("startTime and endTime must be in HH:MM format.");
    err.status = 422;
    throw err;
  }

  const sortOrder = Number.isFinite(Number(payload?.sortOrder)) ? Number(payload.sortOrder) : 0;

  const requiredCount =
    payload?.requiredCount === "" || payload?.requiredCount === undefined || payload?.requiredCount === null
      ? null
      : Number(payload.requiredCount);

  if (requiredCount !== null && (!Number.isInteger(requiredCount) || requiredCount < 0)) {
    const err = new Error("requiredCount must be a non-negative integer or null.");
    err.status = 422;
    throw err;
  }

  const isActive = toBoolInt(payload?.isActive, 1);

  const [res] = await db.query(
    `
    INSERT INTO daily_shift_templates
      (workspace_id, day_of_week, name, start_time, end_time, sort_order, required_count, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [workspaceId, dow, name, startTime, endTime, sortOrder, requiredCount, isActive]
  );

  const [rows] = await db.query(
    `
    SELECT id, day_of_week, name, start_time, end_time, sort_order, required_count, is_active
    FROM daily_shift_templates
    WHERE id = ?
    `,
    [res.insertId]
  );
  return rows[0];
}

async function updateById(workspaceId, id, payload) {
  const shiftId = Number(id);
  if (!Number.isInteger(shiftId)) {
    const err = new Error("id must be an integer.");
    err.status = 422;
    throw err;
  }

  // ודא שה-record שייך ל-workspace
  const [existingRows] = await db.query(
    `SELECT id FROM daily_shift_templates WHERE id = ? AND workspace_id = ?`,
    [shiftId, workspaceId]
  );
  if (existingRows.length === 0) {
    const err = new Error("Shift template not found for this workspace.");
    err.status = 404;
    throw err;
  }

  const fields = [];
  const vals = [];

  if (payload?.name !== undefined) {
    const name = String(payload.name).trim();
    if (name.length < 2) {
      const err = new Error("name must be at least 2 chars.");
      err.status = 422;
      throw err;
    }
    fields.push("name = ?");
    vals.push(name);
  }

  if (payload?.startTime !== undefined) {
    const st = normalizeTime(payload.startTime);
    if (!st) {
      const err = new Error("startTime must be HH:MM.");
      err.status = 422;
      throw err;
    }
    fields.push("start_time = ?");
    vals.push(st);
  }

  if (payload?.endTime !== undefined) {
    const et = normalizeTime(payload.endTime);
    if (!et) {
      const err = new Error("endTime must be HH:MM.");
      err.status = 422;
      throw err;
    }
    fields.push("end_time = ?");
    vals.push(et);
  }

  if (payload?.sortOrder !== undefined) {
    const so = Number(payload.sortOrder);
    if (!Number.isFinite(so)) {
      const err = new Error("sortOrder must be a number.");
      err.status = 422;
      throw err;
    }
    fields.push("sort_order = ?");
    vals.push(so);
  }

  if (payload?.requiredCount !== undefined) {
    const rc =
      payload.requiredCount === "" || payload.requiredCount === null ? null : Number(payload.requiredCount);
    if (rc !== null && (!Number.isInteger(rc) || rc < 0)) {
      const err = new Error("requiredCount must be a non-negative integer or null.");
      err.status = 422;
      throw err;
    }
    fields.push("required_count = ?");
    vals.push(rc);
  }

  if (payload?.isActive !== undefined) {
    fields.push("is_active = ?");
    vals.push(toBoolInt(payload.isActive, 1));
  }

  if (fields.length === 0) {
    const err = new Error("No fields to update.");
    err.status = 422;
    throw err;
  }

  vals.push(shiftId);

  await db.query(
    `UPDATE daily_shift_templates SET ${fields.join(", ")} WHERE id = ?`,
    vals
  );

  const [rows] = await db.query(
    `
    SELECT id, day_of_week, name, start_time, end_time, sort_order, required_count, is_active
    FROM daily_shift_templates
    WHERE id = ?
    `,
    [shiftId]
  );
  return rows[0];
}

async function deleteById(workspaceId, id) {
  const shiftId = Number(id);
  if (!Number.isInteger(shiftId)) {
    const err = new Error("id must be an integer.");
    err.status = 422;
    throw err;
  }

  const [res] = await db.query(
    `DELETE FROM daily_shift_templates WHERE id = ? AND workspace_id = ?`,
    [shiftId, workspaceId]
  );

  if (res.affectedRows === 0) {
    const err = new Error("Shift template not found for this workspace.");
    err.status = 404;
    throw err;
  }
}

module.exports = {
  listByWorkspaceGrouped,
  listByDay,
  createForDay,
  updateById,
  deleteById,
};
