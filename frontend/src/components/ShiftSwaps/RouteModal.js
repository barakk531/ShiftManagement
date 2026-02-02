import { useNavigate } from "react-router-dom";
import classes from "./Modal.module.css";

export default function RouteModal({ children }) {
  const navigate = useNavigate();

  function closeHandler() {
    navigate("..", { replace: true });
  }

  return (
    <>
      <div className={classes.backdrop} onClick={closeHandler} />
      <dialog
        open
        className={classes.modal}
        onCancel={(e) => {
          e.preventDefault();
          closeHandler();
        }}
      >
        {children}
      </dialog>
    </>
  );
}







