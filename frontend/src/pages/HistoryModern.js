import { useLoaderData, useSearchParams, redirect, json } from "react-router-dom";
import { getAuthToken } from "../util/auth";
import EventsList from "../components/EventsList";
import BackgroundStage from "../components/BackgroundStage";
import HistoryKpis from "../components/HistoryKpis";
import YearBars from "../components/YearBars";
import classes from "../components/HistoryModern.module.css";

const API_URL = "http://localhost:8080";

const MONTH_NAMES = [
  "",
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function normalizeEvent(e) {
  const dateStr = typeof e.date === "string" ? e.date.split("T")[0] : e.date;

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

export default function HistoryModern() {
  const { years, months, selected, events, summary, yearSummary } = useLoaderData();
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
        <BackgroundStage
          allowPicker={false}
          title="History background"
          // defaultBgUrl="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7aFAvkuVsaAKXUmhq1s7umcmaewNOOvsnPw&s"
          // https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrNEjAqkpUtKjVJ6HSVABdDA1EGGnDk9kstw&s
          defaultBgUrl="data:image/jpeg;base64,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"
        >
        <div className={classes.shell}>
        <header className={classes.header}>
          <div>
            {/* <div className={classes.badge}>Analytics</div> */}
            <h1 className={classes.title}>History Dashboard</h1>
            <p className={classes.subtitle}>Filter by year and month, then review insights and shifts.</p>
          </div>
        </header>

        <div className={classes.panel}>
          <div className={classes.filtersRow}>
            <label className={classes.filterItem}>
              <span>Year</span>
              <select value={year} onChange={onYearChange}>
                <option value="">Select year</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </label>

            <label className={classes.filterItem}>
              <span>Month</span>
              <select value={month} onChange={onMonthChange} disabled={!year}>
                <option value="">{year ? "Select month" : "Select year first"}</option>
                {months.map((m) => (
                  <option key={m} value={String(m)}>{MONTH_NAMES[m]}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Year trend (optional) */}
          {year && yearSummary?.months ? (
            <YearBars year={year} months={yearSummary.months} />
          ) : null}

          {/* KPI cards (only when month selected) */}
          {year && month && summary ? <HistoryKpis summary={summary} /> : null}

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
      </div>
    </BackgroundStage>
  );
}

export async function historyModernLoader({ request }) {
  const token = getAuthToken();

  if (!token || token === "EXPIRED") {
    localStorage.removeItem("token");
    localStorage.removeItem("expiration");
    return redirect("/auth?mode=login");
  }

  const url = new URL(request.url);
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");

  const yearsRes = await fetch(`${API_URL}/history/years`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!yearsRes.ok) throw json({ message: "Could not load years." }, { status: yearsRes.status });
  const yearsData = await yearsRes.json();

  let months = [];
  let yearSummary = null;

  if (year) {
    const monthsRes = await fetch(`${API_URL}/history/months?year=${encodeURIComponent(year)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!monthsRes.ok) throw json({ message: "Could not load months." }, { status: monthsRes.status });
    months = (await monthsRes.json()).months || [];

    // OPTIONAL: year-summary (if endpoint exists). If not, ignore.
    try {
      const ysRes = await fetch(`${API_URL}/history/year-summary?year=${encodeURIComponent(year)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ysRes.ok) {
        yearSummary = await ysRes.json(); // expect { year, months:[...] }
      }
    } catch (_) {
      yearSummary = null;
    }
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
    yearSummary,
  };
}
