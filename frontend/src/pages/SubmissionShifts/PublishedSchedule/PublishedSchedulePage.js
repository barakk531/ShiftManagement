// src/pages/SubmissionShifts/PublishedSchedule/PublishedSchedulePage.js
//
// Purpose:
// - Render the published weekly schedule for the logged-in user (admin or worker).
// - Shows only the user's assigned shifts and only when the week is published.
//
// Notes:
// - All comments are in English only (per request).

import { useMemo, useState } from "react";
import styles from "./PublishedSchedulePage.module.css";
import usePublishedScheduleWeek from "../../../hooks/usePublishedScheduleWeek";

function toISODate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function getDefaultWeekStartSundayIsrael() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  const isoToday = `${parts.year}-${parts.month}-${parts.day}`;
  const d = new Date(`${isoToday}T12:00:00`);
  const dow = d.getDay(); // 0=Sunday
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export default function PublishedSchedulePage() {
  const [weekStartDate, setWeekStartDate] = useState(getDefaultWeekStartSundayIsrael());
  const { loading, error, data, reload } = usePublishedScheduleWeek({ weekStartDate });

  const totalShifts = useMemo(() => {
    let n = 0;
    for (const day of data?.days || []) n += Array.isArray(day?.shifts) ? day.shifts.length : 0;
    return n;
  }, [data]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Published Shifts</div>
            <div className={styles.subtitle}>
              {data?.workspace?.name ? `Workspace: ${data.workspace.name}` : "Workspace: —"}
            </div>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.field}>
              <span className={styles.labelText}>Week start</span>
              <input
                className={styles.input}
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
              />
            </label>

            <button className={styles.btn} type="button" onClick={reload}>
              Reload
            </button>

            <div className={styles.metaPill}>
              Total shifts: <strong>{totalShifts}</strong>
            </div>
          </div>
        </div>

        {loading ? <div className={styles.notice}>Loading…</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}

        {!loading && !error && totalShifts === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No published shifts</div>
            <div className={styles.emptyText}>
              This week is not published yet, or you have no assigned shifts.
            </div>
          </div>
        ) : null}

        <div className={styles.grid}>
          {(data?.days || []).map((d) => (
            <div key={d.date} className={styles.dayCard}>
              <div className={styles.dayHeader}>
                <div className={styles.dayTitle}>{d.date}</div>
                <div className={styles.dayCount}>{(d.shifts || []).length} shifts</div>
              </div>

              <div className={styles.shiftList}>
                {(d.shifts || []).map((s) => (
                  <div
                    key={`${s.scheduledShiftId}-${s.shiftTemplateId}`}
                    className={styles.shiftRow}
                  >
                    <div className={styles.shiftLeft}>
                      <div className={styles.shiftName}>{s.name}</div>
                      <div className={styles.shiftHint}>Assigned</div>
                    </div>

                    <div className={styles.shiftTimePill}>
                      {String(s.startTime || "").slice(0, 5)}–{String(s.endTime || "").slice(0, 5)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
