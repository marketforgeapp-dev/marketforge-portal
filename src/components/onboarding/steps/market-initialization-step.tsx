import { OnboardingFormData } from "@/types/onboarding";

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MarketInitializationStep({ formData, setFormData }: Props) {
  const toggleMonth = (field: "busyMonths" | "slowMonths", month: string) => {
    setFormData((prev) => {
      const values = prev[field];
      const nextValues = values.includes(month)
        ? values.filter((m) => m !== month)
        : [...values, month];

      return { ...prev, [field]: nextValues };
    });
  };

  return (
    <div className="space-y-8">
      <MonthSection
        title="Busy Months"
        selected={formData.busyMonths}
        onToggle={(month) => toggleMonth("busyMonths", month)}
      />

      <MonthSection
        title="Slow Months"
        selected={formData.slowMonths}
        onToggle={(month) => toggleMonth("slowMonths", month)}
      />

      <label className="block">
        <span className="block text-sm font-medium text-gray-700 mb-2">
          Seasonality Notes
        </span>
        <textarea
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
          value={formData.seasonalityNotes}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              seasonalityNotes: e.target.value,
            }))
          }
        />
      </label>
    </div>
  );
}

function MonthSection({
  title,
  selected,
  onToggle,
}: {
  title: string;
  selected: string[];
  onToggle: (month: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {MONTHS.map((month) => {
          const active = selected.includes(month);

          return (
            <button
              key={month}
              type="button"
              onClick={() => onToggle(month)}
              className={`rounded-full border px-4 py-2 text-sm ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
            >
              {month}
            </button>
          );
        })}
      </div>
    </div>
  );
}