"use client";

import { useState } from "react";
import { OnboardingFormData } from "@/types/onboarding";

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

export function ServicesStep({ formData, setFormData }: Props) {
  const [serviceInput, setServiceInput] = useState("");

  const addService = () => {
    const trimmed = serviceInput.trim();
    if (!trimmed) return;
    if (formData.primaryServices.includes(trimmed)) return;

    setFormData((prev) => ({
      ...prev,
      primaryServices: [...prev.primaryServices, trimmed],
    }));
    setServiceInput("");
  };

  const removeService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      primaryServices: prev.primaryServices.filter((item) => item !== service),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Services
        </label>

        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            placeholder="Add a service"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
          />
          <button
            type="button"
            onClick={addService}
            className="rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.primaryServices.map((service) => (
            <span
              key={service}
              className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-sm text-blue-700 border border-blue-200"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Average Job Value">
          <input
            type="number"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
            value={formData.averageJobValue}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                averageJobValue: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </Field>

        <Field label="Highest Margin Service">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
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
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
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
      <span className="block text-sm font-medium text-gray-700 mb-2">{label}</span>
      {children}
    </label>
  );
}