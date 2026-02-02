
import { redirect } from "react-router-dom";
import { requireAuth } from "../../util/requireAuth";
import NewShiftSwapModal from "../../components/ShiftSwaps/NewShiftSwapModal";

const PAST_DATE_ERROR =
  "The date/time you selected is already in the past, so it's not relevant. Please choose a valid future date.";

export default function NewShiftSwapPage() {
  return <NewShiftSwapModal />;
}

export async function action({ request }) {
  const token = requireAuth();
  const formData = await request.formData();

  const payload = {
    message: formData.get("message"),
    shiftStartAt: formData.get("shiftStartAt"),
  };

  // Frontend validation (prevents app from "crashing" on past date)
  const when = new Date(payload.shiftStartAt);
  if (
    !payload.shiftStartAt ||
    Number.isNaN(when.getTime()) ||
    when.getTime() < Date.now()
  ) {
    return { error: PAST_DATE_ERROR };
  }

  if (!payload.message || String(payload.message).trim().length < 3) {
    return { error: "Please enter a message (min 3 characters)." };
  }

  try {
    const res = await fetch("http://localhost:8080/shift-swaps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // Validation error from server (do NOT throw -> show message in modal)
    if (res.status === 422) {
      let data;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }
      return { error: data?.message || "Invalid input. Please check your values." };
    }

    // Auth error (token expired etc.) -> let your auth system handle it
    if (res.status === 401) {
      return { error: "You are not authenticated. Please log in again." };
    }

    // Other errors -> do not crash the app
    if (!res.ok) {
      return { error: "Could not create the post. Please try again." };
    }

    // Success -> close modal / go back to board
    return redirect("..");
  } catch (err) {
    return { error: "Network error. Please try again." };
  }
}








// import { redirect } from "react-router-dom";
// import { requireAuth } from "../../util/requireAuth";
// import NewShiftSwapModal from "../../components/ShiftSwaps/NewShiftSwapModal";


// const PAST_DATE_ERROR =
//   "The date/time you selected is already in the past, so it's not relevant. Please choose a valid future date.";


// export default function NewShiftSwapPage() {
//   return <NewShiftSwapModal />;
// }

// export async function action({ request }) {
//   const token = requireAuth();
//   const formData = await request.formData();

//   const payload = {
//     message: formData.get("message"),
//     shiftStartAt: formData.get("shiftStartAt"),
//   };

//   const when = new Date(shiftStartAt);
//   if (!shiftStartAt || Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
//     return { error: PAST_DATE_ERROR };
//   }

//   const res = await fetch("http://localhost:8080/shift-swaps", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     body: JSON.stringify(payload),
//   });

//   if (res.status === 422) {
//     let data = null;
//     try {
//       data = await res.json();
//     } catch (_) {}
//     return { error: data?.message || PAST_DATE_ERROR };
//   }

//   if (!res.ok) {
//     throw new Error("Failed to create post");
//   }

//   return redirect("..");
// }











