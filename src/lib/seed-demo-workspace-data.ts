import { prisma } from "@/lib/prisma";

async function upsertCompetitor(
  workspaceId: string,
  data: {
    name: string;
    websiteUrl?: string | null;
    logoUrl?: string | null;
    googleBusinessUrl?: string | null;
    notes?: string | null;
    serviceFocus: string[];
    rating?: number | null;
    reviewCount?: number | null;
    isPrimaryCompetitor?: boolean;
    isRunningAds?: boolean | null;
    isPostingActively?: boolean | null;
    hasActivePromo?: boolean | null;
    reviewVelocity?: string | null;
    signalSummary?: string | null;
  }
) {
  const existing = await prisma.competitor.findFirst({
    where: {
      workspaceId,
      name: data.name,
    },
  });

  if (existing) {
    return prisma.competitor.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.competitor.create({
    data: {
      workspaceId,
      ...data,
    },
  });
}

async function upsertIntelligenceAlert(
  workspaceId: string,
  data: {
    title: string;
    description: string;
    alertType:
      | "COMPETITOR_PROMO"
      | "COMPETITOR_INACTIVE"
      | "SEARCH_DEMAND_SPIKE"
      | "REVIEW_CHANGE"
      | "AEO_OPPORTUNITY"
      | "UNDERUTILIZED_SCHEDULE"
      | "SEASONAL_SHIFT";
    source?:
      | "COMPETITOR"
      | "DEMAND_MODEL"
      | "AEO_MODEL"
      | "CAPACITY_MODEL"
      | "MANUAL"
      | null;
    severity?: "LOW" | "MEDIUM" | "HIGH" | null;
    recommendedAction?: string | null;
    isRead?: boolean;
  }
) {
  const existing = await prisma.intelligenceAlert.findFirst({
    where: {
      workspaceId,
      title: data.title,
    },
  });

  if (existing) {
    return prisma.intelligenceAlert.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.intelligenceAlert.create({
    data: {
      workspaceId,
      ...data,
    },
  });
}

async function upsertRevenueOpportunity(
  workspaceId: string,
  data: {
    title: string;
    description?: string | null;
    opportunityType:
      | "SEASONAL_DEMAND"
      | "COMPETITOR_INACTIVE"
      | "CAPACITY_GAP"
      | "HIGH_VALUE_SERVICE"
      | "AI_SEARCH_VISIBILITY"
      | "REVIEW_SENTIMENT_SHIFT"
      | "LOCAL_SEARCH_SPIKE";
    whyNow: string[];
    priorityScore?: number | null;
    estimatedRevenueMin?: number | null;
    estimatedRevenueMax?: number | null;
    estimatedBookedJobsMin?: number | null;
    estimatedBookedJobsMax?: number | null;
    confidence?: "LOW" | "MEDIUM" | "HIGH" | null;
    capacityFit?: "LOW" | "MEDIUM" | "HIGH" | null;
    recommendedCampaignType?:
      | "DRAIN_SPECIAL"
      | "WATER_HEATER"
      | "MAINTENANCE_PUSH"
      | "REVIEW_GENERATION"
      | "EMERGENCY_SERVICE"
      | "SEO_CONTENT"
      | "AEO_FAQ"
      | "CUSTOM"
      | null;
    isActive?: boolean;
  }
) {
  const existing = await prisma.revenueOpportunity.findFirst({
    where: {
      workspaceId,
      title: data.title,
    },
  });

  if (existing) {
    return prisma.revenueOpportunity.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.revenueOpportunity.create({
    data: {
      workspaceId,
      ...data,
    },
  });
}

async function upsertRecommendation(
  workspaceId: string,
  data: {
    title: string;
    description?: string | null;
    campaignType:
      | "DRAIN_SPECIAL"
      | "WATER_HEATER"
      | "MAINTENANCE_PUSH"
      | "REVIEW_GENERATION"
      | "EMERGENCY_SERVICE"
      | "SEO_CONTENT"
      | "AEO_FAQ"
      | "CUSTOM";
    score: number;
    whyNow: string[];
    estimatedLeadsMin?: number | null;
    estimatedLeadsMax?: number | null;
    estimatedBookedJobsMin?: number | null;
    estimatedBookedJobsMax?: number | null;
    estimatedRevenueMin?: number | null;
    estimatedRevenueMax?: number | null;
    capacityFit?: "LOW" | "MEDIUM" | "HIGH" | null;
    campaignObjective?:
      | "FILL_OPEN_SCHEDULE"
      | "PUSH_HIGHER_TICKET_JOBS"
      | "DEFEND_AGAINST_COMPETITOR"
      | "IMPROVE_AI_SEARCH_VISIBILITY"
      | "INCREASE_REVIEWS"
      | "CAPTURE_SEASONAL_DEMAND"
      | null;
    isLaunched?: boolean;
  }
) {
  const existing = await prisma.recommendation.findFirst({
    where: {
      workspaceId,
      title: data.title,
    },
  });

  if (existing) {
    return prisma.recommendation.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.recommendation.create({
    data: {
      workspaceId,
      ...data,
    },
  });
}

export async function seedDemoWorkspaceData(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      businessProfile: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found for demo seed.");
  }

  if (!workspace.isDemo) {
    throw new Error("Refusing to seed demo data into a non-demo workspace.");
  }

  if (workspace.businessProfile) {
    await prisma.businessProfile.update({
      where: { workspaceId },
      data: {
        businessName: "BluePeak Plumbing",
        website: "https://www.bluepeakplumbing.com",
        logoUrl:
          "https://bluepeakmechanical.com/wp-content/uploads/2025/12/colored-mini-black.png",
        phone: "(770) 555-0148",
        city: "Jasper",
        state: "GA",
        serviceArea:
          "Jasper, Canton, Woodstock, Ball Ground, Cumming, Milton, Alpharetta, Dawsonville",
        serviceAreaRadiusMiles: 30,
        industryLabel: "PLUMBING",
        brandTone: "PROFESSIONAL",

        averageJobValue: 475,
        highestMarginService: "Water Heater Replacement",
        lowestPriorityService: "Very small fixture repairs",

        technicians: 4,
        jobsPerTechnicianPerDay: 3,
        weeklyCapacity: 48,
        targetBookedJobsPerWeek: 36,
        targetWeeklyRevenue: 17100,

        preferredServices: [
          "Water heater replacement",
          "Leak detection",
          "Pipe repair",
          "Preventative plumbing maintenance",
          "Drain cleaning",
        ],
        deprioritizedServices: [
          "Very small fixture repairs",
          "Low-ticket handyman-style plumbing requests",
        ],

        busyMonths: ["November", "December", "January", "February"],
        slowMonths: ["August", "September"],
        seasonalityNotes:
          "Winter tends to drive pipe, water heater, and urgent plumbing demand. Late summer tends to be softer.",

        googleBusinessProfileUrl:
          "https://maps.google.com/?cid=bluepeak-plumbing-demo",
        servicePageUrls: [
          "https://www.bluepeakplumbing.com/drain-cleaning",
          "https://www.bluepeakplumbing.com/water-heaters",
          "https://www.bluepeakplumbing.com/leak-detection",
          "https://www.bluepeakplumbing.com/pipe-repair",
          "https://www.bluepeakplumbing.com/plumbing-maintenance",
          "https://www.bluepeakplumbing.com/emergency-plumber",
        ],
        hasServicePages: true,
        hasFaqContent: false,
        hasBlog: true,
        hasGoogleBusinessPage: true,
        aeoReadinessScore: 61,
      },
    });
  } else {
    await prisma.businessProfile.create({
      data: {
        workspaceId,
        businessName: "BluePeak Plumbing",
        website: "https://www.bluepeakplumbing.com",
        logoUrl:
          "https://bluepeakmechanical.com/wp-content/uploads/2025/12/colored-mini-black.png",
        phone: "(770) 555-0148",
        city: "Jasper",
        state: "GA",
        serviceArea:
          "Jasper, Canton, Woodstock, Ball Ground, Cumming, Milton, Alpharetta, Dawsonville",
        serviceAreaRadiusMiles: 30,
        industryLabel: "PLUMBING",
        brandTone: "PROFESSIONAL",

        averageJobValue: 475,
        highestMarginService: "Water Heater Replacement",
        lowestPriorityService: "Very small fixture repairs",

        technicians: 4,
        jobsPerTechnicianPerDay: 3,
        weeklyCapacity: 48,
        targetBookedJobsPerWeek: 36,
        targetWeeklyRevenue: 17100,

        preferredServices: [
          "Water heater replacement",
          "Leak detection",
          "Pipe repair",
          "Preventative plumbing maintenance",
          "Drain cleaning",
        ],
        deprioritizedServices: [
          "Very small fixture repairs",
          "Low-ticket handyman-style plumbing requests",
        ],

        busySeason: "Winter",
        slowSeason: "Late Summer",
        busyMonths: ["November", "December", "January", "February"],
        slowMonths: ["August", "September"],
        seasonalityNotes:
          "Winter tends to drive pipe, water heater, and urgent plumbing demand. Late summer tends to be softer.",

        googleBusinessProfileUrl:
          "https://maps.google.com/?cid=bluepeak-plumbing-demo",
        servicePageUrls: [
          "https://www.bluepeakplumbing.com/drain-cleaning",
          "https://www.bluepeakplumbing.com/water-heaters",
          "https://www.bluepeakplumbing.com/leak-detection",
          "https://www.bluepeakplumbing.com/pipe-repair",
          "https://www.bluepeakplumbing.com/plumbing-maintenance",
          "https://www.bluepeakplumbing.com/emergency-plumber",
        ],
        hasServicePages: true,
        hasFaqContent: false,
        hasBlog: true,
        hasGoogleBusinessPage: true,
        aeoReadinessScore: 61,
      },
    });
  }

  await upsertCompetitor(workspaceId, {
    name: "Masterflo Plumbing",
    websiteUrl: "https://www.masterfloplumbing.com",
    logoUrl:
      "https://masterfloplumbing.com/wp-content/uploads/2023/06/Plumbers-Near-Canton-Georgia.png",
    googleBusinessUrl: "",
    notes:
      "Recognizable local competitor in the Jasper market. Useful benchmark for local reputation and steady plumbing service messaging.",
    serviceFocus: [
      "Water heaters",
      "Drain issues",
      "General plumbing",
      "Maintenance",
    ],
    rating: 4.8,
    reviewCount: 167,
    isPrimaryCompetitor: true,
    isRunningAds: true,
    isPostingActively: true,
    hasActivePromo: false,
    reviewVelocity: "increasing",
    signalSummary:
      "Strong local trust and steady market presence; likely winning on reputation and consistency.",
  });

  await upsertCompetitor(workspaceId, {
    name: "Superior Plumbing",
    websiteUrl: "https://www.superiorplumbing.com",
    logoUrl:
      "https://lirp.cdn-website.com/17a155d8/dms3rep/multi/opt/LOGO-56168f3a-ee54f996-1920w.png",
    googleBusinessUrl: "",
    notes:
      "Large Atlanta-area plumbing competitor with broad metro visibility. Important benchmark for scale, SEO presence, and paid search visibility.",
    serviceFocus: [
      "Emergency plumbing",
      "Drain cleaning",
      "Water heaters",
      "Sewer and pipe repair",
      "General plumbing",
    ],
    rating: 4.7,
    reviewCount: 950,
    isPrimaryCompetitor: false,
    isRunningAds: true,
    isPostingActively: true,
    hasActivePromo: true,
    reviewVelocity: "steady",
    signalSummary:
      "Large-scale metro competitor with broad service coverage and likely strong paid and organic visibility.",
  });

  await upsertCompetitor(workspaceId, {
    name: "North Georgia Rooter Pros",
    websiteUrl: "https://www.ngrooterpros.com",
    logoUrl:
      "https://northgeorgiarooter.com/wp-content/uploads/2025/02/dbeb8ad5-2561-4c49-99de-62dbae8880bc.png",
    googleBusinessUrl: "",
    notes:
      "Urgency-focused competitor more concentrated on drain and sewer issues.",
    serviceFocus: ["Drain cleaning", "Sewer line issues", "Emergency plumbing"],
    rating: 4.5,
    reviewCount: 94,
    isPrimaryCompetitor: false,
    isRunningAds: true,
    isPostingActively: false,
    hasActivePromo: true,
    reviewVelocity: "flat",
    signalSummary: "Heavy urgency positioning and promo-based acquisition.",
  });

  await upsertCompetitor(workspaceId, {
    name: "Canton FlowWorks Plumbing",
    websiteUrl: "https://www.cantonflowworks.com",
    googleBusinessUrl: "",
    notes:
      "Suburban family-home focused competitor with consistent local content activity.",
    serviceFocus: ["General plumbing", "Maintenance", "Leak repair"],
    rating: 4.6,
    reviewCount: 122,
    isPrimaryCompetitor: false,
    isRunningAds: false,
    isPostingActively: true,
    hasActivePromo: false,
    reviewVelocity: "steady",
    signalSummary:
      "Consistent local content presence, weaker paid acquisition footprint.",
  });

  await upsertCompetitor(workspaceId, {
    name: "Summit Water Heater & Plumbing",
    websiteUrl: "https://www.summitwaterheaterplumbing.com",
    logoUrl:
      "https://s3-media0.fl.yelpcdn.com/bphoto/RwrG3Ejm4P8u6zVFHBSKFQ/l.jpg",
    googleBusinessUrl: "",
    notes:
      "Important high-ticket competitor focused on water heater replacement and repair.",
    serviceFocus: ["Water heater replacement", "Tankless systems", "Repairs"],
    rating: 4.7,
    reviewCount: 88,
    isPrimaryCompetitor: false,
    isRunningAds: true,
    isPostingActively: true,
    hasActivePromo: true,
    reviewVelocity: "increasing",
    signalSummary: "Strong focus on higher-ticket water heater work.",
  });

  await upsertIntelligenceAlert(workspaceId, {
    title: "Drain demand rising across North Atlanta",
    description:
      "Search and service interest for drain-related plumbing issues appears elevated this week.",
    alertType: "SEARCH_DEMAND_SPIKE",
    source: "DEMAND_MODEL",
    severity: "HIGH",
    recommendedAction: "Launch Drain Cleaning Special",
    isRead: false,
  });

  await upsertIntelligenceAlert(workspaceId, {
    title: "Masterflo maintaining strong local visibility",
    description:
      "Masterflo appears active and visible in the Jasper market, especially for core service lines.",
    alertType: "COMPETITOR_PROMO",
    source: "COMPETITOR",
    severity: "MEDIUM",
    recommendedAction: "Defend with high-conversion local campaign",
    isRead: false,
  });

  await upsertIntelligenceAlert(workspaceId, {
    title: "Open weekly capacity can absorb more drain work",
    description:
      "Current schedule assumptions suggest room for additional booked jobs this week.",
    alertType: "UNDERUTILIZED_SCHEDULE",
    source: "CAPACITY_MODEL",
    severity: "HIGH",
    recommendedAction: "Prioritize fast-turn, high-conversion campaigns",
    isRead: false,
  });

  await upsertIntelligenceAlert(workspaceId, {
    title: "BluePeak has no structured FAQ coverage",
    description:
      "The site lacks FAQ content for high-intent local plumbing questions.",
    alertType: "AEO_OPPORTUNITY",
    source: "AEO_MODEL",
    severity: "HIGH",
    recommendedAction: "Generate AEO FAQ content",
    isRead: false,
  });

  await upsertIntelligenceAlert(workspaceId, {
    title: "Competitor review velocity outpacing BluePeak",
    description:
      "At least two competitors appear to be increasing review activity faster than BluePeak.",
    alertType: "REVIEW_CHANGE",
    source: "COMPETITOR",
    severity: "MEDIUM",
    recommendedAction: "Run Review Recovery Push",
    isRead: false,
  });

  const oppDrain = await upsertRevenueOpportunity(workspaceId, {
    title: "Drain Cleaning Demand Gap",
    description:
      "Seasonal drain-related demand appears elevated and current competitive response is inconsistent.",
    opportunityType: "SEASONAL_DEMAND",
    whyNow: [
      "Seasonal increase in clog and drain issues",
      "Open technician capacity this week",
      "Competitor posting activity is inconsistent",
    ],
    priorityScore: 96,
    estimatedRevenueMin: 4200,
    estimatedRevenueMax: 7800,
    estimatedBookedJobsMin: 8,
    estimatedBookedJobsMax: 14,
    confidence: "HIGH",
    capacityFit: "HIGH",
    recommendedCampaignType: "DRAIN_SPECIAL",
    isActive: true,
  });

  const oppWaterHeater = await upsertRevenueOpportunity(workspaceId, {
    title: "Water Heater Replacement Capture",
    description:
      "Higher-ticket water heater work remains one of the most valuable service opportunities in the market.",
    opportunityType: "HIGH_VALUE_SERVICE",
    whyNow: [
      "Higher-value service line",
      "Competitors are active in this category",
      "Strong fit for premium service mix",
    ],
    priorityScore: 90,
    estimatedRevenueMin: 5800,
    estimatedRevenueMax: 12600,
    estimatedBookedJobsMin: 4,
    estimatedBookedJobsMax: 8,
    confidence: "MEDIUM",
    capacityFit: "MEDIUM",
    recommendedCampaignType: "WATER_HEATER",
    isActive: true,
  });

  const oppAeo = await upsertRevenueOpportunity(workspaceId, {
    title: "AI Search Visibility Gap",
    description:
      "BluePeak lacks structured FAQ and answer-ready content for important local plumbing queries.",
    opportunityType: "AI_SEARCH_VISIBILITY",
    whyNow: [
      "No FAQ content exists today",
      "Weak answer-ready content for local service queries",
      "Can improve AI-driven visibility over time",
    ],
    priorityScore: 82,
    estimatedRevenueMin: 1800,
    estimatedRevenueMax: 4200,
    estimatedBookedJobsMin: 3,
    estimatedBookedJobsMax: 6,
    confidence: "MEDIUM",
    capacityFit: "HIGH",
    recommendedCampaignType: "AEO_FAQ",
    isActive: true,
  });

  const oppMaintenance = await upsertRevenueOpportunity(workspaceId, {
    title: "Preventative Maintenance Upsell Window",
    description:
      "There is room to use lower-friction maintenance offers to smooth schedule utilization.",
    opportunityType: "CAPACITY_GAP",
    whyNow: [
      "Available field capacity",
      "Good fit for shoulder weeks",
      "Can smooth schedule between urgent jobs",
    ],
    priorityScore: 74,
    estimatedRevenueMin: 2200,
    estimatedRevenueMax: 5100,
    estimatedBookedJobsMin: 5,
    estimatedBookedJobsMax: 9,
    confidence: "MEDIUM",
    capacityFit: "HIGH",
    recommendedCampaignType: "MAINTENANCE_PUSH",
    isActive: true,
  });

  const oppReview = await upsertRevenueOpportunity(workspaceId, {
    title: "Review Velocity Catch-Up",
    description:
      "Competitors appear to be outpacing BluePeak in review generation and local proof signals.",
    opportunityType: "REVIEW_SENTIMENT_SHIFT",
    whyNow: [
      "Competitors are growing review volume faster",
      "Social proof influences local conversion",
      "Supports local and AI answer trust",
    ],
    priorityScore: 63,
    estimatedRevenueMin: 1000,
    estimatedRevenueMax: 2500,
    estimatedBookedJobsMin: 2,
    estimatedBookedJobsMax: 4,
    confidence: "LOW",
    capacityFit: "HIGH",
    recommendedCampaignType: "REVIEW_GENERATION",
    isActive: true,
  });

  const recDrain = await upsertRecommendation(workspaceId, {
    title: "Drain Cleaning Special",
    description:
      "Fast-turn campaign designed to capture rising drain demand and fill available schedule.",
    campaignType: "DRAIN_SPECIAL",
    score: 9.1,
    whyNow: ["Demand spike", "Open capacity", "Inconsistent competitor response"],
    estimatedLeadsMin: 12,
    estimatedLeadsMax: 18,
    estimatedBookedJobsMin: 4,
    estimatedBookedJobsMax: 6,
    estimatedRevenueMin: 1900,
    estimatedRevenueMax: 2850,
    capacityFit: "HIGH",
    campaignObjective: "FILL_OPEN_SCHEDULE",
    isLaunched: false,
  });

  const recWaterHeater = await upsertRecommendation(workspaceId, {
    title: "Water Heater Upgrade Push",
    description:
      "Higher-ticket campaign focused on premium water heater replacement and upgrade demand.",
    campaignType: "WATER_HEATER",
    score: 8.6,
    whyNow: [
      "Higher-ticket opportunity",
      "Competitor activity confirms demand",
      "Fits premium service strategy",
    ],
    estimatedLeadsMin: 8,
    estimatedLeadsMax: 12,
    estimatedBookedJobsMin: 3,
    estimatedBookedJobsMax: 5,
    estimatedRevenueMin: 3900,
    estimatedRevenueMax: 8200,
    capacityFit: "MEDIUM",
    campaignObjective: "PUSH_HIGHER_TICKET_JOBS",
    isLaunched: false,
  });

  await upsertRecommendation(workspaceId, {
    title: "Plumbing Maintenance Checkup",
    description:
      "Maintenance campaign designed to smooth capacity and create repeat business opportunities.",
    campaignType: "MAINTENANCE_PUSH",
    score: 7.4,
    whyNow: [
      "Smooths schedule",
      "Works well during moderate capacity periods",
      "Supports retention and repeat business",
    ],
    estimatedLeadsMin: 10,
    estimatedLeadsMax: 16,
    estimatedBookedJobsMin: 3,
    estimatedBookedJobsMax: 5,
    estimatedRevenueMin: 1450,
    estimatedRevenueMax: 2450,
    capacityFit: "HIGH",
    campaignObjective: "CAPTURE_SEASONAL_DEMAND",
    isLaunched: false,
  });

  await upsertRecommendation(workspaceId, {
    title: "Review Recovery Push",
    description:
      "Low-friction campaign to improve review velocity and local trust signals.",
    campaignType: "REVIEW_GENERATION",
    score: 6.9,
    whyNow: [
      "Improve local proof",
      "Support AI/local search trust",
      "Low effort, compounding value",
    ],
    estimatedLeadsMin: 2,
    estimatedLeadsMax: 4,
    estimatedBookedJobsMin: 1,
    estimatedBookedJobsMax: 2,
    estimatedRevenueMin: 400,
    estimatedRevenueMax: 950,
    capacityFit: "HIGH",
    campaignObjective: "INCREASE_REVIEWS",
    isLaunched: false,
  });

  await upsertRecommendation(workspaceId, {
    title: "AI Answer Visibility FAQs",
    description:
      "AEO-focused content opportunity to improve answer-engine visibility for local plumbing questions.",
    campaignType: "AEO_FAQ",
    score: 7.2,
    whyNow: [
      "Low AEO readiness",
      "No direct FAQ content",
      "Supports future organic and AI answer visibility",
    ],
    estimatedLeadsMin: 3,
    estimatedLeadsMax: 6,
    estimatedBookedJobsMin: 1,
    estimatedBookedJobsMax: 3,
    estimatedRevenueMin: 500,
    estimatedRevenueMax: 1800,
    capacityFit: "HIGH",
    campaignObjective: "IMPROVE_AI_SEARCH_VISIBILITY",
    isLaunched: false,
  });

  const campaignDrain = await prisma.campaign.upsert({
    where: { campaignCode: "BP-DRAIN-001" },
    update: {
      workspaceId,
      recommendationId: recDrain.id,
      revenueOpportunityId: oppDrain.id,
      name: "Drain Cleaning Special",
      campaignType: "DRAIN_SPECIAL",
      objective: "FILL_OPEN_SCHEDULE",
      targetService: "Drain Cleaning",
      offer: "$50 Off Professional Drain Clearing",
      audience:
        "Homeowners in Jasper, Canton, Woodstock, and surrounding North Atlanta suburbs",
      serviceArea: "Jasper, Canton, Woodstock, Ball Ground, Cumming",
      estimatedLeads: 15,
      estimatedBookedJobs: 5,
      estimatedRevenue: 2375,
      status: "READY",
      qualityReviewStatus: "APPROVED",
      campaignStartDate: new Date("2026-03-10T00:00:00.000Z"),
      campaignEndDate: new Date("2026-03-24T23:59:59.000Z"),
      briefJson: {
        campaignName: "Drain Cleaning Special",
        campaignObjective: "Fill open schedule with fast-converting drain work",
        targetService: "Drain cleaning",
        offer: "$50 Off Professional Drain Clearing",
        audience: "Homeowners in North Atlanta / North Georgia service area",
        cta: "Call now to book fast local service",
        channels: ["Google Business", "Meta", "Google Ads", "Email", "Blog", "SEO", "AEO"],
      },
    },
    create: {
      workspaceId,
      recommendationId: recDrain.id,
      revenueOpportunityId: oppDrain.id,
      campaignCode: "BP-DRAIN-001",
      name: "Drain Cleaning Special",
      campaignType: "DRAIN_SPECIAL",
      objective: "FILL_OPEN_SCHEDULE",
      targetService: "Drain Cleaning",
      offer: "$50 Off Professional Drain Clearing",
      audience:
        "Homeowners in Jasper, Canton, Woodstock, and surrounding North Atlanta suburbs",
      serviceArea: "Jasper, Canton, Woodstock, Ball Ground, Cumming",
      estimatedLeads: 15,
      estimatedBookedJobs: 5,
      estimatedRevenue: 2375,
      status: "READY",
      qualityReviewStatus: "APPROVED",
      campaignStartDate: new Date("2026-03-10T00:00:00.000Z"),
      campaignEndDate: new Date("2026-03-24T23:59:59.000Z"),
      briefJson: {
        campaignName: "Drain Cleaning Special",
        campaignObjective: "Fill open schedule with fast-converting drain work",
        targetService: "Drain cleaning",
        offer: "$50 Off Professional Drain Clearing",
        audience: "Homeowners in North Atlanta / North Georgia service area",
        cta: "Call now to book fast local service",
        channels: ["Google Business", "Meta", "Google Ads", "Email", "Blog", "SEO", "AEO"],
      },
    },
  });

  const campaignWaterHeater = await prisma.campaign.upsert({
    where: { campaignCode: "BP-WH-001" },
    update: {
      workspaceId,
      recommendationId: recWaterHeater.id,
      revenueOpportunityId: oppWaterHeater.id,
      name: "Water Heater Upgrade Push",
      campaignType: "WATER_HEATER",
      objective: "PUSH_HIGHER_TICKET_JOBS",
      targetService: "Water Heater Replacement",
      offer: "Free Water Heater Replacement Estimate",
      audience:
        "Homeowners with aging or underperforming water heaters in North Atlanta / North Georgia",
      serviceArea: "Jasper, Canton, Woodstock, Milton, Alpharetta, Dawsonville",
      estimatedLeads: 10,
      estimatedBookedJobs: 4,
      estimatedRevenue: 6200,
      status: "READY",
      qualityReviewStatus: "APPROVED",
      campaignStartDate: new Date("2026-03-10T00:00:00.000Z"),
      campaignEndDate: new Date("2026-03-31T23:59:59.000Z"),
      briefJson: {
        campaignName: "Water Heater Upgrade Push",
        campaignObjective:
          "Drive higher-ticket booked jobs from homeowners with aging or failing systems",
        targetService: "Water heater replacement",
        offer: "Free Water Heater Replacement Estimate",
        audience: "Homeowners in the North Atlanta / North Georgia service area",
        cta: "Schedule your free estimate today",
        channels: ["Google Business", "Meta", "Google Ads", "Email", "Blog", "SEO", "AEO"],
      },
    },
    create: {
      workspaceId,
      recommendationId: recWaterHeater.id,
      revenueOpportunityId: oppWaterHeater.id,
      campaignCode: "BP-WH-001",
      name: "Water Heater Upgrade Push",
      campaignType: "WATER_HEATER",
      objective: "PUSH_HIGHER_TICKET_JOBS",
      targetService: "Water Heater Replacement",
      offer: "Free Water Heater Replacement Estimate",
      audience:
        "Homeowners with aging or underperforming water heaters in North Atlanta / North Georgia",
      serviceArea: "Jasper, Canton, Woodstock, Milton, Alpharetta, Dawsonville",
      estimatedLeads: 10,
      estimatedBookedJobs: 4,
      estimatedRevenue: 6200,
      status: "READY",
      qualityReviewStatus: "APPROVED",
      campaignStartDate: new Date("2026-03-10T00:00:00.000Z"),
      campaignEndDate: new Date("2026-03-31T23:59:59.000Z"),
      briefJson: {
        campaignName: "Water Heater Upgrade Push",
        campaignObjective:
          "Drive higher-ticket booked jobs from homeowners with aging or failing systems",
        targetService: "Water heater replacement",
        offer: "Free Water Heater Replacement Estimate",
        audience: "Homeowners in the North Atlanta / North Georgia service area",
        cta: "Schedule your free estimate today",
        channels: ["Google Business", "Meta", "Google Ads", "Email", "Blog", "SEO", "AEO"],
      },
    },
  });

  await prisma.campaignAsset.deleteMany({
    where: {
      campaignId: {
        in: [campaignDrain.id, campaignWaterHeater.id],
      },
    },
  });

  await prisma.campaignAsset.createMany({
    data: [
      {
        campaignId: campaignDrain.id,
        assetType: "GOOGLE_BUSINESS",
        title: "Google Business Posts",
        content:
          "Slow or clogged drain? BluePeak Plumbing is offering $50 off professional drain clearing in Jasper and surrounding North Atlanta communities. Call now to book fast local service.",
        isApproved: true,
      },
      {
        campaignId: campaignDrain.id,
        assetType: "META",
        title: "Meta Posts",
        content:
          "Slow drain? Don’t wait until it turns into a mess. BluePeak Plumbing is offering $50 off professional drain clearing across Jasper and North Atlanta. Call today.",
        isApproved: true,
      },
      {
        campaignId: campaignDrain.id,
        assetType: "GOOGLE_ADS",
        title: "Google Ads",
        content:
          "Headlines: Drain Cleaning Near You | $50 Off Drain Clearing | Fast Local Plumbing Help",
        isApproved: true,
      },
      {
        campaignId: campaignDrain.id,
        assetType: "AEO_FAQ",
        title: "Drain Cleaning FAQs",
        content:
          "Q: How much does drain cleaning cost in Jasper, GA? A: Pricing depends on clog severity and location, but BluePeak provides transparent local service recommendations.",
        isApproved: true,
      },
      {
        campaignId: campaignWaterHeater.id,
        assetType: "GOOGLE_BUSINESS",
        title: "Google Business Posts",
        content:
          "Running out of hot water? BluePeak Plumbing offers free water heater replacement estimates for homeowners in Jasper and the North Atlanta area.",
        isApproved: true,
      },
      {
        campaignId: campaignWaterHeater.id,
        assetType: "META",
        title: "Meta Posts",
        content:
          "No hot water? It may be time to replace your water heater. BluePeak Plumbing is offering free replacement estimates across North Atlanta.",
        isApproved: true,
      },
      {
        campaignId: campaignWaterHeater.id,
        assetType: "GOOGLE_ADS",
        title: "Google Ads",
        content:
          "Headlines: Water Heater Replacement Near You | Free Replacement Estimate | Jasper Water Heater Experts",
        isApproved: true,
      },
      {
        campaignId: campaignWaterHeater.id,
        assetType: "AEO_FAQ",
        title: "Water Heater FAQs",
        content:
          "Q: How do I know if I need to replace my water heater? A: Signs include inconsistent hot water, leaks, rust-colored water, or unusual system noises.",
        isApproved: true,
      },
    ],
  });

  await prisma.attributionEntry.deleteMany({
    where: {
      campaignId: {
        in: [campaignDrain.id, campaignWaterHeater.id],
      },
    },
  });

  await prisma.attributionEntry.createMany({
    data: [
      {
        workspaceId,
        campaignId: campaignDrain.id,
        periodStart: new Date("2026-03-10T00:00:00.000Z"),
        periodEnd: new Date("2026-03-17T23:59:59.000Z"),
        leadsGenerated: 14,
        bookedJobs: 5,
        revenue: 2375,
        roi: 3.4,
        confidence: "MEDIUM",
        notes: "Strong short-term response from drain-focused messaging.",
      },
      {
        workspaceId,
        campaignId: campaignWaterHeater.id,
        periodStart: new Date("2026-03-10T00:00:00.000Z"),
        periodEnd: new Date("2026-03-24T23:59:59.000Z"),
        leadsGenerated: 9,
        bookedJobs: 4,
        revenue: 6200,
        roi: 4.1,
        confidence: "MEDIUM",
        notes: "Higher-ticket conversion, lower total volume.",
      },
    ],
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      demoInitializedAt: new Date(),
    },
  });

  return {
    workspaceId,
    heroOpportunityId: oppDrain.id,
    aeoOpportunityId: oppAeo.id,
    maintenanceOpportunityId: oppMaintenance.id,
    reviewOpportunityId: oppReview.id,
  };
}