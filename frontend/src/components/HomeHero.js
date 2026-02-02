

import { Link } from "react-router-dom";
import classes from "./HomeHero.module.css";

export default function HomeHero({ fullName }) {
  return (
    <section className={classes.hero}>
      <div className={classes.overlay} />

      <div className={classes.content}>
        <div className={classes.badge}>Shift Tracker</div>

        <h1 className={classes.title}>
          Welcome{fullName ? ` ${fullName}` : ""}.
        </h1>

        <p className={classes.subtitle}>
          Track shifts, income and history — with a clean monthly view and smart summaries.
        </p>

        <div className={classes.actions}>
          <Link className={`${classes.btn} ${classes.btnPrimary}`} to="/events/new">
            Add New Shift
          </Link>
          <Link className={classes.btn} to="/events">
            This Month
          </Link>
          <Link className={classes.btn} to="/history">
            History
          </Link>
          <Link className={classes.btn} to="/forum">
            Forum
          </Link>
        </div>
      </div>
    </section>
  );
}



