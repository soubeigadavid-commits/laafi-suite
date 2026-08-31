"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", icon: "🏠", label: "Tableau de bord" },
  { href: "/staff/caisse", icon: "☕", label: "Restaurant / POS" },
  { href: "/kitchen", icon: "🍳", label: "Cuisine" },
  { href: "/staff/coworking", icon: "💼", label: "Coworking" },
  { href: "/admin/reservations", icon: "📅", label: "Réservations" },
  { href: "/admin/clients", icon: "👥", label: "Clients" },
  { href: "/admin/stocks", icon: "📦", label: "Stocks" },
  { href: "/admin/achats", icon: "🛒", label: "Achats" },
  { href: "/admin/facturation", icon: "🧾", label: "Facturation" },
  { href: "/admin/rapports", icon: "📊", label: "Rapports" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 w-[70px] overflow-y-auto bg-laafi-dark p-3 text-white md:w-[245px] md:p-4">
      <div className="mb-6 px-1 py-2 text-center text-lg font-extrabold md:px-2 md:text-left md:text-xl">
        <span className="md:hidden">L</span>
        <span className="hidden md:inline">
          LAAFI <span className="text-laafi-gold">Management</span>
        </span>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-neutral-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
