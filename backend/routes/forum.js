const express = require("express");
const { checkAuth } = require("../util/auth");
const { getAllPosts, createPostForUser } = require("../db/forumService");

const router = express.Router();

// forum is shared, but still requires login
router.use(checkAuth);

// GET /forum -> everyone sees everything
router.get("/", async (req, res) => {
  try {
    const posts = await getAllPosts();
    return res.json({ posts });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not load posts" });
  }
});

// POST /forum -> create a post as logged-in user
router.post("/", async (req, res) => {
  try {
    const userId = req.token?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const { title, body } = req.body || {};
    if (!title || title.trim().length < 3) {
      return res.status(400).json({ message: "Title must be at least 3 characters." });
    }
    if (!body || body.trim().length < 5) {
      return res.status(400).json({ message: "Body must be at least 5 characters." });
    }

    const created = await createPostForUser({ title, body }, userId);
    return res.status(201).json({ post: created });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Could not create post" });
  }
});

module.exports = router;
