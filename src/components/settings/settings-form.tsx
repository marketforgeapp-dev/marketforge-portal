"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingFormData } from "@/types/onboarding";
import type { CompetitorCandidate } from "@/lib/google-places-competitors";
import {
  saveSettings,
  fetchBusinessCandidates,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  createPaymentMethodUpdatePortalSession,
  createSubscriptionManagementPortalSession,
} from "@/app/settings/actions";
import { SystemStatusOverlay } from "@/components/system/system-status-overlay";

type Props = {
  workspaceName: string;
  isDemo: boolean;
  initialData: OnboardingFormData;
  primaryEmail: string | null;
  isFinalizeMode?: boolean;
  focusSection?: string | null;
  currentBusinessMatch?: {
    name: string | null;
    formattedAddress: string | null;
    googleBusinessUrl: string | null;
    rating: number | null;
    reviewCount: number | null;
  } | null;
  businessCandidates?: CompetitorCandidate[];
  workspaceStatus:
    | "PENDING_ACTIVATION"
    | "ACTIVE"
    | "PAST_DUE"
    | "CANCELED";
  billingPlanLabel: string;
  billingCurrentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

type ServicePricingRow = {
  serviceName: string;
  averageRevenue: number | "";
};

function Field({
  label,
  children,
  helpText,
}: {
  label: string;
  children: React.ReactNode;
  helpText?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
      {helpText ? (
        <p className="mt-2 text-xs leading-5 text-gray-500">{helpText}</p>
      ) : null}
    </label>
  );
}

function SectionSaveButton({
  onSave,
  isPending,
}: {
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <div className="mt-5 flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={isPending}
        className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white ${
          isPending
            ? "cursor-not-allowed bg-blue-400"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {isPending ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function arrayToCommaSeparated(value: string[]): string {
  return value.join(", ");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatWorkspaceStatusLabel(
  status: "PENDING_ACTIVATION" | "ACTIVE" | "PAST_DUE" | "CANCELED"
): string {
  if (status === "PENDING_ACTIVATION") return "Pending Activation";
  if (status === "PAST_DUE") return "Past Due";
  if (status === "CANCELED") return "Canceled";
  return "Active";
}

function getWorkspaceStatusClasses(
  status: "PENDING_ACTIVATION" | "ACTIVE" | "PAST_DUE" | "CANCELED"
): string {
  if (status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "PAST_DUE") {
    return "bg-amber-100 text-amber-800";
  }

  if (status === "CANCELED") {
    return "bg-red-100 text-red-800";
  }

  return "bg-gray-100 text-gray-700";
}

function formatBillingDate(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizeServicePricingRows(
  preferredServices: string[],
  existingRows: ServicePricingRow[] | undefined
): ServicePricingRow[] {
  const rows: ServicePricingRow[] = Array.isArray(existingRows) ? existingRows : [];

  const byService = new Map(
    rows
      .filter((row) => row?.serviceName?.trim())
      .map((row) => [
        row.serviceName.trim().toLowerCase(),
        {
          serviceName: row.serviceName.trim(),
          averageRevenue: row.averageRevenue,
        } as ServicePricingRow,
      ])
  );

  const normalizedPreferred = preferredServices
    .map((service) => service.trim())
    .filter(Boolean);

  const merged: ServicePricingRow[] = normalizedPreferred.map((service) => {
    const existing = byService.get(service.toLowerCase());
    return (
      existing ?? {
        serviceName: service,
        averageRevenue: "" as const,
      }
    );
  });

  const extras: ServicePricingRow[] = rows.filter(
    (row) =>
      row?.serviceName?.trim() &&
      !normalizedPreferred.some(
        (service) =>
          service.trim().toLowerCase() === row.serviceName.trim().toLowerCase()
      )
  );

  return [...merged, ...extras];
}

function buildPreferredServicesFromPricingRows(
  rows: ServicePricingRow[] | undefined,
  fallbackPreferredServices: string[]
): string[] {
  const normalizedRows = Array.isArray(rows) ? rows : [];

  const pricingServices = normalizedRows
    .map((row) => row.serviceName.trim())
    .filter(Boolean);

  if (pricingServices.length > 0) {
    return pricingServices;
  }

  return fallbackPreferredServices.map((service) => service.trim()).filter(Boolean);
}

export function SettingsForm({
  workspaceName,
  isDemo,
  initialData,
  primaryEmail,
  isFinalizeMode = false,
  focusSection = null,
  currentBusinessMatch = null,
  businessCandidates = [],
  workspaceStatus,
  billingPlanLabel,
  billingCurrentPeriodEnd,
  cancelAtPeriodEnd,
  stripeCustomerId,
  stripeSubscriptionId,
}: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<OnboardingFormData>(() => ({
    ...initialData,
    servicePricing: normalizeServicePricingRows(
      initialData.preferredServices?.length
  ? initialData.preferredServices
  : initialData.primaryServices ?? [],
      initialData.servicePricing ?? []
    ),
  }));

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showRefreshingOverlay, setShowRefreshingOverlay] = useState(false);
  const [showBusinessCandidates, setShowBusinessCandidates] = useState(false);
  const [dynamicBusinessCandidates, setDynamicBusinessCandidates] = useState<CompetitorCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedGoogleBusiness, setSelectedGoogleBusiness] = useState<{
    placeId: string | null;
    name: string | null;
    formattedAddress: string | null;
    googleBusinessUrl: string | null;
    rating: number | null;
    reviewCount: number | null;
  } | null>(
    currentBusinessMatch
      ? {
          placeId: initialData.googlePlaceId ?? null,
          name: currentBusinessMatch.name,
          formattedAddress: currentBusinessMatch.formattedAddress,
          googleBusinessUrl: currentBusinessMatch.googleBusinessUrl,
          rating: currentBusinessMatch.rating,
          reviewCount: currentBusinessMatch.reviewCount,
        }
      : null
  );
    const [isPending, startTransition] = useTransition();
  const [isBillingPending, startBillingTransition] = useTransition();
  const [billingError, setBillingError] = useState<string | null>(null);
  const [preferredServicesInput, setPreferredServicesInput] = useState(() =>
    arrayToCommaSeparated(initialData.preferredServices ?? [])
  );

  const [deprioritizedServicesInput, setDeprioritizedServicesInput] = useState(() =>
    arrayToCommaSeparated(initialData.deprioritizedServices ?? [])
  );
  const locationLine = useMemo(() => {
        const parts = [formData.city, formData.state].filter(Boolean);
    return parts.join(", ");
  }, [formData.city, formData.state]);

  function updateField<K extends keyof OnboardingFormData>(
    key: K,
    value: OnboardingFormData[K]
  ) {
    setFormData((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "preferredServices") {
        next.servicePricing = normalizeServicePricingRows(
          value as string[],
          prev.servicePricing ?? []
        );
      }

      return next;
    });
  }

  function addCompetitor() {
    setFormData((prev) => ({
      ...prev,
      competitors: [
        ...prev.competitors,
        {
          name: "",
          websiteUrl: "",
          googleBusinessUrl: "",
          logoUrl: "",
          isPrimaryCompetitor: false,
        },
      ],
    }));
  }

  function updateCompetitor(
    index: number,
    field: keyof OnboardingFormData["competitors"][number],
    value: string | boolean
  ) {
    setFormData((prev) => {
      const updated = [...prev.competitors];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        competitors: updated,
      };
    });
  }

  function removeCompetitor(index: number) {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  }

  function makePrimaryCompetitor(index: number) {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.map((competitor, i) => ({
        ...competitor,
        isPrimaryCompetitor: i === index,
      })),
    }));
  }

    function updateServicePricing(
    index: number,
    field: keyof ServicePricingRow,
    value: string | number | ""
  ) {
    setFormData((prev) => {
      const currentRows = Array.isArray(prev.servicePricing)
        ? [...prev.servicePricing]
        : [];

      currentRows[index] = {
        ...currentRows[index],
        [field]: value,
      };

      const nextPreferredServices = buildPreferredServicesFromPricingRows(
        currentRows,
        prev.preferredServices ?? []
      );

      return {
        ...prev,
        preferredServices: nextPreferredServices,
        primaryServices: nextPreferredServices,
        servicePricing: currentRows,
      };
    });

    setPreferredServicesInput((prevInput) => {
      const currentRows = Array.isArray(formData.servicePricing)
        ? [...formData.servicePricing]
        : [];

      currentRows[index] = {
        ...currentRows[index],
        [field]: value,
      };

      return arrayToCommaSeparated(
        buildPreferredServicesFromPricingRows(
          currentRows,
          parseCommaSeparated(prevInput)
        )
      );
    });
  }

    function addServicePricingRow() {
    setFormData((prev) => ({
      ...prev,
      servicePricing: [
        ...(prev.servicePricing ?? []),
        {
          serviceName: "",
          averageRevenue: "",
        },
      ],
    }));
  }

    function removeServicePricingRow(index: number) {
    setFormData((prev) => {
      const nextServicePricing = (prev.servicePricing ?? []).filter(
        (_, i) => i !== index
      );

      const nextPreferredServices = buildPreferredServicesFromPricingRows(
        nextServicePricing,
        []
      );

      return {
        ...prev,
        preferredServices: nextPreferredServices,
        primaryServices: nextPreferredServices,
        servicePricing: nextServicePricing,
      };
    });

    setPreferredServicesInput((prevInput) => {
      const currentRows = (formData.servicePricing ?? []).filter(
        (_, i) => i !== index
      );

      return arrayToCommaSeparated(
        buildPreferredServicesFromPricingRows(currentRows, parseCommaSeparated(prevInput))
      );
    });
  }

  function handleSave() {
    setSaveMessage(null);
    setSaveError(null);
    setShowRefreshingOverlay(true);

    startTransition(async () => {
      try {
                const result = await saveSettings({
          ...formData,
          selectedGoogleBusiness,
          servicePricing: (formData.servicePricing ?? [])
            .map((row) => ({
              serviceName: row.serviceName.trim(),
              averageRevenue:
                row.averageRevenue === ""
                  ? null
                  : Number(row.averageRevenue),
            }))
            .filter((row) => row.serviceName.length > 0),
        });

        if (!result?.success) {
          setSaveError("Something went wrong while saving settings.");
          setShowRefreshingOverlay(false);
          return;
        }

        setSaveMessage(
    isFinalizeMode
    ? "Recommendation inputs saved. Redirecting to Command Center..."
    : "Settings saved successfully. Redirecting to Command Center..."
      );
        router.push("/dashboard");
        router.refresh();
      } catch (error) {
        console.error(error);
        setSaveError("Something went wrong while saving settings.");
        setShowRefreshingOverlay(false);
      }
    });
  }

  function handleCancelSubscription() {
    setBillingError(null);

    startBillingTransition(async () => {
      try {
        const result = await cancelSubscriptionAtPeriodEnd();

        if (!result?.success) {
          setBillingError("Failed to schedule cancellation.");
        }
      } catch (error) {
        console.error(error);
        setBillingError("Failed to schedule cancellation.");
      }
    });
  }

  function handleResumeSubscription() {
    setBillingError(null);

    startBillingTransition(async () => {
      try {
        const result = await resumeSubscription();

        if (!result?.success) {
          setBillingError("Failed to resume subscription.");
        }
      } catch (error) {
        console.error(error);
        setBillingError("Failed to resume subscription.");
      }
    });
  }

    function handleUpdatePaymentMethod() {
    setBillingError(null);

    startBillingTransition(async () => {
      try {
        const result = await createPaymentMethodUpdatePortalSession();

        if (!result?.success || !result.url) {
          setBillingError("Failed to open payment method update.");
          return;
        }

        router.push(result.url);
      } catch (error) {
        console.error(error);
        setBillingError("Failed to open payment method update.");
      }
    });
  }

  function handleManageSubscription() {
    setBillingError(null);

    startBillingTransition(async () => {
      try {
        const result = await createSubscriptionManagementPortalSession();

        if (!result?.success || !result.url) {
          setBillingError("Failed to open subscription management.");
          return;
        }

        router.push(result.url);
      } catch (error) {
        console.error(error);
        setBillingError("Failed to open subscription management.");
      }
    });
  }

  return (
    <>
    <div className="space-y-6">
            {isFinalizeMode ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Final Recommendation Step
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            One final step before Command Center
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">
            Your business profile has been saved. Now confirm the final inputs
            MarketForge uses to rank opportunities correctly, select your top
            action, and recommend the best next steps to generate revenue.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step 1
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                Confirm service pricing
              </p>
            </div>

            <div className="rounded-xl border border-white bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step 2
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                Confirm monthly action budget
              </p>
            </div>

            <div className="rounded-xl border border-white bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step 3
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                Review business profile inputs
              </p>
            </div>
          </div>
        </section>
      ) : null}
            {isFinalizeMode ? (
        <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                Google Business Profile
              </p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Confirm your business listing
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                MarketForge uses this business listing for Google rating and review
                data. Confirm the correct listing so reputation and recommendation
                inputs are based on the right business.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
  const next = !showBusinessCandidates;
  setShowBusinessCandidates(next);

  if (next && dynamicBusinessCandidates.length === 0) {
    setIsLoadingCandidates(true);

   const resolvedIndustry: "PLUMBING" | "HVAC" | "SEPTIC" | "TREE_SERVICE" =
  formData.industry === "HVAC" ||
  formData.industry === "SEPTIC" ||
  formData.industry === "TREE_SERVICE"
    ? formData.industry
    : "PLUMBING";

const result = await fetchBusinessCandidates({
  companyName: formData.businessName,
  industry: resolvedIndustry,
  city: formData.city || null,
  state: formData.state || null,
  website: formData.website || null,
  phone: formData.phone || null,
});

    if (result?.success) {
      setDynamicBusinessCandidates(result.candidates ?? []);
    }

    setIsLoadingCandidates(false);
  }
}}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {showBusinessCandidates ? "Hide other listings" : "Choose a different listing"}
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              {selectedGoogleBusiness?.name ?? currentBusinessMatch?.name ?? formData.businessName ?? workspaceName}
            </p>

            {(selectedGoogleBusiness?.formattedAddress ?? currentBusinessMatch?.formattedAddress) ? (
              <p className="mt-1 text-sm text-gray-600">
                {selectedGoogleBusiness?.formattedAddress ?? currentBusinessMatch?.formattedAddress}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-700">
              <span>
                Rating:{" "}
                {selectedGoogleBusiness?.rating ?? currentBusinessMatch?.rating ?? "Not available"}
              </span>
              <span>
                Reviews:{" "}
                {selectedGoogleBusiness?.reviewCount ?? currentBusinessMatch?.reviewCount ?? "Not available"}
              </span>
            </div>

            {(selectedGoogleBusiness?.googleBusinessUrl ?? currentBusinessMatch?.googleBusinessUrl) ? (
              <a
                href={selectedGoogleBusiness?.googleBusinessUrl ?? currentBusinessMatch?.googleBusinessUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View Google Business Profile
              </a>
            ) : null}
          </div>

          {showBusinessCandidates ? (
            <div className="mt-5 space-y-3">
              {isLoadingCandidates ? (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
    Searching for business listings...
  </div>
) : dynamicBusinessCandidates.length > 0 ? (
  dynamicBusinessCandidates.map((candidate, index) => (
                  <div
                    key={`${candidate.placeId ?? candidate.googleBusinessUrl ?? candidate.name}-${index}`}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {candidate.name}
                        </p>
                        {candidate.formattedAddress ? (
                          <p className="mt-1 text-sm text-gray-600">
                            {candidate.formattedAddress}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700">
                          <span>Rating: {candidate.rating ?? "Not available"}</span>
                          <span>Reviews: {candidate.reviewCount ?? "Not available"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoogleBusiness({
                            placeId: candidate.placeId,
                            name: candidate.name,
                            formattedAddress: candidate.formattedAddress,
                            googleBusinessUrl: candidate.googleBusinessUrl,
                            rating: candidate.rating,
                            reviewCount: candidate.reviewCount,
                          });

                                                    setFormData((prev) => ({
                            ...prev,
                            googleBusinessProfileUrl: candidate.googleBusinessUrl ?? "",
                            googlePlaceId: candidate.placeId ?? "",
                            googleRating:
                              typeof candidate.rating === "number"
                                ? candidate.rating
                                : "",
                            googleReviewCount:
                              typeof candidate.reviewCount === "number"
                                ? candidate.reviewCount
                                : "",
                          }));
                          setShowBusinessCandidates(false);
                        }}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Use this listing
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  No alternate Google listings were found for this business.
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
  {isFinalizeMode ? "Recommendation Setup" : "Settings"}
</p>
<h1 className="mt-2 text-3xl font-bold text-gray-900">
  {isFinalizeMode ? "Finalize your recommendation inputs" : "Workspace Settings"}
</h1>
<p className="mt-2 text-gray-600">
  {isFinalizeMode
    ? "Confirm the pricing, budget, and business profile inputs that MarketForge uses to calculate opportunity value, prioritize actions, and prepare your first recommendations."
    : "Review and update the business information that powers your MarketForge workspace."}
</p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 md:flex-row md:items-center">
                    <div className="flex h-24 min-w-[140px] max-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white px-3">
            {formData.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.logoUrl}
                alt={`${formData.businessName || workspaceName} logo`}
                className="max-h-16 w-auto max-w-full object-contain"
              />
            ) : (
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                No Logo
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {formData.businessName || workspaceName}
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isDemo
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isDemo ? "Demo Workspace" : "Live Workspace"}
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
              <p>
                <span className="font-medium text-gray-800">Industry:</span>{" "}
                {formData.industryLabel || formData.industry || "Not set"}
              </p>
              <p>
                <span className="font-medium text-gray-800">Location:</span>{" "}
                {locationLine || "Not set"}
              </p>
              <p>
                <span className="font-medium text-gray-800">Phone:</span>{" "}
                {formData.phone || "Not set"}
              </p>
              <p>
                <span className="font-medium text-gray-800">Website:</span>{" "}
                {formData.website || "Not set"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Account</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Primary Email">
            <input
              disabled
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700"
              value={primaryEmail ?? ""}
            />
          </Field>

          <div className="flex items-end text-sm text-gray-600">
            This email is used for login and notifications.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Business Profile</h2>
            <SectionSaveButton onSave={handleSave} isPending={isPending} />
        <p className="mt-1 text-sm text-gray-600">
          These details define how MarketForge understands your business and local market.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Business Name">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
            />
          </Field>

          <Field label="Industry Label">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.industryLabel}
              onChange={(e) => updateField("industryLabel", e.target.value)}
            />
          </Field>

          <Field label="Website">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.website}
              onChange={(e) => updateField("website", e.target.value)}
            />
          </Field>

          <Field label="Logo URL">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.logoUrl}
              onChange={(e) => updateField("logoUrl", e.target.value)}
            />
          </Field>

          <Field label="Phone">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.phone}
              onChange={(e) => updateField("phone", formatPhone(e.target.value))}
            />
          </Field>

          <Field label="Brand Tone">
            <select
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.brandTone ?? "PROFESSIONAL"}
              onChange={(e) =>
                updateField(
                  "brandTone",
                  e.target.value as OnboardingFormData["brandTone"]
                )
              }
            >
              <option value="PROFESSIONAL">Professional</option>
              <option value="FRIENDLY">Friendly</option>
              <option value="URGENT">Urgent</option>
              <option value="LOCAL">Local</option>
            </select>
          </Field>

          <Field label="City">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
          </Field>

          <Field label="State">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.state}
              onChange={(e) => updateField("state", e.target.value)}
            />
          </Field>

          <Field label="Service Area">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.serviceArea}
              onChange={(e) => updateField("serviceArea", e.target.value)}
            />
          </Field>

          <Field label="Service Area Radius (miles)">
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.serviceAreaRadiusMiles}
              onChange={(e) =>
                updateField(
                  "serviceAreaRadiusMiles",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Capacity and Goals</h2>
            <SectionSaveButton onSave={handleSave} isPending={isPending} />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Average Job Value"
            helpText="MarketForge uses this as the default value estimate until service-level pricing is available for a specific opportunity."
          >
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.averageJobValue}
              onChange={(e) =>
                updateField(
                  "averageJobValue",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </Field>

          <Field label="Highest Priority Service">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.highestMarginService}
              onChange={(e) =>
                updateField("highestMarginService", e.target.value)
              }
            />
          </Field>

          <Field label="Lowest Priority Service">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.lowestPriorityService}
              onChange={(e) =>
                updateField("lowestPriorityService", e.target.value)
              }
            />
          </Field>

          <Field label="Technicians">
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.technicians}
              onChange={(e) =>
                updateField(
                  "technicians",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </Field>

          <Field label="Jobs per Technician per Day">
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.jobsPerTechnicianPerDay}
              onChange={(e) =>
                updateField(
                  "jobsPerTechnicianPerDay",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </Field>

          <Field label="Weekly Capacity">
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.weeklyCapacity}
              onChange={(e) =>
                updateField(
                  "weeklyCapacity",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </Field>

          <Field label="Target Weekly Revenue">
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.targetWeeklyRevenue}
              onChange={(e) =>
                updateField(
                  "targetWeeklyRevenue",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </Field>
          <Field
              label="Monthly Action Budget"
              helpText="Confirm the amount you can typically invest each month in marketing, promotions, and growth actions. You can adjust it any time."
              >
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.monthlyActionBudget}
              onChange={(e) =>
                updateField(
                  "monthlyActionBudget",
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </Field>
        </div>
      </section>

      <section
  id="service-pricing"
  className={`rounded-2xl bg-white p-6 shadow-sm ${
    isFinalizeMode && focusSection === "service-pricing"
      ? "border-2 border-blue-400 ring-4 ring-blue-100"
      : "border border-gray-200"
  }`}
>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Service Pricing</h2>
                <SectionSaveButton onSave={handleSave} isPending={isPending} />
            <p className="mt-1 text-sm text-gray-600">
              Set, confirm, or add average revenue by service so MarketForge can calculate
              realistic opportunity value. If a service does not have a specific price,
              the system falls back to your average job value.
            </p>
          </div>

          <button
            type="button"
            onClick={addServicePricingRow}
            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 font-medium text-blue-700 hover:bg-blue-100"
          >
            Add Service Price
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {(formData.servicePricing ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              No service-level pricing added yet. MarketForge will fall back to
              your average job value until these are filled in.
            </div>
          ) : null}

         {(formData.servicePricing ?? []).map((row, index) => (
  <div
    key={`service-pricing-row-${index}`}
    className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]"
  >
              <Field label="Service Name">
                <input
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  value={row.serviceName}
                  onChange={(e) =>
                    updateServicePricing(index, "serviceName", e.target.value)
                  }
                />
              </Field>

              <Field label="Average Revenue">
                <input
                  type="number"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                  value={row.averageRevenue}
                  onChange={(e) =>
                    updateServicePricing(
                      index,
                      "averageRevenue",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </Field>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeServicePricingRow(index)}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          Services and Seasonality
        </h2>
            <SectionSaveButton onSave={handleSave} isPending={isPending} />
        <div className="mt-6 grid grid-cols-1 gap-4">
          <Field
  label="Preferred Services (comma separated)"
  helpText="These services also drive the default rows in Service Pricing."
>
  <input
    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
    value={preferredServicesInput}
    onChange={(e) => setPreferredServicesInput(e.target.value)}
        onBlur={() => {
      const nextPreferredServices = parseCommaSeparated(preferredServicesInput);

      setFormData((prev) => ({
        ...prev,
        preferredServices: nextPreferredServices,
        primaryServices: nextPreferredServices,
        servicePricing: normalizeServicePricingRows(
          nextPreferredServices,
          prev.servicePricing ?? []
        ),
      }));
    }}
  />
</Field>

          <Field label="Deprioritized Services (comma separated)">
  <input
    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
    value={deprioritizedServicesInput}
    onChange={(e) => setDeprioritizedServicesInput(e.target.value)}
    onBlur={() =>
      updateField(
        "deprioritizedServices",
        parseCommaSeparated(deprioritizedServicesInput)
      )
    }
  />
</Field>

          <Field label="Busy Months (comma separated)">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={arrayToCommaSeparated(formData.busyMonths)}
              onChange={(e) =>
                updateField("busyMonths", parseCommaSeparated(e.target.value))
              }
            />
          </Field>

          <Field label="Slow Months (comma separated)">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={arrayToCommaSeparated(formData.slowMonths)}
              onChange={(e) =>
                updateField("slowMonths", parseCommaSeparated(e.target.value))
              }
            />
          </Field>

          <Field label="Seasonality Notes">
            <textarea
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.seasonalityNotes}
              onChange={(e) =>
                updateField("seasonalityNotes", e.target.value)
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Web Presence</h2>
            <SectionSaveButton onSave={handleSave} isPending={isPending} />
        <p className="mt-1 text-sm text-gray-600">
  These signals help MarketForge evaluate your digital visibility and
  identify SEO, AEO, and local search opportunities.
</p>
        <div className="mt-6 grid grid-cols-1 gap-4">
          <Field
            label="Google Business Profile URL"
            helpText="This helps MarketForge improve local visibility analysis and future lead attribution."
          >
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.googleBusinessProfileUrl}
              onChange={(e) =>
                updateField("googleBusinessProfileUrl", e.target.value)
              }
            />
          </Field>

          <Field label="Service Page URLs (comma separated)">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={arrayToCommaSeparated(formData.servicePageUrls)}
              onChange={(e) =>
                updateField("servicePageUrls", parseCommaSeparated(e.target.value))
              }
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              ["hasServicePages", "Has service pages"],
              ["hasFaqContent", "Has FAQ content"],
              ["hasBlog", "Has blog"],
              ["hasGoogleBusinessPage", "Has Google Business page"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800"
              >
                <input
                  type="checkbox"
                  checked={Boolean(formData[key as keyof OnboardingFormData])}
                  onChange={(e) =>
                    updateField(
                      key as keyof OnboardingFormData,
                      e.target.checked as never
                    )
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Competitors</h2>
                <SectionSaveButton onSave={handleSave} isPending={isPending} />
            <p className="mt-1 text-sm text-gray-600">
  Refine the competitor list detected during onboarding so MarketForge
  can better understand your local competitive landscape and identify
  opportunities where competitors are inactive or weak.
</p>
          </div>

          <button
            type="button"
            onClick={addCompetitor}
            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 font-medium text-blue-700 hover:bg-blue-100"
          >
            Add Competitor
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {formData.competitors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              No competitors added yet.
            </div>
          ) : null}

          {formData.competitors.map((competitor, index) => (
            <div
              key={index}
              className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="font-semibold text-gray-900">
                  Competitor {index + 1}
                </h3>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => makePrimaryCompetitor(index)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      competitor.isPrimaryCompetitor
                        ? "bg-emerald-100 text-emerald-800"
                        : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {competitor.isPrimaryCompetitor
                      ? "Primary Competitor"
                      : "Make Primary"}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeCompetitor(index)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Competitor Name">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    value={competitor.name}
                    onChange={(e) =>
                      updateCompetitor(index, "name", e.target.value)
                    }
                  />
                </Field>

                <Field label="Website URL">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    value={competitor.websiteUrl}
                    onChange={(e) =>
                      updateCompetitor(index, "websiteUrl", e.target.value)
                    }
                  />
                </Field>

                <Field label="Google Business URL">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    value={competitor.googleBusinessUrl}
                    onChange={(e) =>
                      updateCompetitor(index, "googleBusinessUrl", e.target.value)
                    }
                  />
                </Field>

                <Field label="Logo URL">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                    value={competitor.logoUrl}
                    onChange={(e) =>
                      updateCompetitor(index, "logoUrl", e.target.value)
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Billing and Subscription
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Review your current workspace billing state and subscription
              details. Subscription controls will be added next.
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getWorkspaceStatusClasses(
              workspaceStatus
            )}`}
          >
            {formatWorkspaceStatusLabel(workspaceStatus)}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Workspace Type
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {isDemo ? "Demo Workspace" : "Live Workspace"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Current Plan
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {billingPlanLabel}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Current Period End
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {formatBillingDate(billingCurrentPeriodEnd)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cancel at Period End
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {cancelAtPeriodEnd ? "Scheduled" : "Not Scheduled"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Stripe Customer
            </p>
            <p className="mt-2 break-all text-sm font-medium text-gray-900">
              {stripeCustomerId ?? "Not connected"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Stripe Subscription
            </p>
            <p className="mt-2 break-all text-sm font-medium text-gray-900">
              {stripeSubscriptionId ?? "Not connected"}
            </p>
          </div>
        </div>

        {workspaceStatus === "PAST_DUE" ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Billing action is required. This workspace is currently past due.
            Payment method update and recovery controls will be added in the
            next billing batch.
          </div>
        ) : null}

        {workspaceStatus === "CANCELED" ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            This subscription has been canceled. Reactivation controls will be
            added in the next billing batch.
          </div>
        ) : null}

        {cancelAtPeriodEnd && workspaceStatus === "ACTIVE" ? (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            This subscription is scheduled to end at the end of the current
            billing period. Access remains available until then.
          </div>
        ) : null}
                <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleUpdatePaymentMethod}
            disabled={isBillingPending || !stripeCustomerId}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              isBillingPending || !stripeCustomerId
                ? "cursor-not-allowed bg-slate-400"
                : "bg-slate-700 hover:bg-slate-800"
            }`}
          >
            Update Payment Method
          </button>

          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={isBillingPending || !stripeCustomerId}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              isBillingPending || !stripeCustomerId
                ? "cursor-not-allowed bg-slate-400"
                : "bg-slate-700 hover:bg-slate-800"
            }`}
          >
            Manage Subscription
          </button>
        </div>
                <div className="mt-6 flex flex-wrap gap-3">
          {workspaceStatus === "ACTIVE" && !cancelAtPeriodEnd ? (
            <button
              type="button"
              onClick={handleCancelSubscription}
              disabled={isBillingPending}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                isBillingPending
                  ? "cursor-not-allowed bg-red-300"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Cancel at Period End
            </button>
          ) : null}

          {workspaceStatus === "ACTIVE" && cancelAtPeriodEnd ? (
            <button
              type="button"
              onClick={handleResumeSubscription}
              disabled={isBillingPending}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                isBillingPending
                  ? "cursor-not-allowed bg-blue-300"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Resume Subscription
            </button>
          ) : null}
        </div>

        {billingError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {billingError}
          </div>
        ) : null}
      </section>

      {(saveMessage || saveError) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            saveError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {saveError || saveMessage}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={`rounded-lg px-6 py-3 font-medium text-white ${
            isPending
              ? "cursor-not-allowed bg-blue-400"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isPending
  ? "Saving..."
  : isFinalizeMode
    ? "Continue to Command Center"
    : "Save Settings"}
        </button>
      </div>
    </div>
    <SystemStatusOverlay
      mode="refreshing"
      visible={showRefreshingOverlay}
    />
  </>
);
}