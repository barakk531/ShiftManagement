// src/pages/SubmissionShifts/AdminScheduleBuilder.js
//
// Purpose:
// - Admin builds weekly schedule based on worker submissions.
// - Loads week bundle from GET /admin/schedule/week?weekStartDate=YYYY-MM-DD
// - Allows assigning/removing workers per day + shift template (client-side state).
//
// Notes:
// - All comments are in English only (per request).

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../util/apiFetch";
import styles from "./AdminScheduleBuilder.module.css";

function keyFor(dayDate, shiftTemplateId) {
  return `${dayDate}:${shiftTemplateId}`;
}

export default function AdminScheduleBuilder() {
  const [weekStartDate, setWeekStartDate] = useState("");
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [assigned, setAssigned] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!weekStartDate) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await apiFetch(`/admin/schedule/week?weekStartDate=${weekStartDate}`, token);
      setData(res);
      setAssigned({});
    } catch (e) {
      setError(`${e?.message || "Failed"}${e?.status ? ` (status ${e.status})` : ""}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate]);

  const submittedWorkers = useMemo(() => {
    if (!data?.submittedWorkers) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.submittedWorkers;
    return data.submittedWorkers.filter((w) =>
      `${w.firstName} ${w.lastName}`.toLowerCase().includes(q)
    );
  }, [data, query]);

  function isAlreadyAssigned(dayDate, shiftTemplateId, workerId) {
    const k = keyFor(dayDate, shiftTemplateId);
    return (assigned[k] || []).some((w) => w.id === workerId);
  }

  function assignWorker(dayDate, shift, worker) {
    const k = keyFor(dayDate, shift.template.id);
    const current = assigned[k] || [];
    if (current.some((w) => w.id === worker.id)) return;

    const required = Number(shift.requiredCount || 0);
    if (required > 0 && current.length >= required) return;

    setAssigned((prev) => ({
      ...prev,
      [k]: [...current, worker],
    }));
  }

  function removeWorker(dayDate, shiftTemplateId, workerId) {
    const k = keyFor(dayDate, shiftTemplateId);
    const current = assigned[k] || [];
    setAssigned((prev) => ({
      ...prev,
      [k]: current.filter((w) => w.id !== workerId),
    }));
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.h1}>Admin Schedule Builder</h2>

      <div className={styles.toolbar}>
        <label className={styles.dateLabel}>
          <span>Week start (Sunday):</span>
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => setWeekStartDate(e.target.value)}
            className={styles.dateInput}
          />
        </label>

        <button onClick={load} disabled={!weekStartDate || loading} className={styles.btn}>
          {loading ? "Loading..." : "Reload"}
        </button>

        {data?.workspace && (
          <div className={styles.meta}>
            <b>{data.workspace.name}</b> · {data.weekStartDate} · {data.workspace.timezone}
          </div>
        )}
      </div>

      {error && <div className={styles.err}>{error}</div>}

      {!data && !loading && <div className={styles.hint}>Select weekStartDate to load.</div>}

      {data && (
        <div className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <b>Submitted workers</b>
              <span className={styles.count}>{submittedWorkers.length}</span>
            </div>

            <input
              placeholder="Search worker..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.search}
            />

            <div className={styles.workerList}>
              {submittedWorkers.map((w) => (
                <div key={w.id} className={styles.workerCard}>
                  <div>
                    <b>
                      {w.firstName} {w.lastName}
                    </b>
                  </div>
                  <div className={styles.workerMeta}>status: {w.status || "n/a"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.days}>
            {data.days.map((day) => (
              <div key={day.date} className={styles.dayCard}>
                <div className={styles.dayHeader}>
                  <b>{day.date}</b>
                  <span className={styles.dayOfWeek}>dayOfWeek: {day.dayOfWeek}</span>
                </div>

                {day.shifts.length === 0 ? (
                  <div className={styles.closed}>Closed / no templates</div>
                ) : (
                  <div className={styles.shiftGrid}>
                    {day.shifts.map((shift) => {
                      const k = keyFor(day.date, shift.template.id);
                      const assignedHere = assigned[k] || [];
                      const required = Number(shift.requiredCount || 0);

                      return (
                        <div key={shift.template.id} className={styles.shiftCard}>
                          <div className={styles.shiftTop}>
                            <div>
                              <b>{shift.template.name}</b>
                              <div className={styles.shiftTime}>
                                {shift.template.startTime}–{shift.template.endTime}
                              </div>
                            </div>
                            <div className={styles.shiftStats}>
                              required: <b>{required}</b>
                              <br />
                              assigned: <b>{assignedHere.length}</b>
                            </div>
                          </div>

                          <div className={styles.section}>
                            <b>Available:</b>
                            <div className={styles.rows}>
                              {shift.availableWorkers.length === 0 && (
                                <div className={styles.emptyRow}>No one available</div>
                              )}
                              {shift.availableWorkers.map((w) => {
                                const disabled =
                                  isAlreadyAssigned(day.date, shift.template.id, w.id) ||
                                  (required > 0 && assignedHere.length >= required);

                                return (
                                  <div key={w.id} className={styles.row}>
                                    <span>
                                      {w.firstName} {w.lastName}
                                    </span>
                                    <button
                                      disabled={disabled}
                                      onClick={() => assignWorker(day.date, shift, w)}
                                      className={styles.btnSmall}
                                    >
                                      + Assign
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className={styles.section}>
                            <b>Assigned:</b>
                            <div className={styles.rows}>
                              {assignedHere.length === 0 && <div className={styles.emptyRow}>Empty</div>}
                              {assignedHere.map((w) => (
                                <div key={w.id} className={styles.row}>
                                  <span>
                                    {w.firstName} {w.lastName}
                                  </span>
                                  <button
                                    onClick={() => removeWorker(day.date, shift.template.id, w.id)}
                                    className={styles.btnSmall}
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}











// // No -CSS and i liked it
// import { useEffect, useMemo, useState } from "react";
// import { apiFetch } from "../../util/apiFetch";

// function keyFor(dayDate, shiftTemplateId) {
//   return `${dayDate}:${shiftTemplateId}`;
// }

// export default function AdminScheduleBuilder() {
//   const [weekStartDate, setWeekStartDate] = useState("");
//   const [data, setData] = useState(null);
//   const [query, setQuery] = useState("");
//   const [assigned, setAssigned] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   async function load() {
//     if (!weekStartDate) return;
//     setLoading(true);
//     setError("");
//     try {
//         const token = localStorage.getItem("token");
//         const res = await apiFetch(`/admin/schedule/week?weekStartDate=${weekStartDate}`, token);
//         setData(res);
//         setAssigned({});
//     } catch (e) {
//         setError(`${e?.message || "Failed"}${e?.status ? ` (status ${e.status})` : ""}`);
//       }
//  finally {
//         setLoading(false);
//     }
//   }


//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [weekStartDate]);

//   const submittedWorkers = useMemo(() => {
//     if (!data?.submittedWorkers) return [];
//     const q = query.trim().toLowerCase();
//     if (!q) return data.submittedWorkers;
//     return data.submittedWorkers.filter((w) =>
//       `${w.firstName} ${w.lastName}`.toLowerCase().includes(q)
//     );
//   }, [data, query]);

//   function isAlreadyAssigned(dayDate, shiftTemplateId, workerId) {
//     const k = keyFor(dayDate, shiftTemplateId);
//     return (assigned[k] || []).some((w) => w.id === workerId);
//   }

//   function assignWorker(dayDate, shift, worker) {
//     const k = keyFor(dayDate, shift.template.id);
//     const current = assigned[k] || [];
//     if (current.some((w) => w.id === worker.id)) return;

//     const required = Number(shift.requiredCount || 0);
//     if (required > 0 && current.length >= required) return;

//     setAssigned((prev) => ({
//       ...prev,
//       [k]: [...current, worker],
//     }));
//   }

//   function removeWorker(dayDate, shiftTemplateId, workerId) {
//     const k = keyFor(dayDate, shiftTemplateId);
//     const current = assigned[k] || [];
//     setAssigned((prev) => ({
//       ...prev,
//       [k]: current.filter((w) => w.id !== workerId),
//     }));
//   }

//   return (
//     <div style={{ padding: 16 }}>
//       <h2>Admin Schedule Builder</h2>

//       <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
//         <label>
//           Week start (Sunday):
//           <input
//             type="date"
//             value={weekStartDate}
//             onChange={(e) => setWeekStartDate(e.target.value)}
//             style={{ marginLeft: 8 }}
//           />
//         </label>

//         <button onClick={load} disabled={!weekStartDate || loading}>
//           {loading ? "Loading..." : "Reload"}
//         </button>

//         {data?.workspace && (
//           <div style={{ opacity: 0.85 }}>
//             <b>{data.workspace.name}</b> · {data.weekStartDate} · {data.workspace.timezone}
//           </div>
//         )}
//       </div>

//       {error && <div style={{ color: "crimson", marginTop: 12 }}>{error}</div>}

//       {!data && !loading && (
//         <div style={{ marginTop: 12, opacity: 0.8 }}>
//           Select weekStartDate to load.
//         </div>
//       )}

//       {data && (
//         <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 16 }}>
//           <div style={{ border: "1px solid #3333", borderRadius: 12, padding: 12 }}>
//             <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
//               <b>Submitted workers</b>
//               <span style={{ opacity: 0.75 }}>{submittedWorkers.length}</span>
//             </div>

//             <input
//               placeholder="Search worker..."
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               style={{ width: "100%", marginTop: 10, padding: 8 }}
//             />

//             <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
//               {submittedWorkers.map((w) => (
//                 <div key={w.id} style={{ padding: 8, border: "1px solid #3333", borderRadius: 10 }}>
//                   <div>
//                     <b>
//                       {w.firstName} {w.lastName}
//                     </b>
//                   </div>
//                   <div style={{ fontSize: 12, opacity: 0.75 }}>status: {w.status || "n/a"}</div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//             {data.days.map((day) => (
//               <div key={day.date} style={{ border: "1px solid #3333", borderRadius: 12, padding: 12 }}>
//                 <div style={{ display: "flex", justifyContent: "space-between" }}>
//                   <b>{day.date}</b>
//                   <span style={{ opacity: 0.7 }}>dayOfWeek: {day.dayOfWeek}</span>
//                 </div>

//                 {day.shifts.length === 0 ? (
//                   <div style={{ marginTop: 10, opacity: 0.75 }}>Closed / no templates</div>
//                 ) : (
//                   <div
//                     style={{
//                       marginTop: 10,
//                       display: "grid",
//                       gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
//                       gap: 12,
//                     }}
//                   >
//                     {day.shifts.map((shift) => {
//                       const k = keyFor(day.date, shift.template.id);
//                       const assignedHere = assigned[k] || [];
//                       const required = Number(shift.requiredCount || 0);

//                       return (
//                         <div key={shift.template.id} style={{ border: "1px solid #3333", borderRadius: 12, padding: 12 }}>
//                           <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
//                             <div>
//                               <b>{shift.template.name}</b>
//                               <div style={{ fontSize: 12, opacity: 0.75 }}>
//                                 {shift.template.startTime}–{shift.template.endTime}
//                               </div>
//                             </div>
//                             <div style={{ textAlign: "right", fontSize: 12, opacity: 0.8 }}>
//                               required: <b>{required}</b>
//                               <br />
//                               assigned: <b>{assignedHere.length}</b>
//                             </div>
//                           </div>

//                           <div style={{ marginTop: 10 }}>
//                             <b>Available:</b>
//                             <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
//                               {shift.availableWorkers.length === 0 && (
//                                 <div style={{ opacity: 0.7, fontSize: 13 }}>No one available</div>
//                               )}
//                               {shift.availableWorkers.map((w) => {
//                                 const disabled =
//                                   isAlreadyAssigned(day.date, shift.template.id, w.id) ||
//                                   (required > 0 && assignedHere.length >= required);

//                                 return (
//                                   <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
//                                     <span>
//                                       {w.firstName} {w.lastName}
//                                     </span>
//                                     <button disabled={disabled} onClick={() => assignWorker(day.date, shift, w)}>
//                                       + Assign
//                                     </button>
//                                   </div>
//                                 );
//                               })}
//                             </div>
//                           </div>

//                           <div style={{ marginTop: 12 }}>
//                             <b>Assigned:</b>
//                             <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
//                               {assignedHere.length === 0 && <div style={{ opacity: 0.7, fontSize: 13 }}>Empty</div>}
//                               {assignedHere.map((w) => (
//                                 <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
//                                   <span>
//                                     {w.firstName} {w.lastName}
//                                   </span>
//                                   <button onClick={() => removeWorker(day.date, shift.template.id, w.id)}>Remove</button>
//                                 </div>
//                               ))}
//                             </div>
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
