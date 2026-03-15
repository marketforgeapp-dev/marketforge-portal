import { OnboardingFormData } from "@/types/onboarding";

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

export function BusinessInfoStep({ formData, setFormData }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Business Name">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.businessName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, businessName: e.target.value }))
            }
          />
        </Field>

        <Field label="Website">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            placeholder="https://..."
            value={formData.website}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, website: e.target.value }))
            }
          />
        </Field>

        <Field label="Phone">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.phone}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
          />
        </Field>

        <Field label="City">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.city}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, city: e.target.value }))
            }
          />
        </Field>

        <Field label="State">
          <input
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.state}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, state: e.target.value }))
            }
          />
        </Field>

        <Field label="Service Area Radius (miles)">
          <input
            type="number"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
            value={formData.serviceAreaRadiusMiles}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                serviceAreaRadiusMiles: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </Field>
      </div>

      <Field label="Industry">
        <select
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
          value={formData.industry}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              industry: e.target.value as OnboardingFormData["industry"],
            }))
          }
        >
          <option value="">Select industry</option>
          <option value="PLUMBING">Plumbing</option>
          <option value="HVAC">HVAC</option>
          <option value="SEPTIC">Septic</option>
          <option value="TREE_SERVICE">Tree Service</option>
        </select>
      </Field>
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