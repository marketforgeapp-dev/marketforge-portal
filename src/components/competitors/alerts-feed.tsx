import { IntelligenceAlert } from "@/generated/prisma";

type Props = {
  alerts: IntelligenceAlert[];
};

export function AlertsFeed({ alerts }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Market Intelligence Alerts
      </p>

      <div className="mt-4 space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {alert.title}
              </p>

              <span className="text-xs font-medium text-gray-600">
                {alert.alertType.replaceAll("_", " ")}
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-700">
              {alert.description}
            </p>

            {alert.recommendedAction && (
              <p className="mt-2 text-sm font-medium text-blue-700">
                Suggested: {alert.recommendedAction}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}