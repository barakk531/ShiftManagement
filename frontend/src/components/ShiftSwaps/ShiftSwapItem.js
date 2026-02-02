import classes from "./ShiftSwapItem.module.css";
import { Link } from "react-router-dom";

function ShiftSwapItem({ id, body, author, shiftStartAt }) {
  return (
    <li className={classes.post}>
      <Link to={String(id)}>
        <p className={classes.author}>{author}</p>
        <p className={classes.text}>{body}</p>

        {shiftStartAt ? (
          <p className={classes.date}>
            {new Date(shiftStartAt).toLocaleString("he-IL")}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

export default ShiftSwapItem;


