export type CompetitorInput = {
  name: string;
  websiteUrl: string;
  googleBusinessUrl: string;
};

export type OnboardingFormData = {
  businessName: string;
  website: string;
  phone: string;
  city: string;
  state: string;
  serviceAreaRadiusMiles: number | "";
  industry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE" | "";

  primaryServices: string[];
  averageJobValue: number | "";
  highestMarginService: string;
  lowestPriorityService: string;

  technicians: number | "";
  jobsPerTechnicianPerDay: number | "";
  weeklyCapacity: number | "";
  targetWeeklyRevenue: number | "";

  competitors: CompetitorInput[];

  hasServicePages: boolean;
  hasFaqContent: boolean;
  hasBlog: boolean;
  hasGoogleBusinessPage: boolean;
  googleBusinessProfileUrl: string;

  busyMonths: string[];
  slowMonths: string[];
  seasonalityNotes: string;
};