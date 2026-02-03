import { Form, NavLink, useRouteLoaderData, useLocation } from "react-router-dom";

import classes from './MainNavigation.module.css';
import AccountWidget from './AccountWidget';

function MainNavigation() {
  const token = useRouteLoaderData('root');
  const location = useLocation();
  const isShiftSwaps = location.pathname.startsWith("/shift-swaps");
  const hideAccountWidget = location.pathname.startsWith("/submission-shifts");

  let role = null;
  if (token && token !== "EXPIRED") {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      role = payload.role;
    } catch {}
  }

  return (
    <header className={`${classes.header} ${isShiftSwaps ? classes.shiftSwapsHeader : ""}`}>
      <nav>
        <ul className={classes.list}>
          <li>
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? classes.active : undefined
              }
              end
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/events"
              className={({ isActive }) =>
                isActive ? classes.active : undefined
              }
            >
              Events
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/newsletter"
              className={({ isActive }) =>
                isActive ? classes.active : undefined
              }
            >
              App
            </NavLink>
          </li>
          {!token && (<li>
            <NavLink
              to="/auth?mode=login"
              className={({ isActive }) =>
                isActive ? classes.active : undefined
              }
            >
              Authentication
            </NavLink>
          </li>
        )}
          {token && (
          <li>
            <NavLink to="/forum">Forum</NavLink>
          </li>
          )}
          <li>
            <NavLink to="/history" className={({ isActive }) => (isActive ? classes.active : undefined)}>
              History
            </NavLink>
          </li>
          <li>
            <NavLink to="/shift-swaps">Shift-Swap</NavLink>
          </li>

          {/* submission-shifts */}
          <li>
            <NavLink to="/submission-shifts/my-workspace">My Workspace</NavLink>
          </li>

          {role === "worker" && (
            <li>
              <NavLink to="/submission-shifts/select-workspace">Select Workspace</NavLink>
            </li>
          )}
          {role === "worker" && (
            <li>
              <NavLink to="/submission-shifts/submit-availability">
                Submit Availability
              </NavLink>
            </li>
          )}
          {role === "admin" && (
            <li>
              <NavLink to="/submission-shifts/admin/create-workspace">Create Workspace</NavLink>
            </li>
          )}
          {role === "admin" && (
            <li>
              <NavLink to="/submission-shifts/admin/schedule-builder">
                Weekly Scheduler
              </NavLink>
            </li>
          )}
          {role === "admin" && (
            <li>
              <NavLink to="/submission-shifts/admin/schedule-board">
                Schedule Board
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/submission-shifts/published-schedule">
              Published Shifts
            </NavLink>
          </li>

          {token && (
            <li className={classes.logoutItem}>
              <Form action="/logout" method="post" className={classes.logoutForm}>
                <button type="submit" className={classes.navButton}>
                  Logout
                </button>
              </Form>
            </li>
          )}


        </ul>

      </nav>
      {token && !hideAccountWidget && <AccountWidget />}
    </header>
  );
}

export default MainNavigation;
