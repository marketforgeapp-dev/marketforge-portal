import { auth, currentUser } from "@clerk/nextjs/server";

export async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();

  const email = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();

  if (!email) {
    throw new Error("Unauthorized");
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(email)) {
    throw new Error("Unauthorized");
  }
}