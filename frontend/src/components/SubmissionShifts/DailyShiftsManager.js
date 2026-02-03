// // src/components/SubmissionShifts/DailyShiftsManager.js
// import { useEffect, useMemo, useState } from "react";
// import styles from "./DailyShiftsManager.module.css";

// function toHHMM(v) {
//   if (!v) return "";
//   return String(v).slice(0, 5); // supports "HH:MM:SS"
// }

// export default function DailyShiftsManager({
//   dayOfWeek,
//   isClosed,
//   shifts,
//   onCreate, // (dayOfWeek, payload) => Promise
//   onUpdate, // (id, payload) => Promise
//   onDelete, // (id) => Promise
// }) {
//   const disabled = !!isClosed;

//   const [uiErr, setUiErr] = useState("");
//   const [uiMsg, setUiMsg] = useState("");

//   const [form, setForm] = useState({
//     name: "",
//     startTime: "09:00",
//     endTime: "17:00",
//     sortOrder: 1,
//     requiredCount: 1,
//     isActive: true,
//   });

//   useEffect(() => {
//     const maxOrder = (shifts || []).reduce(
//       (m, s) => Math.max(m, Number(s.sort_order ?? 0)),
//       0
//     );
//     setForm((p) => ({ ...p, sortOrder: maxOrder + 1 }));
//   }, [dayOfWeek, shifts]);

//   const sorted = useMemo(
//     () =>
//       (shifts || [])
//         .slice()
//         .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
//     [shifts]
//   );

//   async function handleCreate(e) {
//     e.preventDefault();
//     if (disabled) return;

//     setUiErr("");
//     setUiMsg("");

//     const payload = {
//       name: String(form.name || "").trim(),
//       startTime: form.startTime,
//       endTime: form.endTime,
//       sortOrder: Number(form.sortOrder),
//       requiredCount: Number(form.requiredCount),
//       isActive: !!form.isActive,
//     };

//     if (!payload.name) {
//       setUiErr("Shift name is required.");
//       return;
//     }

//     try {
//       await onCreate(dayOfWeek, payload);
//       setUiMsg("Shift added");
//       setForm((p) => ({
//         ...p,
//         name: "",
//         requiredCount: 1,
//         isActive: true,
//       }));
//     } catch (err) {
//       setUiErr(err?.message || "Failed to add shift.");
//     }
//   }

//   return (
//     <div className={`${styles.container} ${disabled ? styles.disabled : ""}`}>
//       <div className={styles.inner}>
//         <div className={styles.titleRow}>
//           <div className={styles.title}>Daily Shifts</div>
//           {disabled ? (
//             <div className={styles.subtitle}>(Closed day – read only)</div>
//           ) : null}
//         </div>

//         {uiErr ? (
//           <div className={`${styles.banner} ${styles.bannerErr}`}>
//             <span className={`${styles.dot} ${styles.dotErr}`} />
//             <span>{uiErr}</span>
//           </div>
//         ) : null}

//         {uiMsg ? (
//           <div className={`${styles.banner} ${styles.bannerOk}`}>
//             <span className={`${styles.dot} ${styles.dotOk}`} />
//             <span>{uiMsg}</span>
//           </div>
//         ) : null}

//         <div className={styles.scrollX}>
//           <div className={styles.gridHeader}>
//             <div>Shift name</div>
//             <div>Start</div>
//             <div>End</div>
//             <div>Order</div>
//             <div>Required</div>
//             <div className={styles.center}>Active</div>
//             <div />
//           </div>

//           <form onSubmit={handleCreate} className={styles.gridCreate}>
//             <input
//               className={styles.input}
//               disabled={disabled}
//               placeholder="e.g. Morning"
//               value={form.name}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, name: e.target.value }))
//               }
//             />

//             <input
//               className={styles.time}
//               disabled={disabled}
//               type="time"
//               value={form.startTime}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, startTime: e.target.value }))
//               }
//             />

//             <input
//               className={styles.time}
//               disabled={disabled}
//               type="time"
//               value={form.endTime}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, endTime: e.target.value }))
//               }
//             />

//             <input
//               className={styles.num}
//               disabled={disabled}
//               type="number"
//               min="0"
//               value={form.sortOrder}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, sortOrder: e.target.value }))
//               }
//             />

//             <input
//               className={styles.num}
//               disabled={disabled}
//               type="number"
//               min="0"
//               value={form.requiredCount}
//               onChange={(e) =>
//                 setForm((p) => ({ ...p, requiredCount: e.target.value }))
//               }
//             />

//             <div className={styles.center}>
//               <input
//                 className={styles.checkbox}
//                 disabled={disabled}
//                 type="checkbox"
//                 checked={form.isActive}
//                 onChange={(e) =>
//                   setForm((p) => ({ ...p, isActive: e.target.checked }))
//                 }
//               />
//             </div>

//             <button
//               className={`${styles.btn} ${styles.btnPrimary}`}
//               disabled={disabled}
//               type="submit"
//             >
//               Add
//             </button>
//           </form>
//         </div>

//         <div className={styles.list}>
//           {sorted.length === 0 ? (
//             <div className={styles.empty}>No shifts for this day.</div>
//           ) : (
//             sorted.map((s) => (
//               <ShiftRow
//                 key={s.id}
//                 shift={s}
//                 disabled={disabled}
//                 onUpdate={onUpdate}
//                 onDelete={onDelete}
//               />
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function ShiftRow({ shift, disabled, onUpdate, onDelete }) {
//   const [uiErr, setUiErr] = useState("");

//   const [edit, setEdit] = useState({
//     name: shift.name || "",
//     startTime: toHHMM(shift.start_time),
//     endTime: toHHMM(shift.end_time),
//     sortOrder: Number(shift.sort_order ?? 0),
//     requiredCount: Number(shift.required_count ?? 1),
//     isActive: !!shift.is_active,
//   });

//   useEffect(() => {
//     setEdit({
//       name: shift.name || "",
//       startTime: toHHMM(shift.start_time),
//       endTime: toHHMM(shift.end_time),
//       sortOrder: Number(shift.sort_order ?? 0),
//       requiredCount: Number(shift.required_count ?? 1),
//       isActive: !!shift.is_active,
//     });
//   }, [
//     shift.id,
//     shift.name,
//     shift.start_time,
//     shift.end_time,
//     shift.sort_order,
//     shift.required_count,
//     shift.is_active,
//   ]);

//   async function save() {
//     if (disabled) return;
//     setUiErr("");
//     try {
//       await onUpdate(shift.id, {
//         name: String(edit.name || "").trim(),
//         startTime: edit.startTime,
//         endTime: edit.endTime,
//         sortOrder: Number(edit.sortOrder),
//         requiredCount: Number(edit.requiredCount),
//         isActive: !!edit.isActive,
//       });
//     } catch (err) {
//       setUiErr(err?.message || "Failed to save.");
//     }
//   }

//   async function remove() {
//     if (disabled) return;
//     setUiErr("");
//     try {
//       await onDelete(shift.id);
//     } catch (err) {
//       setUiErr(err?.message || "Failed to delete.");
//     }
//   }

//   return (
//     <div className={styles.rowCard}>
//       {uiErr ? (
//         <div className={`${styles.banner} ${styles.bannerErr}`}>
//           <span className={`${styles.dot} ${styles.dotErr}`} />
//           <span>{uiErr}</span>
//         </div>
//       ) : null}

//       <div className={styles.scrollX}>
//         <div className={styles.gridRow}>
//           <input
//             className={styles.input}
//             disabled={disabled}
//             value={edit.name}
//             onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
//           />

//           <input
//             className={styles.time}
//             disabled={disabled}
//             type="time"
//             value={edit.startTime}
//             onChange={(e) =>
//               setEdit((p) => ({ ...p, startTime: e.target.value }))
//             }
//           />

//           <input
//             className={styles.time}
//             disabled={disabled}
//             type="time"
//             value={edit.endTime}
//             onChange={(e) =>
//               setEdit((p) => ({ ...p, endTime: e.target.value }))
//             }
//           />

//           <input
//             className={styles.num}
//             disabled={disabled}
//             type="number"
//             min="0"
//             value={edit.sortOrder}
//             onChange={(e) =>
//               setEdit((p) => ({ ...p, sortOrder: e.target.value }))
//             }
//           />

//           <input
//             className={styles.num}
//             disabled={disabled}
//             type="number"
//             min="0"
//             value={edit.requiredCount}
//             onChange={(e) =>
//               setEdit((p) => ({ ...p, requiredCount: e.target.value }))
//             }
//           />

//           <div className={styles.center}>
//             <input
//               className={styles.checkbox}
//               disabled={disabled}
//               type="checkbox"
//               checked={edit.isActive}
//               onChange={(e) =>
//                 setEdit((p) => ({ ...p, isActive: e.target.checked }))
//               }
//             />
//           </div>

//           <button
//             className={`${styles.btn} ${styles.btnPrimary}`}
//             disabled={disabled}
//             type="button"
//             onClick={save}
//           >
//             Save
//           </button>

//           <button
//             className={`${styles.btn} ${styles.btnDanger}`}
//             disabled={disabled}
//             type="button"
//             onClick={remove}
//           >
//             Delete
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }











import { useEffect, useMemo, useState } from "react";
import styles from "./DailyShiftsManager.module.css";

function toHHMM(v) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

export default function DailyShiftsManager({
  dayOfWeek,
  isClosed,
  shifts,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const disabled = !!isClosed;

  const [uiErr, setUiErr] = useState("");
  const [uiMsg, setUiMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    sortOrder: 1,
    requiredCount: 1,
    isActive: true,
  });

  useEffect(() => {
    const maxOrder = (shifts || []).reduce(
      (m, s) => Math.max(m, Number(s.sort_order ?? 0)),
      0
    );
    setForm((p) => ({ ...p, sortOrder: maxOrder + 1 }));
  }, [dayOfWeek, shifts]);

  async function handleCreate(e) {
    e.preventDefault();
    if (disabled) return;

    setUiErr("");
    setUiMsg("");

    const payload = {
      name: String(form.name || "").trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      sortOrder: Number(form.sortOrder),
      requiredCount: Number(form.requiredCount),
      isActive: !!form.isActive,
    };

    if (!payload.name) {
      setUiErr("Shift name is required.");
      return;
    }

    try {
      await onCreate(dayOfWeek, payload);
      setUiMsg("Added.");
      setForm((p) => ({
        ...p,
        name: "",
        requiredCount: 1,
        isActive: true,
      }));
    } catch (err) {
      setUiErr(err?.message || "Failed to add shift.");
    }
  }

  const sorted = useMemo(
    () =>
      (shifts || [])
        .slice()
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [shifts]
  );

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ""}`}>
      <div className={styles.title}>
        Daily Shifts
        {disabled ? (
          <span className={styles.subtitle}>(Closed day – read only)</span>
        ) : null}
      </div>

      {uiErr ? <div className={styles.err}>{uiErr}</div> : null}
      {uiMsg ? <div className={styles.msg}>{uiMsg}</div> : null}

      <div className={styles.scrollX}>
      <div className={styles.gridHeader}>
        <div>Shift name</div>
        <div>Start</div>
        <div>End</div>
        <div>Order</div>
        <div>Required</div>
        <div className={styles.center}>Active</div>
        <div className={styles.center}>Action</div>
      </div>


        <form onSubmit={handleCreate} className={styles.gridCreate}>
          <input
            className={styles.input}
            disabled={disabled}
            placeholder="e.g. Morning"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />

          <input
            className={styles.time}
            disabled={disabled}
            type="time"
            value={form.startTime}
            onChange={(e) =>
              setForm((p) => ({ ...p, startTime: e.target.value }))
            }
          />

          <input
            className={styles.time}
            disabled={disabled}
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
          />

          <input
            className={styles.num}
            disabled={disabled}
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
          />

          <input
            className={styles.num}
            disabled={disabled}
            type="number"
            min="0"
            value={form.requiredCount}
            onChange={(e) =>
              setForm((p) => ({ ...p, requiredCount: e.target.value }))
            }
          />

          <div className={styles.center}>
            <input
              className={styles.checkbox}
              disabled={disabled}
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((p) => ({ ...p, isActive: e.target.checked }))
              }
            />
          </div>

          <button className={styles.btn} disabled={disabled} type="submit">
            Add
          </button>
        </form>
      </div>

      <div className={styles.list}>
        {sorted.length === 0 ? (
          <div style={{ color: "#666" }}>No shifts for this day.</div>
        ) : (
          sorted.map((s) => (
            <ShiftRow
              key={s.id}
              shift={s}
              disabled={disabled}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ShiftRow({ shift, disabled, onUpdate, onDelete }) {
  const [uiErr, setUiErr] = useState("");

  const [edit, setEdit] = useState({
    name: shift.name || "",
    startTime: toHHMM(shift.start_time),
    endTime: toHHMM(shift.end_time),
    sortOrder: Number(shift.sort_order ?? 0),
    requiredCount: Number(shift.required_count ?? 1),
    isActive: !!shift.is_active,
  });

  useEffect(() => {
    setEdit({
      name: shift.name || "",
      startTime: toHHMM(shift.start_time),
      endTime: toHHMM(shift.end_time),
      sortOrder: Number(shift.sort_order ?? 0),
      requiredCount: Number(shift.required_count ?? 1),
      isActive: !!shift.is_active,
    });
  }, [
    shift.id,
    shift.name,
    shift.start_time,
    shift.end_time,
    shift.sort_order,
    shift.required_count,
    shift.is_active,
  ]);

  async function save() {
    if (disabled) return;
    setUiErr("");
    try {
      await onUpdate(shift.id, {
        name: String(edit.name || "").trim(),
        startTime: edit.startTime,
        endTime: edit.endTime,
        sortOrder: Number(edit.sortOrder),
        requiredCount: Number(edit.requiredCount),
        isActive: !!edit.isActive,
      });
    } catch (err) {
      setUiErr(err?.message || "Failed to save.");
    }
  }

  async function remove() {
    if (disabled) return;
    setUiErr("");
    try {
      await onDelete(shift.id);
    } catch (err) {
      setUiErr(err?.message || "Failed to delete.");
    }
  }
  return (
    <div className={styles.rowCard}>
      {uiErr ? <div className={styles.err}>{uiErr}</div> : null}

      <div className={styles.scrollX}>
        <div className={styles.gridRow}>
          <input
            className={styles.input}
            disabled={disabled}
            value={edit.name}
            onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
          />

          <input
            className={styles.time}
            disabled={disabled}
            type="time"
            value={edit.startTime}
            onChange={(e) =>
              setEdit((p) => ({ ...p, startTime: e.target.value }))
            }
          />

          <input
            className={styles.time}
            disabled={disabled}
            type="time"
            value={edit.endTime}
            onChange={(e) => setEdit((p) => ({ ...p, endTime: e.target.value }))}
          />

          <input
            className={styles.num}
            disabled={disabled}
            type="number"
            min="0"
            value={edit.sortOrder}
            onChange={(e) =>
              setEdit((p) => ({ ...p, sortOrder: e.target.value }))
            }
          />

          <input
            className={styles.num}
            disabled={disabled}
            type="number"
            min="0"
            value={edit.requiredCount}
            onChange={(e) =>
              setEdit((p) => ({ ...p, requiredCount: e.target.value }))
            }
          />

          <div className={styles.center}>
            <input
              className={styles.checkbox}
              disabled={disabled}
              type="checkbox"
              checked={edit.isActive}
              onChange={(e) =>
                setEdit((p) => ({ ...p, isActive: e.target.checked }))
              }
            />
          </div>

          <button className={styles.btn} disabled={disabled} type="button" onClick={save}>
            Save
          </button>
          <button className={styles.btn} disabled={disabled} type="button" onClick={remove}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}



