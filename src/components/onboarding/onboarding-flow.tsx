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
import { saveOnboarding } from "@/app/onboarding/actions";

const STEP_LABELS = [
  "Business Info",
  "Services",
  "Capacity",
  "Competitors",
  "Website / SEO",
  "Market Initialization",
];

const INITIAL_FORM_DATA: OnboardingFormData = {
  businessName: "BluePeak Plumbing",
  website: "",
  phone: "",
  city: "Jasper",
  state: "GA",
  serviceAreaRadiusMiles: 30,
  industry: "PLUMBING",

  primaryServices: [
    "Drain cleaning",
    "Water heater replacement",
    "Leak repair",
    "Toilet repair",
    "Pipe repair",
  ],
  averageJobValue: 450,
  highestMarginService: "Water heater replacement",
  lowestPriorityService: "Toilet repair",

  technicians: 3,
  jobsPerTechnicianPerDay: 3,
  weeklyCapacity: 45,
  targetWeeklyRevenue: 12000,

  competitors: [
    {
      name: "Masterflo Plumbing",
      websiteUrl: "",
      googleBusinessUrl: "",
    },
    {
      name: "Superior Plumbing",
      websiteUrl: "",
      googleBusinessUrl: "",
    },
  ],

  hasServicePages: true,
  hasFaqContent: false,
  hasBlog: false,
  hasGoogleBusinessPage: true,
  googleBusinessProfileUrl: "",

  busyMonths: ["May", "June", "July", "August", "September"],
  slowMonths: ["January", "February"],
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
      const result = await saveOnboarding(formData);

      if (!result.success) {
        setSubmitError(result.error ?? "Something went wrong while saving onboarding.");
        return;
      }

      router.push("/dashboard");
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
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

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
          <OnboardingProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            stepLabels={STEP_LABELS}
          />

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