"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function DashboardAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { officer, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-3xl bg-white border border-black/10 shadow-sm max-w-sm w-full flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center animate-pulse">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-base font-semibold text-black">Verifying Telemetry Credentials</h3>
            <p className="text-xs text-slate-500 font-mono">Checking VisionX operator security token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!officer) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 rounded-3xl bg-white border border-rose-200 shadow-xl max-w-md w-full flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg font-semibold text-black">Officer Authentication Required</h3>
            <p className="text-xs text-slate-600">
              Surveillance telemetry and ANPR tracking require verified agency credentials.
            </p>
          </div>
          <button
            onClick={() => router.replace("/?auth=signin&reason=protected")}
            className="w-full py-2.5 px-4 rounded-full bg-black text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>Launch Operator Sign-in</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
