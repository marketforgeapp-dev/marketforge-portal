type SendEmailInput = {
  to: string[];
  subject: string;
  html: string;
  text: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from || to.length === 0) {
    console.warn("[email] Missing email config or recipients", {
      hasApiKey: Boolean(apiKey),
      hasFrom: Boolean(from),
      recipientCount: to.length,
    });
    return;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error: ${response.status} ${body}`);
  }
}