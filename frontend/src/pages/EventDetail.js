import { Suspense } from 'react';
import {
  useRouteLoaderData,
  redirect,
  Await,
} from 'react-router-dom';

import EventItem from '../components/EventItem';
import EventsList from '../components/EventsList';
import { getAuthToken } from '../util/auth';

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
  const response = await fetch('http://localhost:8080/events/' + id);

  if (!response.ok) {
        const data = await response.json();
        throw new Response(
        JSON.stringify({ message: data.message || 'Could not fetch event.' }),
        { 
          status: response.status, 
          headers: { 'Content-Type': 'application/json' },
        }
        );
  } else {
    const resData = await response.json();
    return resData.event;
  }
}

async function loadEvents() {
  const response = await fetch('http://localhost:8080/events');

  if (!response.ok) {
    // return { isError: true, message: 'Could not fetch events.' };
    // throw new Response(JSON.stringify({ message: 'Could not fetch events.' }), {
    //   status: 500,
    // });
        const data = await response.json();
        throw new Response(
        JSON.stringify({ message: data.message || 'Could not fetch events.' }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
        );
  } else {
    const resData = await response.json();
    return resData.events;
  }
}

// export async function loader({ request, params }) {
//   const id = params.eventId;

//   return defer({
//     event: await loadEvent(id),
//     events: loadEvents(),
//   });
// }

export async function loader({ params }) {
  return {
    event: await loadEvent(params.eventId),
    events: await loadEvents(),
  };
}


export async function action({ params, request }) {
  const eventId = params.eventId;

  const token = getAuthToken();
  const response = await fetch('http://localhost:8080/events/' + eventId, {
    method: request.method,
    headers: {
      'Authorization': 'Bearer ' + token,
    },
  });

    if (!response.ok) {
        const data = await response.json();
        throw new Response(
        JSON.stringify({ message: data.message || 'Could not delete event.' }),
        { status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

  return redirect('/events');
}
