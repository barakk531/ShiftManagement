
// backend/util/rbac.js
//
// Purpose:
// - Auth middleware (JWT) + role guard.
// - Does NOT block workers without a workspace.
// - Loads activeWorkspaceId (users.active_workspace_id) when available.
//
// Notes:
// - All comments are in English only (per request).

const { verify } = require("jsonwebtoken");
const db = require("../db");


function getJwtKey() {
  return process.env.JWT_SECRET || process.env.TOKEN_KEY || process.env.JWT_KEY || "dev_secret";
}

async function requireAuth(req, res, next) {
  
  console.log("RBAC role check:", req.user);

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const payload = verify(token, getJwtKey());

    // Support both token shapes:
    // - { userId: "uuid", role, email, ... }
    // - { id: "uuid", role, email, ... }
    const userId = payload.userId || payload.id;
    if (!userId) return res.status(401).json({ message: "Invalid token payload" });

    req.user = {
      userId: String(userId),
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
    };

    // Load activeWorkspaceId (may be NULL for new workers)
    const [[row]] = await db.query(
      "SELECT active_workspace_id FROM users WHERE id = ? LIMIT 1",
      [req.user.userId]
    );

    req.user.activeWorkspaceId = row?.active_workspace_id || null;

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Missing auth" });

    const role = String(req.user.role || "").toLowerCase();
    const expected = String(requiredRole || "").toLowerCase();

    if (!role || role !== expected) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };




// // RBAC = Role-Based Access Control

// // RBAC = Role-Based Access Control

// const { verify } = require("jsonwebtoken");
// const db = require("../db");

// function getJwtKey() {
//   return (
//     process.env.JWT_SECRET ||
//     process.env.TOKEN_KEY ||
//     process.env.JWT_KEY ||
//     "dev_secret"
//   );
// }

// async function requireAuth(req, res, next) {
//   const header = req.headers.authorization || "";
//   const token = header.startsWith("Bearer ") ? header.slice(7) : null;
//   if (!token) return res.status(401).json({ message: "Missing token" });

//   try {
//     const payload = verify(token, getJwtKey());
//     req.user = payload; // { userId, email, firstName, lastName, role }

//     // Load workspaceId from DB (users.id is VARCHAR(36))
//     const [[row]] = await db.query(
//       "SELECT workspace_id FROM users WHERE id = ?",
//       [req.user.userId]
//     );

//     if (!row || !row.workspace_id) {
//       return res.status(403).json({ message: "User has no workspace" });
//     }

//     req.user.workspaceId = row.workspace_id;

//     return next();
//   } catch {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// }

// function requireRole(role) {
//   return (req, res, next) => {
//     if (!req.user) return res.status(401).json({ message: "Missing auth" });
//     if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
//     return next();
//   };
// }

// module.exports = { requireAuth, requireRole };





// // // RBAC = Role-Based Access Control

// // const { verify } = require("jsonwebtoken");

// // function getJwtKey() {
// //   return process.env.JWT_SECRET || process.env.TOKEN_KEY || process.env.JWT_KEY || "dev_secret";
// // }

// // function requireAuth(req, res, next) {
// //   const header = req.headers.authorization || "";
// //   const token = header.startsWith("Bearer ") ? header.slice(7) : null;
// //   if (!token) return res.status(401).json({ message: "Missing token" });

// //   try {
// //     const payload = verify(token, getJwtKey());
// //     req.user = payload; // { userId, email, firstName, lastName, role }
// //     return next();
// //   } catch {
// //     return res.status(401).json({ message: "Invalid token" });
// //   }
// // }

// // function requireRole(role) {
// //   return (req, res, next) => {
// //     if (!req.user) return res.status(401).json({ message: "Missing auth" });
// //     if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
// //     return next();
// //   };
// // }

// // module.exports = { requireAuth, requireRole };
