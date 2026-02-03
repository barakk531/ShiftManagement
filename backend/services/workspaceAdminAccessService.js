// backend/services/workspaceAdminAccessService.js

/**
 * Workspace Admin Access Service
 *
 * Purpose:
 * - Enforce workspace-level admin authorization (multi-admin per workspace).
 *
 * Notes:
 * - Supports db.query returning either:
 *   1) rows (mysql)
 *   2) [rows, fields] (mysql2)
 */

const db = require("../db");

function extractRows(result) {
  // mysql2: [rows, fields]
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  // mysql: rows
  if (Array.isArray(result)) return result;
  // fallback for custom wrappers
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

async function getAdminRoleInWorkspace(adminUserId, workspaceId) {
  const result = await db.query(
    `
    SELECT role
    FROM workspace_admins
    WHERE workspace_id = ?
      AND admin_id = ?
    LIMIT 1
    `,
    [workspaceId, adminUserId]
  );

  const rows = extractRows(result);
  return rows?.[0]?.role || null;
}

async function assertAdminInWorkspace(adminUserId, workspaceId) {
  const role = await getAdminRoleInWorkspace(adminUserId, workspaceId);
  if (!role) {
    const err = new Error("Admin is not allowed to access this workspace.");
    err.statusCode = 403;
    throw err;
  }
  return role;
}

module.exports = {
  getAdminRoleInWorkspace,
  assertAdminInWorkspace,
};
