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

  <div>
  <p className="mb-3 text-sm text-slate-400">
    Optional: tell MarketForge which services are highest priority or lowest
    priority for your business. This helps fine-tune recommendation selection,
    but you can skip it and let the system decide.
  </p>

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

        <Field label="Highest Priority Service">
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
            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-sm font-medium text-white">
          General Service / Maintenance Controls
        </p>

        <p className="mt-2 text-xs leading-5 text-slate-400">
          These controls apply only to broad general-service or maintenance-style
          actions, not to specific named services like leak repair or water heater
          replacement.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={Boolean(formData.promoteGeneralServiceActions)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  promoteGeneralServiceActions: e.target.checked,
                }))
              }
              className="mt-1"
            />
            <div>
              <p className="font-medium text-white">
                Promote general service / maintenance actions
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Turn this on only if you want MarketForge to surface broad
                general-service or maintenance-style opportunities.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={Boolean(formData.generalServiceHandledByPartner)}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  generalServiceHandledByPartner: e.target.checked,
                }))
              }
              className="mt-1"
            />
            <div>
              <p className="font-medium text-white">
                General service / maintenance is handled by a third party
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Turn this on if broad service or maintenance work is handled by
                an outside partner.
              </p>
            </div>
          </label>
        </div>
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