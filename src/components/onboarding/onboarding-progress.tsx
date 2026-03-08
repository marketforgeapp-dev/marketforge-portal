type OnboardingProgressProps = {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
};

export function OnboardingProgress({
  currentStep,
  totalSteps,
  stepLabels,
}: OnboardingProgressProps) {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Step {currentStep + 1} of {totalSteps}
          </p>
          <h2 className="text-xl font-semibold text-gray-900">
            {stepLabels[currentStep]}
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          {Math.round(progressPercent)}% complete
        </p>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-4">
        {stepLabels.map((label, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <div
              key={label}
              className={`rounded-lg border px-3 py-2 text-xs text-center ${
                isActive
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : isComplete
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-500"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}