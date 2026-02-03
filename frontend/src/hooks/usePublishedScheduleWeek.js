// src/hooks/usePublishedScheduleWeek.js
//
// Purpose:
// - Load "published schedule" week for the logged-in user.
//
// Notes:
// - All comments are in English only (per request).

import { useCallback, useEffect, useState } from "react";
import { getPublishedScheduleWeek } from "../api/publishedSchedule";

export default function usePublishedScheduleWeek({ weekStartDate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ workspace: null, weekStartDate: "", weekStatus: "draft", days: [] });

  const load = useCallback(async () => {
    if (!weekStartDate) {
      setData({ workspace: null, weekStartDate: "", weekStatus: "draft", days: [] });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await getPublishedScheduleWeek({ weekStartDate });
      setData({
        workspace: payload?.workspace || null,
        weekStartDate: payload?.weekStartDate || weekStartDate,
        weekStatus: payload?.weekStatus || "draft",
        days: Array.isArray(payload?.days) ? payload.days : [],
      });
    } catch (e) {
      setError(e?.message || "Failed to load published schedule");
      setData({ workspace: null, weekStartDate: weekStartDate || "", weekStatus: "draft", days: [] });
    } finally {
      setLoading(false);
    }
  }, [weekStartDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, error, data, reload: load };
}
