"use client";

import { useState } from "react";
import { OnboardingFormData } from "@/types/onboarding";
import { mergeAndDedupeServicesForIndustry } from "@/lib/service-normalization";
import type { SupportedIndustry } from "@/lib/industry-service-map";

function resolveSupportedIndustry(
  industry: OnboardingFormData["industry"]
): SupportedIndustry {
  if (industry === "SEPTIC") return "SEPTIC";
  if (industry === "TREE_SERVICE") return "TREE_SERVICE";
  if (industry === "HVAC") return "HVAC";
  return "PLUMBING";
}

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

export function ServicesStep({ formData, setFormData }: Props) {
  const [serviceInput, setServiceInput] = useState("");

  const addService = () => {
    const parsedServices = serviceInput
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (parsedServices.length === 0) return;

    setFormData((prev) => {
            const mergedServices = mergeAndDedupeServicesForIndustry({
        industry: resolveSupportedIndustry(prev.industry),
        groups: [prev.primaryServices, parsedServices],
        max: 20,
      });

      return {
        ...prev,
        primaryServices: mergedServices,
        preferredServices: mergedServices,
      };
    });

    setServiceInput("");
  };

  const removeService = (service: string) => {
    setFormData((prev) => {
      const nextPrimary = prev.primaryServices.filter((item) => item !== service);
      const nextPreferred = prev.preferredServices.filter((item) => item !== service);

      return {
        ...prev,
        primaryServices: nextPrimary,
        preferredServices: nextPreferred,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Primary Services
        </label>

        <div className="mb-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-white"
            placeholder="Add a service or paste multiple separated by commas"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
          />
          <button
            type="button"
            onClick={addService}
            className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-400">
          MarketForge normalizes and deduplicates services automatically so variant
          spelling and capitalization do not create duplicates.
        </p>

        <div className="flex flex-wrap gap-2">
          {formData.primaryServices.map((service) => (
            <span
              key={service}
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700"
            >
              {service}
              <button
                type="button"
                onClick={() => removeService(service)}
                className="text-blue-700 hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Average Job Value">
          <input
            type="number"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.averageJobValue}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                averageJobValue: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
          <p className="mt-2 text-xs text-slate-400">
            Detailed service-level pricing can be added later in Settings to improve
            revenue projections and opportunity scoring.
          </p>
        </Field>

        <Field label="Highest Margin Service">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.highestMarginService}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                highestMarginService: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Lowest Priority Service">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.lowestPriorityService}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                lowestPriorityService: e.target.value,
              }))
            }
          />
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}