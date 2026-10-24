import type { ReactNode } from "react";
import { Nav } from "@/components/nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-slate-200 bg-white md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-4 pt-3 md:px-6 md:pt-5">
          <p className="text-base font-semibold text-slate-900">Cafe IMS</p>
          <p className="text-xs text-slate-500">Inventory &amp; Purchasing</p>
        </div>
        <Nav />
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
