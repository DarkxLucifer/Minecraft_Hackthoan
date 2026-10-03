import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 28,
  height: 28,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconOCR(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      {/* License plate frame with characters */}
      <rect x="2.5" y="6" width="19" height="12" />
      <path d="M5.5 6v14" />
      <path d="M18.5 6v14" />
      <path d="M9 10.5h1.2M11.6 10.5h1.2M14.2 10.5h1.2" />
      <path d="M9 13.5h1.2M11.6 13.5h1.2M14.2 13.5h1.2" />
      <path d="M3 9h2M3 12h2M3 15h2" />
      <path d="M19 9h2M19 12h2M19 15h2" />
    </svg>
  );
}

export function IconTrajectory(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 18C8 14 8 10 12 8C16 6 18 8 20 6" />
      <circle cx="4" cy="18" r="1.6" />
      <circle cx="20" cy="6" r="1.6" />
      <path d="M16 6l4 0l0 4" />
    </svg>
  );
}

export function IconHeatmap(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
      <path d="M6 9V3" />
      <path d="M12 15V9" />
      <path d="M18 9V3" />
      <circle cx="6" cy="9" r="2" />
      <circle cx="12" cy="15" r="2" />
      <circle cx="18" cy="9" r="2" />
    </svg>
  );
}

export function IconAlert(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v0.1" />
    </svg>
  );
}

export function IconArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6l-6 6" />
    </svg>
  );
}

export function IconCrosshair(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10c-4.5-1.5-8-5-8-10V6z" />
      <path d="M9 12l2 2l4-4" />
    </svg>
  );
}