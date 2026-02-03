// src/hooks/useAdminSubmissionsWeek.js

import { useCallback, useEffect, useState } from "react";
import { getAdminSubmissionsWeek } from "../api/adminSchedule";

function normalize(payload) {
  // Expected target:
  // {
  //   workers: [{ id, firstName, lastName, submittedAt }],
  //   summary: { total, submitted, missing }
  // }
  if (!payload || typeof payload !== "object") {
    return { workers: [], summary: { total: 0, submitted: 0, missing: 0 }, raw: payload };
  }

  const workers = Array.isArray(payload.workers)
    ? payload.workers
    : Array.isArray(payload.items)
      ? payload.items
      : [];

  const normalizedWorkers = workers.map((w) => ({
    id: w.id || w.workerId || w.userId || w.uuid || "",
    firstName: w.firstName || w.first_name || "",
    lastName: w.lastName || w.last_name || "",
    submittedAt: w.submittedAt || w.submitted_at || w.createdAt || w.created_at || null,
  }));

  const total = Number(payload?.summary?.total ?? payload?.total ?? normalizedWorkers.length) || 0;
  const submitted =
    Number(payload?.summary?.submitted ?? payload?.submitted ?? 0) ||
    normalizedWorkers.filter((x) => x.submittedAt).length;
  const missing =
    Number(payload?.summary?.missing ?? payload?.missing ?? 0) ||
    Math.max(0, (total || normalizedWorkers.length) - submitted);

  return {
    workers: normalizedWorkers,
    summary: { total: total || normalizedWorkers.length, submitted, missing },
    raw: payload,
  };
}

export default function useAdminSubmissionsWeek({ workspaceId, weekStart }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ workers: [], summary: { total: 0, submitted: 0, missing: 0 }, raw: null });

  const load = useCallback(async () => {
    if (!workspaceId || !weekStart) {
      setData({ workers: [], summary: { total: 0, submitted: 0, missing: 0 }, raw: null });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await getAdminSubmissionsWeek({ workspaceId, weekStart });
      setData(normalize(payload));
    } catch (e) {
      setError(e?.message || "Failed to load submissions status");
      setData({ workers: [], summary: { total: 0, submitted: 0, missing: 0 }, raw: null });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, error, ...data, reload: load };
}
