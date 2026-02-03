// src/components/SubmissionShifts/AdminScheduleBoard/WorkersPool.js

import { useMemo, useState } from "react";
import styles from "./WorkersPool.module.css";

function toDisplayName(w) {
  const full = `${w.firstName || ""} ${w.lastName || ""}`.trim();
  return full || w.id || "Worker";
}

function containsCI(hay, needle) {
  if (!needle) return true;
  return String(hay || "").toLowerCase().includes(String(needle).toLowerCase());
}

export default function WorkersPool({
  workers,
  summary,
  loading,
  error,
  assignedCountByWorkerId,
  onReload,
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | submitted | missing

  const filtered = useMemo(() => {
    const list = Array.isArray(workers) ? workers : [];

    return list
      .filter((w) => {
        const name = toDisplayName(w);
        if (!containsCI(name, q) && !containsCI(w.id, q)) return false;

        const isSubmitted = Boolean(w.submittedAt);

        if (filter === "submitted") return isSubmitted;
        if (filter === "missing") return !isSubmitted;
        return true;
      })
      .sort((a, b) => {
        // Submitted first, then by name
        const as = a.submittedAt ? 0 : 1;
        const bs = b.submittedAt ? 0 : 1;
        if (as !== bs) return as - bs;
        return toDisplayName(a).localeCompare(toDisplayName(b));
      });
  }, [workers, q, filter]);

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Workers</div>

        <button className={styles.btn} type="button" onClick={onReload} disabled={loading}>
          Reload
        </button>
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Submitted</div>
          <div className={styles.summaryValue}>{summary?.submitted ?? 0}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Missing</div>
          <div className={styles.summaryValue}>{summary?.missing ?? 0}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total</div>
          <div className={styles.summaryValue}>{summary?.total ?? 0}</div>
        </div>
      </div>

      <div className={styles.controls}>
        <input
          className={styles.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search worker…"
        />

        <select className={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="submitted">Submitted</option>
          <option value="missing">Missing</option>
        </select>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.loading}>Loading…</div> : null}

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No workers</div>
        ) : (
          filtered.map((w) => {
            const name = toDisplayName(w);
            const isSubmitted = Boolean(w.submittedAt);
            const assignedCount = assignedCountByWorkerId?.[w.id] || 0;

            return (
              <div key={w.id || name} className={styles.row}>
                <div className={styles.nameCol}>
                  <div className={styles.name} title={name}>
                    {name}
                  </div>
                  <div className={styles.meta}>
                    <span className={isSubmitted ? styles.badgeOk : styles.badgeWarn}>
                      {isSubmitted ? "Submitted" : "Missing"}
                    </span>
                    <span className={styles.badgeNeutral}>Assigned {assignedCount}</span>
                  </div>
                </div>

                <div className={styles.rightCol}>
                  <div className={styles.id} title={w.id}>
                    {w.id}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
