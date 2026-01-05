import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createToken, tokenExpiry } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";

const schema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      hashedPassword,
      emailVerified: null, // explicit (optional)
    },
  });

  // Create verification token + send email
  const token = createToken();

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail, // we use email as identifier
      token,
      expires: tokenExpiry(24),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(
    normalizedEmail
  )}`;
  try{
  await sendVerificationEmail({ to: normalizedEmail, verifyUrl });
  }catch(e){
    console.error("EMAIL SEND FAILED",e);
    return NextResponse.json({error:"Failed to send verification email"},{status:500});
  }

  return NextResponse.json(
    { ok: true, message: "Account created. Please verify your email before logging in." },
    { status: 201 }
  );
}
