import { Link, useRouteLoaderData, useSubmit } from 'react-router-dom';

import classes from './EventItem.module.css';

function EventItem({ event }) {
  const token = useRouteLoaderData('root');
  const submit = useSubmit();

  function startDeleteHandler() {
    const proceed = window.confirm('Are you sure?');

    if (proceed) {
      submit(null, { method: 'delete' });
    }
  }

  return (
  <article className={classes.event}>
    <img src={event.image} alt={event.title} />

    <div className={classes.content}>
      <h1>{event.title}</h1>

      {/* Date + total */}
      <div className={classes.meta}>
        <time className={classes.date}>{event.date}</time>

        <p className={classes.shiftTotal}>
          ₪{event.shiftTotal}
        </p>
      </div>

      <p className={classes.description}>{event.description}</p>
    </div>



      {token && (<menu className={classes.actions}>
        <Link to="edit">Edit</Link>
        <button onClick={startDeleteHandler}>Delete</button>
      </menu>
      )}
    </article>
  );
}

export default EventItem;





  // return (
  //   <article className={classes.event}>
  //     <img src={event.image} alt={event.title} />
  //     <h1>{event.title}</h1>
  //     {/* <time>{event.date}</time> */}
  //     {/* Date + total */}
  //     <div className={classes.meta}>
  //       <div className={classes.date}>
  //         <time>{event.date}</time>
  //       </div>

  //       <p className={classes.shiftTotal}>
  //         ₪{event.shiftTotal}
  //       </p>
  //     </div>

  //     <p>{event.description}</p>
