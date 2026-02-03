// backend/routes/workspaces.js
//
// Purpose:
// - Workspace endpoints:
//   - GET /workspaces/me: resolve current workspace based on role.
//   - GET /workspaces/available: list workspaces for worker selection.
//   - POST /workspaces/:id/join: join a workspace and set it active.
//   - GET /workspaces: list all workspaces (optional; can be restricted later).
//   - POST /workspaces: admin creates workspace.
//   - GET /workspaces/me/shift-templates: templates for current workspace.
//   - PUT /workspaces/:id/operating-hours: admin saves operating hours.
//   - GET /workspaces/:id/operating-hours: any logged-in user reads operating hours.
//
// Notes:
// - All comments are in English only (per request).

const express = require("express");
const { requireAuth, requireRole } = require("../util/rbac");

const {
  createWorkspace,
  getMyWorkspace,
  getShiftTemplates,
  upsertOperatingHours,
  getOperatingHours,
  listWorkspaces,
  assertAdminOwnsWorkspace,
  listAvailableWorkspacesForWorker,
  joinWorkspaceAsWorker,
} = require("../services/workspaceService");

const router = express.Router();

// ------------------------------------------------------------
// WORKER/ADMIN: list all workspaces
// GET /workspaces
// ------------------------------------------------------------
router.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await listWorkspaces();
    return res.json({ workspaces: rows });
  } catch (err) {
    console.error("❌ GET /workspaces failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// Anyone logged-in: fetch their current workspace
// GET /workspaces/me
// ------------------------------------------------------------
router.get("/me", requireAuth, async (req, res) => {
  try {
    const ws = await getMyWorkspace(req.user);
    return res.json({ workspace: ws });
  } catch (err) {
    console.error("❌ GET /workspaces/me failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// Fetch templates for my workspace
// GET /workspaces/me/shift-templates
// ------------------------------------------------------------
router.get("/me/shift-templates", requireAuth, async (req, res) => {
  try {
    const ws = await getMyWorkspace(req.user);
    if (!ws) return res.status(404).json({ message: "No workspace found." });

    const templates = await getShiftTemplates(ws.id);
    return res.json({ templates });
  } catch (err) {
    console.error("❌ GET /workspaces/me/shift-templates failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// Worker: list workspaces available for selection
// GET /workspaces/available
// ------------------------------------------------------------
router.get("/available", requireAuth, requireRole("worker"), async (req, res) => {
  try {
    const rows = await listAvailableWorkspacesForWorker(req.user.userId);
    return res.json({ workspaces: rows });
  } catch (err) {
    console.error("❌ GET /workspaces/available failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// Worker: join workspace + set active_workspace_id
// POST /workspaces/:id/join
// ------------------------------------------------------------
router.post("/:id/join", requireAuth, requireRole("worker"), async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const ws = await joinWorkspaceAsWorker(req.user.userId, workspaceId);
    return res.json({ workspace: ws });
  } catch (err) {
    console.error("❌ POST /workspaces/:id/join failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// ADMIN: create workspace
// POST /workspaces
// ------------------------------------------------------------
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { name, industryType, timezone } = req.body;

    if (!name || String(name).trim().length < 2) {
      return res.status(422).json({ message: "Workspace name is required." });
    }

    const result = await createWorkspace({
      adminUserId: req.user.userId,
      name: String(name).trim(),
      industryType,
      timezone,
    });

    if (result.alreadyExists) {
      return res.status(409).json({
        message: "Workspace already exists for this admin.",
        workspaceId: result.workspaceId,
      });
    }

    return res.status(201).json({ message: "Workspace created.", ...result });
  } catch (err) {
    console.error("❌ POST /workspaces failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// ADMIN: save operating hours
// PUT /workspaces/:id/operating-hours
// ------------------------------------------------------------
router.put("/:id/operating-hours", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { hours } = req.body;
    if (!Array.isArray(hours) || hours.length !== 7) {
      return res.status(422).json({ message: "hours must be array of 7 days" });
    }

    const workspaceId = req.params.id;

    await assertAdminOwnsWorkspace(req.user.userId, workspaceId);
    await upsertOperatingHours(workspaceId, hours);

    return res.json({ message: "Operating hours saved" });
  } catch (err) {
    console.error("❌ PUT /workspaces/:id/operating-hours failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

// ------------------------------------------------------------
// ANY USER: get operating hours
// GET /workspaces/:id/operating-hours
// ------------------------------------------------------------
router.get("/:id/operating-hours", requireAuth, async (req, res) => {
  try {
    const hours = await getOperatingHours(req.params.id);
    return res.json({ hours });
  } catch (err) {
    console.error("❌ GET /workspaces/:id/operating-hours failed:", err?.message);
    console.error(err?.stack || err);
    return res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
  }
});

module.exports = router;
