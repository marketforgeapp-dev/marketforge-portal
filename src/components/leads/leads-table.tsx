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
      <div className="mf-card rounded-3xl p-5">
        <p className="text-lg font-semibold text-gray-900">No leads yet</p>
        <p className="mt-2 text-sm text-gray-600">
          Use the Add Phone Lead workflow above to log incoming calls, website
          forms, and manually captured opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
          Lead Pipeline
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                Lead
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                Contact
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                Source
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                Linked Action
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                Status
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                Revenue
              </th>
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">
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
                  {lead.source ?? "—"}
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  {lead.campaign?.name ?? "—"}
                </td>

                <td className="px-5 py-4">
                  <LeadStatusSelect
                    leadId={lead.id}
                    currentStatus={lead.status}
                    currentBookedRevenue={
                      lead.bookedRevenue ? Number(lead.bookedRevenue) : null
                    }
                  />
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  {lead.bookedRevenue ? (
                    <div>
                      <p className="font-semibold text-emerald-700">
                        ${Number(lead.bookedRevenue).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {lead.bookedAt
                          ? `Booked ${new Date(lead.bookedAt).toLocaleDateString()}`
                          : "Booked"}
                      </p>
                    </div>
                  ) : (
                    "—"
                  )}
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