"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button className="border rounded px-3 py-1" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </button>
  );
}
