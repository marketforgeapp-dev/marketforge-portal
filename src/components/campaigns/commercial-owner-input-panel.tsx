"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import type {
  CampaignStatus,
} from "@/generated/prisma";

import {
  saveCommercialReusableInputs,
} from "@/app/campaigns/[campaignId]/actions";

import type {
  CommercialReusableInputs,
  CommercialVendorReadiness,
  VendorReadinessStatus,
} from "@/lib/nlp/commercial/persisted-owner-inputs";

type CommercialBrief = {
  market?: string;

  commercialReusableInputs?:
    CommercialReusableInputs;

  commercialVendorReadiness?:
    CommercialVendorReadiness;

  commercialActionSpec?: {
    target?: {
      accountName?: string | null;
      displayLabel?: string;
    };
  };

  interpretedIntent?: {
    targetAccountName?: string | null;
  };
};

type Props = {
  campaignId: string;
  status: CampaignStatus;
  briefJson: unknown;

  defaults: {
    senderEmail: string;
    senderPhone: string;
    serviceArea: string;
    availableServices: string[];
  };
};

const EMPTY_VENDOR_ITEM = {
  status:
    "NEEDS_PREPARATION" as VendorReadinessStatus,

  notes: "",
};

const VENDOR_ITEMS: Array<{
  key:
    keyof CommercialVendorReadiness;
  label: string;
  needed: string;
}> = [
  {
    key: "w9",
    label: "Completed W-9",
    needed:
      "Usually requested during vendor qualification or onboarding.",
  },
  {
    key: "insurance",
    label:
      "Certificate of Insurance",
    needed:
      "Usually requested during vendor qualification.",
  },
  {
    key: "businessLicense",
    label:
      "Business License",
    needed:
      "Provide when required by the account or jurisdiction.",
  },
  {
    key: "references",
    label:
      "Commercial References Package",
    needed:
      "Useful during vendor review or proposal evaluation.",
  },
  {
    key: "safetyDocumentation",
    label:
      "Safety Documentation",
    needed:
      "May be required for facilities, healthcare, education, or managed properties.",
  },
  {
    key: "pricingSheet",
    label:
      "Commercial Pricing Information",
    needed:
      "Complete after scope and pricing structure are confirmed.",
  },
];

function parseBrief(
  value: unknown
): CommercialBrief | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as CommercialBrief;
}

function buildInitialReusableInputs(
  brief: CommercialBrief | null,
  defaults: Props["defaults"]
): CommercialReusableInputs {
  const existing =
    brief?.commercialReusableInputs;

  const accountName =
    existing
      ?.targetAccount
      .accountName ??
    brief
      ?.commercialActionSpec
      ?.target
      ?.accountName ??
    brief
      ?.interpretedIntent
      ?.targetAccountName ??
    brief
      ?.commercialActionSpec
      ?.target
      ?.displayLabel ??
    "";

  return {
    sender: {
      name:
        existing?.sender.name ??
        "",

      title:
        existing?.sender.title ??
        "",

      email:
        existing?.sender.email ??
        defaults.senderEmail,

      phone:
        existing?.sender.phone ??
        defaults.senderPhone,
    },

    targetAccount: {
      accountName,

      contactName:
        existing
          ?.targetAccount
          .contactName ??
        "",

      contactTitle:
        existing
          ?.targetAccount
          .contactTitle ??
        "",

      contactEmail:
        existing
          ?.targetAccount
          .contactEmail ??
        "",

      contactPhone:
        existing
          ?.targetAccount
          .contactPhone ??
        "",
    },

    capabilities: {
      selectedServices:
        existing
          ?.capabilities
          .selectedServices
          ?.length
          ? existing.capabilities
              .selectedServices
          : defaults
              .availableServices,

      serviceArea:
        existing
          ?.capabilities
          .serviceArea ??
        defaults.serviceArea,

      capacityStatement:
        existing
          ?.capabilities
          .capacityStatement ??
        "",

      commercialExperience:
        existing
          ?.capabilities
          .commercialExperience ??
        "",

      referenceSummary:
        existing
          ?.capabilities
          .referenceSummary ??
        "",

      availabilityModel:
        existing
          ?.capabilities
          .availabilityModel ??
        "",

      differentiators:
        existing
          ?.capabilities
          .differentiators ??
        "",
    },
  };
}

function buildInitialVendorReadiness(
  brief: CommercialBrief | null
): CommercialVendorReadiness {
  const existing =
    brief?.commercialVendorReadiness;

  return {
    w9:
      existing?.w9 ??
      EMPTY_VENDOR_ITEM,

    insurance:
      existing?.insurance ??
      EMPTY_VENDOR_ITEM,

    businessLicense:
      existing?.businessLicense ??
      EMPTY_VENDOR_ITEM,

    references:
      existing?.references ??
      EMPTY_VENDOR_ITEM,

    safetyDocumentation:
      existing
        ?.safetyDocumentation ??
      EMPTY_VENDOR_ITEM,

    pricingSheet:
      existing?.pricingSheet ??
      EMPTY_VENDOR_ITEM,
  };
}

export function CommercialOwnerInputPanel({
  campaignId,
  status,
  briefJson,
  defaults,
}: Props) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const brief =
    useMemo(
      () =>
        parseBrief(
          briefJson
        ),
      [briefJson]
    );

  const [
    inputs,
    setInputs,
  ] =
    useState<
      CommercialReusableInputs
    >(() =>
      buildInitialReusableInputs(
        brief,
        defaults
      )
    );

  const [
    vendorReadiness,
    setVendorReadiness,
  ] =
    useState<
      CommercialVendorReadiness
    >(() =>
      buildInitialVendorReadiness(
        brief
      )
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null
    );

  if (
    brief?.market !==
    "COMMERCIAL"
  ) {
    return null;
  }

  const canEdit =
    status !== "LAUNCHED" &&
    status !== "COMPLETED";

  const inputClass =
    "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100";

  function updateSender(
    key:
      keyof CommercialReusableInputs["sender"],
    value: string
  ) {
    setInputs(
      (current) => ({
        ...current,

        sender: {
          ...current.sender,
          [key]: value,
        },
      })
    );
  }

  function updateTarget(
    key:
      keyof CommercialReusableInputs["targetAccount"],
    value: string
  ) {
    setInputs(
      (current) => ({
        ...current,

        targetAccount: {
          ...current.targetAccount,
          [key]: value,
        },
      })
    );
  }

  function updateCapability(
    key:
      Exclude<
        keyof CommercialReusableInputs["capabilities"],
        "selectedServices"
      >,
    value: string
  ) {
    setInputs(
      (current) => ({
        ...current,

        capabilities: {
          ...current.capabilities,
          [key]: value,
        },
      })
    );
  }

  function toggleService(
    service: string
  ) {
    setInputs(
      (current) => {
        const selected =
          current.capabilities
            .selectedServices;

        return {
          ...current,

          capabilities: {
            ...current.capabilities,

            selectedServices:
              selected.includes(
                service
              )
                ? selected.filter(
                    (item) =>
                      item !==
                      service
                  )
                : [
                    ...selected,
                    service,
                  ],
          },
        };
      }
    );
  }

  return (
    <section
      id="commercial-owner-inputs"
      className="mf-card scroll-mt-6 rounded-3xl p-5"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
          Complete Commercial Details
        </p>

        <h2 className="mt-2 text-xl font-bold tracking-tight text-gray-900">
          Enter reusable information once
        </h2>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
          MarketForge prefilled what it already knows. Add the people,
          account, and verified business facts that should be reused throughout
          this pursuit.
        </p>
      </div>

      {!canEdit ? (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Commercial details are locked after launch.
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-base font-semibold text-gray-900">
          Your Commercial Contact
        </h3>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-800">
            Contact name
            <input
              value={
                inputs.sender.name
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateSender(
                  "name",
                  event.target.value
                )
              }
              placeholder="Patrick Donovan"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Title
            <input
              value={
                inputs.sender.title
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateSender(
                  "title",
                  event.target.value
                )
              }
              placeholder="Owner"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Email
            <input
              type="email"
              value={
                inputs.sender.email
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateSender(
                  "email",
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Phone
            <input
              value={
                inputs.sender.phone
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateSender(
                  "phone",
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="mt-7">
        <h3 className="text-base font-semibold text-gray-900">
          Target Account
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          The account name is prefilled from the prompt when MarketForge can
          identify it.
        </p>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-800">
            Account or business name
            <input
              value={
                inputs.targetAccount
                  .accountName
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateTarget(
                  "accountName",
                  event.target.value
                )
              }
              placeholder="ABC Property Management"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Contact name
            <input
              value={
                inputs.targetAccount
                  .contactName
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateTarget(
                  "contactName",
                  event.target.value
                )
              }
              placeholder="Jordan Smith"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Contact title or role
            <input
              value={
                inputs.targetAccount
                  .contactTitle
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateTarget(
                  "contactTitle",
                  event.target.value
                )
              }
              placeholder="Regional Property Manager"
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Contact email
            <input
              type="email"
              value={
                inputs.targetAccount
                  .contactEmail
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateTarget(
                  "contactEmail",
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Contact phone
            <input
              value={
                inputs.targetAccount
                  .contactPhone
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateTarget(
                  "contactPhone",
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="mt-7">
        <h3 className="text-base font-semibold text-gray-900">
          Services for This Pursuit
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          These begin with the services confirmed in Settings. Uncheck anything
          that is not relevant to this account.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {defaults.availableServices.map(
            (service) => (
              <label
                key={service}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={inputs.capabilities.selectedServices.includes(
                    service
                  )}
                  onChange={() =>
                    toggleService(
                      service
                    )
                  }
                />

                <span>{service}</span>
              </label>
            )
          )}
        </div>
      </div>

      <div className="mt-7">
        <h3 className="text-base font-semibold text-gray-900">
          Verified Capability Facts
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          Enter only statements the business can support. MarketForge will not
          invent experience, capacity, availability, or differentiators.
        </p>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-800">
            Service area or travel coverage
            <input
              value={
                inputs.capabilities
                  .serviceArea
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateCapability(
                  "serviceArea",
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Capacity statement
            <textarea
              rows={3}
              value={
                inputs.capabilities
                  .capacityStatement
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateCapability(
                  "capacityStatement",
                  event.target.value
                )
              }
              placeholder="We can coordinate scheduled work across multiple properties in North Metro Atlanta."
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Verified commercial experience
            <textarea
              rows={3}
              value={
                inputs.capabilities
                  .commercialExperience
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateCapability(
                  "commercialExperience",
                  event.target.value
                )
              }
              placeholder="Describe only commercial experience the business can verify."
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Approved reference or proof summary
            <textarea
              rows={3}
              value={
                inputs.capabilities
                  .referenceSummary
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateCapability(
                  "referenceSummary",
                  event.target.value
                )
              }
              placeholder="References available from verified commercial customers upon request."
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Availability or response model
            <textarea
              rows={3}
              value={
                inputs.capabilities
                  .availabilityModel
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateCapability(
                  "availabilityModel",
                  event.target.value
                )
              }
              placeholder="Describe confirmed scheduling or response availability."
              className={inputClass}
            />
          </label>

          <label className="text-sm font-medium text-gray-800">
            Approved differentiators
            <textarea
              rows={3}
              value={
                inputs.capabilities
                  .differentiators
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateCapability(
                  "differentiators",
                  event.target.value
                )
              }
              placeholder="Clear communication, coordinated scheduling, documented work, and responsive service."
              className={inputClass}
            />
          </label>
        </div>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-7">
        <h3 className="text-base font-semibold text-gray-900">
          Vendor-Readiness Checklist
        </h3>

        <p className="mt-1 text-sm text-gray-600">
          MarketForge does not upload these files yet. Track whether each item
          is available, needs preparation, or does not apply.
        </p>

        <div className="mt-4 space-y-3">
          {VENDOR_ITEMS.map(
            (item) => {
              const value =
                vendorReadiness[
                  item.key
                ];

              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {item.label}
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    {item.needed}
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-[220px_1fr]">
                    <select
                      disabled={!canEdit}
                      value={
                        value.status
                      }
                      onChange={(event) => {
                        setVendorReadiness(
                          (current) => ({
                            ...current,

                            [item.key]: {
                              ...current[
                                item.key
                              ],

                              status:
                                event
                                  .target
                                  .value as VendorReadinessStatus,
                            },
                          })
                        );
                      }}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="AVAILABLE">
                        Available
                      </option>

                      <option value="NEEDS_PREPARATION">
                        Needs preparation
                      </option>

                      <option value="NOT_APPLICABLE">
                        Not applicable
                      </option>
                    </select>

                    <input
                      disabled={!canEdit}
                      value={
                        value.notes
                      }
                      onChange={(event) => {
                        setVendorReadiness(
                          (current) => ({
                            ...current,

                            [item.key]: {
                              ...current[
                                item.key
                              ],

                              notes:
                                event
                                  .target
                                  .value,
                            },
                          })
                        );
                      }}
                      placeholder="Optional notes"
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {canEdit ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setSuccessMessage(
                null
              );

              startTransition(
                async () => {
                  const result =
                    await saveCommercialReusableInputs({
                      campaignId,
                      reusableInputs:
                        inputs,
                      vendorReadiness,
                    });

                  if (
                    !result.success
                  ) {
                    setError(
                      result.error
                    );

                    return;
                  }

                  setSuccessMessage(
                    "Commercial details were saved and applied. Review the updated materials before approving them again."
                  );

                  router.refresh();
                }
              );
            }}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending
              ? "Saving..."
              : "Save and Apply to Materials"}
          </button>

          <p className="text-sm text-gray-500">
            Updated materials return to review.
          </p>
        </div>
      ) : null}
    </section>
  );
}