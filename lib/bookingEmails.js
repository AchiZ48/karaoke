import { sendMail } from "./mailer";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "Pending";
  return `THB ${numeric.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function getBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function buildBookingHtml(booking, { isUpdate }) {
  const customerName = escapeHtml(booking.customerName || "there");
  const heading = isUpdate
    ? "Your booking has been updated"
    : "Thank you for your booking";
  const intro = isUpdate
    ? "Here are the latest details for your booking."
    : "Here are the details of your booking.";
  const dateText = escapeHtml(formatDate(booking.date));
  const timeSlotText = escapeHtml(booking.timeSlot || "To be scheduled");
  const roomName = escapeHtml(booking.room?.name || "");
  const roomNumber = escapeHtml(booking.room?.number || "");
  const roomType = escapeHtml(booking.room?.type || "");
  const people = escapeHtml(String(booking.numberOfPeople ?? ""));
  const paymentMethod = escapeHtml(booking.paymentMethod || "");
  const total = escapeHtml(formatCurrency(booking.totalAmount));
  const promotionCode = booking.promotionCode
    ? escapeHtml(booking.promotionCode)
    : "";
  const bookingId = escapeHtml(booking.bookingId || "");
  const baseUrl = getBaseUrl();
  const viewPath = booking.userId ? "/my-bookings" : "/admin";
  const viewUrl = `${baseUrl}${viewPath}`;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="color: #4b0082;">${heading}</h2>
      <p>Hi ${customerName},</p>
      <p>${intro}</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 520px;">
        <tbody>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Booking ID</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Date</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${dateText}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Time slot</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${timeSlotText}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Room</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${roomName} (${roomNumber})${
              roomType ? ` — ${roomType}` : ""
            }</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Guests</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${people}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Payment method</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${paymentMethod}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Total</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${total}</td>
          </tr>
          ${
            promotionCode
              ? `<tr>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb; font-weight: 600;">Promotion</td>
            <td style="padding: 6px 10px; border: 1px solid #e5e7eb;">${promotionCode}</td>
          </tr>`
              : ""
          }
        </tbody>
      </table>
      <p style="margin-top: 16px;">You can view the booking status any time at <a href="${viewUrl}">${viewUrl}</a>.</p>
      <p>If you have questions, just reply to this email.</p>
      <p>Regards,<br/>BorntoSing Team</p>
    </div>
  `;
}

export async function sendBookingConfirmationEmail(
  bookingInput,
  { isUpdate = false } = {},
) {
  if (!bookingInput) return;
  const booking =
    typeof bookingInput.toObject === "function"
      ? bookingInput.toObject({ getters: false, virtuals: false })
      : { ...bookingInput };
  const email = booking.customerEmail;
  if (!email) return;
  const subject = isUpdate
    ? `Booking ${booking.bookingId || "update"} updated`
    : `Booking ${booking.bookingId || "confirmation"} confirmed`;
  const html = buildBookingHtml(booking, { isUpdate });
  try {
    await sendMail({ to: email, subject, html });
  } catch (err) {
    console.error("[MAILER] Failed to send booking email", err);
  }
}
