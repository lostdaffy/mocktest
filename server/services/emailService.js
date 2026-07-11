// Free email sending via Gmail SMTP. Setup (one-time, ₹0):
// 1. Use any Gmail account (or make a new one for this app, e.g. smarttestengine@gmail.com)
// 2. Enable 2-Step Verification: myaccount.google.com/security
// 3. Create an "App Password": myaccount.google.com/apppasswords
//    (choose "Mail" as the app) - this gives a 16-character password
// 4. Put that in .env as EMAIL_USER and EMAIL_APP_PASSWORD (NOT your normal Gmail password)
//
// Gmail's free sending limit is ~500 emails/day, which is plenty for
// password-reset emails at this stage.

const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

async function sendPasswordResetOTP(toEmail, otp, userName) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("EMAIL_USER/EMAIL_APP_PASSWORD not configured in .env");
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"Smart Test Engine" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Password Reset OTP - Smart Test Engine",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1053F3;">Password Reset</h2>
        <p>Namaste ${userName || ""},</p>
        <p>Aapka password reset OTP hai:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0F1729;">${otp}</p>
        <p>Ye OTP 15 minute ke liye valid hai. Agar aapne ye request nahi ki, is email ko ignore kar dijiye.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetOTP };