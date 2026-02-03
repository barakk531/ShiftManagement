
import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useRouteLoaderData } from "react-router-dom";
import { getOperatingHours, saveOperatingHours } from "../../api/workspaces";

import DailyShiftsManager from "../../components/SubmissionShifts/DailyShiftsManager";

import classes from "./AdminOperatingHours.module.css";

const LOGIN_ROUTE = "/auth";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function defaultHours() {
  return Array.from({ length: 7 }).map((_, i) => ({
    day_of_week: i,
    is_closed: false,
    open_time: "09:00",
    close_time: "17:00",
  }));
}

function toUiTime(t) {
  if (!t) return "";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function toDbTime(t) {
  if (!t) return null;
  const s = String(t);
  return s.length === 5 ? `${s}:00` : s;
}

function getTokenFallback() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken") ||
    null
  );
}
const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

async function apiFetch(token, path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      (typeof text === "string" && text.includes("Cannot") ? text : "") ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return json ?? {};
}


function normalizeGroupedDailyShifts(payload) {
  const src = payload?.days || payload?.grouped || payload || {};
  const out = {};
  for (let i = 0; i < 7; i++) out[i] = [];
  Object.keys(src || {}).forEach((k) => {
    const dow = Number(k);
    if (Number.isFinite(dow) && dow >= 0 && dow <= 6) {
      out[dow] = Array.isArray(src[k]) ? src[k] : [];
    }
  });
  return out;
}

export default function AdminOperatingHours() {
  const rootData = useRouteLoaderData("root");
  const token = rootData?.token || getTokenFallback();

  const { id } = useParams();
  const workspaceId = id;

  const [hours, setHours] = useState(defaultHours());
  const [expandedDow, setExpandedDow] = useState(null);

  const [dailyByDay, setDailyByDay] = useState(() => {
    const init = {};
    for (let i = 0; i < 7; i++) init[i] = [];
    return init;
  });

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const role = useMemo(() => {
    if (!token || token === "EXPIRED") return null;
    try {
      return JSON.parse(atob(token.split(".")[1]))?.role || null;
    } catch {
      return null;
    }
  }, [token]);

  // load operating hours
  useEffect(() => {
    let alive = true;
    if (!token || token === "EXPIRED" || role !== "admin" || !workspaceId) return;

    (async () => {
      setErr("");
      setMsg("");
      try {
        const data = await getOperatingHours(workspaceId);
        const arr = Array.isArray(data) ? data : data?.hours;

        if (Array.isArray(arr) && arr.length > 0) {
          const byDow = new Map(arr.map((x) => [Number(x.day_of_week), x]));
          const merged = Array.from({ length: 7 }).map((_, dow) => {
            const row = byDow.get(dow);
            if (!row) {
              return {
                day_of_week: dow,
                is_closed: false,
                open_time: "09:00",
                close_time: "17:00",
              };
            }
            return {
              day_of_week: dow,
              is_closed: !!row.is_closed,
              open_time: toUiTime(row.open_time) || "09:00",
              close_time: toUiTime(row.close_time) || "17:00",
            };
          });

          if (alive) setHours(merged);
        } else {
          if (alive) setHours(defaultHours());
        }
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e.message || "Failed to load hours");
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, role, workspaceId]);

  // load daily shifts grouped
  useEffect(() => {
    let alive = true;
    if (!token || token === "EXPIRED" || role !== "admin") return;

    (async () => {
      try {
        const grouped = await apiFetch(token, "/daily-shifts", { method: "GET" });
        const normalized = normalizeGroupedDailyShifts(grouped);
        if (alive) setDailyByDay(normalized);
      } catch (e) {
        if (alive) setErr((prev) => prev || e.message || "Failed to load daily shifts");
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, role]);

  // Guards AFTER hooks
  if (!token || token === "EXPIRED") return <Navigate to={LOGIN_ROUTE} replace />;
  if (role !== "admin") return <Navigate to="/submission-shifts/my-workspace" replace />;
  if (!workspaceId) return <Navigate to="/submission-shifts/my-workspace" replace />;

  const rows = hours.slice().sort((a, b) => a.day_of_week - b.day_of_week);

  function update(dow, patch) {
    setHours((prev) =>
      prev.map((h) => (Number(h.day_of_week) === Number(dow) ? { ...h, ...patch } : h))
    );
  }

  async function save() {
    setErr("");
    setMsg("");
    setSaving(true);

    const payload = hours.map((h) => {
      const isClosed = !!h.is_closed;
      return {
        dayOfWeek: Number(h.day_of_week),
        isClosed,
        openTime: isClosed ? null : toDbTime(h.open_time),
        closeTime: isClosed ? null : toDbTime(h.close_time),
      };
    });

    try {
      await saveOperatingHours(workspaceId, payload);
      setMsg("Saved operating hours.");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function createShift(dayOfWeek, payload) {
    setErr("");
    setMsg("");
    const res = await apiFetch(token, `/daily-shifts/${dayOfWeek}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const created = res?.template || res;
    setDailyByDay((prev) => {
      const next = { ...prev };
      const list = Array.isArray(next[dayOfWeek]) ? next[dayOfWeek].slice() : [];
      list.push(created);
      next[dayOfWeek] = list;
      return next;
    });

    setMsg("Shift added.");
  }

  async function updateShift(id, payload) {
    setErr("");
    setMsg("");
    const res = await apiFetch(token, `/daily-shifts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    const updated = res?.template || res;
    setDailyByDay((prev) => {
      const next = { ...prev };
      for (let dow = 0; dow < 7; dow++) {
        const list = Array.isArray(next[dow]) ? next[dow].slice() : [];
        const idx = list.findIndex((x) => String(x.id) === String(id));
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updated };
          next[dow] = list;
          break;
        }
      }
      return next;
    });

    setMsg("Shift saved.");
  }

  async function deleteShift(id) {
    setErr("");
    setMsg("");
    await apiFetch(token, `/daily-shifts/${id}`, { method: "DELETE" });

    setDailyByDay((prev) => {
      const next = { ...prev };
      for (let dow = 0; dow < 7; dow++) {
        const list = Array.isArray(next[dow]) ? next[dow].slice() : [];
        const filtered = list.filter((x) => String(x.id) !== String(id));
        if (filtered.length !== list.length) {
          next[dow] = filtered;
          break;
        }
      }
      return next;
    });

    setMsg("Shift deleted.");
  }

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <div>
          <h1 className={classes.h1}>Operating Hours</h1>
          <div className={classes.sub}>Define open/closed days, then build default shifts per day.</div>
        </div>

        <button
          className={`${classes.btn} ${classes.btnPrimary}`}
          onClick={save}
          disabled={saving}
          type="button"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {(err || msg) ? (
        <div className={`${classes.banner} ${err ? classes.bannerErr : classes.bannerOk}`}>
          <span className={`${classes.dot} ${err ? classes.dotErr : classes.dotOk}`} />
          <span>{err || msg}</span>
        </div>
      ) : null}

      <div className={classes.list}>
        {rows.map((h) => {
          const dow = Number(h.day_of_week);
          const isOpen = expandedDow === dow;
          const isClosed = !!h.is_closed;

          return (
            <div key={dow} className={classes.dayCard}>
              <div className={classes.dayTop}>
                <div className={classes.dayName}>{DAYS[dow]}</div>

                <label className={classes.closed}>
                  <input
                    type="checkbox"
                    checked={isClosed}
                    onChange={(e) => update(dow, { is_closed: e.target.checked })}
                  />
                  <span>Closed</span>
                </label>

                <div className={classes.times}>
                  <input
                    className={classes.time}
                    type="time"
                    disabled={isClosed}
                    value={h.open_time || "09:00"}
                    onChange={(e) => update(dow, { open_time: e.target.value })}
                  />
                  <span className={classes.sep}>—</span>
                  <input
                    className={classes.time}
                    type="time"
                    disabled={isClosed}
                    value={h.close_time || "17:00"}
                    onChange={(e) => update(dow, { close_time: e.target.value })}
                  />
                </div>

                <button
                  className={classes.btn}
                  type="button"
                  onClick={() => setExpandedDow((prev) => (prev === dow ? null : dow))}
                >
                  {isOpen ? "Hide Shifts" : "Manage Shifts"}
                </button>
              </div>

              {isOpen ? (
                <DailyShiftsManager
                  dayOfWeek={dow}
                  isClosed={isClosed}
                  shifts={dailyByDay[dow] || []}
                  onCreate={createShift}
                  onUpdate={updateShift}
                  onDelete={deleteShift}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}










// work: without-CSS

// import { useEffect, useMemo, useState } from "react";
// import { Navigate, useParams, useRouteLoaderData } from "react-router-dom";
// import { getOperatingHours, saveOperatingHours } from "../../api/workspaces";
// import DailyShiftsManager from "../../components/SubmissionShifts/DailyShiftsManager";

// const LOGIN_ROUTE = "/auth";
// const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// function defaultHours() {
//   return Array.from({ length: 7 }).map((_, i) => ({
//     day_of_week: i,
//     is_closed: false,
//     open_time: "09:00",
//     close_time: "17:00",
//   }));
// }

// function toUiTime(t) {
//   if (!t) return "";
//   return String(t).slice(0, 5);
// }

// function toDbTime(t) {
//   if (!t) return null;
//   const s = String(t);
//   return s.length === 5 ? `${s}:00` : s;
// }

// function getTokenFallback() {
//   return (
//     localStorage.getItem("token") ||
//     localStorage.getItem("jwt") ||
//     localStorage.getItem("accessToken") ||
//     null
//   );
// }

// // async function apiFetch(path, token, opts = {}) {
// //   const res = await fetch(path, {
// //     ...opts,
// //     headers: {
// //       ...(opts.headers || {}),
// //       Authorization: token ? `Bearer ${token}` : undefined,
// //     },
// //   });

// //   const isJson = (res.headers.get("content-type") || "").includes("application/json");
// //   const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

// //   if (!res.ok) {
// //     const msg =
// //       (data && typeof data === "object" && (data.message || data.error)) ||
// //       (typeof data === "string" && data) ||
// //       `Request failed (${res.status})`;
// //     throw new Error(msg);
// //   }

// //   return data;
// // }


// const API_BASE =
//   process.env.REACT_APP_API_BASE_URL || "http://localhost:8080"; 

// async function apiFetch(path, token, opts = {}) {
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
//   const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

//   if (!res.ok) {
//     const msg =
//       isJson
//         ? (data?.message || data?.error || `Request failed (${res.status})`)
//         : `Request failed (${res.status})`;
//     throw new Error(msg);
//   }

//   return data;
// }






// export default function AdminOperatingHours() {
//   const rootData = useRouteLoaderData("root");
//   const token = rootData?.token || getTokenFallback();

//   const { id } = useParams();
//   const workspaceId = id;

//   const [hours, setHours] = useState(defaultHours());
//   const [err, setErr] = useState("");
//   const [msg, setMsg] = useState("");

//   const [dailyShiftsByDay, setDailyShiftsByDay] = useState({
//     0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
//   });
//   const [expandedDay, setExpandedDay] = useState(null);

//   const role = useMemo(() => {
//     if (!token || token === "EXPIRED") return null;
//     try {
//       return JSON.parse(atob(token.split(".")[1]))?.role || null;
//     } catch {
//       return null;
//     }
//   }, [token]);

//   useEffect(() => {
//     let alive = true;
//     if (!token || token === "EXPIRED" || role !== "admin" || !workspaceId) return;

//     (async () => {
//       setErr("");
//       setMsg("");
//       try {
//         const data = await getOperatingHours(workspaceId);
//         const arr = Array.isArray(data) ? data : data?.hours;

//         const byDow = new Map((arr || []).map((x) => [Number(x.day_of_week), x]));
//         const merged = Array.from({ length: 7 }).map((_, dow) => {
//           const row = byDow.get(dow);
//           if (!row) {
//             return { day_of_week: dow, is_closed: false, open_time: "09:00", close_time: "17:00" };
//           }
//           return {
//             day_of_week: dow,
//             is_closed: !!row.is_closed,
//             open_time: toUiTime(row.open_time) || "09:00",
//             close_time: toUiTime(row.close_time) || "17:00",
//           };
//         });

//         if (alive) setHours(merged);
//       } catch (e) {
//         if (!alive) return;
//         setErr(e.message || "Failed to load operating hours");
//       }
//     })();

//     return () => { alive = false; };
//   }, [token, role, workspaceId]);

//   useEffect(() => {
//     let alive = true;
//     if (!token || token === "EXPIRED" || role !== "admin") return;

//     (async () => {
//       try {
//         const data = await apiFetch("/daily-shifts", token);
//         const days = data?.days || { 0:[],1:[],2:[],3:[],4:[],5:[],6:[] };

//         if (!alive) return;
//         setDailyShiftsByDay({
//           0: days[0] || [],
//           1: days[1] || [],
//           2: days[2] || [],
//           3: days[3] || [],
//           4: days[4] || [],
//           5: days[5] || [],
//           6: days[6] || [],
//         });
//       } catch (e) {
//         if (!alive) return;
//         setErr((prev) => prev || e.message || "Failed to load daily shifts");
//       }
//     })();

//     return () => { alive = false; };
//   }, [token, role]);

//   if (!token || token === "EXPIRED") return <Navigate to={LOGIN_ROUTE} replace />;
//   if (role !== "admin") return <Navigate to="/submission-shifts/my-workspace" replace />;
//   if (!workspaceId) return <Navigate to="/submission-shifts/my-workspace" replace />;

//   const rows = hours.slice().sort((a, b) => a.day_of_week - b.day_of_week);

//   function updateHour(dow, patch) {
//     setHours((prev) =>
//       prev.map((h) => (Number(h.day_of_week) === Number(dow) ? { ...h, ...patch } : h))
//     );
//   }

//   async function saveHours() {
//     setErr("");
//     setMsg("");

//     const payload = hours.map((h) => {
//       const isClosed = !!h.is_closed;
//       return {
//         dayOfWeek: Number(h.day_of_week),
//         isClosed,
//         openTime: isClosed ? null : toDbTime(h.open_time),
//         closeTime: isClosed ? null : toDbTime(h.close_time),
//       };
//     });

//     try {
//       await saveOperatingHours(workspaceId, payload);
//       setMsg("Saved");
//     } catch (e) {
//       setErr(e.message || "Save failed");
//     }
//   }

// //   async function createShift(dayOfWeek, payload) {
// //     setErr(""); setMsg("");
// //     const res = await apiFetch(`/daily-shifts/${dayOfWeek}`, token, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify(payload),
// //     });

// //     const created = res?.template; // routes return { template }
// //     if (!created) throw new Error("Create failed: missing template");

// //     setDailyShiftsByDay((prev) => ({
// //       ...prev,
// //       [dayOfWeek]: [...(prev[dayOfWeek] || []), created].sort(
// //         (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
// //       ),
// //     }));
// //   }


//   async function createShift(dayOfWeek, payload) {
//     setErr("");
//     setMsg("");

//     const res = await apiFetch(`/daily-shifts/${dayOfWeek}`, token, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const created = res?.template || res; // ✅ accept both shapes
//     if (!created || created.id == null) {
//       throw new Error("Create failed (bad response from server)");
//     }

//     setDailyShiftsByDay((prev) => ({
//       ...prev,
//       [dayOfWeek]: [...(prev[dayOfWeek] || []), created].sort(
//         (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
//       ),
//     }));

//     setMsg("Shift added");
//   }



//   // async function updateShift(id, payload) {
//   //   setErr(""); setMsg("");
//   //   const res = await apiFetch(`/daily-shifts/${id}`, token, {
//   //     method: "PUT",
//   //     headers: { "Content-Type": "application/json" },
//   //     body: JSON.stringify(payload),
//   //   });

//   //   const updated = res?.template;
//   //   if (!updated) throw new Error("Update failed: missing template");

//   //   setDailyShiftsByDay((prev) => {
//   //     const next = { ...prev };
//   //     for (const d of Object.keys(next)) {
//   //       next[d] = (next[d] || [])
//   //         .map((s) => (s.id === id ? updated : s))
//   //         .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
//   //     }
//   //     return next;
//   //   });
//   // }


// async function updateShift(id, payload) {
//   setErr("");
//   setMsg("");

//   const res = await apiFetch(`/daily-shifts/${id}`, token, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });

//   const updated = res?.template || res;
//   if (!updated || updated.id == null) {
//     throw new Error("Update failed (bad response from server)");
//   }

//   setDailyShiftsByDay((prev) => {
//     const next = { ...prev };
//     for (const d of Object.keys(next)) {
//       next[d] = (next[d] || [])
//         .map((s) => (s.id === id ? updated : s))
//         .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
//     }
//     return next;
//   });

//   setMsg("Saved");
// }




//   async function deleteShift(id) {
//     setErr(""); setMsg("");
//     await apiFetch(`/daily-shifts/${id}`, token, { method: "DELETE" });

//     setDailyShiftsByDay((prev) => {
//       const next = { ...prev };
//       for (const d of Object.keys(next)) {
//         next[d] = (next[d] || []).filter((s) => s.id !== id);
//       }
//       return next;
//     });
//   }

//   return (
//     // <div style={{ maxWidth: 1200 }}>
//     <div
//   style={{
//     width: "100%",
//     maxWidth: 1200,
//     margin: "0 auto",
//     padding: "0 16px",
//     boxSizing: "border-box",
//   }}
// >

//       <h2>Operating Hours</h2>

//       {err ? <p style={{ color: "red" }}>{err}</p> : null}
//       {msg ? <p style={{ color: "green" }}>{msg}</p> : null}

//       <div style={{ display: "grid", gap: 12 }}>
//         {rows.map((h) => {
//           const dow = Number(h.day_of_week);
//           const isExpanded = expandedDay === dow;

//           return (
//             <div
//               key={dow}
//               style={{
//                 border: "1px solid #eee",
//                 borderRadius: 10,
//                 padding: 12,
//                 display: "grid",
//                 gap: 10,
//               }}
//             >
//               <div
//                 style={{
//                   display: "grid",
//                   gridTemplateColumns: "120px 110px 140px 140px auto",
//                   gap: 10,
//                   alignItems: "center",
//                 }}
//               >
//                 <strong>{DAYS[dow]}</strong>

//                 <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                   <input
//                     type="checkbox"
//                     checked={!!h.is_closed}
//                     onChange={(e) => updateHour(dow, { is_closed: e.target.checked })}
//                   />
//                   Closed
//                 </label>

//                 <input
//                   type="time"
//                   disabled={!!h.is_closed}
//                   value={h.open_time || "09:00"}
//                   onChange={(e) => updateHour(dow, { open_time: e.target.value })}
//                 />

//                 <input
//                   type="time"
//                   disabled={!!h.is_closed}
//                   value={h.close_time || "17:00"}
//                   onChange={(e) => updateHour(dow, { close_time: e.target.value })}
//                 />

//                 <button
//                   type="button"
//                   onClick={() => setExpandedDay((prev) => (prev === dow ? null : dow))}
//                 >
//                   {isExpanded ? "Hide Shifts" : "Manage Shifts"}
//                 </button>
//               </div>

//               {isExpanded ? (
//                 <DailyShiftsManager
//                   dayOfWeek={dow}
//                   isClosed={!!h.is_closed}
//                   shifts={dailyShiftsByDay[dow] || []}
//                   onCreate={createShift}
//                   onUpdate={updateShift}
//                   onDelete={deleteShift}
//                 />
//               ) : null}
//             </div>
//           );
//         })}
//       </div>

//       <button style={{ marginTop: 16 }} onClick={saveHours}>
//         Save
//       </button>
//     </div>
//   );
// }

