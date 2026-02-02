import { useLoaderData, useSearchParams, redirect, json } from "react-router-dom";
import { getAuthToken } from "../util/auth";
import EventsList from "../components/EventsList";
import classes from "../components/History.module.css";

const API_URL = "http://localhost:8080";

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function History() {
  const { years, months, selected, events, summary } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();

  const year = selected.year;
  const month = selected.month;

  function onYearChange(e) {
    const next = new URLSearchParams(searchParams);
    const value = e.target.value;

    if (value) next.set("year", value);
    else next.delete("year");

    next.delete("month");
    setSearchParams(next);
  }

  function onMonthChange(e) {
    const next = new URLSearchParams(searchParams);
    const value = e.target.value;

    if (value) next.set("month", value);
    else next.delete("month");

    setSearchParams(next);
  }

  return (
    <section className={classes.history}>
      <header className={classes.headerRow}>
        <h1>History</h1>
      </header>

      <div className={classes.panel}>
        <div className={classes.filtersRow}>
          <label className={classes.filterItem}>
            <span>Year</span>
            <select value={year} onChange={onYearChange}>
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          <label className={classes.filterItem}>
            <span>Month</span>
            <select value={month} onChange={onMonthChange} disabled={!year}>
              <option value="">{year ? "Select month" : "Select year first"}</option>
              {months.map((m) => (
                <option key={m} value={String(m)}>
                  {MONTH_NAMES[m]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {year && month && summary && (
          <div className={classes.summaryBar}>
            <div className={classes.summaryItem}>
              <span className={classes.summaryLabel}>Hours</span>
              <span className={classes.summaryValue}>{Number(summary.totalHours).toFixed(2)}</span>
            </div>

            <div className={classes.summaryItem}>
              <span className={classes.summaryLabel}>Travel</span>
              <span className={classes.summaryValue}>{Number(summary.totalTravel).toFixed(2)}</span>
            </div>

            <div className={classes.summaryItem}>
              <span className={classes.summaryLabel}>Total ₪</span>
              <span className={classes.summaryValueAccent}>₪{Number(summary.totalIncome).toFixed(0)}</span>
            </div>
          </div>
        )}

        {!year || !month ? (
          <p className={classes.hint}>Choose a year and month to view events.</p>
        ) : events.length === 0 ? (
          <p className={classes.hint}>
            No events found for {MONTH_NAMES[Number(month)]} {year}.
          </p>
        ) : (
          <EventsList events={events} />
        )}
      </div>
    </section>
  );
}

export default History;


function normalizeEvent(e) {
  const dateStr =
    typeof e.date === "string" ? e.date.split("T")[0] : e.date;

  return {
    ...e,
    date: dateStr,
    startTime: e.startTime ?? e.start_time,
    endTime: e.endTime ?? e.end_time,
    hourlyRate: e.hourlyRate ?? e.hourly_rate,
    dayOfWeek: e.dayOfWeek ?? e.day_of_week,
    hoursWorked: e.hoursWorked ?? e.hours_worked,
    shiftTotal: e.shiftTotal ?? e.shift_total,
  };
}


export async function historyLoader({ request }) {
  const token = getAuthToken();

    if (!token || token === "EXPIRED") {
    localStorage.removeItem("token");
    localStorage.removeItem("expiration");
    return redirect("/auth");
  }


  const url = new URL(request.url);
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");

  const yearsRes = await fetch(`${API_URL}/history/years`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!yearsRes.ok) {
    throw json({ message: "Could not load years." }, { status: yearsRes.status });
  }

  const yearsData = await yearsRes.json();

  let months = [];
  if (year) {
    const monthsRes = await fetch(`${API_URL}/history/months?year=${encodeURIComponent(year)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!monthsRes.ok) {
      throw json({ message: "Could not load months." }, { status: monthsRes.status });
    }

    months = (await monthsRes.json()).months || [];
  }

  let events = [];
  let summary = null;

  if (year && month) {
    const [eventsRes, summaryRes] = await Promise.all([
      fetch(`${API_URL}/history/events?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_URL}/history/summary?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!eventsRes.ok) throw json({ message: "Could not load events." }, { status: eventsRes.status });
    if (!summaryRes.ok) throw json({ message: "Could not load summary." }, { status: summaryRes.status });

    const rawEvents = (await eventsRes.json()).events || [];
    events = rawEvents.map(normalizeEvent);
    summary = (await summaryRes.json()).summary || null;
  }

  return {
    years: yearsData.years || [],
    months,
    selected: { year: year || "", month: month || "" },
    events,
    summary,
  };
}
