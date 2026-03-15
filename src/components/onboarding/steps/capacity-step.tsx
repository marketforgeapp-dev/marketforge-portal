import { OnboardingFormData } from "@/types/onboarding";

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

function calculateWeeklyCapacity(
  technicians: number | "",
  jobsPerTechnicianPerDay: number | ""
): number | "" {
  if (typeof technicians !== "number" || typeof jobsPerTechnicianPerDay !== "number") {
    return "";
  }

  if (!Number.isFinite(technicians) || !Number.isFinite(jobsPerTechnicianPerDay)) {
    return "";
  }

  return technicians * jobsPerTechnicianPerDay * 5;
}

export function CapacityStep({ formData, setFormData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Technicians">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
          value={formData.technicians}
          onChange={(e) =>
            setFormData((prev) => {
              const nextTechnicians =
                e.target.value === "" ? "" : Number(e.target.value);

              const previousDerived = calculateWeeklyCapacity(
                prev.technicians,
                prev.jobsPerTechnicianPerDay
              );

              const shouldAutoUpdateWeeklyCapacity =
                prev.weeklyCapacity === "" || prev.weeklyCapacity === previousDerived;

              return {
                ...prev,
                technicians: nextTechnicians,
                weeklyCapacity: shouldAutoUpdateWeeklyCapacity
                  ? calculateWeeklyCapacity(
                      nextTechnicians,
                      prev.jobsPerTechnicianPerDay
                    )
                  : prev.weeklyCapacity,
              };
            })
          }
        />
      </Field>

      <Field label="Jobs per Technician per Day">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
          value={formData.jobsPerTechnicianPerDay}
          onChange={(e) =>
            setFormData((prev) => {
              const nextJobsPerTechnicianPerDay =
                e.target.value === "" ? "" : Number(e.target.value);

              const previousDerived = calculateWeeklyCapacity(
                prev.technicians,
                prev.jobsPerTechnicianPerDay
              );

              const shouldAutoUpdateWeeklyCapacity =
                prev.weeklyCapacity === "" || prev.weeklyCapacity === previousDerived;

              return {
                ...prev,
                jobsPerTechnicianPerDay: nextJobsPerTechnicianPerDay,
                weeklyCapacity: shouldAutoUpdateWeeklyCapacity
                  ? calculateWeeklyCapacity(
                      prev.technicians,
                      nextJobsPerTechnicianPerDay
                    )
                  : prev.weeklyCapacity,
              };
            })
          }
        />
      </Field>

      <Field label="Weekly Capacity">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
          value={formData.weeklyCapacity}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              weeklyCapacity: e.target.value === "" ? "" : Number(e.target.value),
            }))
          }
        />
        <p className="mt-2 text-xs text-gray-500">
  MarketForge uses capacity to determine whether the business needs more demand,
  easier-to-book jobs, or higher-value work. This defaults to technicians × jobs
  per technician per day × 5 days per week, but you can override it if your real
  weekly capacity is different.
</p>
      </Field>

      <Field label="Target Weekly Revenue">
        <input
          type="number"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
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
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}