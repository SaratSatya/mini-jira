"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "rounded-md px-3 py-2 text-sm border transition",
        active ? "border-white" : "border-white/30 hover:border-white/70",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function AppNav() {
  const { status, data } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href={status === "authenticated" ? "/dashboard" : "/"} className="font-semibold">
          Mini Jira
        </Link>

        <nav className="flex items-center gap-2">
          {status === "authenticated" ? (
            <>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/projects">Projects</NavLink>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-md px-3 py-2 text-sm border border-white/30 hover:border-white/70 transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login">Login</NavLink>
              <NavLink href="/register">Register</NavLink>
            </>
          )}
        </nav>
      </div>

      {status === "authenticated" && data?.user?.email ? (
        <div className="mx-auto max-w-5xl px-4 pb-3 text-xs text-white/60">
          Signed in as {data.user.email}
        </div>
      ) : null}
    </header>
  );
}
