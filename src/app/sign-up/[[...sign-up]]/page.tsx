import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <SignUp
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      forceRedirectUrl="/portal/onboarding"
      fallbackRedirectUrl="/portal/onboarding"
    />
  );
}