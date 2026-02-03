
const { sign, verify } = require("jsonwebtoken");
const { compare } = require("bcryptjs");
const { NotAuthError } = require("./errors");

function getJwtKey() {
  const key =
    process.env.JWT_SECRET ||
    process.env.JWT_KEY ||
    process.env.TOKEN_KEY ||
    process.env.ACCESS_TOKEN_SECRET;

  if (!key) {
    throw new Error("JWT secret is missing. Set JWT_SECRET in backend/.env");
  }
  return key;
}

function createJSONToken(user) {
  console.log("🔥 createJSONToken CALLED with:", user);

  return sign(
    {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    getJwtKey(),
    { expiresIn: "1h" }
  );
}

function validateJSONToken(token) {
  return verify(token, getJwtKey());
}

function isValidPassword(password, storedPassword) {
  return compare(password, storedPassword);
}

function checkAuthMiddleware(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }
  if (!req.headers.authorization) {
    return next(new NotAuthError("Not authenticated."));
  }

  const authFragments = req.headers.authorization.split(" ");
  if (authFragments.length !== 2) {
    return next(new NotAuthError("Not authenticated."));
  }

  const authToken = authFragments[1];

  try {
    const validatedToken = validateJSONToken(authToken);
    req.token = validatedToken;
  } catch (error) {
    return next(new NotAuthError("Not authenticated."));
  }

  next();
}

exports.createJSONToken = createJSONToken;
exports.validateJSONToken = validateJSONToken;
exports.isValidPassword = isValidPassword;
exports.checkAuth = checkAuthMiddleware;


