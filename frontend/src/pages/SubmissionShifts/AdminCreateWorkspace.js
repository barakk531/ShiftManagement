
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useRouteLoaderData } from "react-router-dom";
import { createWorkspace } from "../../api/workspaces";

import classes from "./AdminCreateWorkspace.module.css";

function getRoleFromToken(token) {
  if (!token || token === "EXPIRED") return null;
  try {
    return JSON.parse(atob(token.split(".")[1]))?.role || null;
  } catch {
    return null;
  }
}

export default function AdminCreateWorkspace() {
  // ✅ כל ה־hooks למעלה (אסור שיהיה return לפני useState)
  const navigate = useNavigate();
  const token = useRouteLoaderData("root");

  const role = useMemo(() => getRoleFromToken(token), [token]);

  const [name, setName] = useState("");
  const [industryType, setIndustryType] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jerusalem");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Guard אחרי hooks
  if (role !== "admin") {
    return <Navigate to="/submission-shifts/my-workspace" replace />;
  }

  async function submitHandler(e) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await createWorkspace({
        name,
        industryType,
        timezone,
      });

      const workspaceId = res?.workspace?.id || res?.id || res?.workspaceId;
      if (!workspaceId) throw new Error("Workspace id missing from response");

      navigate(`/submission-shifts/admin/operating-hours/${workspaceId}`);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to create workspace"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={classes.page}>
      <div className={classes.shell}>
        <div className={classes.header}>
          <div>
            <h1 className={classes.title}>Create Workspace</h1>
            <p className={classes.subtitle}>Set up your workspace once. Then define operating hours and daily shifts.</p>
          </div>
        </div>

        <div className={classes.card}>
          {error ? <div className={classes.error}>{error}</div> : null}

          <form className={classes.form} onSubmit={submitHandler}>
            <div className={classes.grid}>
              <div className={classes.field}>
                <label className={classes.label}>Workspace name</label>
                <input
                  className={classes.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Office"
                />
              </div>

              <div className={classes.field}>
                <label className={classes.label}>Industry type</label>
                <input
                  className={classes.input}
                  value={industryType}
                  onChange={(e) => setIndustryType(e.target.value)}
                  placeholder="e.g. Retail / Restaurant / Clinic"
                />
              </div>

              <div className={classes.field}>
                <label className={classes.label}>Timezone</label>
                <input
                  className={classes.input}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Jerusalem"
                />
                <div className={classes.hint}>Keep it consistent for weekly submissions.</div>
              </div>
            </div>

            <div className={classes.actions}>
            <button className={`${classes.btn} ${classes.btnPrimary}`} type="submit">
                Create & Set Operating Hours
            </button>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}





// import { useState } from "react";
// import { useNavigate, useRouteLoaderData, Navigate } from "react-router-dom";
// import { createWorkspace } from "../../api/workspaces";

// export default function AdminCreateWorkspace() {
//   const navigate = useNavigate();
//   const token = useRouteLoaderData("root");

//   // 🔒 Guard – רק Admin
//   let role = null;
//   if (token && token !== "EXPIRED") {
//     try {
//       role = JSON.parse(atob(token.split(".")[1])).role;
//     } catch {}
//   }

//   if (role !== "admin") {
//     return <Navigate to="/submission-shifts/my-workspace" replace />;
//   }

//   const [name, setName] = useState("");
//   const [industryType, setIndustryType] = useState("");
//   const [timezone, setTimezone] = useState("Asia/Jerusalem");
//   const [error, setError] = useState("");

//   async function submitHandler(e) {
//     e.preventDefault();
//     setError("");

//     try {
//       const res = await createWorkspace({
//         name,
//         industryType,
//         timezone,
//       });

//       const workspaceId =
//         res?.workspace?.id || res?.id || res?.workspaceId;

//       if (!workspaceId) {
//         throw new Error("Workspace id missing from response");
//       }

//       navigate(
//         `/submission-shifts/admin/operating-hours/${workspaceId}`
//       );
//     } catch (err) {
//       setError(
//         err?.response?.data?.message ||
//           err.message ||
//           "Failed to create workspace"
//       );
//     }
//   }

//   return (
//     <div>
//       <h1>Create Workspace</h1>

//       {error && <p style={{ color: "red" }}>{error}</p>}

//       <form onSubmit={submitHandler}>
//         <label>Name</label>
//         <input value={name} onChange={(e) => setName(e.target.value)} />

//         <label>Industry type</label>
//         <input
//           value={industryType}
//           onChange={(e) => setIndustryType(e.target.value)}
//         />

//         <label>Timezone</label>
//         <input
//           value={timezone}
//           onChange={(e) => setTimezone(e.target.value)}
//         />

//         <button type="submit">Create</button>
//       </form>
//     </div>
//   );
// }
