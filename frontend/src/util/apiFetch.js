// src/util/apiFetch.js
//
// Purpose:
// - Small fetch wrapper that:
//   - Adds JSON headers + Bearer token
//   - Parses JSON safely (also handles non-JSON/HTML errors)
//   - Throws Error with .status and .data for UI error handling
//
// Notes:
// - All comments are in English only (per request).

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:8080";

export async function apiFetch(path, token, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (networkErr) {
    const err = new Error(networkErr?.message || "Network error");
    err.status = 0;
    err.data = null;
    throw err;
  }

  // Some responses can be 204 No Content
  const text = await res.text().catch(() => "");
  let data = null;

  // Try to parse JSON, otherwise keep text
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && data.message) ||
      (typeof text === "string" && text && text.length < 300 ? text : "") ||
      `Request failed (${res.status})`;

    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data ?? {};
}




// const API_BASE =
//   process.env.REACT_APP_API_BASE_URL ||
//   process.env.REACT_APP_API_BASE ||
//   "http://localhost:8080";

// export async function apiFetch(path, token, options = {}) {
//   const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

//   const res = await fetch(url, {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       ...(options.headers || {}),
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//     },
//   });

//   const text = await res.text();
//   let json = null;
//   try {
//     json = text ? JSON.parse(text) : null;
//   } catch {
//     json = null;
//   }

//   if (!res.ok) {
//     const msg =
//       json?.message ||
//       (typeof text === "string" && text.includes("Cannot") ? text : "") ||
//       `Request failed (${res.status})`;
//     const err = new Error(msg);
//     err.status = res.status;
//     throw err;
//   }

//   return json ?? {};
// }
