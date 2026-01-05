import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) throw new Error("Missing SMTP_HOST");
  if (!user) throw new Error("Missing SMTP_USER");
  if (!pass) throw new Error("Missing SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendVerificationEmail(input: {
  to: string;
  verifyUrl: string;
}) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("Missing EMAIL_FROM");

  const transporter = getTransport();

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject: "Verify your email",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5">
        <h2>Verify your email</h2>
        <p>Click below to verify your email address:</p>
        <p><a href="${input.verifyUrl}">Verify Email</a></p>
        <p>If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });

  console.log("NODEMAILER_SEND_RESULT:", {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  });
}
