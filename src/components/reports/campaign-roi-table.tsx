import { Campaign, AttributionEntry } from "@/generated/prisma";

type Row = {
  campaign: Campaign;
  attribution?: AttributionEntry;
};

type Props = {
  rows: Row[];
};

export function CampaignRoiTable({ rows }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-5 py-3 text-xs text-gray-600 uppercase">
              Campaign
            </th>
            <th className="px-5 py-3 text-xs text-gray-600 uppercase">
              Leads
            </th>
            <th className="px-5 py-3 text-xs text-gray-600 uppercase">
              Jobs
            </th>
            <th className="px-5 py-3 text-xs text-gray-600 uppercase">
              Revenue
            </th>
            <th className="px-5 py-3 text-xs text-gray-600 uppercase">
              ROI
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const entry = row.attribution;

            return (
              <tr key={row.campaign.id} className="border-t border-gray-200">
                <td className="px-5 py-4 font-medium text-gray-900">
                  {row.campaign.name}
                </td>

                <td className="px-5 py-4 text-gray-700">
                  {entry?.leadsGenerated ?? "—"}
                </td>

                <td className="px-5 py-4 text-gray-700">
                  {entry?.bookedJobs ?? "—"}
                </td>

                <td className="px-5 py-4 text-gray-700">
                  ${Number(entry?.revenue ?? 0).toLocaleString()}
                </td>

                <td className="px-5 py-4 text-gray-700">
                  {entry?.roi ?? "—"}x
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}