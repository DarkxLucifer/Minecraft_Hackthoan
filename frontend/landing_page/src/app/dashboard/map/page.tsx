"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GpsTransitMapPage } from "@/components/GpsTransitMapPage";

function DashboardMapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plateParam = searchParams.get("plate") || "KA05MR9633";

  return (
    <div className="w-full">
      <GpsTransitMapPage
        onBackToDashboard={() => router.push("/dashboard/search")}
        initialPlate={plateParam}
        initialSection="map"
      />
    </div>
  );
}

export default function DashboardMapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs text-[#6F6F6F]">
          Loading Transit Corridor Mesh...
        </div>
      }
    >
      <DashboardMapContent />
    </Suspense>
  );
}

