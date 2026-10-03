"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SurveillanceDatabasePage } from "@/components/SurveillanceDatabasePage";

export default function DashboardDatabasePage() {
  const router = useRouter();

  const handleJumpToCamera = (videoName: string, timestamp: number, plate: string) => {
    router.push(`/dashboard/search`);
  };

  return (
    <div className="w-full pb-20">
      {/* Page Header referencing traffic-light */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-2">
        <div className="border-b border-black/10 pb-5">
          <h1 className="text-3xl sm:text-4xl font-serif text-black font-normal tracking-tight">
            Surveillance Records Database
          </h1>
          <p className="text-sm text-[#6F6F6F] mt-1 font-sans">
            Structured sighting records across all camera nodes with Indian standard format validation and OCR verification.
          </p>
        </div>
      </div>

      <SurveillanceDatabasePage onJumpToCamera={handleJumpToCamera} />
    </div>
  );
}
