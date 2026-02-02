import { useLoaderData, redirect } from "react-router-dom";
import EventsList from "../components/EventsList";
import MonthlySummaryBar from "../components/MonthlySummaryBar";

const API_BASE_URL = "http://localhost:8080";

function getCurrentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function fetchJSON(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });

  if (response.status === 401) {
    throw new Response(JSON.stringify({ message: "Not authenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!response.ok) {
    let message = "Request failed.";
    try {
      const data = await response.json();
      message = data?.message || message;
    } catch (_) {}
    throw new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return response.json();
}

export async function loader() {
  const token = localStorage.getItem("token");
  if (!token) return redirect("/auth?mode=login");

  const { year, month } = getCurrentYearMonth();

  const [eventsData, summaryData] = await Promise.all([
    fetchJSON(`${API_BASE_URL}/events?year=${year}&month=${month}`, token),
    fetchJSON(`${API_BASE_URL}/events/summary?year=${year}&month=${month}`, token),
  ]);

  return {
    year,
    month,
    events: eventsData.events || [],
    summary: summaryData.summary || {
      shiftsCount: 0,
      hoursWorked: 0,
      travel: 0,
      shiftTotal: 0,
    },
  };
}

export default function EventsPage() {
  const { events, summary } = useLoaderData();

  return (
    <>
      <MonthlySummaryBar summary={summary} />
      <EventsList events={events} />
    </>
  );
}
