import { useRouteLoaderData } from 'react-router-dom';
import EventForm from '../components/EventForm';

function EditEventPage() {
  const data = useRouteLoaderData('event-detail');

  // Backend supports PUT /events/:id (not PATCH)
  return <EventForm method="put" event={data.event} />;
}

export default EditEventPage;


