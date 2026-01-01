import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

export async function sendVerificationEmail(input: { to: string; verifyUrl: string }) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("Missing EMAIL_FROM");

  const resend = getResend();

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject: "Verify your email",
    html: `<p>Verify: <a href="${input.verifyUrl}">Click here</a></p>`,
  });

  console.log("RESEND_SEND_RESULT:", result); // ✅ add this
}
