// backend/routes/availability.js
//
// Purpose:
// - Worker availability submission flow for "next week":
//   - GET /availability/next-week: bundle (days + templates + existing submission)
//   - POST /availability/next-week: save submission
// - Admin overview:
//   - GET /availability/admin/submissions/week
//
// Notes:
// - All comments are in English only (per request).

const express = require("express");
const { requireAuth, requireRole } = require("../util/rbac");

const { getMyWorkspace } = require("../services/workspaceService");
const { getNextWeekBundle, saveNextWeekAvailability } = require("../services/availabilityService");

// for admin
const { getAdminAvailabilitySubmissionsWeek } = require("../services/adminAvailabilitySubmissionsWeekService");

const router = express.Router();

// WORKER: get next week bundle (days + templates + existing submission)
router.get("/next-week", requireAuth, requireRole("worker"), async (req, res) => {
  try {
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(403).json({ message: "User has no active workspace" });

    const data = await getNextWeekBundle({
      userId: req.user.userId,
      workspaceId: ws.id,
    });

    return res.json(data);
  } catch (err) {
    console.error("❌ GET /availability/next-week failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || err.status || 500).json({ message: err.message || "Server error" });
  }
});

// WORKER: save next week availability
router.post("/next-week", requireAuth, requireRole("worker"), async (req, res) => {
  try {
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(403).json({ message: "User has no active workspace" });

    const result = await saveNextWeekAvailability(
      {
        userId: req.user.userId,
        workspaceId: ws.id,
      },
      req.body
    );

    return res.json({ message: "Availability saved", result });
  } catch (err) {
    console.error("❌ POST /availability/next-week failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || err.status || 500).json({ message: err.message || "Server error" });
  }
});

// ADMIN: submissions overview for a week
router.get("/admin/submissions/week", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { workspaceId, weekStartDate } = req.query;

    const data = await getAdminAvailabilitySubmissionsWeek({
      adminId: req.user.userId,
      workspaceId,
      weekStartDate,
    });

    return res.json(data);
  } catch (err) {
    console.error("❌ GET /availability/admin/submissions/week failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || err.status || 500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;


// // availability.js

// const express = require("express");
// const { requireAuth, requireRole } = require("../util/rbac");
// const { getNextWeekBundle, saveNextWeekAvailability } = require("../services/availabilityService");
// // for admin
// const {
//   getAdminAvailabilitySubmissionsWeek,
// } = require("../services/adminAvailabilitySubmissionsWeekService");

// const router = express.Router();

// // WORKER: get next week bundle (days + templates + existing submission)
// router.get("/next-week", requireAuth, requireRole("worker"), async (req, res) => {
//   try {
//     const data = await getNextWeekBundle(req.user.userId);
//     res.json(data);
//   } catch (err) {
//     console.error("❌ GET /availability/next-week failed:", err?.message);
//     console.error(err?.stack || err);
//     res.status(err.status || 500).json({ message: err.message || "Server error" });
//   }
// });

// // WORKER: save next week availability
// router.post("/next-week", requireAuth, requireRole("worker"), async (req, res) => {
//   try {
//     const result = await saveNextWeekAvailability(req.user.userId, req.body);
//     res.json({ message: "Availability saved", result });
//   } catch (err) {
//     console.error("❌ POST /availability/next-week failed:", err?.message);
//     console.error(err?.stack || err);
//     res.status(err.status || 500).json({ message: err.message || "Server error" });
//   }
// });


// // ADMIN: submissions overview for a week
// router.get(
//   "/admin/submissions/week",
//   requireAuth,
//   requireRole("admin"),
//   async (req, res, next) => {
//     try {
//       const { workspaceId, weekStartDate } = req.query;

//       const data = await getAdminAvailabilitySubmissionsWeek({
//         adminId: req.user.userId,
//         workspaceId,
//         weekStartDate,
//       });

//     res.json(data);
//     } catch (err) {
//         console.error("❌ GET /availability/admin/submissions/week failed:", err?.message);
//         console.error(err?.stack || err);
//         res.status(err.status || 500).json({ message: err.message || "Server error" });
//     }
//   }
// );



// module.exports = router;

