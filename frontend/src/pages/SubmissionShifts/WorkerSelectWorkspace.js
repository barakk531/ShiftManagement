

// src/pages/SubmissionShifts/WorkerSelectWorkspace.js
//
// Purpose:
// - Worker selects and joins a workspace.
// - Uses the new multi-workspace flow:
//   - GET /workspaces/available
//   - POST /workspaces/:id/join
// - After join, redirects to /submission-shifts/my-workspace
//
// Notes:
// - All comments are in English only (per request).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAvailableWorkspaces, joinWorkspace } from "../../api/workspaces";
import styles from "./WorkerSelectWorkspace.module.css";

export default function WorkerSelectWorkspace() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const data = await listAvailableWorkspaces();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || "Failed to load workspaces");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((w) => {
      const name = String(w?.name || "").toLowerCase();
      const status = String(w?.membership_status || "").toLowerCase();
      return name.includes(q) || status.includes(q);
    });
  }, [items, query]);

  const selectedWorkspace = useMemo(() => {
    return items.find((w) => w.id === selected) || null;
  }, [items, selected]);

  async function submit() {
    setErr("");
    try {
      if (!selected) return setErr("Select a workspace");
      setSubmitting(true);
      await joinWorkspace(selected);
      nav("/submission-shifts/my-workspace", { replace: true });
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to join workspace");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.hgroup}>
              <h1 className={styles.title}>Select workspace</h1>
              <p className={styles.subtitle}>Choose where you want to submit availability.</p>
            </div>

            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => {
                setQuery("");
                setSelected("");
                setErr("");
                setLoading(true);
                (async () => {
                  try {
                    const data = await listAvailableWorkspaces();
                    setItems(Array.isArray(data) ? data : []);
                  } catch (e) {
                    setErr(e?.response?.data?.message || e.message || "Failed to load workspaces");
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
              disabled={loading || submitting}
            >
              Reload
            </button>
          </div>

          <div className={styles.searchRow}>
            <input
              className={styles.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workspace..."
              aria-label="Search workspace"
              disabled={loading}
            />
          </div>
        </header>

        {err ? (
          <div className={styles.alert} role="alert">
            {err}
          </div>
        ) : null}

        <section className={styles.card}>
          {loading ? (
            <div className={styles.state}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No workspaces found</div>
              <div className={styles.emptyText}>Try a different search.</div>
            </div>
          ) : (
            <ul className={styles.list} role="list">
              {filtered.map((w) => {
                const active = w.id === selected;
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      className={`${styles.item} ${active ? styles.itemActive : ""}`}
                      onClick={() => setSelected(w.id)}
                      aria-pressed={active}
                      disabled={submitting}
                    >
                      <div className={styles.itemMain}>
                        <div className={styles.itemTitle}>{w.name || "Workspace"}</div>
                        <div className={styles.itemMeta}>
                          {w.membership_status ? `Status: ${w.membership_status}` : "Status: available"}
                        </div>
                      </div>

                      <div className={`${styles.pill} ${active ? styles.pillActive : ""}`}>
                        {active ? "Selected" : "Select"}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className={styles.footer}>
            <div className={styles.selection}>
              {selectedWorkspace ? (
                <>
                  <div className={styles.selectionLabel}>Selected</div>
                  <div className={styles.selectionValue}>{selectedWorkspace.name}</div>
                </>
              ) : (
                <>
                  <div className={styles.selectionLabel}>Selected</div>
                  <div className={styles.selectionValueMuted}>None</div>
                </>
              )}
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  setQuery("");
                  setSelected("");
                  setErr("");
                }}
                disabled={submitting || (!query && !selected && !err)}
              >
                Clear
              </button>

              <button
                type="button"
                className={styles.primaryBtn}
                onClick={submit}
                disabled={submitting || !selected}
              >
                {submitting ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}





// no-CSS
// // src/pages/SubmissionShifts/WorkerSelectWorkspace.js
// //
// // Purpose:
// // - Worker selects and joins a workspace.
// // - Uses the new multi-workspace flow:
// //   - GET /workspaces/available
// //   - POST /workspaces/:id/join
// // - After join, redirects to /submission-shifts/my-workspace
// //
// // Notes:
// // - All comments are in English only (per request).

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { listAvailableWorkspaces, joinWorkspace } from "../../api/workspaces";

// export default function WorkerSelectWorkspace() {
//   const nav = useNavigate();

//   const [items, setItems] = useState([]);
//   const [selected, setSelected] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [err, setErr] = useState("");

//   useEffect(() => {
//     (async () => {
//       setErr("");
//       setLoading(true);
//       try {
//         const data = await listAvailableWorkspaces();
//         setItems(Array.isArray(data) ? data : []);
//       } catch (e) {
//         setErr(e?.response?.data?.message || e.message || "Failed to load workspaces");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   async function submit() {
//     setErr("");
//     try {
//       if (!selected) return setErr("Select a workspace");
//       setSubmitting(true);

//       await joinWorkspace(selected);

//       nav("/submission-shifts/my-workspace", { replace: true });
//     } catch (e) {
//       setErr(e?.response?.data?.message || e.message || "Failed to join workspace");
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <div style={{ maxWidth: 520 }}>
//       <h2>Select Workspace</h2>

//       {err ? <p style={{ color: "red" }}>{err}</p> : null}

//       {loading ? (
//         <p>Loading...</p>
//       ) : (
//         <>
//           <select value={selected} onChange={(e) => setSelected(e.target.value)}>
//             <option value="">-- choose --</option>
//             {items.map((w) => (
//               <option key={w.id} value={w.id}>
//                 {w.name}
//                 {w.membership_status ? ` (${w.membership_status})` : ""}
//               </option>
//             ))}
//           </select>

//           <button onClick={submit} style={{ marginLeft: 10 }} disabled={submitting}>
//             {submitting ? "Joining..." : "Join"}
//           </button>
//         </>
//       )}
//     </div>
//   );
// }





// // import { useEffect, useState } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { listWorkspaces, selectWorkspace } from "../../api/workspaces";

// // export default function WorkerSelectWorkspace() {
// //   const nav = useNavigate();
// //   const [items, setItems] = useState([]);
// //   const [selected, setSelected] = useState("");
// //   const [err, setErr] = useState("");

// //   useEffect(() => {
// //     (async () => {
// //       setErr("");
// //       try {
// //         const data = await listWorkspaces();
// //         setItems(Array.isArray(data) ? data : data?.workspaces || []);
// //       } catch (e) {
// //         setErr(e?.response?.data?.message || e.message || "Failed to load");
// //       }
// //     })();
// //   }, []);

// //   async function submit() {
// //     setErr("");
// //     try {
// //       if (!selected) return setErr("Select a workspace");
// //       await selectWorkspace(selected);
// //     //   nav("/me/workspace");
// //     nav("/submission-shifts/my-workspace");
// //     } catch (e) {
// //       setErr(e?.response?.data?.message || e.message || "Failed");
// //     }
// //   }

// //   return (
// //     <div style={{ maxWidth: 520 }}>
// //       <h2>Select Workspace</h2>
// //       {err ? <p style={{ color: "red" }}>{err}</p> : null}

// //       <select value={selected} onChange={(e) => setSelected(e.target.value)}>
// //         <option value="">-- choose --</option>
// //         {items.map((w) => (
// //           <option key={w.id} value={w.id}>
// //             {w.name}
// //           </option>
// //         ))}
// //       </select>

// //       <button onClick={submit} style={{ marginLeft: 10 }}>
// //         Select
// //       </button>
// //     </div>
// //   );
// // }
