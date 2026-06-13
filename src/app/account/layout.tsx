"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import { User, Package, MapPin, LayoutDashboard, LogOut, RefreshCw } from "lucide-react";

const accountNav = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/orders", label: "Orders", icon: Package },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar */}
        <aside className="md:w-56 flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-foreground mb-4">Account</h2>
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto" aria-label="Account navigation">
            {accountNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap mt-2 md:mt-4 md:border-t md:border-border md:pt-4 cursor-pointer w-full"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Log out
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
