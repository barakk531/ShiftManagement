const pool = require("../db"); // adjust path if your folder structure differs

// Get all posts from all users (shared forum)
async function getAllPosts() {
  const [rows] = await pool.execute(`
    SELECT 
      p.id,
      p.title,
      p.body,
      p.created_at AS createdAt,
      u.id AS userId,
      u.email,
      u.first_name AS firstName,
      u.last_name AS lastName
    FROM forum_posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
  `);

  return rows;
}

// Create post for logged-in user
async function createPostForUser({ title, body }, userId) {
  const [result] = await pool.execute(
    `INSERT INTO forum_posts (user_id, title, body) VALUES (?, ?, ?)`,
    [userId, title, body]
  );

  const [rows] = await pool.execute(
    `SELECT id, title, body, created_at AS createdAt, user_id AS userId
     FROM forum_posts
     WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
}

module.exports = {
  getAllPosts,
  createPostForUser,
};
