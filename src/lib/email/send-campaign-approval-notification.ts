import { sendEmail } from "@/lib/email/send-email";

type Input = {
  businessName: string;
  campaignName: string;
  targetService: string | null;
};

export async function sendCampaignApprovalNotification(input: Input) {
  const recipients = [
    process.env.MARKETFORGE_NOTIFICATION_EMAIL ?? "marketforgelabs@gmail.com",
  ];

  const subject = `MarketForge Approval: ${input.businessName} — ${input.campaignName}`;

  const text = [
    "A user has approved a MarketForge action.",
    "",
    `Business: ${input.businessName}`,
    `Campaign: ${input.campaignName}`,
    `Stage: Approved`,
    `Target service: ${input.targetService ?? "Not specified"}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">MarketForge Action Approved</h2>
      <p>A user has approved a MarketForge action.</p>

      <table style="border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Business</td>
          <td style="padding: 6px 0;">${input.businessName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Campaign</td>
          <td style="padding: 6px 0;">${input.campaignName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Stage</td>
          <td style="padding: 6px 0;">Approved</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Target service</td>
          <td style="padding: 6px 0;">${input.targetService ?? "Not specified"}</td>
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