// src/components/SubmissionShifts/AdminScheduleBoard/AssignedWorkerChip.js

import styles from "./AssignedWorkerChip.module.css";

function getWorkerId(w) {
  return w?.workerId || w?.id || w?.userId || w?.uuid || "";
}

function getWorkerName(w) {
  const first = w?.firstName || w?.first_name || "";
  const last = w?.lastName || w?.last_name || "";
  const full = `${first} ${last}`.trim();
  return full || w?.name || w?.email || getWorkerId(w) || "Worker";
}

export default function AssignedWorkerChip({
  worker,
  disabled = false,
  removing = false,
  onRemove,
}) {
  const workerId = getWorkerId(worker);
  const label = getWorkerName(worker);

  return (
    <span className={styles.chip}>
      <span className={styles.label} title={label}>
        {label}
      </span>
        <button
        type="button"
        className={styles.removeBtn}
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onRemove && workerId) onRemove(workerId);
        }}
        disabled={disabled || removing || !workerId}
        aria-label="Remove assignment"
        title="Remove assignment"
        >
        {removing ? "…" : "×"}
        </button>
    </span>
  );
}
