"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    });

    // If redirect=true, NextAuth will navigate; errors show as query param
    if (res?.error) setErr("Invalid credentials");
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold">Login</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          className="w-full border p-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err ? <p className="text-sm text-red-500">{err}</p> : null}

        <button className="w-full border rounded p-2">Sign in</button>
      </form>

      <p className="mt-4 text-sm">
        New here? <Link className="underline" href="/register">Create an account</Link>
      </p>
    </main>
  );
}
