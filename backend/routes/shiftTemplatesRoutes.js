const express = require("express");
const { requireAuth, requireRole } = require("../util/rbac");
const shiftTemplatesService = require("../services/shiftTemplatesService");

const router = express.Router();

// Admin: list templates for my workspace
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const templates = await shiftTemplatesService.listMyWorkspaceTemplates(req.user.userId);
  res.json({ templates });
});

// Admin: create template
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { name, startTime, endTime, sortOrder = 0, requiredCount = null, isActive = true } = req.body;

  if (!name || String(name).trim().length < 2) {
    return res.status(422).json({ message: "Template name is required." });
  }
  if (!startTime || !endTime) {
    return res.status(422).json({ message: "startTime and endTime are required." });
  }

  const created = await shiftTemplatesService.createTemplate(req.user.userId, {
    name: String(name).trim(),
    startTime,
    endTime,
    sortOrder: Number(sortOrder) || 0,
    requiredCount: requiredCount === "" ? null : (requiredCount == null ? null : Number(requiredCount)),
    isActive: !!isActive,
  });

  res.status(201).json({ template: created });
});

// Admin: update template
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  const { name, startTime, endTime, sortOrder, requiredCount, isActive } = req.body;

  const updated = await shiftTemplatesService.updateTemplate(req.user.userId, id, {
    name,
    startTime,
    endTime,
    sortOrder,
    requiredCount,
    isActive,
  });

  res.json({ template: updated });
});

// Admin: delete template
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = Number(req.params.id);
  await shiftTemplatesService.deleteTemplate(req.user.userId, id);
  res.json({ ok: true });
});

module.exports = router;
