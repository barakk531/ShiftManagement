// backend/services/scheduledWeekPublishService.js
//
// Purpose:
// - Publish/unpublish a scheduled week (stored on scheduled_shifts.status).
// - Provide current week status for UI (draft/published).
//
// Notes:
// - All comments are in English only (per request).

const db = require("../db");

async function getWeekStatus(workspaceId, weekStartDate) {
  const [rows] = await db.query(
    `
    SELECT
      CASE WHEN SUM(ss.status = 'published') > 0 THEN 'published' ELSE 'draft' END AS status
    FROM scheduled_shifts ss
    WHERE ss.workspace_id = ?
      AND ss.week_start_date = ?
    `,
    [String(workspaceId), String(weekStartDate)]
  );

  return { status: rows?.[0]?.status || "draft" };
}

async function publishWeek(workspaceId, weekStartDate, publishedByUserId) {
  // We keep publishedByUserId for future auditing, not stored for now.
  await db.query(
    `
    UPDATE scheduled_shifts
    SET status = 'published'
    WHERE workspace_id = ?
      AND week_start_date = ?
    `,
    [String(workspaceId), String(weekStartDate)]
  );

  const s = await getWeekStatus(workspaceId, weekStartDate);
  return s.status;
}

async function unpublishWeek(workspaceId, weekStartDate) {
  await db.query(
    `
    UPDATE scheduled_shifts
    SET status = 'draft'
    WHERE workspace_id = ?
      AND week_start_date = ?
    `,
    [String(workspaceId), String(weekStartDate)]
  );

  const s = await getWeekStatus(workspaceId, weekStartDate);
  return s.status;
}

module.exports = { getWeekStatus, publishWeek, unpublishWeek };
