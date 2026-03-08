export function RightRail() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Competitor Intelligence
          </p>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            Live Signals
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              Masterflo Plumbing
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Strong local trust and steady visibility. No recent drain cleaning
              promotion detected.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              Superior Plumbing
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Broad metro visibility with heavier paid acquisition footprint.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Market Signals
          </p>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            This Week
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Drain cleaning demand up 18%
            </p>
            <p className="mt-1 text-sm leading-6 text-green-800">
              Jasper and Canton are showing stronger local intent for urgent
              plumbing service.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">
              Capacity available this week
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Estimated room for 4–6 additional booked jobs based on current
              schedule assumptions.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              AEO gap remains open
            </p>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              BluePeak still lacks FAQ coverage for high-intent local plumbing
              questions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}