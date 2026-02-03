

// src/hooks/useAdminScheduleWeek.js
//
// Purpose:
// - Fetch and normalize the admin weekly schedule payload.
// - Exposes weekStatus + missingWorkers for Publish/Unpublish UI.
//
// Notes:
// - All comments are in English only (per request).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAdminScheduleWeek } from "../api/adminSchedule";

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

function safeGet(obj, keys, fallback) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined) return obj[k];
  }
  return fallback;
}

function normalizeWeekPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { weekStart: "", days: [], weekStatus: "draft", missingWorkers: 0, raw: null };
  }

  const weekStart =
    safeGet(payload, ["weekStart", "week_start", "weekStartDate", "week_start_date"], "") || "";

  const weekStatus =
    safeGet(payload, ["weekStatus", "status", "publishStatus"], "draft") || "draft";

  const missingWorkers = Number(
    safeGet(payload, ["missingWorkers", "missing_workers"], 0) || 0
  );

  const rawDays = safeGet(payload, ["days", "week", "schedule", "weekDays"], null) || [];

  if (Array.isArray(rawDays)) {
    const days = rawDays.map((d) => {
      const date = safeGet(d, ["date", "dayDate", "day_date"], "") || "";
      const shifts = safeGet(d, ["shifts", "scheduledShifts", "items"], []) || [];

      return {
        date: toISODate(date),
        shifts: Array.isArray(shifts) ? shifts : [],
      };
    });

    return {
      weekStart: toISODate(weekStart),
      weekStatus,
      missingWorkers,
      days,
      raw: payload,
    };
  }

  return {
    weekStart: toISODate(weekStart),
    weekStatus,
    missingWorkers,
    days: [],
    raw: payload,
  };
}

export default function useAdminScheduleWeek({ workspaceId, weekStart }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    weekStart: "",
    weekStatus: "draft",
    missingWorkers: 0,
    days: [],
    raw: null,
  });

  const lastArgsRef = useRef({ workspaceId: "", weekStart: "" });

  const load = useCallback(
    async (args = null) => {
      const nextArgs = args || { workspaceId, weekStart };
      lastArgsRef.current = nextArgs;

      if (!nextArgs.workspaceId || !nextArgs.weekStart) {
        setData({
          weekStart: "",
          weekStatus: "draft",
          missingWorkers: 0,
          days: [],
          raw: null,
        });
        return;
      }

      setLoading(true);
      setError("");

      try {
        const payload = await getAdminScheduleWeek({
          workspaceId: nextArgs.workspaceId,
          weekStart: nextArgs.weekStart,
        });

        const normalized = normalizeWeekPayload(payload);
        setData(normalized);
      } catch (e) {
        setError(e?.message || "Failed to load schedule week");
      } finally {
        setLoading(false);
      }
    },
    [workspaceId, weekStart]
  );

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(() => {
    load(lastArgsRef.current);
  }, [load]);

  const view = useMemo(() => data, [data]);

  return {
    loading,
    error,
    weekStart: view.weekStart || weekStart || "",
    weekStatus: view.weekStatus || "draft",
    missingWorkers: Number(view.missingWorkers || 0),
    days: view.days || [],
    raw: view.raw,
    setData,
    reload,
  };
}


// // src/hooks/useAdminScheduleWeek.js

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { getAdminScheduleWeek } from "../api/adminSchedule";

// function toISODate(value) {
//   if (!value) return "";
//   if (typeof value === "string") return value.slice(0, 10);
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "";
//   const yyyy = String(d.getFullYear());
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// function safeGet(obj, keys, fallback) {
//   for (const k of keys) {
//     if (obj && obj[k] !== undefined) return obj[k];
//   }
//   return fallback;
// }

// function normalizeWeekPayload(payload) {
//   // Try to support multiple shapes from backend without breaking UI.
//   // Expected final shape: { weekStart, days: [{ date, shifts: [...] }], meta? }
//   if (!payload || typeof payload !== "object") {
//     return { weekStart: "", days: [] };
//   }

//   const weekStart =
//     safeGet(payload, ["weekStart", "week_start", "weekStartDate", "week_start_date"], "") ||
//     "";

//   // Common shapes:
//   // 1) payload.days = [{ date/dayDate, shifts }]
//   // 2) payload.week = [...]
//   // 3) payload.schedule = [...]
//   const rawDays =
//     safeGet(payload, ["days", "week", "schedule", "weekDays"], null) || [];

//   // If backend already returns an array of day objects
//   if (Array.isArray(rawDays)) {
//     const days = rawDays.map((d) => {
//       const date =
//         safeGet(d, ["date", "dayDate", "day_date"], "") || "";
//       const shifts =
//         safeGet(d, ["shifts", "scheduledShifts", "items"], []) || [];

//       return {
//         date: toISODate(date),
//         shifts: Array.isArray(shifts) ? shifts : [],
//       };
//     });

//     return { weekStart: toISODate(weekStart), days, raw: payload };
//   }

//   // Fallback: if payload itself is a single day list-like
//   return { weekStart: toISODate(weekStart), days: [], raw: payload };
// }

// export default function useAdminScheduleWeek({ workspaceId, weekStart }) {
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [data, setData] = useState({ weekStart: "", days: [], raw: null });

//   const lastArgsRef = useRef({ workspaceId: "", weekStart: "" });

//   const load = useCallback(
//     async (args = null) => {
//       const nextArgs = args || { workspaceId, weekStart };
//       lastArgsRef.current = nextArgs;

//       if (!nextArgs.workspaceId || !nextArgs.weekStart) {
//         setData({ weekStart: "", days: [], raw: null });
//         return;
//       }

//       setLoading(true);
//       setError("");

//       try {
//         const payload = await getAdminScheduleWeek({
//           workspaceId: nextArgs.workspaceId,
//           weekStart: nextArgs.weekStart,
//         });

//         const normalized = normalizeWeekPayload(payload);
//         setData(normalized);
//       } catch (e) {
//         setError(e?.message || "Failed to load schedule week");
//       } finally {
//         setLoading(false);
//       }
//     },
//     [workspaceId, weekStart]
//   );

//   useEffect(() => {
//     load();
//   }, [load]);

//   const reload = useCallback(() => {
//     load(lastArgsRef.current);
//   }, [load]);

//   const view = useMemo(() => data, [data]);

//   return {
//     loading,
//     error,
//     weekStart: view.weekStart || weekStart || "",
//     days: view.days || [],
//     raw: view.raw,
//     setData, // Allows optimistic updates in the page
//     reload,
//   };
// }
