import type { PromptReadinessResult } from "@/app/campaigns/actions";

function buildNeedsInputResult(params: {
  title: string;
  message: string;
  requirements: string[];
  examplePrompt: string;
}): PromptReadinessResult {
  return {
    ready: false,
    title: params.title,
    message: params.message,
    requirements: params.requirements,
    examplePrompt: params.examplePrompt,
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function requestsFinalProposalTerms(prompt: string) {
  const lower = normalize(prompt);

  const proposalSignal =
    lower.includes("final proposal") ||
    lower.includes("ready-to-send proposal") ||
    lower.includes("ready to send proposal") ||
    lower.includes("contract proposal");

  const termSignal =
    lower.includes("price") ||
    lower.includes("pricing") ||
    lower.includes("scope") ||
    lower.includes("terms") ||
    /\$\s?\d/.test(prompt);

  return proposalSignal && termSignal;
}

function requestsUnsupportedCapabilityClaim(prompt: string) {
  const lower = normalize(prompt);

  const claimSignals = [
    "tell them we have",
    "say that we have",
    "claim that we have",
    "promise that we have",
    "guarantee that we have",
  ];

  const capabilitySignals = [
    "24/7",
    "24-7",
    "licensed for",
    "insured for",
    "hospital experience",
    "high-rise experience",
    "government approved",
    "approved vendor",
  ];

  return (
    claimSignals.some((signal) => lower.includes(signal)) &&
    capabilitySignals.some((signal) => lower.includes(signal))
  );
}

/**
 * Commercial readiness protects truthfulness without requiring
 * the owner to already know every later-stage sales detail.
 *
 * Broad account-acquisition, named-account, recurring-revenue,
 * and incumbent-displacement requests are intentionally allowed
 * to proceed.
 */
export function resolveCommercialPromptReadiness(
  prompt: string
): PromptReadinessResult {
  const cleanedPrompt = prompt.trim();

  if (cleanedPrompt.length < 10) {
    return buildNeedsInputResult({
      title: "Add more detail to your commercial request",
      message:
        "MarketForge needs a clearer commercial business objective before it can build the account pursuit.",
      requirements: [
        "Describe the type of commercial account, organization, relationship, or revenue outcome you want.",
      ],
      examplePrompt:
        "Help me win apartment communities and recurring property-management work.",
    });
  }

  if (requestsUnsupportedCapabilityClaim(cleanedPrompt)) {
    return buildNeedsInputResult({
      title: "Confirm the commercial capability before using it",
      message:
        "MarketForge cannot present an operational capability, credential, or vendor status as fact unless the business confirms it.",
      requirements: [
        "Confirm the exact capability or credential the business can support.",
        "Remove any claim that cannot be verified by the business.",
      ],
      examplePrompt:
        "Help us pursue hospital plumbing accounts. Include an owner-input placeholder for our verified emergency coverage, insurance, licensing, and healthcare references.",
    });
  }

  if (requestsFinalProposalTerms(cleanedPrompt)) {
    return buildNeedsInputResult({
      title: "Separate the pursuit package from the final commercial terms",
      message:
        "MarketForge can generate the complete proposal framework now, but final scope, pricing, and contractual commitments must come from the business or the account discovery process.",
      requirements: [
        "Ask MarketForge to generate the full proposal with owner-input placeholders, or provide the approved final scope and pricing terms.",
      ],
      examplePrompt:
        "Create the complete pursuit and proposal package for a 300-unit apartment community. Leave clearly labeled owner-input sections for final scope, pricing, service levels, and contract terms.",
    });
  }

  return {
    ready: true,
  };
}