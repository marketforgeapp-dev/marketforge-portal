import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/portal(.*)",
  "/dashboard(.*)",
  "/campaigns(.*)",
  "/competitors(.*)",
  "/execution(.*)",
  "/leads(.*)",
  "/onboarding(.*)",
  "/opportunities(.*)",
  "/reports(.*)",
  "/settings(.*)",
  "/aeo(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  },
  {
    frontendApiProxy: {
      enabled: true,
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc|__clerk)(.*)",
  ],
};