// src/pages/SubmissionShifts/SubmissionShiftsRoot.js
//
// Purpose:
// - Root wrapper for all Submission Shifts pages.
// - Applies the Submission Shifts theme class to <body>.
// - Enforces worker Select Workspace flow:
//   - If user is a worker and has no active workspace -> redirect to Select Workspace page.
//   - Admin users are not redirected.
//
// Notes:
// - All comments are in English only (per request).

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import "../../components/SubmissionShiftsTheme.module.css";

import { getMyWorkspace } from "../../api/workspaces";

function getLocalUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function SubmissionShiftsRoot() {
  const nav = useNavigate();
  const location = useLocation();
  const didRun = useRef(false);

  useEffect(() => {
    document.body.classList.add("submission-shifts-theme");
    return () => {
      document.body.classList.remove("submission-shifts-theme");
    };
  }, []);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      const user = getLocalUser();
      const role = String(user?.role || "").toLowerCase();

      // Only enforce selection flow for workers.
      if (role !== "worker") return;

      // Do not redirect if already on select workspace page.
      if (location.pathname.includes("select-workspace")) return;

      try {
        const ws = await getMyWorkspace();

        // If no active workspace yet, redirect to selection page.
        if (!ws) {
          nav("/submission-shifts/select-workspace", { replace: true });
        }
      } catch (e) {
        // If workspace fetch fails, do not hard-block navigation.
        // The page itself can surface the error if needed.
        console.error("SubmissionShiftsRoot getMyWorkspace failed:", e);
      }
    })();
  }, [nav, location.pathname]);

  return <Outlet />;
}


// import { Outlet } from "react-router-dom";
// import { useEffect } from "react";
// import "../../components/SubmissionShiftsTheme.module.css";

// export default function SubmissionShiftsRoot() {
//   useEffect(() => {
//     document.body.classList.add("submission-shifts-theme");
//     return () => {
//       document.body.classList.remove("submission-shifts-theme");
//     };
//   }, []);

//   return <Outlet />;
// }
