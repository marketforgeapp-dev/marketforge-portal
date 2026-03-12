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
  serviceAreaRadiusMiles: 30,
  industry: "PLUMBING",
  industryLabel: "Plumbing",
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
  targetBookedJobsPerWeek: null,

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

export function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_FORM_DATA);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalSteps = STEP_LABELS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  function applyAiPrefill(prefill: OnboardingPrefillResult) {
    setFormData((current) => ({
      ...current,
      businessName: prefill.businessName || current.businessName,
      website: prefill.website || current.website,
      logoUrl: prefill.logoUrl || current.logoUrl,
      phone: prefill.phone || current.phone,
      city: prefill.city || current.city,
      state: prefill.state || current.state,
      serviceArea: prefill.serviceArea || current.serviceArea,
      industry: prefill.industry || current.industry,
      industryLabel:
        prefill.industry === "PLUMBING"
          ? "Plumbing"
          : prefill.industry === "HVAC"
            ? "HVAC"
            : prefill.industry === "SEPTIC"
              ? "Septic"
              : prefill.industry === "TREE_SERVICE"
                ? "Tree Service"
                : current.industryLabel,

      preferredServices:
        prefill.preferredServices.length > 0
          ? prefill.preferredServices
          : current.preferredServices,

      primaryServices:
        prefill.preferredServices.length > 0
          ? prefill.preferredServices
          : current.primaryServices,

      servicePageUrls:
        prefill.servicePageUrls.length > 0
          ? prefill.servicePageUrls
          : current.servicePageUrls,

      hasFaqContent: prefill.hasFaqContent,
      hasFaqPage: prefill.hasFaqContent || current.hasFaqPage,

      busySeason: prefill.busySeason || current.busySeason,
      slowSeason: prefill.slowSeason || current.slowSeason,

      averageJobValue: prefill.averageJobValueHint ?? current.averageJobValue,

      competitors:
        prefill.competitors.length > 0
          ? [...prefill.competitors]
              .slice(0, 5)
              .map((competitor, index) => ({
                name: competitor.name,
                websiteUrl: competitor.websiteUrl ?? "",
                googleBusinessUrl: competitor.googleBusinessUrl ?? "",
                logoUrl: competitor.logoUrl ?? "",
                isPrimaryCompetitor: index === 0,
              }))
              .concat(
                Array.from({
                  length: Math.max(0, 5 - prefill.competitors.length),
                }).map((_, index) => ({
                  name: "",
                  websiteUrl: "",
                  googleBusinessUrl: "",
                  logoUrl: "",
                  isPrimaryCompetitor:
                    prefill.competitors.length === 0 && index === 0,
                }))
              )
          : current.competitors.length > 0
            ? current.competitors
            : Array.from({ length: 5 }).map((_, index) => ({
                name: "",
                websiteUrl: "",
                googleBusinessUrl: "",
                logoUrl: "",
                isPrimaryCompetitor: index === 0,
              })),
    }));
  }

  const currentStepComponent = useMemo(() => {
    switch (currentStep) {
      case 0:
        return <BusinessInfoStep formData={formData} setFormData={setFormData} />;
      case 1:
        return <ServicesStep formData={formData} setFormData={setFormData} />;
      case 2:
        return <CapacityStep formData={formData} setFormData={setFormData} />;
      case 3:
        return <CompetitorsStep formData={formData} setFormData={setFormData} />;
      case 4:
        return <WebsiteSeoStep formData={formData} setFormData={setFormData} />;
      case 5:
        return (
          <MarketInitializationStep
            formData={formData}
            setFormData={setFormData}
          />
        );
      default:
        return null;
    }
  }, [currentStep, formData]);

  const handleNext = () => {
    if (!isLastStep) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (!isFirstStep) setCurrentStep((prev) => prev - 1);
  };

  const handleFinish = () => {
    setSubmitError(null);

    startTransition(async () => {
      try {
        const result = await saveOnboarding(formData);

        if (!result?.success) {
          setSubmitError("Something went wrong while saving onboarding.");
          return;
        }

        router.push("/dashboard");
      } catch (error) {
        console.error(error);
        setSubmitError("Something went wrong while saving onboarding.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
          <OnboardingTopbar />
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            MarketForge Setup
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Set up your business profile
          </h1>
          <p className="mt-2 text-gray-600">
            We’ll use this information to identify revenue opportunities, track
            competitor activity, and generate recommended campaigns.
          </p>
        </div>

        <div className="mb-6">
          <OnboardingAiPrefill onApply={applyAiPrefill} />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
          <OnboardingProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepLabels={STEP_LABELS}
          />

          {formData.logoUrl ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.logoUrl}
                alt={`${formData.businessName || "Business"} logo`}
                className="h-12 w-12 rounded-lg bg-white object-contain p-1"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Company logo loaded
                </p>
                <p className="text-xs text-gray-600">
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
  );
}