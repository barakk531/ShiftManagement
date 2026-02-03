


// src/api/workspaces.js
//
// Purpose:
// - Workspace API client.
// - Supports worker Select Workspace flow (available + join).
// - Supports admin management (create workspace, operating hours).
// - Provides "my workspace" resolution via GET /workspaces/me.
//
// Notes:
// - All comments are in English only (per request).

import http from "./http";

// ------------------------------------------------------------
// Common
// ------------------------------------------------------------

// GET /workspaces
export async function listWorkspaces() {
  const res = await http.get("/workspaces");
  return res.data.workspaces;
}

// GET /workspaces/me
export async function getMyWorkspace() {
  const res = await http.get("/workspaces/me");
  return res.data.workspace;
}

// GET /workspaces/me/shift-templates
export async function getMyShiftTemplates() {
  const res = await http.get("/workspaces/me/shift-templates");
  return res.data.templates;
}

// ------------------------------------------------------------
// Worker: Select Workspace flow
// ------------------------------------------------------------

// GET /workspaces/available
export async function listAvailableWorkspaces() {
  const res = await http.get("/workspaces/available");
  return res.data.workspaces;
}

// POST /workspaces/:id/join
export async function joinWorkspace(workspaceId) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const res = await http.post(`/workspaces/${workspaceId}/join`);
  return res.data.workspace;
}

// ------------------------------------------------------------
// Admin: Create workspace
// ------------------------------------------------------------

// POST /workspaces
export async function createWorkspace(payload) {
  const res = await http.post("/workspaces", payload);
  return res.data;
}

// ------------------------------------------------------------
// Operating hours
// ------------------------------------------------------------

// GET /workspaces/:id/operating-hours
export async function getOperatingHours(workspaceId) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const res = await http.get(`/workspaces/${workspaceId}/operating-hours`);
  return res.data.hours;
}

// PUT /workspaces/:id/operating-hours
export async function saveOperatingHours(workspaceId, hours) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const res = await http.put(`/workspaces/${workspaceId}/operating-hours`, { hours });
  return res.data;
}












// import http from "./http";

// // GET /workspaces
// export async function listWorkspaces() {
//   const res = await http.get("/workspaces");
//   return res.data.workspaces;
// }

// // POST /workspaces
// export async function createWorkspace(payload) {
//   const res = await http.post("/workspaces", payload);
//   return res.data;
// }

// // GET /workspaces/me
// export async function getMyWorkspace() {
//   const res = await http.get("/workspaces/me");
//   return res.data.workspace;
// }

// // POST /workspaces/select
// export async function selectWorkspace(workspaceId) {
//   const res = await http.post("/workspaces/select", { workspaceId });
//   return res.data;
// }

// // GET /workspaces/:id/operating-hours
// export async function getOperatingHours(workspaceId) {
//   const res = await http.get(`/workspaces/${workspaceId}/operating-hours`);
//   return res.data.hours;
// }

// // PUT /workspaces/:id/operating-hours
// export async function saveOperatingHours(workspaceId, hours) {
//   const res = await http.put(`/workspaces/${workspaceId}/operating-hours`, {
//     hours,
//   });
//   return res.data;
// }
