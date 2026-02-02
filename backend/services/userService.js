

const pool = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createUser(userData) {
  console.log('🧠 createUser() called with:', userData.email);

  const { email, password } = userData;

  if (!email) throw new Error('Email is required');
  if (!password) throw new Error('Password is required');

  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, terms, acquisition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        email,
        hashedPassword,
        userData.firstName || '',
        userData.lastName || '',
        userData.role || 'Student',
        userData.terms ? 1 : 0,
        JSON.stringify(userData.acquisition || []),
      ]
    );

    return {
      id,
      email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
    };
  } finally {
    connection.release();
  }
}


async function getUserByEmail(email) {
  const connection = await pool.getConnection();

  try {
    const [rows] = await connection.execute(
      `SELECT
          id,
          email,
          password_hash,
          first_name,
          last_name,
          email_verified,
          email_verification_code_hash,
          email_verification_expires_at,
          password_reset_code_hash,
          password_reset_expires_at
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) return null;

    const user = rows[0];

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: user.email_verified,

      emailVerificationCodeHash: user.email_verification_code_hash,
      emailVerificationExpiresAt: user.email_verification_expires_at,

      passwordResetCodeHash: user.password_reset_code_hash,
      passwordResetExpiresAt: user.password_reset_expires_at,
    };
  } finally {
    connection.release();
  }
}


// Email verification: store code hash + expiry
async function setEmailVerification(userId, codeHash, expiresAt) {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `
      UPDATE users
      SET email_verification_code_hash = ?,
          email_verification_expires_at = ?,
          email_verified = 0
      WHERE id = ?
      `,
      [codeHash, expiresAt, userId]
    );
  } finally {
    connection.release();
  }
}

// Email verification: mark verified + clear code
async function verifyUserEmail(userId) {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      `
      UPDATE users
      SET email_verified = 1,
          email_verification_code_hash = NULL,
          email_verification_expires_at = NULL
      WHERE id = ?
      `,
      [userId]
    );
  } finally {
    connection.release();
  }
}

module.exports = {
  createUser,
  getUserByEmail,
  setEmailVerification,
  verifyUserEmail,
};














// const pool = require('../db');
// const bcrypt = require('bcryptjs');
// const crypto = require('crypto');



// async function createUser(userData) {
//     console.log('🧠 createUser() called with:', userData.email);

//     const { email, password } = userData;

//     if (!email) throw new Error('Email is required');
//     if (!password) throw new Error('Password is required');

//     const connection = await pool.getConnection();

//     try {
//     const [rows] = await connection.execute(
//         'SELECT id FROM users WHERE email = ?',
//         [email]
//     );

//     if (rows.length > 0) {
//         throw new Error('User with this email already exists');
//     }

//     const hashedPassword = await bcrypt.hash(password, 12);
//     const id = crypto.randomUUID();

//     await connection.execute(
//         `INSERT INTO users (id, email, password_hash, first_name, last_name, role, terms, acquisition)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//         id,
//         email,
//         hashedPassword,
//         userData.firstName || '',
//         userData.lastName || '',
//         userData.role || 'Student',
//         userData.terms ? 1 : 0,
//         JSON.stringify(userData.acquisition || []),
//         ]
//     );

//   return {
//     id,
//     email,
//     firstName: userData.firstName || '',
//     lastName: userData.lastName || '',
//   };
    
//   } finally {
//     connection.release();
//   }
// }


// async function getUserByEmail(email) {
//   const connection = await pool.getConnection();

//   try {
//     const [rows] = await connection.execute(
//       `SELECT id, email, password_hash, first_name, last_name
//        FROM users
//        WHERE email = ?
//        LIMIT 1`,
//       [email]
//     );

//     if (rows.length === 0) {
//       return null;
//     }

//     const user = rows[0];

//     return {
//       id: user.id,
//       email: user.email,
//       passwordHash: user.password_hash,
//       firstName: user.first_name,
//       lastName: user.last_name,
//     };
//   } finally {
//     connection.release();
//   }
// }


// // email Verification
// async function setEmailVerification(userId, codeHash, expiresAt) {
//   const db = require('../db');
//   await db.query(
//     `
//     UPDATE users
//     SET email_verification_code_hash = ?,
//         email_verification_expires_at = ?,
//         email_verified = 0
//     WHERE id = ?
//     `,
//     [codeHash, expiresAt, userId]
//   );
// }



// module.exports = {
//   createUser,
//   getUserByEmail,
//   setEmailVerification,

// };
