import React from "react";

type VisionXLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
};

export default function VisionXLogo({
  className = "",
  size = "md",
  theme = "light",
}: VisionXLogoProps) {
  const heightStyles = {
    sm: "h-[18px]",
    md: "h-[22px]",
    lg: "h-[30px]",
  }[size];

  const logoSrc =
    theme === "dark" ? "/visionx-logo-white.png" : "/visionx-logo-black.png";

  return (
    <span
      className={`visionx-brand-wrap inline-flex items-center select-none ${className}`}
      aria-label="VisionX Roadway Intelligence"
    >
      <img
        src={logoSrc}
        alt="VisionX"
        className={`w-auto object-contain ${heightStyles}`}
        style={{ display: "block" }}
      />
    </span>
  );
}
