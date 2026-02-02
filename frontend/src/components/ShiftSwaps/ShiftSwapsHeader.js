import { Link } from 'react-router-dom';
import { MdPostAdd, MdMessage } from 'react-icons/md';

import classes from './MainHeader.module.css';

function ShiftSwapsHeader() {
  return (
    <header className={classes.header}>
      <h1 className={classes.logo}>
        <MdMessage />
        Shift-Swap Poster
      </h1>
      <p>
        <Link to="new" className={classes.button}>
          <MdPostAdd size={18} />
          New Post
        </Link>
      </p>
    </header>
  );
}

export default ShiftSwapsHeader;
