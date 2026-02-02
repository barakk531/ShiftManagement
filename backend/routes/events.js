const express = require("express");
const { checkAuth } = require("../util/auth");

const {
  getEventsByUser,
  getEventByIdForUser,
  createEventForUser,
  updateEventForUser,
  deleteEventForUser,
} = require("../db/eventService");

const router = express.Router();

// Protect everything below this line
router.use(checkAuth);

// GET /events -> only events of the logged-in user
router.get("/", async (req, res) => {
  try {
    const userId = req.token?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const events = await getEventsByUser(userId);
    return res.json({ events });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Could not fetch events." });
  }
});

// GET /events/:id -> only if belongs to user
router.get("/:id", async (req, res) => {
  try {
    const userId = req.token?.userId;
    const eventId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const event = await getEventByIdForUser(eventId, userId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.json({ event });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Could not fetch event." });
  }
});

// POST /events -> create for user
router.post("/", async (req, res) => {
  try {
    const userId = req.token?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const created = await createEventForUser(req.body, userId);
    return res.status(201).json({ event: created });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Could not save shift." });
  }
});

// PUT /events/:id -> update only if belongs to user
router.put("/:id", async (req, res) => {
  try {
    const userId = req.token?.userId;
    const eventId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const ok = await updateEventForUser(eventId, req.body, userId);
    if (!ok) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Return the updated event in the API shape (camelCase)
    const updated = await getEventByIdForUser(eventId, userId);
    return res.json({ event: updated });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Could not update event." });
  }
});

// DELETE /events/:id -> delete only if belongs to user
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.token?.userId;
    const eventId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const ok = await deleteEventForUser(eventId, userId);
    if (!ok) {
      return res.status(404).json({ message: "Event not found." });
    }

    return res.status(200).json({ message: "Event deleted." });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Could not delete event." });
  }
});

module.exports = router;






// const express = require("express");
// const { checkAuth } = require("../util/auth");

// const {
//   getEventsByUser,
//   getEventByIdForUser,
//   createEventForUser,
//   updateEventForUser,
//   deleteEventForUser,
// } = require("../db/eventService");

// const router = express.Router();

// // Protect everything below this line
// router.use(checkAuth);

// // GET /events -> only events of the logged-in user
// router.get("/", async (req, res) => {
//   try {
//     const userId = req.token?.userId; // ✅ FIX

//     if (!userId) {
//       return res.status(401).json({ message: "Not authenticated." });
//     }

//     const events = await getEventsByUser(userId);
//     return res.json({ events });
//   } catch (err) {
//     return res.status(500).json({ message: err.message || "Could not fetch events." });
//   }
// });

// // GET /events/:id -> only if belongs to user
// router.get("/:id", async (req, res) => {
//   try {
//     const userId = req.token?.userId; // ✅ FIX
//     const eventId = req.params.id;

//     if (!userId) {
//       return res.status(401).json({ message: "Not authenticated." });
//     }

//     const event = await getEventByIdForUser(eventId, userId);
//     if (!event) {
//       return res.status(404).json({ message: "Event not found." });
//     }

//     return res.json({ event });
//   } catch (err) {
//     return res.status(500).json({ message: err.message || "Could not fetch event." });
//   }
// });

// // POST /events -> create for user
// router.post("/", async (req, res) => {
//   try {
//     const userId = req.token?.userId; // ✅ FIX

//     if (!userId) {
//       return res.status(401).json({ message: "Not authenticated." });
//     }

//     const created = await createEventForUser(req.body, userId);
//     return res.status(201).json({ event: created });
//   } catch (err) {
//     return res.status(500).json({ message: err.message || "Could not save shift." });
//   }
// });

// // PUT /events/:id -> update only if belongs to user
// router.put("/:id", async (req, res) => {
//   try {
//     const userId = req.token?.userId; // ✅ FIX
//     const eventId = req.params.id;

//     if (!userId) {
//       return res.status(401).json({ message: "Not authenticated." });
//     }

//     const ok = await updateEventForUser(eventId, req.body, userId);
//     if (!ok) {
//       return res.status(404).json({ message: "Event not found." });
//     }


//     const updated = await eventService.getEventByIdForUser(req.params.id, req.user.id);
//     return res.json({ event: updated });
//     // const updated = await getEventByIdForUser(eventId, userId);
//     // return res.json({ event: updated });
//   } catch (err) {
//     return res.status(500).json({ message: err.message || "Could not update event." });
//   }
// });

// // DELETE /events/:id -> delete only if belongs to user
// router.delete("/:id", async (req, res) => {
//   try {
//     const userId = req.token?.userId; // ✅ FIX
//     const eventId = req.params.id;

//     if (!userId) {
//       return res.status(401).json({ message: "Not authenticated." });
//     }

//     const ok = await deleteEventForUser(eventId, userId);
//     if (!ok) {
//       return res.status(404).json({ message: "Event not found." });
//     }

//     return res.status(200).json({ message: "Event deleted." });
//   } catch (err) {
//     return res.status(500).json({ message: err.message || "Could not delete event." });
//   }
// });



// router.put("/:id", async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const eventId = req.params.id;

//     const updatedEvent = await eventService.updateEvent(
//       userId,
//       eventId,
//       req.body
//     );

//     if (!updatedEvent) {
//       return res.status(404).json({ message: "Event not found" });
//     }

//     res.json({ event: updatedEvent });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to update event" });
//   }
// });

// module.exports = router;
