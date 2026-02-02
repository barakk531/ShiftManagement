const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail(to) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM, // "Your App <onboarding@resend.dev>"
    to,
    subject: "Resend test email",
    html: "<h2>If you see this, Resend works ✅</h2>",
    text: "If you see this, Resend works ✅",
  });
}

async function sendVerificationCodeEmail({ to, code, minutes = 5 }) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Email verification code",
    html: `
      <div style="font-family: Arial, sans-serif">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">
          ${code}
        </div>
        <p>Expires in ${minutes} minutes.</p>
      </div>
    `,
    text: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
  });
}



async function sendPasswordResetCodeEmail({ to, code, minutes }) {
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reset password",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Reset password</h2>
        <p>Use this 6-digit code to reset your password:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</div>
        <p>This code expires in ${minutes} minutes.</p>
      </div>
    `,
  });
}

module.exports = { sendTestEmail, sendVerificationCodeEmail, sendPasswordResetCodeEmail };
