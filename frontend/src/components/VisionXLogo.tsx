import React from "react";

type VisionXLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function VisionXLogo({ className = "", size = "md" }: VisionXLogoProps) {
  const sizeClasses = {
    sm: "text-base tracking-[2px]",
    md: "text-[20px] tracking-[2.4px]",
    lg: "text-2xl tracking-[3px]",
  }[size];

  return (
    <span
      className={`visionx-spacex-logo font-bold uppercase select-none text-current inline-flex items-center ${sizeClasses} ${className}`}
      aria-label="VisionX Mobility Intelligence"
    >
      VISION<span>X</span>
    </span>
  );
}
