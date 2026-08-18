import { prisma } from "@/lib/prisma";
import {
  getWebsiteDomain,
  normalizeBusinessName,
} from "@/lib/public-site/strategy-session";

type StrategySessionConversionInput = {
  workspaceId: string;
  workspaceCreatedAt: Date;
  isDemo: boolean;
  businessName: string;
  website: string | null;
  ownerEmail?: string | null;
};

type StrategySessionConversionResult =
  | {
      matched: true;
      leadId: string;
      matchType: "AUTO_DOMAIN_AND_NAME" | "AUTO_DOMAIN";
    }
  | {
      matched: false;
      reason:
        | "demo-workspace"
        | "missing-website"
        | "invalid-website"
        | "no-candidate"
        | "ambiguous-domain"
        | "already-linked";
    };

function normalizeEmail(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  return normalized.length > 0 ? normalized : null;
}

function getEffectiveLeadDate(lead: {
  requestedAt: Date;
  sessionAt: Date | null;
}) {
  return lead.sessionAt ?? lead.requestedAt;
}

export async function attributeStrategySessionConversion(
  input: StrategySessionConversionInput,
): Promise<StrategySessionConversionResult> {
  if (input.isDemo) {
    return {
      matched: false,
      reason: "demo-workspace",
    };
  }

  if (!input.website) {
    return {
      matched: false,
      reason: "missing-website",
    };
  }

  let websiteDomain: string;

  try {
    websiteDomain = getWebsiteDomain(input.website);
  } catch {
    return {
      matched: false,
      reason: "invalid-website",
    };
  }

  const normalizedBusinessName = normalizeBusinessName(
    input.businessName,
  );
  const normalizedOwnerEmail = normalizeEmail(input.ownerEmail);

  const existingWorkspaceLink =
    await prisma.strategySessionLead.findUnique({
      where: {
        convertedWorkspaceId: input.workspaceId,
      },
      select: {
        id: true,
      },
    });

  if (existingWorkspaceLink) {
    return {
      matched: false,
      reason: "already-linked",
    };
  }

  const candidates = await prisma.strategySessionLead.findMany({
    where: {
      convertedWorkspaceId: null,
      websiteDomain,
      status: {
        notIn: ["CONVERTED", "CLOSED"],
      },
      OR: [
        {
          sessionAt: {
            not: null,
            lte: input.workspaceCreatedAt,
          },
        },
        {
          sessionAt: null,
          requestedAt: {
            lte: input.workspaceCreatedAt,
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      normalizedBusinessName: true,
      requestedAt: true,
      sessionAt: true,
    },
  });

  if (candidates.length === 0) {
    return {
      matched: false,
      reason: "no-candidate",
    };
  }

  const sortedCandidates = [...candidates].sort(
    (left, right) =>
      getEffectiveLeadDate(right).getTime() -
      getEffectiveLeadDate(left).getTime(),
  );

  const exactBusinessMatches = sortedCandidates.filter(
    (candidate) =>
      candidate.normalizedBusinessName === normalizedBusinessName,
  );

  let selectedLead:
    | (typeof sortedCandidates)[number]
    | null = null;

  let matchType:
    | "AUTO_DOMAIN_AND_NAME"
    | "AUTO_DOMAIN"
    | null = null;

  if (exactBusinessMatches.length > 0) {
    selectedLead = exactBusinessMatches[0];
    matchType = "AUTO_DOMAIN_AND_NAME";
  } else if (sortedCandidates.length === 1) {
    selectedLead = sortedCandidates[0];
    matchType = "AUTO_DOMAIN";
  } else if (normalizedOwnerEmail) {
    const emailMatches = sortedCandidates.filter(
      (candidate) =>
        normalizeEmail(candidate.email) === normalizedOwnerEmail,
    );

    if (emailMatches.length === 1) {
      selectedLead = emailMatches[0];
      matchType = "AUTO_DOMAIN";
    }
  }

  if (!selectedLead || !matchType) {
    return {
      matched: false,
      reason: "ambiguous-domain",
    };
  }

  const convertedAt = new Date();

  const result = await prisma.strategySessionLead.updateMany({
    where: {
      id: selectedLead.id,
      convertedWorkspaceId: null,
      status: {
        notIn: ["CONVERTED", "CLOSED"],
      },
    },
    data: {
      convertedWorkspaceId: input.workspaceId,
      convertedAt,
      conversionMatchType: matchType,
      status: "CONVERTED",
    },
  });

  if (result.count !== 1) {
    return {
      matched: false,
      reason: "already-linked",
    };
  }

  return {
    matched: true,
    leadId: selectedLead.id,
    matchType,
  };
}