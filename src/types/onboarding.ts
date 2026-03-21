export type CompetitorInput = {
  name: string;
  websiteUrl: string;
  googleBusinessUrl: string;
  logoUrl: string;
  isPrimaryCompetitor: boolean;
};

export type OnboardingFormData = {
  businessName: string;
  website: string;
  logoUrl: string;
  phone: string;

  city: string;
  state: string;
  serviceArea: string;
  serviceAreaRadiusMiles: number | "";
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE" | "";
  industryLabel: string;
  brandTone: "PROFESSIONAL" | "FRIENDLY" | "URGENT" | "LOCAL" | null;

  preferredServices: string[];
  primaryServices: string[];
  deprioritizedServices: string[];

  averageJobValue: number | "";
  servicePricing?: {
  serviceName: string;
  averageRevenue: number | "";
  }[];
  highestMarginService: string;
  lowestPriorityService: string;

  technicians: number | "";
  jobsPerTechnicianPerDay: number | "";
  weeklyCapacity: number | "";
  targetWeeklyRevenue: number | "";
  
  competitors: CompetitorInput[];

  hasServicePages: boolean;
  hasFaqContent: boolean;
  hasFaqPage: boolean;
  hasBlog: boolean;
  hasGoogleBusinessPage: boolean;
  googleBusinessProfileUrl: string;
  servicePageUrls: string[];

  busySeason: string;
  slowSeason: string;
  busyMonths: string[];
  slowMonths: string[];
  seasonalityNotes: string;
};