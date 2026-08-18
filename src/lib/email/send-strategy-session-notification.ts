import { sendEmail } from "@/lib/email/send-email";

type Input = {
  name: string;
  email: string;
  phone: string | null;
  businessName: string;
  website: string;
  availability: string | null;
  leadId: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(value: string | null) {
  return value && value.trim().length > 0
    ? value.trim()
    : "Not specified";
}

export async function sendStrategySessionNotification(
  input: Input,
) {
  const recipients = [
    process.env.MARKETFORGE_NOTIFICATION_EMAIL ??
      "marketforgelabs@gmail.com",
  ];

  const subject =
    `New MarketForge Strategy Session: ${input.businessName}`;

  const text = [
    "A new Growth Strategy Session has been requested.",
    "",
    `Business: ${input.businessName}`,
    `Website: ${input.website}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${display(input.phone)}`,
    `Availability: ${display(input.availability)}`,
    `Strategy Session Lead ID: ${input.leadId}`,
  ].join("\n");

  const rows = [
    ["Business", input.businessName],
    ["Website", input.website],
    ["Name", input.name],
    ["Email", input.email],
    ["Phone", display(input.phone)],
    ["Availability", display(input.availability)],
    ["Lead ID", input.leadId],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 6px 16px 6px 0; font-weight: 700; vertical-align: top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 6px 0;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `,
    )
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">
        New MarketForge Growth Strategy Session
      </h2>

      <p>
        A new Growth Strategy Session has been requested.
      </p>

      <table style="border-collapse: collapse; margin-top: 12px;">
        ${rows}
      </table>
    </div>
  `;

  await sendEmail({
    to: recipients,
    subject,
    html,
    text,
  });
}