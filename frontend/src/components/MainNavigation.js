import { Form, NavLink, useRouteLoaderData, useLocation } from "react-router-dom";

import classes from './MainNavigation.module.css';
import AccountWidget from './AccountWidget';

function MainNavigation() {
  const token = useRouteLoaderData('root');
  const location = useLocation();
  const isShiftSwaps = location.pathname.startsWith("/shift-swaps");

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
      {token && <AccountWidget />}
    </header>
  );
}

export default MainNavigation;
