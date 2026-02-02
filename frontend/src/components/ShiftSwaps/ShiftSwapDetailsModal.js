import { useLoaderData, Link } from "react-router-dom";
import RouteModal from "./RouteModal";
import classes from "./ShiftSwapDetailsModal.module.css";

export default function ShiftSwapDetailsModal() {
  const post = useLoaderData();

  if (!post) {
    return (
      <RouteModal>
        <main className={classes.details}>
          <h1>Could not find post</h1>
          <p>Unfortunately, the requested post could not be found.</p>
          <p>
            <Link to=".." className={classes.btn}>
              Okay
            </Link>
            
            <p style={{ marginTop: "1rem" }}>
              <Link to=".." className={classes.btn}>
                Close
              </Link>
            </p>
          </p>
        </main>
      </RouteModal>
    );
  }

  return (
    <RouteModal>
      <main className={classes.details}>
        <p className={classes.author}>{post.author}</p>
        <p className={classes.text}>{post.body}</p>
      </main>
    </RouteModal>
  );
}
