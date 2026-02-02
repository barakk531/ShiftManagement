const pool = require(".");
const crypto = require("crypto");

/**
 * Map DB row (snake_case) to API object (camelCase)
 */
function mapEventRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    //  date: String(row.date),
    date:
      row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date),
    image: row.image,

    city: row.city,
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,

    hourlyRate: Number(row.hourly_rate),
    travel: Number(row.travel),
    dayOfWeek: row.day_of_week,
    hoursWorked: Number(row.hours_worked),
    shiftTotal: Number(row.shift_total),
  };
}

/**
 * GET all events for a user
 */
async function getEventsByUser(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      DATE_FORMAT(date, '%Y-%m-%d') AS date,
      image,
      city,
      start_time,
      end_time,
      hourly_rate,
      travel,
      day_of_week,
      hours_worked,
      shift_total
    FROM events
    WHERE user_id = ?
    ORDER BY date DESC, created_at DESC
    `,
    [userId]
  );

  return rows.map(mapEventRow);
}

/**
 * GET single event (user scoped)
 */
async function getEventByIdForUser(eventId, userId) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      DATE_FORMAT(date, '%Y-%m-%d') AS date,
      image,
      city,
      start_time,
      end_time,
      hourly_rate,
      travel,
      day_of_week,
      hours_worked,
      shift_total
    FROM events
    WHERE id = ? AND user_id = ?
    LIMIT 1
    `,
    [eventId, userId]
  );

  if (rows.length === 0) return null;
  return mapEventRow(rows[0]);
}

/**
 * CREATE new event for user
 */
async function createEventForUser(data, userId) {

  if (!data?.date || String(data.date).trim() === "") {
    const err = new Error("Date is required.");
    err.status = 422;
    throw err;
  }


  const id = crypto.randomUUID();

  await pool.query(
    `
    INSERT INTO events (
      id,
      user_id,
      title,
      description,
      date,
      image,
      city,
      start_time,
      end_time,
      hourly_rate,
      travel,
      day_of_week,
      hours_worked,
      shift_total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      userId,
      data.title,
      data.description,
      data.date,
      data.image,
      data.city || null,
      data.startTime || null,
      data.endTime || null,
      Number(data.hourlyRate) || 0,
      Number(data.travel) || 0,
      data.dayOfWeek || null,
      Number(data.hoursWorked) || 0,
      Number(data.shiftTotal) || 0,
    ]
  );

  return { id, ...data };
}

/**
 * UPDATE event (user scoped)
 */
async function updateEventForUser(eventId, data, userId) {

  if (!data?.date || String(data.date).trim() === "") {
  const err = new Error("Date is required.");
  err.status = 422;
  throw err;
  }

  const [result] = await pool.query(
    `
    UPDATE events SET
      title = ?,
      description = ?,
      date = ?,
      image = ?,
      city = ?,
      start_time = ?,
      end_time = ?,
      hourly_rate = ?,
      travel = ?,
      day_of_week = ?,
      hours_worked = ?,
      shift_total = ?
    WHERE id = ? AND user_id = ?
    `,
    [
      data.title,
      data.description,
      data.date,
      data.image,
      data.city || null,
      data.startTime || null,
      data.endTime || null,
      Number(data.hourlyRate) || 0,
      Number(data.travel) || 0,
      data.dayOfWeek || null,
      Number(data.hoursWorked) || 0,
      Number(data.shiftTotal) || 0,
      eventId,
      userId,
    ]
  );

  return result.affectedRows > 0;
}


async function getEventsByUserForMonth(userId, year, month) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      title,
      description,
      DATE_FORMAT(date, '%Y-%m-%d') AS date,
      image,
      city,
      start_time,
      end_time,
      hourly_rate,
      travel,
      day_of_week,
      hours_worked,
      shift_total
    FROM events
    WHERE user_id = ?
      AND YEAR(date) = ?
      AND MONTH(date) = ?
    ORDER BY date DESC, created_at DESC
    `,
    [userId, year, month]
  );

  return rows.map(mapEventRow);
}

async function getMonthlySummaryForUser(userId, year, month) {
  const [rows] = await pool.query(
    `
    SELECT
      COUNT(*) AS shiftsCount,
      COALESCE(SUM(hours_worked), 0) AS hoursWorked,
      COALESCE(SUM(travel), 0) AS travel,
      COALESCE(SUM(shift_total), 0) AS shiftTotal
    FROM events
    WHERE user_id = ?
      AND YEAR(date) = ?
      AND MONTH(date) = ?
    `,
    [userId, year, month]
  );

  const r = rows?.[0] || {};
  return {
    shiftsCount: Number(r.shiftsCount || 0),
    hoursWorked: Number(r.hoursWorked || 0),
    travel: Number(r.travel || 0),
    shiftTotal: Number(r.shiftTotal || 0),
  };
}


/**
 * DELETE event (user scoped)
 */
async function deleteEventForUser(eventId, userId) {
  const [result] = await pool.query(
    `DELETE FROM events WHERE id = ? AND user_id = ?`,
    [eventId, userId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  getEventsByUser,
  getEventByIdForUser,
  createEventForUser,
  updateEventForUser,
  getEventsByUserForMonth,
  getMonthlySummaryForUser,
  deleteEventForUser,
};




