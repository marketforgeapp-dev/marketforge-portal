"use client";

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OnboardingFormData } from "@/types/onboarding";
import { OnboardingProgress } from "./onboarding-progress";
import { BusinessInfoStep } from "./steps/business-info-step";
import { ServicesStep } from "./steps/services-step";
import { CapacityStep } from "./steps/capacity-step";
import { CompetitorsStep } from "./steps/competitors-step";
import { WebsiteSeoStep } from "./steps/website-seo-step";
import { MarketInitializationStep } from "./steps/market-initialization-step";
import { OnboardingAiPrefill } from "@/components/onboarding/onboarding-ai-prefill";
import type { OnboardingPrefillResult } from "@/lib/onboarding-prefill-schema";
import { saveOnboarding } from "@/app/onboarding/actions";
import { OnboardingTopbar } from "@/components/onboarding/onboarding-topbar";
import {
  dedupeServicesForIndustry,
  mergeAndDedupeServicesForIndustry,
} from "@/lib/service-normalization";
import type { SupportedIndustry } from "@/lib/industry-service-map";

const STEP_LABELS = [
  "Business Info",
  "Services",
  "Capacity",
  "Competitors",
  "Website / SEO",
  "Market Initialization",
];

const INITIAL_FORM_DATA: OnboardingFormData = {
  businessName: "",
  website: "",
  logoUrl: "",
  phone: "",
  city: "",
  state: "",
  serviceArea: "",
  serviceAreaRadiusMiles: 25,
  industry: "PLUMBING",
  industryLabel: "Plumbing",
  googlePlaceId: "",
  googleRating: "",
  googleReviewCount: "",
  brandTone: "PROFESSIONAL",

  preferredServices: [],
  primaryServices: [],
  deprioritizedServices: [],
  averageJobValue: 450,
  highestMarginService: "",
  lowestPriorityService: "",

  technicians: 3,
  jobsPerTechnicianPerDay: 3,
  weeklyCapacity: 45,
  targetWeeklyRevenue: 12000,
  monthlyActionBudget: "",
  
  competitors: [],

  hasServicePages: false,
  hasFaqContent: false,
  hasFaqPage: false,
  hasBlog: false,
  hasGoogleBusinessPage: false,
  googleBusinessProfileUrl: "",
  servicePageUrls: [],

  busySeason: "",
  slowSeason: "",
  busyMonths: [],
  slowMonths: [],
  seasonalityNotes: "",
};

function resolveSupportedIndustry(
  industry: OnboardingFormData["industry"]
): SupportedIndustry {
  if (industry === "SEPTIC") return "SEPTIC";
  if (industry === "TREE_SERVICE") return "TREE_SERVICE";
  if (industry === "HVAC") return "HVAC";
  return "PLUMBING";
}

function getIndustryLabel(industry: OnboardingFormData["industry"]): string {
  if (industry === "SEPTIC") return "Septic";
  if (industry === "TREE_SERVICE") return "Tree Service";
  if (industry === "HVAC") return "HVAC";
  return "Plumbing";
}

export function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_FORM_DATA);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSavingOverlay, setShowSavingOverlay] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalSteps = STEP_LABELS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  function applyAiPrefill(prefill: OnboardingPrefillResult) {
    setFormData((current) => {
            const mergedServices = mergeAndDedupeServicesForIndustry({
        industry: resolveSupportedIndustry(prefill.industry),
        groups: [
          current.primaryServices,
          current.preferredServices,
          prefill.preferredServices,
        ],
        max: 20,
      });

      return {
        ...current,
        businessName: prefill.businessName || current.businessName,
        website: prefill.website || current.website,
        logoUrl: prefill.logoUrl || current.logoUrl,
        phone: prefill.phone || current.phone,
        city: prefill.city || current.city,
        state: prefill.state || current.state,
        serviceArea: prefill.serviceArea || current.serviceArea,
        googleBusinessProfileUrl:
          prefill.googleBusinessProfileUrl || current.googleBusinessProfileUrl,
        industry: prefill.industry || current.industry,
        industryLabel: getIndustryLabel(prefill.industry || current.industry),

        preferredServices: mergedServices,
        primaryServices: mergedServices,

        servicePageUrls:
          prefill.servicePageUrls.length > 0
            ? prefill.servicePageUrls
            : current.servicePageUrls,

        hasFaqContent: prefill.hasFaqContent || current.hasFaqContent,
        hasFaqPage: prefill.hasFaqContent || current.hasFaqPage,
        hasBlog: prefill.hasBlog || current.hasBlog,
        hasGoogleBusinessPage:
          prefill.hasGoogleBusinessPage || current.hasGoogleBusinessPage,
        hasServicePages: prefill.hasServicePages || current.hasServicePages,

        busySeason: prefill.busySeason || current.busySeason,
        slowSeason: prefill.slowSeason || current.slowSeason,
        averageJobValue: prefill.averageJobValueHint ?? current.averageJobValue,

        competitors:
          prefill.competitors.length > 0
            ? prefill.competitors.slice(0, 10).map((competitor, index) => ({
                name: competitor.name,
                websiteUrl: competitor.websiteUrl ?? "",
                googleBusinessUrl: competitor.googleBusinessUrl ?? "",
                logoUrl: competitor.logoUrl ?? "",
                isPrimaryCompetitor: index === 0,
              }))
            : current.competitors,
      };
    });
  }

  const normalizedFormData = useMemo(() => {
    return {
      ...formData,
            primaryServices: dedupeServicesForIndustry(
        formData.primaryServices,
        resolveSupportedIndustry(formData.industry)
      ),
            preferredServices: dedupeServicesForIndustry(
        formData.preferredServices.length > 0
          ? formData.preferredServices
          : formData.primaryServices,
        resolveSupportedIndustry(formData.industry)
      ),
            deprioritizedServices: dedupeServicesForIndustry(
        formData.deprioritizedServices,
        resolveSupportedIndustry(formData.industry)
      ),
    };
  }, [formData]);

  const currentStepComponent = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <BusinessInfoStep
            formData={normalizedFormData}
            setFormData={setFormData}
          />
        );
      case 1:
        return (
          <ServicesStep
            formData={normalizedFormData}
            setFormData={setFormData}
          />
        );
      case 2:
        return (
          <CapacityStep
            formData={normalizedFormData}
            setFormData={setFormData}
          />
        );
      case 3:
        return (
          <CompetitorsStep
            formData={normalizedFormData}
            setFormData={setFormData}
          />
        );
      case 4:
        return (
          <WebsiteSeoStep
            formData={normalizedFormData}
            setFormData={setFormData}
          />
        );
      case 5:
        return (
          <MarketInitializationStep
            formData={normalizedFormData}
            setFormData={setFormData}
          />
        );
      default:
        return null;
    }
  }, [currentStep, normalizedFormData]);

  const handleNext = () => {
    if (!isLastStep) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (!isFirstStep) setCurrentStep((prev) => prev - 1);
  };

    const handleFinish = () => {
  setSubmitError(null);
  setShowSavingOverlay(true);

  startTransition(async () => {
    try {
      const result = await saveOnboarding({
        ...normalizedFormData,
        preferredServices:
          normalizedFormData.preferredServices.length > 0
            ? normalizedFormData.preferredServices
            : normalizedFormData.primaryServices,
      });

      if (!result?.success) {
        setSubmitError("Something went wrong while saving onboarding.");
        setShowSavingOverlay(false);
        return;
      }

      router.push("/settings?intent=finalize&focus=service-pricing");
    } catch (error) {
      console.error(error);
      setSubmitError("Something went wrong while saving onboarding.");
      setShowSavingOverlay(false);
    }
  });
};
    return (
    <>
      <div className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <OnboardingTopbar />

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
            MarketForge Setup
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            Set up your business profile
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
  MarketForge uses your services, pricing, capacity, competitors, and local
  visibility signals to identify the best revenue opportunities for your
  business. After setup, you will confirm a final set of business inputs before
  MarketForge prepares your first recommendations.
</p>
        </div>

        <div className="mb-6">
          <OnboardingAiPrefill onApply={applyAiPrefill} />
        </div>

        <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
  Review and refine anything before continuing. These inputs shape opportunity
  ranking, revenue projections, and the recommendations MarketForge will prepare
  after one final accuracy step in Settings.
</div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <OnboardingProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepLabels={STEP_LABELS}
          />

          {normalizedFormData.logoUrl ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={normalizedFormData.logoUrl}
                alt={`${normalizedFormData.businessName || "Business"} logo`}
                className="h-12 w-12 rounded-lg bg-white object-contain p-1"
              />
              <div>
                <p className="text-sm font-semibold text-white">Company logo loaded</p>
                <p className="text-xs text-slate-400">
                  This logo will be stored for use throughout the MarketForge workspace.
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-8">{currentStepComponent}</div>

          {submitError ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirstStep || isPending}
              className={`rounded-lg px-5 py-3 font-medium ${
                isFirstStep || isPending
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isPending}
                className={`rounded-lg px-6 py-3 font-medium text-white ${
                  isPending
                    ? "cursor-not-allowed bg-blue-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isPending ? "Saving..." : "Finish Setup"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={isPending}
                className={`rounded-lg px-6 py-3 font-medium text-white ${
                  isPending
                    ? "cursor-not-allowed bg-blue-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Next
              </button>
            )}
          </div>
        </div>
            </div>
    </div>

    {showSavingOverlay ? (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-6">
    <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
        Saving your business profile
      </p>

      <h2 className="mt-3 text-2xl font-bold text-white">
        Finalizing your setup
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-300">
        Next, you’ll confirm the final inputs MarketForge uses to rank
        opportunities correctly and prepare your first recommendations.
      </p>

      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
      </div>
    </div>
  </div>
) : null}
  </>
  );
}