const db = require("../db"); 
const workspaceService = require("./workspaceService");
const { randomUUID } = require("crypto");

async function getMyWorkspaceId(adminUserId) {
  const ws = await workspaceService.getMyWorkspace(adminUserId);
  if (!ws?.id) {
    const err = new Error("No workspace found for this admin.");
    err.status = 404;
    throw err;
  }
  return ws.id;
}

async function listMyWorkspaceTemplates(adminUserId) {
  const workspaceId = await getMyWorkspaceId(adminUserId);

  const [rows] = await db.query(
    `SELECT id, name, start_time, end_time, sort_order, required_count, is_active
     FROM shift_templates
     WHERE workspace_id = ?
     ORDER BY sort_order ASC, start_time ASC`,
    [workspaceId]
  );

  return rows;
}

// backend/services/shiftTemplatesService.js

async function createTemplate(workspaceId, data) {
  const id = randomUUID();

  const name = String(data.name || "").trim();
  const start_time = data.start_time;
  const end_time = data.end_time;

  const sort_order = Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0;
  const required_count = Number.isFinite(Number(data.required_count)) ? Number(data.required_count) : 1;
  const is_active = data.is_active === false ? 0 : 1;

  if (!workspaceId) throw new Error("workspace_id is required");
  if (!name) throw new Error("name is required");
  if (!start_time || !end_time) throw new Error("start_time/end_time are required");

  await db.query(
    `INSERT INTO shift_templates
      (id, workspace_id, name, start_time, end_time, sort_order, required_count, is_active)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, workspaceId, name, start_time, end_time, sort_order, required_count, is_active]
  );

  const [rows] = await db.query(`SELECT * FROM shift_templates WHERE id = ?`, [id]);
  return rows[0];
}

async function updateTemplate(adminUserId, templateId, patch) {
  const workspaceId = await getMyWorkspaceId(adminUserId);

  // ensure belongs to my workspace
  const [exist] = await db.query(
    `SELECT id FROM shift_templates WHERE id = ? AND workspace_id = ?`,
    [templateId, workspaceId]
  );
  if (!exist.length) {
    const err = new Error("Template not found.");
    err.status = 404;
    throw err;
  }

  // Build update dynamically (simple)
  const fields = [];
  const values = [];

  if (patch.name != null) { fields.push("name = ?"); values.push(String(patch.name).trim()); }
  if (patch.startTime != null) { fields.push("start_time = ?"); values.push(patch.startTime); }
  if (patch.endTime != null) { fields.push("end_time = ?"); values.push(patch.endTime); }
  if (patch.sortOrder != null) { fields.push("sort_order = ?"); values.push(Number(patch.sortOrder) || 0); }
  if (patch.requiredCount !== undefined) {
    fields.push("required_count = ?");
    values.push(patch.requiredCount === "" || patch.requiredCount == null ? null : Number(patch.requiredCount));
  }
  if (patch.isActive != null) { fields.push("is_active = ?"); values.push(patch.isActive ? 1 : 0); }

  if (!fields.length) {
    const err = new Error("No fields to update.");
    err.status = 422;
    throw err;
  }

  values.push(templateId);

  await db.query(
    `UPDATE shift_templates SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  const [rows] = await db.query(
    `SELECT id, name, start_time, end_time, sort_order, required_count, is_active
     FROM shift_templates WHERE id = ?`,
    [templateId]
  );

  return rows[0];
}

async function deleteTemplate(adminUserId, templateId) {
  const workspaceId = await getMyWorkspaceId(adminUserId);

  const [result] = await db.query(
    `DELETE FROM shift_templates WHERE id = ? AND workspace_id = ?`,
    [templateId, workspaceId]
  );

  if (result.affectedRows === 0) {
    const err = new Error("Template not found.");
    err.status = 404;
    throw err;
  }
}

module.exports = {
  listMyWorkspaceTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
