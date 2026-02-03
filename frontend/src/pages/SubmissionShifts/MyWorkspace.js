import { useEffect, useMemo, useState } from "react";
import { Link, useRouteLoaderData } from "react-router-dom";
import { getMyWorkspace, getOperatingHours } from "../../api/workspaces";

import styles from "./MyWorkspace.module.css";
import { useBodyClass } from "../../components/useBodyClass";
import "../../components/SubmissionShiftsTheme.module.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function decodeJwt(token) {
  if (!token || token === "EXPIRED") return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function MyWorkspace() {

  const [ws, setWs] = useState(null);
  const [hours, setHours] = useState(null);
  const [err, setErr] = useState("");

  const token = useRouteLoaderData("root");
  const user = decodeJwt(token);
  const role = user?.role || null;

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const data = await getMyWorkspace();
        const workspace = data?.workspace || data || null;
        setWs(workspace);

        if (workspace?.id) {
          const h = await getOperatingHours(workspace.id);
          const arr = Array.isArray(h) ? h : h?.hours;
          setHours(Array.isArray(arr) ? arr : null);
        }
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Failed");
      }
    })();
  }, []);

  const sortedHours = useMemo(() => {
    if (!Array.isArray(hours)) return null;
    return hours.slice().sort((a, b) => a.day_of_week - b.day_of_week);
  }, [hours]);

  if (err) return <p className={styles.err}>{err}</p>;

  if (!ws) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.h1}>My Workspace</h1>
            <div className={styles.wsMeta}>No workspace selected</div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardInner}>
            <div className={styles.note}>
              Worker: go to Select Workspace. Admin: create your Workspace.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.h1}>My Workspace</h1>
          <div className={styles.wsMeta}>
            <strong style={{ color: "rgba(255,255,255,0.92)" }}>{ws.name}</strong>{" "}
            <span>({ws.timezone || "timezone"})</span>
          </div>
        </div>

        <div className={styles.actions}>
          {role === "admin" && ws?.id ? (
            <Link to={`/submission-shifts/admin/operating-hours/${ws.id}`}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="button">
                Manage Days & Shifts
              </button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardInner}>
          <div className={styles.sectionTitle}>
            <h2 className={styles.h2}>Operating Hours</h2>
            <div className={styles.sub}>Week overview</div>
          </div>

          {sortedHours ? (
            <div className={styles.grid}>
              {sortedHours.map((h) => {
                const isClosed = !!h.is_closed;
                return (
                  <div key={h.day_of_week} className={styles.dayRow}>
                    <div className={styles.day}>{DAYS[h.day_of_week]}</div>

                    <div className={styles.hours}>
                      {isClosed ? (
                        <span className={styles.badge}>
                          <span className={styles.dot} />
                          Closed
                        </span>
                      ) : (
                        <span className={styles.badge}>
                          <span className={`${styles.dot} ${styles.dotOk}`} />
                          {h.open_time} – {h.close_time}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.note}>No hours defined</div>
          )}
        </div>
      </div>
    </div>
  );
}





// noooooo DELETE::::
//noooooooooooooooooooooooo DELETEEEEEEE:


// import { useEffect, useState } from "react";
// import { Link, useRouteLoaderData } from "react-router-dom";
// import { getMyWorkspace, getOperatingHours } from "../../api/workspaces";

// const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// function decodeJwt(token) {
//   if (!token || token === "EXPIRED") return null;
//   try {
//     return JSON.parse(atob(token.split(".")[1]));
//   } catch {
//     return null;
//   }
// }

// function toHHMM(v) {
//   if (!v) return "";
//   return String(v).slice(0, 5);
// }

// async function apiFetch(path, token, opts = {}) {
//   const res = await fetch(path, {
//     ...opts,
//     headers: {
//       ...(opts.headers || {}),
//       Authorization: token ? `Bearer ${token}` : undefined,
//     },
//   });

//   const isJson = (res.headers.get("content-type") || "").includes("application/json");
//   const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

//   if (!res.ok) {
//     const msg =
//       (data && typeof data === "object" && (data.message || data.error)) ||
//       (typeof data === "string" && data) ||
//       `Request failed (${res.status})`;
//     throw new Error(msg);
//   }

//   return data;
// }

// export default function MyWorkspace() {
//   const [ws, setWs] = useState(null);
//   const [hours, setHours] = useState(null);
//   const [dailyShiftsByDay, setDailyShiftsByDay] = useState({
//     0: [],
//     1: [],
//     2: [],
//     3: [],
//     4: [],
//     5: [],
//     6: [],
//   });
//   const [err, setErr] = useState("");

//   // NOTE: in your app, root loader seems to return token directly.
//   const token = useRouteLoaderData("root");
//   const user = decodeJwt(token);
//   const role = user?.role || null;

//   useEffect(() => {
//     let alive = true;

//     (async () => {
//       setErr("");
//       try {
//         const data = await getMyWorkspace();
//         const workspace = data?.workspace || data || null;

//         if (!alive) return;
//         setWs(workspace);

//         if (workspace?.id) {
//           // operating hours
//           const h = await getOperatingHours(workspace.id);
//           const arr = Array.isArray(h) ? h : h?.hours;

//           if (alive) setHours(Array.isArray(arr) ? arr : null);
//         }

//         // daily shifts (workspace derived from auth on backend)
//         const ds = await apiFetch("/daily-shifts", token);
//         const days = ds?.days || ds || {};

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
//         setErr(e?.response?.data?.message || e.message || "Failed");
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, [token]);

//   if (err) return <p style={{ color: "red" }}>{err}</p>;

//   if (!ws) {
//     return (
//       <div>
//         <h2>No workspace selected</h2>
//         <p>Worker: go to Select Workspace. Admin: create your Workspace.</p>
//       </div>
//     );
//   }

//   const sortedHours = Array.isArray(hours)
//     ? hours.slice().sort((a, b) => a.day_of_week - b.day_of_week)
//     : [];

//   // Build a consistent 0..6 view even if hours missing
//   const hoursByDow = new Map(sortedHours.map((h) => [Number(h.day_of_week), h]));
//   const viewDays = Array.from({ length: 7 }).map((_, dow) => {
//     const h = hoursByDow.get(dow);
//     return {
//       dow,
//       is_closed: h ? !!h.is_closed : false,
//       open_time: h?.open_time ?? null,
//       close_time: h?.close_time ?? null,
//     };
//   });

//   return (
//     <div style={{ maxWidth: 820 }}>
//       <h2>My Workspace</h2>
//       <p>
//         <strong>{ws.name}</strong> ({ws.timezone || "timezone"})
//       </p>

//       <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//         <h3 style={{ margin: 0 }}>Operating Hours + Daily Shifts</h3>

//         {role === "admin" && ws?.id ? (
//           <Link to={`/submission-shifts/admin/operating-hours/${ws.id}`}>
//             <button type="button">Manage Days & Shifts</button>
//           </Link>
//         ) : null}
//       </div>

//       <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
//         {viewDays.map((d) => {
//         const raw = dailyShiftsByDay?.[d.dow] ?? dailyShiftsByDay?.[String(d.dow)];
//         const shifts = Array.isArray(raw)
//           ? raw.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
//           : [];

//           return (
//             <div
//               key={d.dow}
//               style={{
//                 border: "1px solid #eee",
//                 borderRadius: 10,
//                 padding: 12,
//               }}
//             >
//               <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
//                 <strong style={{ width: 60 }}>{DAYS[d.dow]}</strong>

//                 {d.is_closed ? (
//                   <span>Closed</span>
//                 ) : d.open_time && d.close_time ? (
//                   <span>
//                     {toHHMM(d.open_time)} - {toHHMM(d.close_time)}
//                   </span>
//                 ) : (
//                   <span style={{ color: "#777" }}>No hours defined</span>
//                 )}
//               </div>

//               <div style={{ marginTop: 8, paddingInlineStart: 70 }}>
//                 {shifts.length === 0 ? (
//                   <div style={{ color: "#777" }}>No shifts</div>
//                 ) : (
//                   <div style={{ display: "grid", gap: 6 }}>
//                     {shifts.map((s) => (
//                       <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
//                         <span style={{ fontWeight: 600, minWidth: 140 }}>{s.name}</span>
//                         <span>
//                           {toHHMM(s.start_time)} - {toHHMM(s.end_time)}
//                         </span>
//                         <span style={{ color: "#777" }}>
//                           req: {s.required_count ?? 1}
//                         </span>
//                         {!s.is_active ? (
//                           <span style={{ color: "crimson" }}>(inactive)</span>
//                         ) : null}
//                         {d.is_closed ? (
//                           <span style={{ color: "#999" }}>(day closed)</span>
//                         ) : null}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }





// // import { useEffect, useState } from "react";
// // import { Link, useRouteLoaderData } from "react-router-dom";
// // import { getMyWorkspace, getOperatingHours } from "../../api/workspaces";

// // const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// // function decodeJwt(token) {
// //   if (!token || token === "EXPIRED") return null;
// //   try {
// //     return JSON.parse(atob(token.split(".")[1]));
// //   } catch {
// //     return null;
// //   }
// // }

// // export default function MyWorkspace() {
// //   const [ws, setWs] = useState(null);
// //   const [hours, setHours] = useState(null);
// //   const [err, setErr] = useState("");

// //   const token = useRouteLoaderData("root");
// //   const user = decodeJwt(token);
// //   const role = user?.role || null;

// //   useEffect(() => {
// //     (async () => {
// //       setErr("");
// //       try {
// //         const data = await getMyWorkspace();
// //         const workspace = data?.workspace || data || null;
// //         setWs(workspace);

// //         if (workspace?.id) {
// //           const h = await getOperatingHours(workspace.id);
// //           const arr = Array.isArray(h) ? h : h?.hours;
// //           setHours(Array.isArray(arr) ? arr : null);
// //         }
// //       } catch (e) {
// //         setErr(e?.response?.data?.message || e.message || "Failed");
// //       }
// //     })();
// //   }, []);

// //   if (err) return <p style={{ color: "red" }}>{err}</p>;

// //   if (!ws) {
// //     return (
// //       <div>
// //         <h2>No workspace selected</h2>
// //         <p>Worker: go to Select Workspace. Admin: create your Workspace.</p>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div style={{ maxWidth: 720 }}>
// //       <h2>My Workspace</h2>
// //       <p>
// //         <strong>{ws.name}</strong> ({ws.timezone || "timezone"})
// //       </p>

// //       <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
// //         <h3 style={{ margin: 0 }}>Operating Hours</h3>

// //         {role === "admin" && ws?.id ? (
// //           <Link to={`/submission-shifts/admin/operating-hours/${ws.id}`}>
// //             <button type="button">Set Operating Hours</button>
// //           </Link>
// //         ) : null}
// //         {role === "admin" && (
// //           <Link to="/submission-shifts/admin/shift-templates">
// //             <button type="button">Manage Shift Templates</button>
// //           </Link>
// //         )}        
// //       </div>


// //       {Array.isArray(hours) ? (
// //         <div style={{ display: "grid", gap: 6 }}>
// //           {hours
// //             .slice()
// //             .sort((a, b) => a.day_of_week - b.day_of_week)
// //             .map((h, idx) => (
// //               <div key={idx} style={{ display: "flex", gap: 10 }}>
// //                 <strong style={{ width: 60 }}>{DAYS[h.day_of_week]}</strong>
// //                 {h.is_closed ? (
// //                   <span>Closed</span>
// //                 ) : (
// //                   <span>
// //                     {h.open_time} - {h.close_time}
// //                   </span>
// //                 )}
// //               </div>
// //             ))}
// //         </div>
// //       ) : (
// //         <p>No hours defined</p>
// //       )}
// //     </div>
// //   );
// // }
