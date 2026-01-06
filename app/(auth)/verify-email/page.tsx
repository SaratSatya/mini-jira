import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return <div className="p-6">Invalid verification link.</div>;
  }

  const vt = await prisma.verificationToken.findFirst({
    where: { identifier: email, token },
    select: { expires: true },
  });

  if (!vt) return <div className="p-6">Verification link is invalid or already used.</div>;
  if (vt.expires < new Date()) return <div className="p-6">Verification link expired.</div>;

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.deleteMany({
    where: { identifier: email, token },
  });

  redirect("/login?verified=1");
}
