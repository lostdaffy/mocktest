// Password-reset emails via Gmail SMTP. Free, and no domain DNS changes
// needed (rankveer.com's DNS is still locked at the registrar, so a
// provider that requires SPF/DKIM records on our own domain isn't possible
// yet).
//
// SETUP (one-time, ₹0):
//   1. Create a Gmail account for the app (e.g. rankveer.help@gmail.com)
//   2. Turn on 2-Step Verification: myaccount.google.com/security
//   3. Create an App Password: myaccount.google.com/apppasswords
//      - this gives a 16-character password
//   4. In Render -> Environment, set:
//        EMAIL_USER=rankveer.help@gmail.com
//        EMAIL_APP_PASSWORD=<the 16-character app password, no spaces>
//
// LIMIT TO KNOW ABOUT: a personal Gmail account can send roughly 500
// emails a day. Only password resets send email, so that's plenty at
// launch - but once resets regularly approach that, move to a transactional
// provider (Amazon SES / Brevo / Resend) on a rankveer.com address, which
// needs the domain's DNS to be editable first.

const nodemailer = require("nodemailer");

let transporter = null;

function isEmailConfigured() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);
}

// One pooled connection reused across requests, instead of opening a fresh
// SMTP connection (and TLS handshake) for every email.
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      pool: true,
      maxConnections: 3,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

const escapeHtml = (s) =>
  String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Sends a password-reset code.
//
// The email deliberately does NOT mention the account's phone number. If a
// student mistyped their email at signup, the code lands with a stranger -
// but resetting also requires the account's phone number, which that
// stranger never sees, so the code is useless to them.
async function sendPasswordResetCode(toEmail, code, userName) {
  if (!isEmailConfigured()) {
    throw new Error("EMAIL_USER / EMAIL_APP_PASSWORD not configured on the server");
  }

  const firstName = escapeHtml(String(userName || "").trim().split(/\s+/)[0]);

  await getTransporter().sendMail({
    from: `"Rankveer" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `${code} is your Rankveer password reset code`,
    text:
      `Namaste${firstName ? " " + firstName : ""},\n\n` +
      `Your Rankveer password reset code is: ${code}\n\n` +
      `It is valid for 15 minutes. Don't share it with anyone - Rankveer will never ask you for it.\n\n` +
      `If you didn't ask to reset your password, you can ignore this email. Your password won't change.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#101936">
        <h2 style="margin:0 0 16px;color:#4F46E5">Reset your password</h2>
        <p style="margin:0 0 12px">Namaste${firstName ? " " + firstName : ""},</p>
        <p style="margin:0 0 12px">Your Rankveer password reset code is:</p>
        <p style="margin:0 0 16px;font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
        <p style="margin:0 0 12px;color:#5F6B85">It is valid for 15 minutes. Don't share it with anyone — Rankveer will never ask you for it.</p>
        <p style="margin:0;color:#5F6B85">If you didn't ask to reset your password, you can ignore this email. Your password won't change.</p>
      </div>
    `,
  });
}

module.exports = { isEmailConfigured, sendPasswordResetCode };
