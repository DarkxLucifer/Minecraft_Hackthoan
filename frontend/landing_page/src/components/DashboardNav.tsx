"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  Database,
  MapPin,
  ShieldAlert,
  Menu,
  X,
  ChevronRight,
  LogOut,
  UserCheck,
} from "lucide-react";
import VisionXLogo from "@/components/VisionXLogo";
import { useAuth } from "@/context/AuthContext";

export const DashboardNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { officer, signOut } = useAuth();
  const officerEmail = officer?.email ?? "officer@traffic.gov.in";

  const handleSignOut = async () => {
    await signOut();
    router.push("/?loggedout=true");
  };

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Search", href: "/dashboard/search", icon: Search },
    { label: "Database", href: "/dashboard/database", icon: Database },
    { label: "Map", href: "/dashboard/map", icon: MapPin },
    { label: "Blacklist", href: "/dashboard/blacklist", icon: ShieldAlert, isBlacklist: true },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/dashboard/search") {
      return pathname === "/dashboard/search" || pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-black/10 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between gap-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center select-none cursor-pointer group"
              title="Vision X Home"
            >
              <VisionXLogo size="md" />
              <span className="ml-3 hidden sm:inline-block text-[11px] font-mono text-[#6F6F6F] border-l border-black/15 pl-3">
                Surveillance Intelligence
              </span>
            </Link>
          </div>

          {/* Center Nav Links: Home, Search, Database, Map, Blacklist */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-black/[0.04] border border-black/5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              if (item.isBlacklist) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`dash-nav-link flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "dash-nav-blacklist-active shadow-sm"
                        : "text-rose-700 hover:text-rose-900 hover:bg-rose-50"
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: "#e11d48",
                            color: "#ffffff",
                            boxShadow: "0 2px 8px rgba(225, 29, 72, 0.25)",
                          }
                        : { color: "#be123c" }
                    }
                  >
                    <Icon
                      className="w-3.5 h-3.5 shrink-0"
                      color={active ? "#ffffff" : "#be123c"}
                      style={{
                        color: active ? "#ffffff" : "#be123c",
                        stroke: active ? "#ffffff" : "#be123c",
                      }}
                    />
                    <span
                      style={{
                        color: active ? "#ffffff" : "#be123c",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        active ? "bg-white text-rose-700" : "bg-rose-100 text-rose-700"
                      }`}
                      style={{
                        backgroundColor: active ? "#ffffff" : "#ffe4e6",
                        color: "#be123c",
                      }}
                    >
                      2
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`dash-nav-link flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "dash-nav-pill-active shadow-sm"
                      : "text-[#5E5E59] hover:text-black hover:bg-white/80"
                  }`}
                  style={
                    active
                      ? {
                            backgroundColor: "#000000",
                            color: "#ffffff",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                          }
                      : { color: "#5E5E59" }
                  }
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    color={active ? "#ffffff" : "#5E5E59"}
                    style={{
                      color: active ? "#ffffff" : "#5E5E59",
                      stroke: active ? "#ffffff" : "#5E5E59",
                    }}
                  />
                  <span
                    style={{
                      color: active ? "#ffffff" : "#5E5E59",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Right Status Indicator & Officer Controls */}
          <div className="flex items-center gap-3">

            {/* Officer Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="truncate max-w-[120px] font-semibold">{officerEmail}</span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-700 hover:text-rose-950 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
              title="Sign Out / Lock Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-black hover:text-[#6F6F6F] transition-colors"
            >
              <span>Site</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-black/10 text-black hover:bg-black/5 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/10 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-1.5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? item.isBlacklist
                        ? "dash-nav-blacklist-active"
                        : "dash-nav-pill-active"
                      : item.isBlacklist
                      ? "text-rose-700 bg-rose-50"
                      : "text-black hover:bg-black/5"
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: item.isBlacklist ? "#e11d48" : "#000000",
                          color: "#ffffff",
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className="w-4 h-4 shrink-0"
                      color={active ? "#ffffff" : item.isBlacklist ? "#be123c" : "#121212"}
                      style={{
                        color: active ? "#ffffff" : item.isBlacklist ? "#be123c" : "#121212",
                        stroke: active ? "#ffffff" : item.isBlacklist ? "#be123c" : "#121212",
                      }}
                    />
                    <span style={{ color: active ? "#ffffff" : "inherit" }}>{item.label}</span>
                  </div>
                  {item.isBlacklist && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                      style={{
                        backgroundColor: active ? "#ffffff" : "#ffe4e6",
                        color: "#be123c",
                      }}
                    >
                      2 Flagged
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Mobile Sign Out */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 mt-3 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({officerEmail})</span>
              </div>
            </button>
          </div>
        )}
      </header>
    </>
  );
};

export default DashboardNav;
