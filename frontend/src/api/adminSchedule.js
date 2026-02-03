
// src/api/adminSchedule.js
//
// Purpose:
// - Client-side API wrapper for admin schedule endpoints.
// - Loads weekly schedule, loads submissions status, removes assignments, assigns workers.
// - Centralizes auth + JSON request handling.
//
// Notes:
// - All comments are in English only (per request).

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function getTokenFallback() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken") ||
    null
  );
}

function toISODate(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return "";
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

async function request(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const token = getTokenFallback();

  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const message =
      (body && body.message) ||
      (typeof body === "string" ? body : "") ||
      `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

// Loads the weekly admin schedule (schedule builder source-of-truth)
export async function getAdminScheduleWeek({ workspaceId, weekStart }) {
  const qs = new URLSearchParams();
  if (workspaceId) qs.set("workspaceId", workspaceId);
  if (weekStart) qs.set("weekStartDate", toISODate(weekStart));

  return request(`/admin/schedule/week?${qs.toString()}`, { method: "GET" });
}

// Fetches submissions status for the requested week
export async function getAdminSubmissionsWeek({ workspaceId, weekStart }) {
  const qs = new URLSearchParams();
  if (workspaceId) qs.set("workspaceId", workspaceId);

  const iso = toISODate(weekStart);
  if (iso) qs.set("weekStartDate", iso);

  return request(`/availability/admin/submissions/week?${qs.toString()}`, { method: "GET" });
}

// Removes a worker assignment from a scheduled shift
export async function removeAssignment({ workspaceId, scheduledShiftId, workerId }) {
  return request(`/admin/schedule/assignment`, {
    method: "DELETE",
    body: JSON.stringify({ workspaceId, scheduledShiftId, workerId }),
  });
}

// Assigns a worker to a shift for a given week + shift template
export async function assignWorker({
  workspaceId,
  weekStartDate,
  dayDate,
  shiftTemplateId,
  userId,
}) {
  return request(`/admin/schedule/assignment`, {
    method: "POST",
    body: JSON.stringify({
      workspaceId,
      weekStartDate: toISODate(weekStartDate),
      dayDate: toISODate(dayDate),
      shiftTemplateId,
      userId,
    }),
  });
}

// Publish week (make schedule visible to workers)
export async function publishWeek(weekStartDate) {
  return request(`/admin/schedule/week/publish`, {
    method: "POST",
    body: JSON.stringify({ weekStartDate: toISODate(weekStartDate) }),
  });
}

// Unpublish week (back to draft)
export async function unpublishWeek(weekStartDate) {
  return request(`/admin/schedule/week/unpublish`, {
    method: "POST",
    body: JSON.stringify({ weekStartDate: toISODate(weekStartDate) }),
  });
}




// // src/api/adminSchedule.js
// //
// // Purpose:
// // - Client-side API wrapper for admin schedule endpoints.
// // - Loads weekly schedule, loads submissions status, removes assignments, assigns workers.
// // - Centralizes auth + JSON request handling.
// //
// // Notes:
// // - All comments are in English only (per request).

// const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// function getTokenFallback() {
//   return (
//     localStorage.getItem("token") ||
//     localStorage.getItem("jwt") ||
//     localStorage.getItem("accessToken") ||
//     null
//   );
// }

// async function request(path, opts = {}) {
//   const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
//   const token = getTokenFallback();

//   const res = await fetch(url, {
//     ...opts,
//     headers: {
//       ...(opts.headers || {}),
//       "Content-Type": "application/json",
//       Authorization: token ? `Bearer ${token}` : undefined,
//     },
//   });

//   const ct = res.headers.get("content-type") || "";
//   const isJson = ct.includes("application/json");
//   const body = isJson ? await res.json().catch(() => null) : await res.text();

//   if (!res.ok) {
//     const message =
//       (body && body.message) ||
//       (typeof body === "string" ? body : "Request failed");
//     const err = new Error(message);
//     err.status = res.status;
//     err.body = body;
//     throw err;
//   }

//   return body;
// }

// function toISODate(value) {
//   if (!value) return "";
//   if (typeof value === "string") {
//     // If already YYYY-MM-DD
//     if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
//     // Try parse anything else
//     const d = new Date(value);
//     if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
//     return "";
//   }
//   if (value instanceof Date && !Number.isNaN(value.getTime())) {
//     return value.toISOString().slice(0, 10);
//   }
//   return "";
// }

// // Loads the weekly admin schedule (schedule builder source-of-truth)
// export async function getAdminScheduleWeek({ workspaceId, weekStart }) {
//   const qs = new URLSearchParams();
//   if (workspaceId) qs.set("workspaceId", workspaceId);
//   if (weekStart) qs.set("weekStartDate", toISODate(weekStart));

//   return request(`/admin/schedule/week?${qs.toString()}`, {
//     method: "GET",
//   });
// }

// // Removes a worker assignment from a scheduled shift
// export async function removeAssignment({
//   workspaceId,
//   scheduledShiftId,
//   workerId,
// }) {
//   return request(`/admin/schedule/assignment`, {
//     method: "DELETE",
//     body: JSON.stringify({ workspaceId, scheduledShiftId, workerId }),
//   });
// }

// // Fetches submissions status for the requested week (who submitted availability and when)
// export async function getAdminSubmissionsWeek({ workspaceId, weekStart }) {
//   const qs = new URLSearchParams();
//   if (workspaceId) qs.set("workspaceId", workspaceId);

//   const iso = toISODate(weekStart);
//   if (iso) qs.set("weekStartDate", iso);

//   return request(`/availability/admin/submissions/week?${qs.toString()}`, {
//     method: "GET",
//   });
// }

// // Assigns a worker to a shift for a given week + shift template
// export async function assignWorker({
//   workspaceId,
//   weekStartDate,
//   dayDate,
//   shiftTemplateId,
//   userId,
// }) {
//   return request(`/admin/schedule/assignment`, {
//     method: "POST",
//     body: JSON.stringify({
//       workspaceId,
//       weekStartDate,
//       dayDate,
//       shiftTemplateId,
//       userId,
//     }),
//   });
// }


// const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// function getTokenFallback() {
//   return (
//     localStorage.getItem("token") ||
//     localStorage.getItem("jwt") ||
//     localStorage.getItem("accessToken") ||
//     null
//   );
// }

// async function apiFetch(path, opts = {}) {
//   const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
//   const token = getTokenFallback();

//   const res = await fetch(url, {
//     ...opts,
//     headers: {
//       "Content-Type": "application/json",
//       ...(opts.headers || {}),
//       Authorization: token ? `Bearer ${token}` : undefined,
//     },
//   });

//   const ct = res.headers.get("content-type") || "";
//   const isJson = ct.includes("application/json");
//   const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

//   if (!res.ok) {
//     const msg = (data && data.message) || (typeof data === "string" ? data : "") || `HTTP ${res.status}`;
//     const err = new Error(msg);
//     err.status = res.status;
//     err.data = data;
//     throw err;
//   }

//   return data;
// }

// export async function publishWeek(weekStartDate) {
//   return apiFetch("/admin/schedule/week/publish", {
//     method: "POST",
//     body: JSON.stringify({ weekStartDate }),
//   });
// }

// export async function unpublishWeek(weekStartDate) {
//   return apiFetch("/admin/schedule/week/unpublish", {
//     method: "POST",
//     body: JSON.stringify({ weekStartDate }),
//   });
// }
