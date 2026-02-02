



import { Link, Form, useActionData, useNavigation } from "react-router-dom";
import RouteModal from "./RouteModal";
import classes from "./NewShiftSwapModal.module.css";

export default function NewShiftSwapModal() {
  const data = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <RouteModal>
      <Form method="post" className={classes.form}>
        <p>
          <label htmlFor="shiftStartAt">Shift date & time</label>
          {data?.error && <p className={classes.error}>{data.error}</p>}

          <input
            id="shiftStartAt"
            name="shiftStartAt"
            type="datetime-local"
            required
            lang="en-GB"   // Day/Month
          />
        </p>

        <p>
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" required rows={3} />
        </p>

        <p className={classes.actions}>
          <Link to=".." type="button">Cancel</Link>
          <button>Submit</button>

        </p>
      </Form>
    </RouteModal>
  );
}




