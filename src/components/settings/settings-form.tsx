"use client";

import { useMemo, useState, useTransition } from "react";
import type { OnboardingFormData } from "@/types/onboarding";
import { saveSettings } from "@/app/settings/actions";

type Props = {
  workspaceName: string;
  isDemo: boolean;
  initialData: OnboardingFormData;
  primaryEmail: string | null;
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

export function SettingsForm({
  workspaceName,
  isDemo,
  initialData,
  primaryEmail,
}: Props) {
  const [formData, setFormData] = useState<OnboardingFormData>(() => ({
    ...initialData,
    servicePricing: normalizeServicePricingRows(
      initialData.preferredServices ?? [],
      initialData.servicePricing ?? []
    ),
  }));

  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

      return {
        ...prev,
        servicePricing: currentRows,
      };
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
    setFormData((prev) => ({
      ...prev,
      servicePricing: (prev.servicePricing ?? []).filter((_, i) => i !== index),
    }));
  }

  function handleSave() {
    setSaveMessage(null);
    setSaveError(null);

    startTransition(async () => {
      try {
        const result = await saveSettings({
          ...formData,
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
          return;
        }

        setSaveMessage("Settings saved successfully.");
      } catch (error) {
        console.error(error);
        setSaveError("Something went wrong while saving settings.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Workspace Settings
        </h1>
        <p className="mt-2 text-gray-600">
          Review and update the business information that powers your
          MarketForge workspace.
        </p>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 md:flex-row md:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {formData.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.logoUrl}
                alt={`${formData.businessName || workspaceName} logo`}
                className="h-full w-full object-contain p-2"
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

          <Field label="Highest Margin Service">
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

          <Field label="Target Booked Jobs per Week">
            <input
              type="number"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={formData.targetBookedJobsPerWeek ?? ""}
              onChange={(e) =>
                updateField(
                  "targetBookedJobsPerWeek",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Service Pricing</h2>
            <p className="mt-1 text-sm text-gray-600">
              Set average revenue by service so MarketForge can calculate more
              credible opportunity value and avoid overstating revenue impact.
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
              key={`${row.serviceName || "service"}-${index}`}
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
        <div className="mt-6 grid grid-cols-1 gap-4">
          <Field
            label="Preferred Services (comma separated)"
            helpText="These services also drive the default rows in Service Pricing."
          >
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={arrayToCommaSeparated(formData.preferredServices)}
              onChange={(e) =>
                updateField("preferredServices", parseCommaSeparated(e.target.value))
              }
            />
          </Field>

          <Field label="Deprioritized Services (comma separated)">
            <input
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
              value={arrayToCommaSeparated(formData.deprioritizedServices)}
              onChange={(e) =>
                updateField(
                  "deprioritizedServices",
                  parseCommaSeparated(e.target.value)
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
            <p className="mt-1 text-sm text-gray-600">
              Refine the competitor list detected during onboarding so
              MarketForge has accurate local market context.
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
        <h2 className="text-xl font-bold text-gray-900">
          Billing and Subscription
        </h2>
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="font-medium text-gray-900">Coming soon</p>
          <p className="mt-1 text-sm text-gray-600">
            Billing details, subscription plan management, and payment methods
            will appear here in a future release.
          </p>
        </div>
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
          {isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}