import { OnboardingFormData } from "@/types/onboarding";

type Props = {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
};

export function WebsiteSeoStep({ formData, setFormData }: Props) {
  return (
  <div className="space-y-6">
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-900">
        Local visibility signals
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        These inputs help MarketForge assess your local search visibility and
        identify opportunities related to service pages, FAQs, and Google
        Business Profile strength.
      </p>
    </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Toggle
          label="Has Service Pages"
          checked={formData.hasServicePages}
          onChange={(checked) =>
            setFormData((prev) => ({ ...prev, hasServicePages: checked }))
          }
        />

        <Toggle
          label="Has FAQ Content"
          checked={formData.hasFaqContent}
          onChange={(checked) =>
            setFormData((prev) => ({ ...prev, hasFaqContent: checked }))
          }
        />

        <Toggle
          label="Has Blog"
          checked={formData.hasBlog}
          onChange={(checked) =>
            setFormData((prev) => ({ ...prev, hasBlog: checked }))
          }
        />

        <Toggle
          label="Has Google Business Page"
          checked={formData.hasGoogleBusinessPage}
          onChange={(checked) =>
            setFormData((prev) => ({ ...prev, hasGoogleBusinessPage: checked }))
          }
        />
     </div>

      <label className="block">
  <span className="block text-sm font-medium text-gray-700 mb-2">
    Google Business Profile URL
  </span>
  <input
    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-white"
    value={formData.googleBusinessProfileUrl}
    onChange={(e) =>
      setFormData((prev) => ({
        ...prev,
        googleBusinessProfileUrl: e.target.value,
      }))
    }
  />
  <p className="mt-2 text-xs text-gray-500">
    Providing your Google Business Profile helps MarketForge evaluate local
    visibility and competitor positioning more accurately.
  </p>
</label>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}