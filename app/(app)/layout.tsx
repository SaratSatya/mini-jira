import { AppNav } from "../components/app-nav"; // from app/(app) to app/components

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main className="py-8">
        <div className="mx-auto max-w-5xl px-4">{children}</div>
      </main>
    </>
  );
}
