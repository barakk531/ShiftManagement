// src/pages/SubmissionShifts/WorkerSubmitAvailability.js
//
// Purpose:
// - Worker submits availability for next week.
// - Loads bundle from GET /availability/next-week and saves via POST /availability/next-week.
//
// Notes:
// - All comments are in English only (per request).

import { useEffect, useMemo, useState } from "react";
import { Navigate, useRouteLoaderData } from "react-router-dom";
import styles from "./WorkerSubmitAvailability.module.css";

const LOGIN_ROUTE = "/auth";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function getTokenFallback() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken") ||
    null
  );
}

async function apiFetch(path, token, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok) {
    const msg =
      (isJson && (data?.message || data?.error)) ||
      (typeof data === "string" && data) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

function toHHmm(raw) {
  if (!raw) return "";

  if (typeof raw === "string") {
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    if (!m) return "";
    const hh = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const hh = String(raw.getHours()).padStart(2, "0");
    const mm = String(raw.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return "";
}

function getShiftTimes(s) {
  const rawStart =
    s?.start_time ?? s?.startTime ?? s?.start ?? s?.start_at ?? s?.startAt ?? null;
  const rawEnd =
    s?.end_time ?? s?.endTime ?? s?.end ?? s?.end_at ?? s?.endAt ?? null;

  const start = toHHmm(rawStart);
  const end = toHHmm(rawEnd);

  return { start, end };
}

export default function WorkerSubmitAvailability() {
  const rootData = useRouteLoaderData("root");
  const token = rootData?.token || getTokenFallback();

  const [bundle, setBundle] = useState(null);
  const [checked, setChecked] = useState({});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { type: 'success' | 'error', text: string }

  const role = useMemo(() => {
    if (!token || token === "EXPIRED") return null;
    try {
      return JSON.parse(atob(token.split(".")[1]))?.role || null;
    } catch {
      return null;
    }
  }, [token]);

  const totalSelected = useMemo(() => {
    let c = 0;
    for (const k of Object.keys(checked || {})) if (checked[k]) c += 1;
    return c;
  }, [checked]);

  useEffect(() => {
    let alive = true;

    if (!token || token === "EXPIRED") {
      setLoading(false);
      return;
    }

    (async () => {
      setErr("");
      setLoading(true);

      try {
        const res = await apiFetch("/availability/next-week", token);
        if (!alive) return;

        if (!res || !Array.isArray(res.days)) {
          throw new Error("Invalid availability bundle (days).");
        }

        setBundle(res);

        const map = {};
        (res.items || []).forEach((i) => {
          map[`${i.day_date}_${i.shift_template_id}`] = !!i.is_available;
        });
        setChecked(map);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load availability");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  if (!token || token === "EXPIRED") return <Navigate to={LOGIN_ROUTE} replace />;
  if (role !== "worker") return <Navigate to="/submission-shifts/my-workspace" replace />;

  function toggle(dayDate, shiftId) {
    const key = `${dayDate}_${shiftId}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function save() {
    setErr("");
    setSaveMsg(null);

    const items = [];
    for (const day of bundle.days || []) {
      const dayDate = day?.date;
      if (!dayDate) continue;

      for (const shift of day.shifts || []) {
        const shiftId = shift?.id;
        if (shiftId == null) continue;

        const key = `${dayDate}_${shiftId}`;
        items.push({
          dayDate,
          shiftTemplateId: String(shiftId),
          isAvailable: !!checked[key],
        });
      }
    }

    try {
      setSaving(true);

      await apiFetch("/availability/next-week", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: bundle.weekStartDate,
          items,
        }),
      });

      setSaveMsg({ type: "success", text: "Availability saved successfully." });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      const text = e?.message || "Save failed.";
      setErr(text);
      setSaveMsg({ type: "error", text });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>Loading...</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className={styles.page}>
        <div className={styles.alert} role="alert">
          {err}
        </div>
      </div>
    );
  }

  if (!bundle) return null;

  const isOpen = !!bundle.windowOpen;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.h1}>Submit availability</h1>
          <div className={styles.wsMeta}>
            <span className={styles.muted}>Workspace:</span>{" "}
            <span className={styles.strong}>{bundle.workspace?.name || "—"}</span>
            <span className={styles.sep}>•</span>
            <span className={styles.muted}>Week start:</span>{" "}
            <span className={styles.strong}>{bundle.weekStartDate}</span>
            <span className={styles.sep}>•</span>
            <span className={styles.muted}>Timezone:</span>{" "}
            <span className={styles.strong}>{bundle.workspace?.timezone || "Asia/Jerusalem"}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={`${styles.badge} ${isOpen ? styles.badgeOk : styles.badgeBad}`}>
            <span className={`${styles.dot} ${isOpen ? styles.dotOk : styles.dotBad}`} />
            {isOpen ? "Window open" : "Window closed"}
          </div>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={save}
            disabled={saving || !isOpen}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {saveMsg ? (
        <div
          className={`${styles.toast} ${
            saveMsg.type === "success" ? styles.toastSuccess : styles.toastError
          }`}
          role="status"
        >
          {saveMsg.text}
        </div>
      ) : null}

      <div className={styles.card}>
        <div className={styles.cardInner}>
          <div className={styles.sectionTitle}>
            <h2 className={styles.h2}>Next week</h2>
            <div className={styles.sub}>
              Selected: <span className={styles.strong}>{totalSelected}</span>
            </div>
          </div>

          <div className={styles.grid}>
            {(bundle.days || []).map((day, idx) => {
              const dayDate = day?.date || `day-${idx}`;
              const isClosed = !!day?.isClosed;
              const shifts = Array.isArray(day?.shifts) ? day.shifts : [];

              return (
                <div className={styles.dayRow} key={dayDate}>
                  <div className={styles.day}>
                    <div className={styles.dayDate}>{day?.date || "—"}</div>
                    {isClosed ? <div className={styles.dayClosed}>Closed</div> : null}
                  </div>

                  <div className={styles.hours}>
                    {isClosed ? (
                      <div className={styles.note}>No shifts (closed)</div>
                    ) : shifts.length === 0 ? (
                      <div className={styles.note}>No shifts</div>
                    ) : (
                      shifts.map((s) => {
                        const key = `${day.date}_${s.id}`;
                        const active = !!checked[key];

                        const { start, end } = getShiftTimes(s);
                        const shiftName = s?.name || "Shift";
                        const timeText = start && end ? `${start}–${end}` : "Time not provided";

                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`${styles.shiftChip} ${active ? styles.shiftChipOn : ""}`}
                            onClick={() => toggle(day.date, s.id)}
                            disabled={!isOpen || saving}
                            aria-pressed={active}
                            title={`${shiftName} ${timeText}`}
                          >
                            <div className={styles.shiftText}>
                              <div className={styles.shiftTime}>{timeText}</div>
                              <div className={styles.shiftName}>{shiftName}</div>
                            </div>

                            <span
                              className={`${styles.shiftMark} ${active ? styles.shiftMarkOn : ""}`}
                            />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!isOpen ? (
            <div className={styles.lockedNote}>
              The submission window is closed. You can view shifts, but cannot change or save.
            </div>
          ) : null}

          {err ? <div className={`${styles.note} ${styles.err}`}>{err}</div> : null}
        </div>
      </div>
    </div>
  );
}



// no-CSS
// // src/pages/SubmissionShifts/WorkerSubmitAvailability.js

// import { useEffect, useMemo, useState } from "react";
// import { Navigate, useRouteLoaderData } from "react-router-dom";

// const LOGIN_ROUTE = "/auth";
// const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

// function getTokenFallback() {
//   return (
//     localStorage.getItem("token") ||
//     localStorage.getItem("jwt") ||
//     localStorage.getItem("accessToken") ||
//     null
//   );
// }

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
//   const data = isJson
//     ? await res.json().catch(() => null)
//     : await res.text().catch(() => "");

//   if (!res.ok) {
//     const msg =
//       (isJson && (data?.message || data?.error)) ||
//       (typeof data === "string" && data) ||
//       `Request failed (${res.status})`;
//     throw new Error(msg);
//   }

//   return data;
// }

// export default function WorkerSubmitAvailability() {
//   const rootData = useRouteLoaderData("root");
//   const token = rootData?.token || getTokenFallback();

//   const [bundle, setBundle] = useState(null);
//   const [checked, setChecked] = useState({});
//   const [err, setErr] = useState("");
//   const [loading, setLoading] = useState(true);

//   const [saving, setSaving] = useState(false);
//   const [saveMsg, setSaveMsg] = useState(null); // { type: 'success' | 'error', text: string }

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

//     if (!token || token === "EXPIRED") {
//       setLoading(false);
//       return;
//     }

//     (async () => {
//       setErr("");
//       setLoading(true);

//       try {
//         const res = await apiFetch("/availability/next-week", token);
//         if (!alive) return;

//         if (!res || !Array.isArray(res.days)) {
//           throw new Error("Invalid availability bundle (days).");
//         }

//         setBundle(res);

//         const map = {};
//         (res.items || []).forEach((i) => {
//           map[`${i.day_date}_${i.shift_template_id}`] = !!i.is_available;
//         });
//         setChecked(map);
//       } catch (e) {
//         if (!alive) return;
//         setErr(e?.message || "Failed to load availability");
//       } finally {
//         if (alive) setLoading(false);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, [token]);

//   if (!token || token === "EXPIRED") return <Navigate to={LOGIN_ROUTE} replace />;
//   if (role !== "worker") return <Navigate to="/submission-shifts/my-workspace" replace />;
//   if (loading) return <p>Loading...</p>;
//   if (err) return <p style={{ color: "red" }}>{err}</p>;
//   if (!bundle) return null;

//   function toggle(dayDate, shiftId) {
//     const key = `${dayDate}_${shiftId}`;
//     setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
//   }

//   async function save() {
//     setErr("");
//     setSaveMsg(null);

//     const items = [];
//     for (const day of bundle.days || []) {
//       const dayDate = day?.date;
//       if (!dayDate) continue;

//       for (const shift of day.shifts || []) {
//         const shiftId = shift?.id;
//         if (shiftId == null) continue;

//         const key = `${dayDate}_${shiftId}`;
//         items.push({
//           dayDate,
//           shiftTemplateId: String(shiftId),
//           isAvailable: !!checked[key],
//         });
//       }
//     }

//     try {
//       setSaving(true);

//       await apiFetch("/availability/next-week", token, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           weekStartDate: bundle.weekStartDate,
//           items,
//         }),
//       });

//       setSaveMsg({ type: "success", text: "Availability saved successfully." });
//       setTimeout(() => setSaveMsg(null), 3000);
//     } catch (e) {
//       const text = e?.message || "Save failed.";
//       setErr(text);
//       setSaveMsg({ type: "error", text });
//     } finally {
//       setSaving(false);
//     }
//   }

//   return (
//     <div
//       style={{
//         width: "100%",
//         maxWidth: 1200,
//         margin: "0 auto",
//         padding: "0 16px",
//         boxSizing: "border-box",
//       }}
//     >
//       <h2>Submit Availability</h2>

//       <p>
//         Workspace: <b>{bundle.workspace?.name || "—"}</b>
//       </p>
//       <p>
//         Week start: <b>{bundle.weekStartDate}</b>
//       </p>
//       <p>
//         Timezone: <b>{bundle.workspace?.timezone || "Asia/Jerusalem"}</b>
//       </p>
//       <p>
//         Window:{" "}
//         <b style={{ color: bundle.windowOpen ? "green" : "red" }}>
//           {bundle.windowOpen ? "OPEN" : "CLOSED"}
//         </b>
//       </p>

//       {saveMsg && (
//         <div
//           style={{
//             margin: "12px 0",
//             padding: "10px 12px",
//             borderRadius: 10,
//             border: "1px solid rgba(255,255,255,0.15)",
//             background:
//               saveMsg.type === "success"
//                 ? "rgba(0,255,0,0.08)"
//                 : "rgba(255,0,0,0.08)",
//           }}
//         >
//           {saveMsg.text}
//         </div>
//       )}

//       <table width="100%" cellPadding="10" style={{ borderCollapse: "collapse" }}>
//         <thead>
//           <tr>
//             <th align="left" style={{ borderBottom: "1px solid #444" }}>
//               Day
//             </th>
//             <th align="left" style={{ borderBottom: "1px solid #444" }}>
//               Shifts
//             </th>
//           </tr>
//         </thead>
//         <tbody>
//           {(bundle.days || []).map((day, idx) => {
//             const dayDate = day?.date || `day-${idx}`;
//             const isClosed = !!day?.isClosed;

//             return (
//               <tr key={dayDate}>
//                 <td style={{ borderBottom: "1px solid #333", width: 180 }}>
//                   {day?.date || "—"}{" "}
//                   {isClosed ? <span style={{ opacity: 0.7 }}>(Closed)</span> : null}
//                 </td>

//                 <td style={{ borderBottom: "1px solid #333" }}>
//                   {isClosed ? (
//                     <span style={{ opacity: 0.7 }}>Closed</span>
//                   ) : (day?.shifts || []).length === 0 ? (
//                     <span style={{ opacity: 0.7 }}>No shifts</span>
//                   ) : (
//                     (day.shifts || []).map((s) => {
//                       const key = `${day.date}_${s.id}`;
//                       return (
//                         <label
//                           key={s.id}
//                           style={{
//                             marginRight: 18,
//                             display: "inline-flex",
//                             gap: 8,
//                             alignItems: "center",
//                           }}
//                         >
//                           <input
//                             type="checkbox"
//                             checked={!!checked[key]}
//                             onChange={() => toggle(day.date, s.id)}
//                             disabled={!bundle.windowOpen || saving}
//                           />
//                           <span>
//                             {s.name} ({String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)})
//                           </span>
//                         </label>
//                       );
//                     })
//                   )}
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>

//       <button onClick={save} disabled={saving || !bundle.windowOpen} style={{ marginTop: 12 }}>
//         {saving ? "Saving..." : "Save"}
//       </button>
//     </div>
//   );
// }
