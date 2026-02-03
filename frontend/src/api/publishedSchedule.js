
// src/api/publishedSchedule.js
//
// Purpose:
// - Client API for user-facing published schedule page.
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

async function apiFetch(path, opts = {}) {
  const token = getTokenFallback();
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: opts.method || "GET",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const msg =
      (payload && payload.message) ||
      (typeof payload === "string" ? payload : "") ||
      `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = payload;
    throw err;
  }

  return payload;
}

export async function getPublishedScheduleWeek({ weekStartDate }) {
  const qs = new URLSearchParams();
  qs.set("weekStartDate", weekStartDate);
  return apiFetch(`/published-schedule/week?${qs.toString()}`, { method: "GET" });
}


// // src/api/publishedSchedule.js
// //
// // Purpose:
// // - Client API for user-facing published schedule page.
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

// async function apiFetch(path, opts = {}) {
//   const token = getTokenFallback();
//   const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

//   const res = await fetch(url, {
//     ...opts,
//     headers: {
//       ...(opts.headers || {}),
//       Authorization: token ? `Bearer ${token}` : undefined,
//     },
//   });

//   const ct = res.headers.get("content-type") || "";
//   const isJson = ct.includes("application/json");
//   const payload = isJson ? await res.json() : await res.text();

//   if (!res.ok) {
//     const msg = payload?.message || (typeof payload === "string" ? payload : "Request failed");
//     const err = new Error(msg);
//     err.status = res.status;
//     throw err;
//   }

//   return payload;
// }

// export async function getPublishedScheduleWeek({ weekStartDate }) {
//   return apiFetch(`/published-schedule/week?weekStartDate=${encodeURIComponent(weekStartDate)}`);
// }
