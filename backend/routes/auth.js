


// backend/routes/auth.js
//
// Purpose:
// - Authentication routes (signup, login).
// - Optional email verification (verify-email, resend-verification).
// - Password reset flow (forgot-password, verify-reset-code, reset-password).
// - Ensures returned user payload includes activeWorkspaceId for Select Workspace flow.
//
// Notes:
// - All comments are in English only (per request).

const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const {
  sendTestEmail,
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
} = require("../services/emailService");

const {
  setPasswordReset,
  clearPasswordReset,
  updateUserPassword,
  verifyResetCode,
} = require("../services/forgotPassService");

const { createUser, getUserByEmail, setEmailVerification, verifyUserEmail } = require("../services/userService");

const { createJSONToken, isValidPassword } = require("../util/auth");
const { isValidEmail, isValidText } = require("../util/validation");

const router = express.Router();

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function toUserPayload(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role ?? "worker",
    activeWorkspaceId: user.activeWorkspaceId ?? null,
  };
}

// ------------------------------------------------------------
// POST /auth/signup
// ------------------------------------------------------------
router.post("/signup", async (req, res, next) => {
  const data = req.body || {};

  const emailNorm = normalizeEmail(data.email);
  const password = data.password;

  const firstName = data["first-name"] ?? data.firstName ?? "";
  const lastName = data["last-name"] ?? data.lastName ?? "";

  const errors = {};

  if (!isValidEmail(emailNorm)) {
    errors.email = "Invalid email.";
  } else {
    try {
      const existingUser = await getUserByEmail(emailNorm);
      if (existingUser) errors.email = "Email exists already.";
    } catch (e) {
      // ignored here
    }
  }

  if (!isValidText(password, 6)) {
    errors.password = "Invalid password. Must be at least 6 characters long.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: "User signup failed due to validation errors.",
      errors,
    });
  }

  try {
    const createdUser = await createUser({
      email: emailNorm,
      password,
      firstName,
      lastName,
      role: data.role,
      terms: data.terms,
      acquisition: data.acquisition,
    });

    // DEV mode: bypass email verification and return token
    if (process.env.DEV_BYPASS_EMAIL_VERIFICATION === "true") {
      await verifyUserEmail(createdUser.id);

      const token = createJSONToken({
        id: createdUser.id,
        email: createdUser.email,
        firstName,
        lastName,
        role: createdUser.role ?? "worker",
        activeWorkspaceId: createdUser.activeWorkspaceId ?? null,
      });

      return res.status(201).json({
        message: "User created (DEV mode, email auto-verified).",
        token,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          firstName,
          lastName,
          role: createdUser.role ?? "worker",
          activeWorkspaceId: createdUser.activeWorkspaceId ?? null,
        },
      });
    }

    // Production verification flow may be enabled later.
    // If verification sending is currently disabled, return a safe response.
    return res.status(201).json({
      message: "User created. Email verification required.",
      needsEmailVerification: true,
      email: createdUser.email,
      expiresInSeconds: 5 * 60,
    });
  } catch (error) {
    if (error?.message && error.message.toLowerCase().includes("already exists")) {
      return res.status(422).json({
        message: "User signup failed due to validation errors.",
        errors: { email: "Email exists already." },
      });
    }
    return next(error);
  }
});

// ------------------------------------------------------------
// POST /auth/verify-email
// ------------------------------------------------------------
router.post("/verify-email", async (req, res) => {
  const emailNorm = normalizeEmail(req.body?.email);
  const codeStr = String(req.body?.code || "").trim();

  if (process.env.DEV_BYPASS_EMAIL_VERIFICATION === "true") {
    return res.status(400).json({ message: "Email verification is disabled in development mode." });
  }

  if (!emailNorm || !codeStr) {
    return res.status(422).json({ message: "Email and code are required." });
  }

  try {
    const user = await getUserByEmail(emailNorm);

    if (!user) return res.status(401).json({ message: "Invalid email or code." });
    if (Number(user.emailVerified)) return res.status(200).json({ message: "Email already verified." });

    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      return res.status(401).json({ message: "No active verification code." });
    }

    if (new Date(user.emailVerificationExpiresAt) < new Date()) {
      return res.status(401).json({ message: "Verification code expired." });
    }

    const ok = await bcrypt.compare(codeStr, user.emailVerificationCodeHash);
    if (!ok) return res.status(401).json({ message: "Invalid email or code." });

    await verifyUserEmail(user.id);

    // Reload user (to reflect verified status, role, activeWorkspaceId)
    const fresh = await getUserByEmail(emailNorm);

    const token = createJSONToken({
      id: fresh.id,
      email: fresh.email,
      firstName: fresh.firstName,
      lastName: fresh.lastName,
      role: fresh.role ?? "worker",
      activeWorkspaceId: fresh.activeWorkspaceId ?? null,
    });

    return res.status(200).json({
      message: "Email verified successfully.",
      token,
      user: toUserPayload(fresh),
    });
  } catch (err) {
    console.error("verify-email error:", err);
    return res.status(500).json({ message: "Verification failed." });
  }
});

// ------------------------------------------------------------
// POST /auth/resend-verification
// ------------------------------------------------------------
router.post("/resend-verification", async (req, res) => {
  const emailNorm = normalizeEmail(req.body?.email);
  if (!emailNorm) return res.status(422).json({ message: "Email is required." });

  try {
    const user = await getUserByEmail(emailNorm);

    // Do not reveal whether an email exists.
    if (!user) {
      return res.status(200).json({ message: "If the email exists, a new code was sent." });
    }

    if (Number(user.emailVerified)) {
      return res.status(200).json({ message: "Email already verified." });
    }

    const verificationCode = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(verificationCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await setEmailVerification(user.id, codeHash, expiresAt);
    await sendVerificationCodeEmail({
      to: emailNorm,
      code: verificationCode,
      minutes: 5,
    });

    // DEV ONLY: remove devCode once email sending is confirmed
    return res.status(200).json({
      message: "New verification code generated.",
      needsEmailVerification: true,
      email: user.email,
      devCode: verificationCode,
      expiresInSeconds: 300,
    });
  } catch (err) {
    console.error("resend-verification error:", err);
    return res.status(500).json({ message: "Failed to resend verification code." });
  }
});

// ------------------------------------------------------------
// POST /auth/login
// ------------------------------------------------------------
router.post("/login", async (req, res) => {
  const emailNorm = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  try {
    const user = await getUserByEmail(emailNorm);
    console.log("LOGIN user role:", user?.role);

    if (!user) return res.status(401).json({ message: "Authentication failed." });

    const DEV_BYPASS = process.env.DEV_BYPASS_EMAIL_VERIFICATION === "true";

    if (!DEV_BYPASS && !Number(user.emailVerified)) {
      return res.status(403).json({ message: "Email not verified." });
    }


    const passwordOk = await isValidPassword(password, user.passwordHash);
    if (!passwordOk) return res.status(401).json({ message: "Authentication failed." });

    const token = createJSONToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      activeWorkspaceId: user.activeWorkspaceId ?? null,
    });

    return res.json({ token, user: toUserPayload(user) });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Login failed." });
  }
});

// ------------------------------------------------------------
// POST /auth/test-email
// ------------------------------------------------------------
router.post("/test-email", async (req, res) => {
  try {
    const { to } = req.body || {};
    const result = await sendTestEmail(to);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("test-email error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ------------------------------------------------------------
// POST /auth/forgot-password
// ------------------------------------------------------------
router.post("/forgot-password", async (req, res) => {
  const emailNorm = normalizeEmail(req.body?.email);

  const genericOk = () =>
    res.status(200).json({
      message: "If an account exists, a reset code was sent.",
      expiresInSeconds: 300,
    });

  if (!isValidEmail(emailNorm)) return genericOk();

  const user = await getUserByEmail(emailNorm);
  if (!user) return genericOk();

  const verificationCode = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(verificationCode, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await setPasswordReset(user.id, codeHash, expiresAt);

  try {
    await sendPasswordResetCodeEmail({
      to: emailNorm,
      code: verificationCode,
      minutes: 5,
    });
  } catch (e) {
    console.error("FAILED TO SEND RESET EMAIL:", e);
    return res.status(500).json({ message: "Failed to send reset email" });
  }

  return genericOk();
});

// ------------------------------------------------------------
// POST /auth/verify-reset-code
// ------------------------------------------------------------
router.post("/verify-reset-code", async (req, res) => {
  try {
    const emailNorm = normalizeEmail(req.body?.email);
    const codeStr = String(req.body?.code || "").trim();

    if (!isValidEmail(emailNorm)) return res.status(400).json({ message: "Invalid email" });
    if (!/^\d{6}$/.test(codeStr)) return res.status(400).json({ message: "Invalid code" });

    const user = await getUserByEmail(emailNorm);
    if (!user) return res.status(400).json({ message: "Invalid code or expired" });

    const reset = await verifyResetCode(
      {
        password_reset_code_hash: user.passwordResetCodeHash,
        password_reset_expires_at: user.passwordResetExpiresAt,
      },
      codeStr
    );

    if (!reset.ok) return res.status(400).json({ message: "Invalid code or expired" });

    return res.status(200).json({ message: "Code verified" });
  } catch (err) {
    console.error("verify-reset-code error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ------------------------------------------------------------
// POST /auth/reset-password
// ------------------------------------------------------------
router.post("/reset-password", async (req, res) => {
  const emailNorm = normalizeEmail(req.body?.email);
  const codeStr = String(req.body?.code || "").trim();
  const newPassword = req.body?.newPassword;

  if (!isValidEmail(emailNorm)) return res.status(400).json({ message: "Invalid email" });
  if (!isValidText(newPassword, 6)) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  if (!/^\d{6}$/.test(codeStr)) return res.status(400).json({ message: "Invalid code" });

  const user = await getUserByEmail(emailNorm);
  if (!user) return res.status(400).json({ message: "Invalid code or expired" });

  const expiresAt = user.passwordResetExpiresAt;
  const codeHash = user.passwordResetCodeHash;

  if (!expiresAt || new Date(expiresAt) < new Date()) {
    return res.status(400).json({ message: "Invalid code or expired" });
  }

  const ok = await bcrypt.compare(codeStr, codeHash || "");
  if (!ok) return res.status(400).json({ message: "Invalid code or expired" });

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await updateUserPassword(user.id, passwordHash);
  await clearPasswordReset(user.id);

  return res.status(200).json({ message: "Password updated successfully" });
});

module.exports = router;
