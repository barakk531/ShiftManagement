// src/components/SubmissionShifts/AdminScheduleBoard/WeekGrid.js
//
// Purpose:
// - Render the weekly grid (days -> shifts).
// - Pass shift objects as-is into ShiftCell.
// - Wire up remove-assignment and click-to-assign props.
//
// Notes:
// - All comments are in English only (per request).

import ShiftCell from "./ShiftCell";
import styles from "./WeekGrid.module.css";

function getDayLabel(isoDate) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
  });
}

export default function WeekGrid({
  workspaceId,
  days,
  pendingRemoveByKey,
  onRemoveAssignment,

  // Click-to-assign props
  workers = [],
  onAssignWorker,
}) {
  if (!days || days.length === 0) {
    return <div className={styles.empty}>No days to display</div>;
  }

  return (
    <div className={styles.grid}>
      {days.map((day) => {
        const dayDate = day?.date || day?.dayDate || "";
        const shifts = Array.isArray(day?.shifts) ? day.shifts : [];

        return (
          <section key={dayDate || `day-${Math.random()}`} className={styles.dayCol}>
            <div className={styles.dayHeader}>
              <div className={styles.dayTitle}>{getDayLabel(dayDate) || dayDate}</div>
              <div className={styles.daySub}>{dayDate}</div>
            </div>

            <div className={styles.shifts}>
              {shifts.length === 0 ? (
                <div className={styles.noShifts}>No shifts</div>
              ) : (
                shifts.map((shift) => (
                  <ShiftCell
                    key={
                      shift?.scheduledShiftId ||
                      shift?.scheduled_shift_id ||
                      shift?.id ||
                      `${dayDate}-${Math.random()}`
                    }
                    dayDate={dayDate}
                    shift={shift}
                    workspaceId={workspaceId}
                    pendingRemoveByKey={pendingRemoveByKey}
                    onRemoveAssignment={onRemoveAssignment}
                    workers={workers}
                    onAssignWorker={onAssignWorker}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
