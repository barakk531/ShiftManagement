import { Suspense } from 'react';
import {
  useRouteLoaderData,
  redirect,
  Await,
} from 'react-router-dom';

import EventItem from '../components/EventItem';
import EventsList from '../components/EventsList';
import { getAuthToken } from '../util/auth';


function authHeaders() {
  const token = getAuthToken();
  if (!token || token === 'EXPIRED') {
    throw redirect('/auth?mode=login');
  }
  return { Authorization: 'Bearer ' + token };
}

function EventDetailPage() {
  const { event, events } = useRouteLoaderData('event-detail');

  return (
    <>
      <Suspense fallback={<p style={{ textAlign: 'center' }}>Loading...</p>}>
        <Await resolve={event}>
          {(loadedEvent) => <EventItem event={loadedEvent} />}
        </Await>
      </Suspense>
      <Suspense fallback={<p style={{ textAlign: 'center' }}>Loading...</p>}>
        <Await resolve={events}>
          {(loadedEvents) => <EventsList events={loadedEvents} />}
        </Await>
      </Suspense>
    </>
  );
}

export default EventDetailPage;


async function loadEvent(id) {
  const response = await fetch('http://localhost:8080/events/' + id, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    // Do NOT assume JSON on errors; be defensive
    let message = 'Could not fetch event.';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // response was not JSON (e.g., HTML)
    }

    throw new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resData = await response.json();
  return resData.event;
}


async function loadEvents() {
  const response = await fetch('http://localhost:8080/events', {
    headers: authHeaders(),
  });

  if (!response.ok) {
    let message = 'Could not fetch events.';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // response was not JSON
    }

    throw new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resData = await response.json();
  return resData.events;
}


export async function loader({ params }) {
  return {
    event: await loadEvent(params.eventId),
    events: await loadEvents(),
  };
}

export async function action({ params, request }) {
  const eventId = params.eventId;

  const response = await fetch('http://localhost:8080/events/' + eventId, {
    method: request.method,
    headers: authHeaders(),
  });

  if (!response.ok) {
    let message = 'Could not delete event.';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {}

    throw new Response(JSON.stringify({ message }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return redirect('/events');


}
