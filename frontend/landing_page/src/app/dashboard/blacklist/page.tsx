"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShieldAlert,
  AlertOctagon,
  Navigation,
  ChevronRight,
  Car,
} from "lucide-react";
import { BLOCKED_VEHICLES_DATA } from "@/components/GpsTransitMapPage";

export default function DashboardBlacklistPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<
    "ALL" | "CRITICAL_WANTED" | "STOLEN_ALERT" | "SEIZED_COURT_ORDER"
  >("ALL");

  const filteredVehicles = BLOCKED_VEHICLES_DATA.filter((blk) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      blk.plate.toLowerCase().includes(q) ||
      blk.vehicleModel.toLowerCase().includes(q) ||
      blk.caseNumber.toLowerCase().includes(q) ||
      blk.violationReason.toLowerCase().includes(q) ||
      blk.originDistrict.toLowerCase().includes(q) ||
      blk.reappearDistrict.toLowerCase().includes(q);

    const matchesSeverity =
      severityFilter === "ALL" || blk.severity === severityFilter;

    return matchesQuery && matchesSeverity;
  });

  return (
    <div className="w-full pb-20">
      {/* Page Header (Consistent with Database & Dashboard pages) */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 pt-10 pb-4">
        <div className="border-b border-black/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-800">
                Surveillance Registry • {BLOCKED_VEHICLES_DATA.length} Targets Active
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif text-black font-normal tracking-tight">
              Flagged &amp; Wanted Vehicles Hotlist
            </h1>
            <p className="text-sm text-[#6F6F6F] mt-1.5 max-w-3xl font-sans">
              Live district perimeter alert registry tracking court-seized, hit-and-run, stolen, or banned transit vehicles across cameras.
              Inspect inter-district sightings, optical proof, and click &ldquo;Trace on District Map&rdquo; to analyze route trajectories.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-white border border-black/10 text-center">
              <div className="text-xl font-serif font-bold text-rose-600">
                {BLOCKED_VEHICLES_DATA.length}
              </div>
              <div className="text-[10px] font-mono uppercase text-[#6F6F6F]">Flagged Fleet</div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-white border border-black/10 text-center">
              <div className="text-xl font-serif font-bold text-black">2</div>
              <div className="text-[10px] font-mono uppercase text-[#6F6F6F]">Hit &amp; Run</div>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-white border border-black/10 text-center">
              <div className="text-xl font-serif font-bold text-black">1</div>
              <div className="text-[10px] font-mono uppercase text-[#6F6F6F]">Stolen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-6">
        <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F6F6F]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Registration Plate, Make/Model, FIR, or Offense Reason..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9FAFB] border border-black/15 rounded-xl text-black placeholder-[#6F6F6F] focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-xs font-mono tracking-wider transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSeverityFilter("ALL")}
                className={`px-3.5 py-2 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  severityFilter === "ALL"
                    ? "bg-rose-600 text-white shadow-xs font-bold"
                    : "bg-[#F3F4F6] text-[#6F6F6F] hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                All Hotlist ({BLOCKED_VEHICLES_DATA.length})
              </button>
              <button
                onClick={() => setSeverityFilter("CRITICAL_WANTED")}
                className={`px-3.5 py-2 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  severityFilter === "CRITICAL_WANTED"
                    ? "bg-rose-600 text-white shadow-xs font-bold"
                    : "bg-[#F3F4F6] text-[#6F6F6F] hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                Critical Wanted
              </button>
              <button
                onClick={() => setSeverityFilter("STOLEN_ALERT")}
                className={`px-3.5 py-2 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  severityFilter === "STOLEN_ALERT"
                    ? "bg-rose-600 text-white shadow-xs font-bold"
                    : "bg-[#F3F4F6] text-[#6F6F6F] hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                Stolen Vehicles
              </button>
              <button
                onClick={() => setSeverityFilter("SEIZED_COURT_ORDER")}
                className={`px-3.5 py-2 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                  severityFilter === "SEIZED_COURT_ORDER"
                    ? "bg-rose-600 text-white shadow-xs font-bold"
                    : "bg-[#F3F4F6] text-[#6F6F6F] hover:bg-rose-50 hover:text-rose-700"
                }`}
              >
                Court Orders
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hotlist Cards Grid */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-8">
        {filteredVehicles.length === 0 ? (
          <div className="bg-white border border-black/10 rounded-2xl p-12 text-center">
            <ShieldAlert className="w-12 h-12 text-[#6F6F6F] mx-auto mb-3 opacity-40" />
            <div className="text-base font-semibold text-black">No Flagged Targets Match Query</div>
            <p className="text-xs text-[#6F6F6F] mt-1 font-mono">
              Try searching by plate number (e.g. KA09Z4433, KA05MR9633) or reset your filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVehicles.map((blk) => {
              const isCritical = blk.severity === "CRITICAL_WANTED";
              const isStolen = blk.severity === "STOLEN_ALERT";

              return (
                <div
                  key={blk.id}
                  className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-white ${
                    isCritical
                      ? "border-rose-200 hover:border-rose-400"
                      : isStolen
                      ? "border-rose-200 hover:border-rose-400"
                      : "border-amber-200 hover:border-amber-400"
                  }`}
                >
                  <div className="p-6">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 ${
                          isCritical
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : isStolen
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        {blk.severityLabel}
                      </span>
                      <span className="text-xs font-mono text-[#6F6F6F]">{blk.caseNumber}</span>
                    </div>

                    {/* Plate and Vehicle */}
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-black tracking-wider mb-1">
                      {blk.plate}
                    </div>
                    <div className="text-xs text-[#6F6F6F] mb-4">
                      {blk.vehicleModel} • {blk.state}
                    </div>

                    {/* Violation / Warrant Box */}
                    <div className="bg-[#F9FAFB] border border-black/10 rounded-xl p-3.5 mb-4">
                      <div className="text-[10px] font-mono text-rose-700 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" /> Offense / Block Reason
                      </div>
                      <div className="text-xs text-black leading-relaxed font-medium">
                        {blk.violationReason}
                      </div>
                    </div>

                    {/* Sighting History Across Jurisdictions */}
                    <div className="space-y-2.5 text-xs font-mono mb-4 bg-[#F9FAFB] p-3.5 rounded-xl border border-black/10">
                      <div className="flex items-start gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mt-1 shrink-0" />
                        <div>
                          <span className="text-[#6F6F6F] text-[10px] font-bold">
                            INITIAL APPEARANCE DISTRICT:
                          </span>
                          <div className="text-black font-semibold">{blk.originDistrict}</div>
                          <div className="text-[#6F6F6F] text-[11px]">
                            Location: {blk.whereAppeared} • Time: {blk.firstSeenTime}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 pt-2.5 border-t border-black/10">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0 animate-pulse" />
                        <div>
                          <span className="text-[#6F6F6F] text-[10px] font-bold">
                            SUBSEQUENT REAPPEARANCE DISTRICT:
                          </span>
                          <div className="text-black font-semibold">{blk.reappearDistrict}</div>
                          <div className="text-[#6F6F6F] text-[11px]">
                            Location: {blk.reappearedAt} • Time: {blk.reappearTime}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Optical Proof Sightings Images */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/5 border border-black/10 relative">
                        <img
                          src={blk.photoVehicle}
                          alt="Vehicle Sighting"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80";
                          }}
                        />
                        <span className="absolute bottom-2 left-2 text-[9px] font-mono bg-white/90 px-2 py-0.5 rounded text-black font-semibold shadow-xs">
                          Photo 1: Context
                        </span>
                      </div>
                      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black/5 border border-black/10 relative">
                        <img
                          src={blk.photoPlate}
                          alt="Plate Sighting"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80";
                          }}
                        />
                        <span className="absolute bottom-2 left-2 text-[9px] font-mono bg-white/90 px-2 py-0.5 rounded text-rose-700 font-bold shadow-xs">
                          Photo 2: Optical Plate
                        </span>
                      </div>
                    </div>

                    {/* Dispatch Action */}
                    <div className="text-xs text-[#6F6F6F] font-mono border-t border-black/10 pt-3">
                      <span className="text-black font-bold">DISPATCH ACTION:</span> {blk.actionTaken}
                    </div>
                  </div>

                  {/* Card Action Button: Routes directly to District Map with plate query */}
                  <div className="p-4 bg-[#F9FAFB] border-t border-black/10">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/map?plate=${encodeURIComponent(blk.plate)}`)
                      }
                      className="w-full py-2.5 px-5 rounded-full bg-black text-white hover:bg-neutral-800 active:scale-[0.98] text-xs font-semibold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Trace on District Map
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
