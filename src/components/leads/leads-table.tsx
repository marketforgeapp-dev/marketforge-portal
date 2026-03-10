import { Lead, Campaign, RevenueOpportunity } from "@/generated/prisma";
import { LeadStatusSelect } from "./lead-status-select";

type LeadRow = Lead & {
  campaign: Campaign | null;
  revenueOpportunity: RevenueOpportunity | null;
};

type Props = {
  leads: LeadRow[];
};

export function LeadsTable({ leads }: Props) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-gray-900">No leads yet</p>
        <p className="mt-2 text-sm text-gray-600">
          Once campaigns begin generating responses, leads will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Lead
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Contact
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Campaign
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Opportunity
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Status
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Notes
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-gray-200 align-top">
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-900">{lead.leadName}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Created {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  <div>{lead.phone ?? "—"}</div>
                  <div className="mt-1">{lead.email ?? "—"}</div>
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  {lead.campaign?.name ?? lead.source ?? "—"}
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  {lead.revenueOpportunity?.title ?? "—"}
                </td>

                <td className="px-5 py-4">
                  <LeadStatusSelect
                    leadId={lead.id}
                    currentStatus={lead.status}
                  />
                </td>

                <td className="px-5 py-4 text-sm leading-6 text-gray-700">
                  {lead.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}