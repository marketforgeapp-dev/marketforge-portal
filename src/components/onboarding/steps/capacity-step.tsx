import { OnboardingFormData } from "@/types/onboarding";

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

export function CapacityStep({ formData, setFormData }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Technicians">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
          value={formData.technicians}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              technicians: e.target.value === "" ? "" : Number(e.target.value),
            }))
          }
        />
      </Field>

      <Field label="Jobs per Technician per Day">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
          value={formData.jobsPerTechnicianPerDay}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              jobsPerTechnicianPerDay:
                e.target.value === "" ? "" : Number(e.target.value),
            }))
          }
        />
      </Field>

      <Field label="Weekly Capacity">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
          value={formData.weeklyCapacity}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              weeklyCapacity: e.target.value === "" ? "" : Number(e.target.value),
            }))
          }
        />
      </Field>

      <Field label="Target Weekly Revenue">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
          value={formData.targetWeeklyRevenue}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              targetWeeklyRevenue:
                e.target.value === "" ? "" : Number(e.target.value),
            }))
          }
        />
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