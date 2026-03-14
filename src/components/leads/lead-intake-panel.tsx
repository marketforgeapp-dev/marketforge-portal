"use client";

import { useState, useTransition } from "react";
import { createLead } from "@/app/leads/actions";

type CampaignOption = {
  id: string;
  name: string;
};

type Props = {
  campaigns: CampaignOption[];
  workspaceId: string;
};

const SOURCE_OPTIONS = [
  "Phone Call",
  "Website Form",
  "Google Business Profile",
  "Facebook",
  "Referral",
  "Manual",
];

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length < 4) return digits;
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function LeadIntakePanel({ campaigns, workspaceId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [leadName, setLeadName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Phone Call");
  const [serviceNeeded, setServiceNeeded] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [notes, setNotes] = useState("");

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

  function resetForm() {
    setLeadName("");
    setPhone("");
    setEmail("");
    setSource("Phone Call");
    setServiceNeeded("");
    setCampaignId("");
    setNotes("");
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
  try {
    const digits = phone.replace(/\D/g, "");

    if (digits.length !== 10) {
      setError("Enter a valid 10 digit phone number.");
      return;
    }

    const result = await createLead({
      workspaceId,
      leadName,
      phone,
      email,
      source,
      serviceNeeded,
      campaignId: campaignId || null,
      notes,
    });
    if (result?.deduped) {
    setSuccessMessage("Existing lead found. MarketForge updated the existing record instead of creating a duplicate.");
    } else {
    setSuccessMessage("Lead saved successfully.");
    }
        resetForm();
        } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not create lead."
        );
      }
    });
  }

  return (
    <section className="mf-card rounded-3xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Lead Intake
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Log phone-first leads fast so MarketForge can track action-to-revenue performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {isOpen ? "Close Lead Intake" : "Add Phone Lead"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Lead Name
                </label>
                <input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="John Smith"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Phone
                </label>
                <input
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(555) 666-7777"
                    inputMode="numeric"
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Email
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Lead Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Service Needed
                </label>
                <input
                  value={serviceNeeded}
                  onChange={(e) => setServiceNeeded(e.target.value)}
                  placeholder="Tankless water heater install"
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Linked Action
                </label>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="">No linked action</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Caller asked about availability, pricing, urgency, or service details..."
                  className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save Lead"}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}