

import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import EventsNavigation from "../components/EventsNavigation";
import { requireAuth } from "../util/requireAuth";
import "../components/EventsTheme.module.css";

function EventsRootLayout() {
  useEffect(() => {
    // Enable events-only background on mount
    document.body.classList.add("events-theme");
    // Cleanup on unmount
    return () => document.body.classList.remove("events-theme");
  }, []);

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




// import { Outlet } from "react-router-dom";
// import EventsNavigation from "../components/EventsNavigation";
// import { requireAuth } from "../util/requireAuth";

// function EventsRootLayout() {
//   return (
//     <>
//       <EventsNavigation />
//       <Outlet />
//     </>
//   );
// }

// export default EventsRootLayout;

// export function eventsRootLoader() {
//   requireAuth(); // if not logged-in -> redirects to /auth?mode=login
//   return null;
// }
