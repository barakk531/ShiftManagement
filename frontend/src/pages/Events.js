// src/pages/Events.js
import { useLoaderData, redirect } from "react-router-dom";
import EventsList from "../components/EventsList";

const API_BASE_URL = "http://localhost:8080";

async function loadEvents(token) {
  const response = await fetch(`${API_BASE_URL}/events`, {
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  if (response.status === 401) {
    // token missing/expired/invalid
    throw new Response(JSON.stringify({ message: "Not authenticated." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!response.ok) {
    let message = "Could not fetch events.";
    try {
      const data = await response.json();
      message = data?.message || message;
    } catch (_) {
      // ignore JSON parse errors
    }

    throw new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resData = await response.json();
  return resData.events || [];
}

export async function loader() {
  const token = localStorage.getItem("token");

  if (!token) {
    return redirect("/auth?mode=login");
  }

  try {
    const events = await loadEvents(token);
    return { events };
  } catch (err) {
    // If backend returned 401, send user to login
    if (err instanceof Response && err.status === 401) {
      return redirect("/auth?mode=login");
    }
    throw err;
  }
}

export default function EventsPage() {
  const { events } = useLoaderData();
  return <EventsList events={events} />;
}
