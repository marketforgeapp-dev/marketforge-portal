import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";

export default async function OnboardingPage() {
  const workspace = await getCurrentWorkspace();

  if (workspace?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return <OnboardingFlow />;
}