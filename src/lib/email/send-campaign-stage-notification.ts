import { sendEmail } from "@/lib/email/send-email";

type CampaignStage = "SCHEDULED" | "LAUNCHED" | "COMPLETED";

type Input = {
  stage: CampaignStage;
  businessName: string;
  businessEmail: string | null;
  campaignName: string;
  targetService: string | null;
  launchOwner: string | null;
  scheduledLaunchDate: string | null;
};

function uniqueEmails(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function stageLabel(stage: CampaignStage) {
  if (stage === "SCHEDULED") return "Queued";
  if (stage === "LAUNCHED") return "Launched";
  return "Completed";
}

function stageSummary(stage: CampaignStage) {
  if (stage === "SCHEDULED") {
    return "A MarketForge action has moved into the queue for launch.";
  }

  if (stage === "LAUNCHED") {
    return "A MarketForge action has been marked as launched.";
  }

  return "A MarketForge action has been marked as completed.";
}

export async function sendCampaignStageNotification(input: Input) {
  const marketForgeEmail =
    process.env.MARKETFORGE_NOTIFICATION_EMAIL ?? "marketforgelabs@gmail.com";

  const recipients = uniqueEmails([marketForgeEmail, input.businessEmail]);

  if (recipients.length === 0) {
    return;
  }

  const status = stageLabel(input.stage);
  const summary = stageSummary(input.stage);
  const subject = `MarketForge ${status}: ${input.businessName} — ${input.campaignName}`;

  const text = [
    summary,
    "",
    `Business: ${input.businessName}`,
    `Campaign: ${input.campaignName}`,
    `Stage: ${status}`,
    `Target service: ${input.targetService ?? "Not specified"}`,
    `Launch owner: ${input.launchOwner ?? "Not specified"}`,
    `Scheduled launch date: ${input.scheduledLaunchDate ?? "Not specified"}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">MarketForge Campaign Update</h2>
      <p>${summary}</p>

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
          <td style="padding: 6px 0;">${status}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Target service</td>
          <td style="padding: 6px 0;">${input.targetService ?? "Not specified"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Launch owner</td>
          <td style="padding: 6px 0;">${input.launchOwner ?? "Not specified"}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px 6px 0; font-weight: 700;">Scheduled launch date</td>
          <td style="padding: 6px 0;">${input.scheduledLaunchDate ?? "Not specified"}</td>
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