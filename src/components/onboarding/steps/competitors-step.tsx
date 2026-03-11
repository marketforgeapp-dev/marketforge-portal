import { OnboardingFormData } from "@/types/onboarding";

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

export function CompetitorsStep({ formData, setFormData }: Props) {
  const addCompetitor = () => {
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
  };

  const updateCompetitor = (
    index: number,
    field:
      | "name"
      | "websiteUrl"
      | "googleBusinessUrl"
      | "logoUrl"
      | "isPrimaryCompetitor",
    value: string | boolean
  ) => {
    setFormData((prev) => {
      const updated = [...prev.competitors];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return { ...prev, competitors: updated };
    });
  };

  const removeCompetitor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-4">
      {formData.competitors.map((competitor, index) => (
        <div
          key={index}
          className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Competitor {index + 1}
            </h3>
            <button
              type="button"
              onClick={() => removeCompetitor(index)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Competitor Name">
              <input
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900"
                value={competitor.name}
                onChange={(e) => updateCompetitor(index, "name", e.target.value)}
              />
            </Field>

            <Field label="Website">
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
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCompetitor}
        className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 font-medium text-blue-700 hover:bg-blue-100"
      >
        Add Competitor
      </button>
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
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}