"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitStrategySession } from "@/app/growth-strategy-session/actions";
import type { StrategySessionFormState } from "@/lib/public-site/strategy-session-types";

const initialStrategySessionFormState: StrategySessionFormState = {
  status: "idle",
  message: "",
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-white/10 bg-[#0d1620] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15";

const labelClassName =
  "text-sm font-semibold text-white/80";

function FieldError({
  errors,
}: {
  errors?: string[];
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="mt-2 text-sm text-red-300">
      {errors[0]}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 px-6 py-4 text-base font-semibold text-white shadow-[0_14px_36px_rgba(59,130,246,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      {pending
        ? "Submitting..."
        : "Schedule My Strategy Session"}
    </button>
  );
}

export function StrategySessionForm() {
  const [state, formAction] = useActionState(
    submitStrategySession,
    initialStrategySessionFormState,
  );

  if (state.status === "success") {
    return (
      <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-6 sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
          Request received
        </div>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          You’re set. We’ll prepare before the session.
        </h2>

        <p className="mt-4 text-base leading-7 text-white/68">
          We’ll review your business and follow up to confirm timing for the
          Growth Strategy Session.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="strategy-name"
            className={labelClassName}
          >
            Name
          </label>

          <input
            id="strategy-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            className={inputClassName}
          />

          <FieldError errors={state.fieldErrors?.name} />
        </div>

        <div>
          <label
            htmlFor="strategy-email"
            className={labelClassName}
          >
            Email
          </label>

          <input
            id="strategy-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className={inputClassName}
          />

          <FieldError errors={state.fieldErrors?.email} />
        </div>

        <div>
          <label
            htmlFor="strategy-phone"
            className={labelClassName}
          >
            Phone{" "}
            <span className="font-normal text-white/40">
              (optional)
            </span>
          </label>

          <input
            id="strategy-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            className={inputClassName}
          />

          <FieldError errors={state.fieldErrors?.phone} />
        </div>

        <div>
          <label
            htmlFor="strategy-business"
            className={labelClassName}
          >
            Business name
          </label>

          <input
            id="strategy-business"
            name="businessName"
            type="text"
            autoComplete="organization"
            required
            maxLength={180}
            className={inputClassName}
          />

          <FieldError
            errors={state.fieldErrors?.businessName}
          />
        </div>
      </div>

      <div className="mt-5">
        <label
          htmlFor="strategy-website"
          className={labelClassName}
        >
          Business website
        </label>

        <input
          id="strategy-website"
          name="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          maxLength={500}
          placeholder="yourbusiness.com"
          className={inputClassName}
        />

        <FieldError errors={state.fieldErrors?.website} />

        <p className="mt-2 text-xs leading-5 text-white/40">
          Your business name and website give MarketForge the starting point
          for preparing the session.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="strategy-availability"
          className={labelClassName}
        >
          Availability{" "}
          <span className="font-normal text-white/40">
            (optional)
          </span>
        </label>

        <textarea
          id="strategy-availability"
          name="availability"
          rows={3}
          maxLength={500}
          placeholder="For example: weekday mornings or Tuesday after 2 PM"
          className={`${inputClassName} resize-y`}
        />

        <FieldError
          errors={state.fieldErrors?.availability}
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="strategy-company">
          Company
        </label>

        <input
          id="strategy-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" && state.message && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-300/20 bg-red-300/[0.06] px-4 py-3 text-sm leading-6 text-red-200"
        >
          {state.message}
        </div>
      )}

      <div className="mt-6">
        <SubmitButton />
      </div>

      <p className="mt-4 text-xs leading-5 text-white/40">
        We use the information you provide to prepare the session and contact
        you about scheduling.
      </p>
    </form>
  );
}