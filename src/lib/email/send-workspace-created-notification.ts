import { sendEmail } from "@/lib/email/send-email";

type Input = {
  ownerEmail: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  businessName: string;
  website: string | null;
  phone: string | null;
  city: string;
  state: string | null;
  industryLabel: string | null;
};

function formatLocation(city: string, state: string | null) {
  if (city && state) return `${city}, ${state}`;
  return city || state || "Not specified";
}

function formatOwnerName(firstName: string | null, lastName: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName.length > 0 ? fullName : "Not specified";
}

export async function sendWorkspaceCreatedNotification(input: Input) {
  const recipients = [
    process.env.MARKETFORGE_NOTIFICATION_EMAIL ?? "marketforgelabs@gmail.com",
  ];

  const subject = `MarketForge Workspace Created: ${input.businessName}`;

  const text = [
    "A new MarketForge workspace has been created.",
    "",
    `Business: ${input.businessName}`,
    `Owner: ${formatOwnerName(input.ownerFirstName, input.ownerLastName)}`,
    `Owner email: ${input.ownerEmail ?? "Not specified"}`,
    `Industry: ${input.industryLabel ?? "Not specified"}`,
    `Location: ${formatLocation(input.city, input.state)}`,
    `Website: ${input.website ?? "Not specified"}`,
    `Phone: ${input.phone ?? "Not specified"}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">New MarketForge Workspace Created</h2>
      <p>A new MarketForge workspace has been created.</p>

      <table style="border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Business</td>
          <td style="padding: 6px 0;">${input.businessName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Owner</td>
          <td style="padding: 6px 0;">${formatOwnerName(
            input.ownerFirstName,
            input.ownerLastName
          )}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Owner email</td>
          <td style="padding: 6px 0;">${input.ownerEmail ?? "Not specified"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Industry</td>
          <td style="padding: 6px 0;">${input.industryLabel ?? "Not specified"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Location</td>
          <td style="padding: 6px 0;">${formatLocation(
            input.city,
            input.state
          )}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Website</td>
          <td style="padding: 6px 0;">${input.website ?? "Not specified"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Phone</td>
          <td style="padding: 6px 0;">${input.phone ?? "Not specified"}</td>
        </tr>
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