// backend/services/eventService.js
const pool = require('../db');
const crypto = require('crypto');

async function getEventsByUser(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id, title, description, date, image
       FROM events
       WHERE user_id = ?
       ORDER BY date DESC, created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      date: (r.date instanceof Date)
        ? r.date.toISOString().slice(0, 10)
        : String(r.date),
      image: r.image,
    }));
  } finally {
    conn.release();
  }
}

async function getEventByIdForUser(eventId, userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id, title, description, date, image
       FROM events
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [eventId, userId]
    );
    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      date: (r.date instanceof Date)
        ? r.date.toISOString().slice(0, 10)
        : String(r.date),
      image: r.image,
    };
  } finally {
    conn.release();
  }
}

async function createEventForUser(data, userId) {
  const id = crypto.randomUUID();

  const conn = await pool.getConnection();
  try {
    await conn.execute(
      `INSERT INTO events (id, user_id, title, description, date, image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, userId, data.title, data.description, data.date, data.image]
    );

    return { ...data, id };
  } finally {
    conn.release();
  }
}

async function updateEventForUser(eventId, data, userId) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(
      `UPDATE events
       SET title = ?, description = ?, date = ?, image = ?
       WHERE id = ? AND user_id = ?`,
      [data.title, data.description, data.date, data.image, eventId, userId]
    );

    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

async function deleteEventForUser(eventId, userId) {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.execute(
      `DELETE FROM events WHERE id = ? AND user_id = ?`,
      [eventId, userId]
    );
    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

module.exports = {
  getEventsByUser,
  getEventByIdForUser,
  createEventForUser,
  updateEventForUser,
  deleteEventForUser,
};
