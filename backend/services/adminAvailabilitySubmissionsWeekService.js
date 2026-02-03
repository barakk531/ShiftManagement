// backend/services/adminAvailabilitySubmissionsWeekService.js
// Purpose:
// Admin-only read service that returns submission status (submitted / missing)
// for all workers in a workspace for a given weekStartDate.

const db = require("../db");
const { assertAdminInWorkspace } = require("./workspaceAdminAccessService");

function extractRows(result) {
  return Array.isArray(result) ? result[0] : result;
}

async function getAdminAvailabilitySubmissionsWeek({
  adminId,
  workspaceId,
  weekStartDate,
}) {
  if (!workspaceId) {
    const e = new Error("workspaceId is required");
    e.status = 422;
    throw e;
  }

  if (!weekStartDate) {
    const e = new Error("weekStartDate is required");
    e.status = 422;
    throw e;
  }

  // Ensure admin belongs to workspace
  await assertAdminInWorkspace(adminId, workspaceId);

  const result = await db.query(
  `
  SELECT
      u.id,
      u.first_name AS firstName,
      u.last_name  AS lastName,
      s.created_at AS submittedAt,
      s.status
  FROM workspace_workers ww
  INNER JOIN users u
      ON u.id = ww.worker_id
  LEFT JOIN availability_submissions s
      ON s.user_id = u.id
  AND s.workspace_id = ?
  AND s.week_start_date = ?
  WHERE ww.workspace_id = ?
      AND ww.status = 'active'
      AND u.role = 'worker'
  ORDER BY u.first_name ASC, u.last_name ASC
  `,
  [workspaceId, weekStartDate, workspaceId]
  );

  const rows = extractRows(result) || [];

  const workers = rows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    submittedAt: r.submittedAt || null,
    status: r.status || "missing",
    submitted: !!r.submittedAt,
  }));

  const total = workers.length;
  const submitted = workers.filter((w) => w.submitted).length;
  const missing = total - submitted;

  return {
    workers,
    summary: { total, submitted, missing },
  };
}

module.exports = {
  getAdminAvailabilitySubmissionsWeek,
};
