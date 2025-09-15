import { Resend } from "resend";

export async function sendMail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    (process.env.MAIL_FROM && process.env.MAIL_FROM.trim()) ||
    "Acme <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("[MAILER] RESEND_API_KEY not set. Email not sent.");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("From:", from);
    console.log("HTML:\n", html);
    return { mocked: true };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[RESEND] send error", { error, to, from, subject });
      throw new Error(error.message || "Failed to send email via Resend");
    }
    return { id: data?.id };
  } catch (err) {
    console.error("[RESEND] exception", err);
    throw err;
  }
}
