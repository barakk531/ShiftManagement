
// without CSS looks ok

// src/pages/SubmissionShifts/AdminScheduleBoard/AdminScheduleBoardPage.js
//
// Purpose:
// - Admin schedule board page composition (WeekGrid + WorkersPool).
// - Loads weekly schedule (DB source-of-truth) and worker submissions status.
// - Shows only relevant days: today (Israel) -> end of selected week.
// - Includes debug panel for date calculations (Today/WeekStart/WeekEnd/From).
//
// Notes:
// - All comments are in English only (per request).

import { useMemo, useState, useEffect } from "react";
import useAdminScheduleWeek from "../../../hooks/useAdminScheduleWeek";
import { removeAssignment, assignWorker } from "../../../api/adminSchedule";
import WeekGrid from "../../../components/SubmissionShifts/AdminScheduleBoard/WeekGrid";
import styles from "./AdminScheduleBoardPage.module.css";
import { getMyWorkspace } from "../../../api/workspaces";
import useAdminSubmissionsWeek from "../../../hooks/useAdminSubmissionsWeek";
import WorkersPool from "../../../components/SubmissionShifts/AdminScheduleBoard/WorkersPool";
import { publishWeek, unpublishWeek } from "../../../api/adminSchedule";

function toISODate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayISOIsrael() {
  // en-CA guarantees YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeToIsraelDay(value) {
  const iso = toISODate(value); // Always YYYY-MM-DD
  if (!iso) return "";
  // Use noon to avoid DST edge cases
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}


function addDaysISO(isoDate, days) {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function maxISO(a, b) {
  return a >= b ? a : b;
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

  // Use midday to avoid DST edge cases.
  const d = new Date(`${isoToday}T12:00:00`);
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - dow);

  return toISODate(d);
}

function removeWorkerFromShift(shift, workerId) {
  const list = shift?.assignedWorkers || shift?.assigned_workers || shift?.workers || [];
  const arr = Array.isArray(list) ? list : [];
  const next = arr.filter((w) => {
    const id = w?.workerId || w?.id || w?.userId || w?.uuid || "";
    return String(id) !== String(workerId);
  });

  if (shift?.assignedWorkers !== undefined) return { ...shift, assignedWorkers: next };
  if (shift?.assigned_workers !== undefined) return { ...shift, assigned_workers: next };
  if (shift?.workers !== undefined) return { ...shift, workers: next };
  return { ...shift, assignedWorkers: next };
}

function addWorkerToShift(shift, worker) {
  const list = shift?.assignedWorkers || shift?.assigned_workers || shift?.workers || [];
  const arr = Array.isArray(list) ? list : [];

  const wid = worker?.id || worker?.workerId || worker?.userId || worker?.uuid || "";
  const exists = arr.some((w) => {
    const id = w?.workerId || w?.id || w?.userId || w?.uuid || "";
    return String(id) === String(wid);
  });

  if (exists) return shift;

  const next = [...arr, worker];

  if (shift?.assignedWorkers !== undefined) return { ...shift, assignedWorkers: next };
  if (shift?.assigned_workers !== undefined) return { ...shift, assigned_workers: next };
  if (shift?.workers !== undefined) return { ...shift, workers: next };
  return { ...shift, assignedWorkers: next };
}

function getWorkspaceIdFallback() {
  return localStorage.getItem("workspaceId") || localStorage.getItem("selectedWorkspaceId") || "";
}

function findDayDateByScheduledShiftId(days, scheduledShiftId) {
  if (!scheduledShiftId) return "";
  for (const day of days || []) {
    const dayDate = day?.dayDate || day?.date || "";
    const shifts = Array.isArray(day?.shifts) ? day.shifts : [];
    for (const s of shifts) {
      const sid = s?.scheduledShiftId || s?.scheduled_shift_id || s?.id || "";
      if (sid && String(sid) === String(scheduledShiftId)) return dayDate;
    }
  }
  return "";
}


export default function AdminScheduleBoardPage() {
  const [workspaceId, setWorkspaceId] = useState(getWorkspaceIdFallback());
  const [weekStart, setWeekStart] = useState(getDefaultWeekStartSundayIsrael());
  const [pendingRemoveByKey, setPendingRemoveByKey] = useState({});

	const { loading, error, days, setData, reload, weekStatus, missingWorkers } = useAdminScheduleWeek({
		workspaceId,
		weekStart,
	});


	const [publishing, setPublishing] = useState(false);
	const [publishErr, setPublishErr] = useState("");
	// handler: publish
	async function togglePublish() {
		setPublishErr("");
		setPublishing(true);
		try {
			if (weekStatus === "published") {
				await unpublishWeek(weekStart);
			} else {
				await publishWeek(weekStart);
			}
			reload();
		} catch (e) {
			setPublishErr(e?.response?.data?.message || e.message || "Failed");
		} finally {
			setPublishing(false);
		}
	}


  const visibleDays = useMemo(() => {
    const todayISO = todayISOIsrael();
    const weekStartISO = toISODate(weekStart);
    const weekEndISO = weekStartISO ? addDaysISO(weekStartISO, 6) : "";

    const fromISO = weekStartISO ? maxISO(todayISO, weekStartISO) : todayISO;

    return (days || []).filter((day) => {
			const rawDayDate = day?.dayDate || day?.date || "";
			const dayDateIL = normalizeToIsraelDay(rawDayDate);

			if (!dayDateIL) return false;
			if (dayDateIL < fromISO) return false;
			if (weekEndISO && dayDateIL > weekEndISO) return false;
			return true;
		});
  }, [days, weekStart]);

  const submissions = useAdminSubmissionsWeek({ workspaceId, weekStart });

  const assignedCountByWorkerId = useMemo(() => {
    const map = {};
    for (const day of visibleDays || []) {
      const shifts = Array.isArray(day?.shifts) ? day.shifts : [];
      for (const s of shifts) {
        const workers = s?.assignedWorkers || s?.assigned_workers || s?.workers || [];
        if (!Array.isArray(workers)) continue;
        for (const w of workers) {
          const wid = w?.workerId || w?.id || w?.userId || w?.uuid || "";
          if (!wid) continue;
          map[wid] = (map[wid] || 0) + 1;
        }
      }
    }
    return map;
  }, [visibleDays]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      if (workspaceId) return;

      try {
        const ws = await getMyWorkspace();
        const id = ws?.id || ws?.workspaceId || "";
        if (!cancelled && id) {
          setWorkspaceId(id);
          localStorage.setItem("workspaceId", id);
        }
      } catch (e) {
        // Silent fail
      }
    }

    loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const totals = useMemo(() => {
    let required = 0;
    let filled = 0;

    for (const day of visibleDays || []) {
      const shifts = Array.isArray(day?.shifts) ? day.shifts : [];
      for (const s of shifts) {
        const req = Number(s?.requiredCount ?? s?.required_count ?? 0) || 0;
        const workers = s?.assignedWorkers || s?.assigned_workers || s?.workers || [];
        required += req;
        filled += Array.isArray(workers) ? workers.length : 0;
      }
    }

    return { required, filled };
  }, [visibleDays]);

  // Debug computed values for UI
  const debugTodayISO = todayISOIsrael();
  const debugWeekStartISO = toISODate(weekStart);
  const debugWeekEndISO = debugWeekStartISO ? addDaysISO(debugWeekStartISO, 6) : "";
  const debugFromISO = debugWeekStartISO ? maxISO(debugTodayISO, debugWeekStartISO) : debugTodayISO;

  async function handleRemoveAssignment({ workspaceId, scheduledShiftId, workerId }) {
    if (!workspaceId || !scheduledShiftId || !workerId) return;

    const dayDateResolved = findDayDateByScheduledShiftId(days, scheduledShiftId);
    const todayISO = todayISOIsrael();
    if (dayDateResolved && toISODate(dayDateResolved) < todayISO) {
      // eslint-disable-next-line no-alert
      alert("Cannot remove workers from past days");
      return;
    }

    const key = `${scheduledShiftId}:${workerId}`;

    let prevSnapshot = null;
    setData((prev) => {
      prevSnapshot = prev;

      const nextDays = (prev?.days || []).map((day) => {
        const shifts = Array.isArray(day?.shifts) ? day.shifts : [];
        const nextShifts = shifts.map((s) => {
          const sid = s?.scheduledShiftId || s?.scheduled_shift_id || s?.id;
          if (String(sid) !== String(scheduledShiftId)) return s;
          return removeWorkerFromShift(s, workerId);
        });

        return { ...day, shifts: nextShifts };
      });

      return { ...prev, days: nextDays };
    });

    setPendingRemoveByKey((m) => ({ ...m, [key]: true }));

    try {
      await removeAssignment({ workspaceId, scheduledShiftId, workerId });
    } catch (e) {
      if (prevSnapshot) setData(prevSnapshot);
      else reload();
      // eslint-disable-next-line no-alert
      alert(e?.message || "Failed to remove assignment");
    } finally {
      setPendingRemoveByKey((m) => {
        const next = { ...m };
        delete next[key];
        return next;
      });
    }
  }

  async function handleAssignWorker({
    workspaceId,
    scheduledShiftId,
    shiftTemplateId,
    workerId,
    dayDate: dayDateParam,
  }) {
    if (!workspaceId || !weekStart || !shiftTemplateId || !workerId) return;

    const dayDateResolved =
      dayDateParam || findDayDateByScheduledShiftId(visibleDays, scheduledShiftId);

    const todayISO = todayISOIsrael();
    if (dayDateResolved && toISODate(dayDateResolved) < todayISO) {
      // eslint-disable-next-line no-alert
      alert("Cannot assign workers to past days");
      return;
    }

    if (!dayDateResolved) {
      // eslint-disable-next-line no-alert
      alert("Missing dayDate for assignment");
      return;
    }

    const workerObj =
      (submissions?.workers || []).find((w) => String(w.id) === String(workerId)) ||
      { id: workerId, firstName: "Worker", lastName: "" };

    let prevSnapshot = null;
    setData((prev) => {
      prevSnapshot = prev;

      const nextDays = (prev?.days || []).map((day) => {
        const shifts = Array.isArray(day?.shifts) ? day.shifts : [];
        const dayDate = day?.dayDate || day?.date || "";

        const nextShifts = shifts.map((s) => {
          const sid = s?.scheduledShiftId || s?.scheduled_shift_id || s?.id || "";
          const tid =
            s?.shiftTemplateId ||
            s?.shift_template_id ||
            s?.templateId ||
            s?.template?.id ||
            "";

          const matchById = scheduledShiftId && sid && String(sid) === String(scheduledShiftId);

          const matchByTemplateAndDay =
            !scheduledShiftId &&
            dayDate &&
            String(dayDate) === String(dayDateResolved) &&
            tid &&
            String(tid) === String(shiftTemplateId);

          if (!matchById && !matchByTemplateAndDay) return s;

          return addWorkerToShift(s, workerObj);
        });

        return { ...day, shifts: nextShifts };
      });

      return { ...prev, days: nextDays };
    });

    try {
      await assignWorker({
        workspaceId,
        weekStartDate: weekStart,
        dayDate: dayDateResolved,
        shiftTemplateId,
        userId: workerId,
      });
    } catch (e) {
      if (prevSnapshot) setData(prevSnapshot);
      else reload();
      // eslint-disable-next-line no-alert
      alert(e?.message || "Failed to assign worker");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Admin Schedule Board</div>
						<div className={styles.subTitle}>
							Week start:{" "}
							<input
								className={styles.input}
								type="date"
								value={weekStart}
								onChange={(e) => setWeekStart(e.target.value)}
							/>

							<button className={styles.btn} type="button" onClick={reload}>
								Reload
							</button>
{/* //orangeeeeeeeeeeeeeeeeeeeeeee the color of publish
<button
  type="button"
  onClick={togglePublish}
  disabled={publishing}
  className={[
    styles.btn,
    weekStatus === "published" ? styles.unpublishBtn : styles.publishBtn,
  ].join(" ")}
  style={{ marginLeft: 8 }}
>
  {publishing ? "Saving..." : weekStatus === "published" ? "Unpublish" : "Publish"}
</button> */}

							<button
								className={styles.btn}
								type="button"
								onClick={togglePublish}
								disabled={publishing}
								style={{ marginLeft: 8 }}
							>
								{publishing ? "Saving..." : weekStatus === "published" ? "Unpublish" : "Publish"}
							</button>

							{publishErr ? (
								<span style={{ color: "red", marginLeft: 10 }}>{publishErr}</span>
							) : null}
						</div>

          {/* Debug panel for date logic */}
          {/* <div className={styles.subTitle}>
						Debug: Today(IL)={debugTodayISO} | WeekStart={debugWeekStartISO} | WeekEnd={debugWeekEndISO} | From={debugFromISO} | Days={days?.length || 0} | VisibleDays={visibleDays.length}
          </div> */}
        </div>

        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Filled / Required</div>
            <div className={styles.statValue}>
              {totals.filled}/{totals.required || "-"}
            </div>
          </div>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.loading}>Loading…</div> : null}
      {!loading && !error && (visibleDays?.length || 0) === 0 ? (
        <div className={styles.loading}>No upcoming days in this week.</div>
      ) : null}

      <div className={styles.layout}>
        <WorkersPool
          workers={submissions.workers}
          summary={submissions.summary}
          loading={submissions.loading}
          error={submissions.error}
          assignedCountByWorkerId={assignedCountByWorkerId}
          onReload={submissions.reload}
        />

        <div className={styles.main}>
          <div className={styles.content}>
            <WeekGrid
              workspaceId={workspaceId}
              days={visibleDays}
              pendingRemoveByKey={pendingRemoveByKey}
              onRemoveAssignment={handleRemoveAssignment}
              workers={submissions.workers}
              onAssignWorker={handleAssignWorker}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
