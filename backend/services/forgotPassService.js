const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../db"); 

const DEFAULT_EXPIRES_SECONDS = 5 * 60;

function generate6DigitCode() {
  return String(crypto.randomInt(100000, 1000000)); // 100000..999999
}

function makeExpiresAt(expiresInSeconds = DEFAULT_EXPIRES_SECONDS) {
  return new Date(Date.now() + expiresInSeconds * 1000);
}


async function setPasswordReset(userId, codeHash, expiresAt) {
  const sql = `
    UPDATE users
    SET password_reset_code_hash = ?, password_reset_expires_at = ?
    WHERE id = ?
  `;
  await db.query(sql, [codeHash, expiresAt, userId]);
}


async function clearPasswordReset(userId) {
  const sql = `
    UPDATE users
    SET password_reset_code_hash = NULL, password_reset_expires_at = NULL
    WHERE id = ?
  `;
  await db.query(sql, [userId]);
}


// hashed password
async function updateUserPassword(userId, passwordHash) {
  const sql = `
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
  `;
  await db.query(sql, [passwordHash, userId]);
}


// hash + expires 
async function createResetCodeBundle(expiresInSeconds = DEFAULT_EXPIRES_SECONDS) {
  const code = generate6DigitCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = makeExpiresAt(expiresInSeconds);

  return { code, codeHash, expiresAt, expiresInSeconds };
}

 // user: record DB (password_reset_code_hash / password_reset_expires_at)
async function verifyResetCode(user, code) {
  if (!user) return { ok: false, reason: "no_user" };

  const exp = user.password_reset_expires_at;
  if (!exp) return { ok: false, reason: "no_expiry" };

  const expDate = new Date(exp);
  if (Number.isNaN(expDate.getTime())) return { ok: false, reason: "bad_expiry" };

  if (expDate < new Date()) return { ok: false, reason: "expired" };

  const hash = user.password_reset_code_hash || "";
  const match = await bcrypt.compare(String(code), hash);
  if (!match) return { ok: false, reason: "bad_code" };

  return { ok: true };
}

module.exports = {
  DEFAULT_EXPIRES_SECONDS,
  createResetCodeBundle,
  setPasswordReset,
  clearPasswordReset,
  updateUserPassword,
  verifyResetCode,
};
