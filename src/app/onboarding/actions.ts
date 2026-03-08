"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { onboardingSchema, type OnboardingSchemaInput } from "@/lib/onboarding-schema";

function toNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableNumber(value: number | "") {
  return value === "" ? null : value;
}

export async function saveOnboarding(data: OnboardingSchemaInput) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return {
      success: false,
      error: "You must be signed in to complete onboarding.",
    };
  }

  const parsed = onboardingSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid onboarding data.",
    };
  }

  const formData = parsed.data;
  const clerkUser = await currentUser();

  const email =
    clerkUser?.emailAddresses?.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    )?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    null;

  const firstName = clerkUser?.firstName ?? null;
  const lastName = clerkUser?.lastName ?? null;

  const appUser = await prisma.user.upsert({
    where: { clerkUserId },
    update: {
      email,
      firstName,
      lastName,
    },
    create: {
      clerkUserId,
      email,
      firstName,
      lastName,
    },
  });

  const baseSlug = slugify(formData.businessName);
  let workspaceSlug = baseSlug;
  let slugSuffix = 1;

  while (true) {
    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!existingWorkspace) break;
    workspaceSlug = `${baseSlug}-${slugSuffix}`;
    slugSuffix += 1;
  }

  let workspaceMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: appUser.id,
      role: "OWNER",
    },
    include: {
      workspace: true,
    },
  });

  if (!workspaceMembership) {
    const createdWorkspace = await prisma.workspace.create({
      data: {
        name: formData.businessName,
        slug: workspaceSlug,
        industry: formData.industry === "" ? null : formData.industry,
        members: {
          create: {
            userId: appUser.id,
            role: "OWNER",
          },
        },
      },
    });

    workspaceMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: createdWorkspace.id,
        userId: appUser.id,
      },
      include: {
        workspace: true,
      },
    });

    if (!workspaceMembership) {
      return {
        success: false,
        error: "Workspace membership could not be created.",
      };
    }
  } else {
    await prisma.workspace.update({
      where: { id: workspaceMembership.workspace.id },
      data: {
        name: formData.businessName,
        industry: formData.industry === "" ? null : formData.industry,
      },
    });
  }

  const workspaceId = workspaceMembership.workspace.id;

  await prisma.businessProfile.upsert({
    where: { workspaceId },
    update: {
      businessName: formData.businessName,
      website: toNullableString(formData.website),
      phone: toNullableString(formData.phone),
      city: formData.city,
      state: toNullableString(formData.state),
      serviceArea: `${formData.city}, ${formData.state} (${formData.serviceAreaRadiusMiles || 0} miles)`,
      serviceAreaRadiusMiles: toNullableNumber(formData.serviceAreaRadiusMiles),
      industryLabel: formData.industry || null,

      averageJobValue: toNullableNumber(formData.averageJobValue),
      highestMarginService: toNullableString(formData.highestMarginService),
      lowestPriorityService: toNullableString(formData.lowestPriorityService),

      technicians: toNullableNumber(formData.technicians),
      jobsPerTechnicianPerDay: toNullableNumber(formData.jobsPerTechnicianPerDay),
      weeklyCapacity: toNullableNumber(formData.weeklyCapacity),
      targetBookedJobsPerWeek: null,
      targetWeeklyRevenue: toNullableNumber(formData.targetWeeklyRevenue),

      preferredServices: formData.primaryServices,
      deprioritizedServices: formData.lowestPriorityService
        ? [formData.lowestPriorityService]
        : [],

      busyMonths: formData.busyMonths,
      slowMonths: formData.slowMonths,
      seasonalityNotes: toNullableString(formData.seasonalityNotes),

      googleBusinessProfileUrl: toNullableString(formData.googleBusinessProfileUrl),
      servicePageUrls: [],
      hasServicePages: formData.hasServicePages,
      hasFaqContent: formData.hasFaqContent,
      hasBlog: formData.hasBlog,
      hasGoogleBusinessPage: formData.hasGoogleBusinessPage,
    },
    create: {
      workspaceId,
      businessName: formData.businessName,
      website: toNullableString(formData.website),
      phone: toNullableString(formData.phone),
      city: formData.city,
      state: toNullableString(formData.state),
      serviceArea: `${formData.city}, ${formData.state} (${formData.serviceAreaRadiusMiles || 0} miles)`,
      serviceAreaRadiusMiles: toNullableNumber(formData.serviceAreaRadiusMiles),
      industryLabel: formData.industry || null,

      averageJobValue: toNullableNumber(formData.averageJobValue),
      highestMarginService: toNullableString(formData.highestMarginService),
      lowestPriorityService: toNullableString(formData.lowestPriorityService),

      technicians: toNullableNumber(formData.technicians),
      jobsPerTechnicianPerDay: toNullableNumber(formData.jobsPerTechnicianPerDay),
      weeklyCapacity: toNullableNumber(formData.weeklyCapacity),
      targetBookedJobsPerWeek: null,
      targetWeeklyRevenue: toNullableNumber(formData.targetWeeklyRevenue),

      preferredServices: formData.primaryServices,
      deprioritizedServices: formData.lowestPriorityService
        ? [formData.lowestPriorityService]
        : [],

      busyMonths: formData.busyMonths,
      slowMonths: formData.slowMonths,
      seasonalityNotes: toNullableString(formData.seasonalityNotes),

      googleBusinessProfileUrl: toNullableString(formData.googleBusinessProfileUrl),
      servicePageUrls: [],
      hasServicePages: formData.hasServicePages,
      hasFaqContent: formData.hasFaqContent,
      hasBlog: formData.hasBlog,
      hasGoogleBusinessPage: formData.hasGoogleBusinessPage,
    },
  });

  await prisma.competitor.deleteMany({
    where: { workspaceId },
  });

  const cleanedCompetitors = formData.competitors.filter(
    (competitor) => competitor.name.trim().length > 0
  );

  if (cleanedCompetitors.length > 0) {
    await prisma.competitor.createMany({
      data: cleanedCompetitors.map((competitor, index) => ({
        workspaceId,
        name: competitor.name.trim(),
        websiteUrl: toNullableString(competitor.websiteUrl),
        googleBusinessUrl: toNullableString(competitor.googleBusinessUrl),
        serviceFocus: [],
        isPrimaryCompetitor: index === 0,
      })),
    });
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      onboardingCompletedAt: new Date(),
      demoInitializedAt: new Date(),
    },
  });

  return {
    success: true,
    workspaceId,
    workspaceSlug: workspaceMembership.workspace.slug,
  };
}