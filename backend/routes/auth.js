
const {
  sendTestEmail,
  sendVerificationCodeEmail,
  sendPasswordResetCodeEmail,
} = require("../services/emailService");

const {
  createResetCodeBundle,
  setPasswordReset,
  clearPasswordReset,
  updateUserPassword,
  verifyResetCode,
} = require("../services/forgotPassService");


// for email authenticate 
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

console.log('✅ resend-verification route file loaded');


const express = require('express'); 
// const { createUser, getUserByEmail } = require('../services/userService');
const { createUser, getUserByEmail, setEmailVerification, verifyUserEmail } = require('../services/userService');


const { createJSONToken, isValidPassword } = require('../util/auth');
const { isValidEmail, isValidText } = require('../util/validation');

const router = express.Router();



router.post('/signup', async (req, res, next) => {
  const data = req.body;
  console.log('✅ /signup called. body =', data);

  let errors = {};


  // 1) validations
  if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email.';
  } else {
    try {
      const existingUser = await getUserByEmail(data.email);
      if (existingUser) {
        errors.email = 'Email exists already.';
      }
    } catch (error) {
      // ignore here, handled later
    }
  }

  if (!isValidText(data.password, 6)) {
    errors.password = 'Invalid password. Must be at least 6 characters long.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'User signup failed due to validation errors.',
      errors,
    });
  }

  try {
    // 2) create user (email_verified stays 0 by default)
    const firstName = data['first-name'] ?? data.firstName;
    const lastName = data['last-name'] ?? data.lastName;
    const email = data.email;
    
    const createdUser = await createUser({
      email: data.email,
      password: data.password,
      firstName,
      lastName,
      role: data.role,
      terms: data.terms,
      acquisition: data.acquisition,
    });


    // 3) generate verification code (6 digits)
    const verificationCode = String(crypto.randomInt(100000, 1000000)); // 100000..999999
    console.log("ABOUT TO SEND VERIFICATION EMAIL", { email, verificationCode });

    // 4) hash and expiry (5 minutes)
    const codeHash = await bcrypt.hash(verificationCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 5) persist hash + expiry
    await setEmailVerification(createdUser.id, codeHash, expiresAt);

    try {
      await sendVerificationCodeEmail({
        to: email,
        code: verificationCode,
        minutes: 5,
      });
    } catch (e) {
      console.error("FAILED TO SEND EMAIL:", e);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    console.log("VERIFICATION EMAIL SENT");


    // 6) return "needs verification" (no JWT yet)
    // TEMP for development: return code in response so you can test flow before SendGrid.
    // IMPORTANT: remove "devCode" once email sending works.
    return res.status(201).json({
      message: 'User created. Email verification required.',
      needsEmailVerification: true,
      email: createdUser.email,
      devCode: verificationCode,
      expiresInSeconds: 5 * 60,
    });
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('already exists')) {
      return res.status(422).json({
        message: 'User signup failed due to validation errors.',
        errors: { email: 'Email exists already.' },
      });
    }
    return next(error);
  }
});



// verify-email
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(422).json({ message: 'Email and code are required.' });
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or code.' });
    }

    if (user.emailVerified) {
      return res.status(200).json({ message: 'Email already verified.' });
    }

    if (
      !user.emailVerificationCodeHash ||
      !user.emailVerificationExpiresAt
    ) {
      return res
        .status(401)
        .json({ message: 'No active verification code.' });
    }

    if (new Date(user.emailVerificationExpiresAt) < new Date()) {
      return res.status(401).json({ message: 'Verification code expired.' });
    }

    const isValid = await bcrypt.compare(
      String(code),
      user.emailVerificationCodeHash
    );

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or code.' });
    }

    await verifyUserEmail(user.id);

    const token = createJSONToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    // return res.status(200).json({
    //   message: 'Email verified successfully.',
    //   token,
    // });
    return res.status(200).json({
      message: 'Email verified successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role ?? "user",
      },
    });

    } catch (err) {
      console.error('verify-email error:', err);
      return res.status(500).json({ message: 'Verification failed.' });
    }

});



router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(422).json({ message: 'Email is required.' });
  }

  try {
    const user = await getUserByEmail(email);

    // Security: do not reveal whether an email exists in the system.
    if (!user) {
      return res.status(200).json({ message: 'If the email exists, a new code was sent.' });
    }

    if (user.emailVerified) {
      return res.status(200).json({ message: 'Email already verified.' });
    }

    const verificationCode = String(crypto.randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(verificationCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await setEmailVerification(user.id, codeHash, expiresAt);
    await sendVerificationCodeEmail({
      to: email,
      code: verificationCode,
      minutes: 5,
    });

    // DEV ONLY: return the code for local testing. Remove once SendGrid is wired.
    return res.status(200).json({
      message: 'New verification code generated.',
      needsEmailVerification: true,
      email: user.email,
      devCode: verificationCode,
      expiresInSeconds: 300,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to resend verification code.' });
  }
});




// without email verification: 
// router.post('/signup', async (req, res, next) => {
//   const data = req.body;
//   console.log('✅ /signup called. body =', data);
//   let errors = {};

//   if (!isValidEmail(data.email)) {
//     errors.email = 'Invalid email.';
//   } else {
//     try {
//       const existingUser = await get(data.email);
//       if (existingUser) {
//         errors.email = 'Email exists already.';
//       }
//     } catch (error) {}
//   }

//   if (!isValidText(data.password, 6)) {
//     errors.password = 'Invalid password. Must be at least 6 characters long.';
//   }

//   if (Object.keys(errors).length > 0) {
//     return res.status(422).json({
//       message: 'User signup failed due to validation errors.',
//       errors,
//     });
//   }

//   try {
//     const firstName = data['first-name'] ?? data.firstName;
//     const lastName  = data['last-name']  ?? data.lastName;
//     console.log('➡️ calling createUser with email:', data.email);

//     const createdUser = await createUser({
//       email: data.email,
//       password: data.password,
//       firstName,
//       lastName,
//       role: data.role,
//       terms: data.terms,
//       acquisition: data.acquisition,
//     });


//     const authToken = createJSONToken(createdUser);
//     res
//       .status(201)
//       .json({ message: 'User created.', user: createdUser, token: authToken });
//     } catch (error) {
//       if (error.message && error.message.toLowerCase().includes('already exists')) {
//         return res.status(422).json({
//           message: 'User signup failed due to validation errors.',
//           errors: { email: 'Email exists already.' },
//         });
//       }
//       next(error);
//     }

// });

router.post("/test-email", async (req, res) => {
  try {
    const { to } = req.body;
    const result = await sendTestEmail(to);
    return res.json({ ok: true, result });
  } catch (err) {
    console.error("test-email error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});


router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const genericOk = () =>
    res.status(200).json({
      message: "If an account exists, a reset code was sent.",
      expiresInSeconds: 300,
    });

  if (!isValidEmail(email)) return genericOk();

  const user = await getUserByEmail(email);
  if (!user) return genericOk();

  const verificationCode = String(crypto.randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(verificationCode, 10);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await setPasswordReset(user.id, codeHash, expiresAt);

  try {
    await sendPasswordResetCodeEmail({
      to: email,
      code: verificationCode,
      minutes: 5,
    });
  } catch (e) {
    console.error("FAILED TO SEND RESET EMAIL:", e);
    return res.status(500).json({ message: "Failed to send reset email" });
  }

  return genericOk();
});

// verification to the code that send in email, that is the right one
router.post("/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    const emailNorm = String(email || "").trim().toLowerCase();
    const codeStr = String(code || "").trim();

    if (!isValidEmail(emailNorm)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (!/^\d{6}$/.test(codeStr)) {
      return res.status(400).json({ message: "Invalid code" });
    }

    const user = await getUserByEmail(emailNorm);
    if (!user) {
      return res.status(400).json({ message: "Invalid code or expired" });
    }

    const reset = await verifyResetCode(
      {
        password_reset_code_hash: user.passwordResetCodeHash,
        password_reset_expires_at: user.passwordResetExpiresAt,
      },
      codeStr
    );

    if (!reset.ok) {
      return res.status(400).json({ message: "Invalid code or expired" });
    }

    return res.status(200).json({ message: "Code verified" });
  } catch (err) {
    console.error("verify-reset-code error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});



router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  const emailNorm = String(email || "").trim().toLowerCase();
  
  if (!isValidEmail(emailNorm)) return res.status(400).json({ message: "Invalid email" });
  if (!isValidText(newPassword, 6)) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  if (!code || String(code).length !== 6) {
    return res.status(400).json({ message: "Invalid code" });
  }

  const user = await getUserByEmail(emailNorm);
  if (!user) return res.status(400).json({ message: "Invalid code or expired" });

  // ✅ use camelCase (like verify-email does)
  const expiresAt = user.passwordResetExpiresAt ?? user.password_reset_expires_at;
  const codeHash  = user.passwordResetCodeHash ?? user.password_reset_code_hash;

  if (!expiresAt || new Date(expiresAt) < new Date()) {
    return res.status(400).json({ message: "Invalid code or expired" });
  }

  const ok = await bcrypt.compare(String(code), codeHash || "");
  if (!ok) return res.status(400).json({ message: "Invalid code or expired" });

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await updateUserPassword(user.id, passwordHash);
  await clearPasswordReset(user.id);

  return res.status(200).json({ message: "Password updated successfully" });
});



router.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await getUserByEmail(email); // <-- MySQL

    if (!user) {
      return res.status(401).json({ message: 'Authentication failed.' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ message: "Email not verified." });
    }

    const passwordOk = await isValidPassword(password, user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Authentication failed.' });
    }

    const token = createJSONToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    res.json({ token });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed.' });
  }
});


module.exports = router;
