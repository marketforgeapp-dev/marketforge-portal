import { openai } from "@/lib/openai";
import type { ResidentialOwnerObjective } from "@/lib/action-spec";

export async function refineTargetingWithAI(params: {
  ownerObjective: ResidentialOwnerObjective;
  service: string;
  serviceArea: string;
  demandType: string;
  intentLevel: string;
  jobValueTier: string;
  existingKeywordThemes: string[];
  existingNegativeKeywords: string[];
  promotionalContext?: unknown;
}) {
  const prompt = `
You are a senior paid media strategist.

You specialize in LOCAL SERVICE businesses (plumbing, HVAC, tree service, septic).

Your job is to REFINE targeting — not expand it broadly.

---

STRICT RULES:

- For STANDARD_SERVICE_GROWTH, keep keyword themes high-intent.
- For COMPETITIVE_ACQUISITION, keep targeting service-first and use truthful provider-comparison context only.
- For POSITIONING_TRUST, keep targeting service-first and do not create unsupported superiority language.
- Do not create competitor attack keywords or competitor-name conquest keywords unless explicitly supplied and operationally approved.
- Do NOT create awkward or unnatural phrases
- Do NOT repeat words (e.g. "repair repair")
- Do NOT mix unrelated concepts
- Keep keywords SHORT (2–4 words max when possible)
- Maintain CLEAN structure
- If promotional context includes a verified or user-requested brand/product, you may include 1–2 clean keyword themes using that brand/product.
- Do NOT invent rebate values, financing terms, APRs, eligibility rules, or expiration dates.
- If promotional context is unverified, keep targeting aligned to the brand/product/service but avoid exact incentive claims.

---

INPUT:
Owner Objective: ${params.ownerObjective}
Service: ${params.service}
Location: ${params.serviceArea}
Demand Type: ${params.demandType}
Intent Level: ${params.intentLevel}
Job Value Tier: ${params.jobValueTier}

Existing Keyword Themes:
${params.existingKeywordThemes.join(", ")}

Existing Negative Keywords:
${params.existingNegativeKeywords.join(", ")}

Promotional Context:
${JSON.stringify(params.promotionalContext ?? null, null, 2)}

---

TASK:

1. Refine keyword themes into clean, realistic Google Ads-style phrases
2. Add ONLY 2–3 strong variations max
3. Keep consistent structure (no messy phrasing)
4. Improve negative keywords with REAL commercial exclusions
5. Suggest Meta targeting notes ONLY if useful

---

RETURN JSON ONLY:

{
  "keywordThemes": string[],
  "negativeKeywords": string[],
  "metaNotes": string[],
  "refinementNotes": string[]
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  try {
    const content = response.choices[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch {
    return null;
  }
}