import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const workspace = await getCurrentWorkspace();

  if (workspace?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return <OnboardingFlow />;
}