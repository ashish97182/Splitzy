import nodemailer from "nodemailer";
import { config } from "dotenv";

// Load environment variables
config();
const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (match) => {
    const escapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return escapeMap[match] || match;
  });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.EMAIL_USER,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email server:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Generic sender function
export const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Splitzy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// 1. Registration email
export async function sendRegisteredEmail(userEmail, name) {
  const subject = "Welcome to SPLITZY!";
  const text = `Hello ${name},\n\nThank you for registering with Splitzy. We are excited to have you on board!`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2>Welcome to SPLITZY, ${name}!</h2>
      <p>Thank you for registering. Your account is now active.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    </div>
  `;

  return await sendEmail(userEmail, subject, text, html);
}

//2 sendgroup invite email
export async function sendGroupInviteEmail(userEmail, rawName, rawGroupName, rawInviterName) {
  const name = escapeHtml(rawName);
  const groupName = escapeHtml(rawGroupName);
  const inviterName = escapeHtml(rawInviterName);

  const subject = `You've been added to "${rawGroupName}" on Splitzy! 💸`;
  const text = `Hi ${rawName},\n\n${rawInviterName} added you to the group "${rawGroupName}" on Splitzy.\nLog in to start logging shared expenses and balances.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #4F46E5; margin-top: 0;">You've been added to a group!</h2>
      <p>Hi <strong>${name}</strong>,</p>
      <p><strong>${inviterName}</strong> added you to the group <strong style="color: #111;">${groupName}</strong> on Splitzy.</p>
      <p style="margin: 24px 0;">
        You can now view group expenses, split bills, and track who owes what.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 13px; color: #777;">
        Log into your Splitzy account to view the group ledger.
      </p>
    </div>
  `;

  return sendEmail(userEmail, subject, text, html);
}
