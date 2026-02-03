// src/components/SubmissionShifts/AdminScheduleBoard/ShiftCell.js
//
// Purpose:
// - Render a single shift card inside the weekly grid.
// - Show assigned workers and allow removing assignments.
// - Provide click-to-assign UI (simple picker, no drag & drop yet).
//
// Notes:
// - All comments are in English only (per request).

import { useMemo, useState } from "react";
import AssignedWorkerChip from "./AssignedWorkerChip";
import styles from "./ShiftCell.module.css";

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getShiftId(shift) {
  return shift?.scheduledShiftId || shift?.scheduled_shift_id || shift?.id || "";
}

function getShiftTemplateId(shift) {
  return (
    shift?.shiftTemplateId ||
    shift?.shift_template_id ||
    shift?.templateId ||
    shift?.template?.id ||
    ""
  );
}

function getShiftTitle(shift) {
  return (
    shift?.shiftName ||
    shift?.name ||
    shift?.templateName ||
    shift?.template?.name ||
    "Shift"
  );
}

function getShiftTime(shift) {
  const start =
    shift?.startTime ||
    shift?.start_time ||
    shift?.template?.startTime ||
    shift?.template?.start_time ||
    "";
  const end =
    shift?.endTime ||
    shift?.end_time ||
    shift?.template?.endTime ||
    shift?.template?.end_time ||
    "";

  const t = `${start}–${end}`.replace(/–$/, "").replace(/^–/, "");
  return t.trim();
}

function getAssignedWorkers(shift) {
  const list = shift?.assignedWorkers || shift?.assigned_workers || shift?.workers || [];
  return Array.isArray(list) ? list : [];
}

function getWorkerId(w) {
  return w?.workerId || w?.id || w?.userId || w?.uuid || "";
}

export default function ShiftCell({
  dayDate,
  shift,
  workspaceId,
  pendingRemoveByKey,
  onRemoveAssignment,

  // Click-to-assign props
  workers = [],
  onAssignWorker,
}) {
  const [assignOpen, setAssignOpen] = useState(false);

  const scheduledShiftId = getShiftId(shift);
  const scheduledShiftIdNum = safeNum(scheduledShiftId, 0);
    const canRemove = scheduledShiftIdNum > 0;
  const shiftTemplateId = getShiftTemplateId(shift);
  const title = getShiftTitle(shift);
  const time = getShiftTime(shift);

  const requiredCount = safeNum(shift?.requiredCount ?? shift?.required_count, 0);

  const assignedWorkers = getAssignedWorkers(shift);
  const filledCount = assignedWorkers.length;
  
  const eligibleWorkers = Array.isArray(shift?.availableWorkers) ? shift.availableWorkers : [];

  const isFull = requiredCount > 0 && filledCount >= requiredCount;
  const isMissing = requiredCount > 0 && filledCount < requiredCount;

  // Quick lookup to prevent showing "assign" enabled for already-assigned workers
  const assignedIds = useMemo(() => {
    const set = new Set();
    for (const w of assignedWorkers) {
      const id = getWorkerId(w);
      if (id) set.add(id);
    }
    return set;
  }, [assignedWorkers]);

  function handleAssignClick() {
    if (isFull) return;
    setAssignOpen((v) => !v);
  }

  function handlePickWorker(workerId) {
    if (!workerId || !onAssignWorker) return;

    // Close picker immediately for responsive UI
    setAssignOpen(false);

    // Delegate API + optimistic update to parent
    onAssignWorker({
      workspaceId,
      scheduledShiftId,
      shiftTemplateId,
      workerId,
      dayDate,
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.title}>
            {title} {time ? <span className={styles.time}>{time}</span> : null}
          </div>

          <div
            className={[
              styles.count,
              isFull ? styles.full : "",
              isMissing ? styles.missing : "",
            ].join(" ")}
            title="Filled / Required"
          >
            {filledCount}/{requiredCount || "-"}
          </div>
        </div>

        <div className={styles.meta}>
          <span className={styles.metaItem}>{dayDate}</span>
          <span className={styles.metaItem}>ID: {scheduledShiftIdNum || "-"}</span>
        </div>
      </div>

      <div className={styles.body}>
        {assignedWorkers.length === 0 ? (
          <div className={styles.empty}>No assigned workers</div>
        ) : (
          <div className={styles.chips}>
            {assignedWorkers.map((w) => {
              const workerId = getWorkerId(w);
              const key = `${scheduledShiftIdNum}:${workerId}`;
              const removing = Boolean(pendingRemoveByKey?.[key]);

              return (
                <AssignedWorkerChip
                key={`${scheduledShiftIdNum}:${workerId}`}
                worker={w}
                removing={removing}
                onRemove={(wid) => {
                    console.log("REMOVE CLICK", {
                        wid,
                        workerIdFromChip: workerId,
                        idToRemove: wid || workerId,
                        workspaceId,
                        scheduledShiftIdRaw: scheduledShiftId,
                        scheduledShiftIdNum,
                        canRemove,
                        hasHandler: !!onRemoveAssignment,
                    });

                    if (!canRemove) return;
                    const idToRemove = wid || workerId;
                    if (!idToRemove) return;

                    onRemoveAssignment?.({
                    workspaceId,
                    scheduledShiftId: scheduledShiftIdNum, // number, not string
                    workerId: idToRemove,
                    });
                }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.hint}>
          {isFull ? "Shift is full" : isMissing ? "Needs more workers" : "OK"}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.assignBtn}
            disabled={isFull || !shiftTemplateId}
            onClick={handleAssignClick}
            title={!shiftTemplateId ? "Missing shiftTemplateId" : "Assign worker"}
          >
            Assign
          </button>
        </div>
      </div>
        {assignOpen ? (
        <div className={styles.assignPicker}>
            {eligibleWorkers.length ? (
            eligibleWorkers.map((w) => {
                const wid = getWorkerId(w);
                const disabled = !wid || assignedIds.has(wid) || isFull;

                return (
                <button
                    key={wid || `${w.firstName || ""}-${w.lastName || ""}`}
                    type="button"
                    className={styles.assignOption}
                    disabled={disabled}
                    onClick={() => handlePickWorker(wid)}
                    title={assignedIds.has(wid) ? "Already assigned" : ""}
                >
                    {(w.firstName || "").trim()} {(w.lastName || "").trim()}
                </button>
                );
            })
            ) : (
            <div className={styles.empty}>No workers available</div>
            )}
        </div>
        ) : null}
    </div>
  );
}
