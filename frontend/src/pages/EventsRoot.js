import { Outlet } from "react-router-dom";
import EventsNavigation from "../components/EventsNavigation";
import { requireAuth } from "../util/requireAuth";

function EventsRootLayout() {
  return (
    <>
      <EventsNavigation />
      <Outlet />
    </>
  );
}

export default EventsRootLayout;

export function eventsRootLoader() {
  requireAuth(); // if not logged-in -> redirects to /auth?mode=login
  return null;
}
