const db = require("../db");

async function getAvailableYears(userId) {
  const [rows] = await db.query(
    `
    SELECT DISTINCT YEAR(date) AS year
    FROM events
    WHERE user_id = ?
    ORDER BY year DESC
    `,
    [userId]
  );

  return rows.map((r) => r.year).filter(Boolean);
}

async function getAvailableMonths(userId, year) {
  const [rows] = await db.query(
    `
    SELECT DISTINCT MONTH(date) AS month
    FROM events
    WHERE user_id = ? AND YEAR(date) = ?
    ORDER BY month DESC
    `,
    [userId, year]
  );

  return rows.map((r) => r.month).filter(Boolean);
}

async function getEventsForMonth(userId, year, month) {
  const [rows] = await db.query(
    `
    SELECT
      id,
      user_id,
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
      shift_total,
      created_at
    FROM events
    WHERE user_id = ?
      AND YEAR(date) = ?
      AND MONTH(date) = ?
    ORDER BY date DESC, start_time DESC
    `,
    [userId, year, month]
  );

  return rows;
}

async function getMonthSummary(userId, year, month) {
  const [rows] = await db.query(
    `
    SELECT
      COALESCE(SUM(hours_worked), 0) AS totalHours,
      COALESCE(SUM(travel), 0) AS totalTravel,
      COALESCE(SUM(shift_total), 0) AS totalIncome,
      COUNT(*) AS shiftsCount
    FROM events
    WHERE user_id = ?
      AND YEAR(date) = ?
      AND MONTH(date) = ?
    `,
    [userId, year, month]
  );

  return rows[0] || { totalHours: 0, totalTravel: 0, totalIncome: 0, shiftsCount: 0 };
}

module.exports = {
  getAvailableYears,
  getAvailableMonths,
  getEventsForMonth,
  getMonthSummary,
};
