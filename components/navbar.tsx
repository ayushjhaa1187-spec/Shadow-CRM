"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";
import {
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Users,
  Briefcase,
  Activity,
  MessageSquare,
} from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/deals", label: "Deals", icon: Briefcase },
  { href: "/dashboard/activities", label: "Activities", icon: Activity },
  { href: "/dashboard/chat", label: "AI Chat", icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/reset-password";
  if (isAuthPage) return null;

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-border backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-text-primary hidden sm:inline">
              Shadow CRM
            </span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user && (
              <>
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-7 h-7 rounded-full"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon size={14} className="text-primary" />
                    </div>
                  )}
                  <span className="text-sm text-text-secondary max-w-[120px] truncate">
                    {profile?.display_name || user.email?.split("@")[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
                    aria-label="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary"
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && user && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:bg-surface-hover"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
            <hr className="border-border my-2" />
            <div className="flex items-center gap-2 px-3 py-2">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon size={12} className="text-primary" />
                </div>
              )}
              <span className="text-sm text-text-secondary">
                {profile?.display_name || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-danger hover:bg-surface-hover transition-colors"
            >
              <LogOut size={16} />
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
