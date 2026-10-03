import React from "react";

type VisionXLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
};

export default function VisionXLogo({
  className = "",
  size = "md",
  showIcon = true,
}: VisionXLogoProps) {
  const sizeClasses = {
    sm: "text-base tracking-[2px]",
    md: "text-[20px] tracking-[2.4px]",
    lg: "text-2xl tracking-[3px]",
  }[size];

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 30,
  }[size];

  return (
    <span
      className={`visionx-spacex-logo font-bold uppercase select-none text-current inline-flex items-center gap-2.5 ${sizeClasses} ${className}`}
      aria-label="VisionX Mobility Intelligence"
    >
      {showIcon && (
        <svg
          width={iconSizes}
          height={iconSizes}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="visionx-emblem shrink-0"
          aria-hidden="true"
        >
          {/* Outer radar disc with velocity aperture */}
          <circle
            cx="16"
            cy="16"
            r="14"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="18 4 6 4"
            opacity="0.9"
          />
          {/* Inner dynamic target horizon lines */}
          <line
            x1="4"
            y1="16"
            x2="11"
            y2="16"
            stroke="#00E5FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="21"
            y1="16"
            x2="28"
            y2="16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          {/* Central high-velocity chevron */}
          <path
            d="M13 10L19 16L13 22"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Precision center focal point */}
          <circle cx="16" cy="16" r="2" fill="#E4572E" />
        </svg>
      )}
      <span className="visionx-text">
        VISION<span style={{ color: "#E4572E" }}>X</span>
      </span>
    </span>
  );
}
