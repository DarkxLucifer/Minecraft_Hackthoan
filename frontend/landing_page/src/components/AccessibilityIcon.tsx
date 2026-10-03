import type { SVGProps } from "react";

export default function AccessibilityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Universal Accessibility / Human figure */}
      <circle cx="12" cy="4.2" r="2.2" />
      <path
        d="M20.5 8.2c-.4-.3-1-.2-1.3.2L16.2 11c-.3.3-.8.2-1-.2L13.8 8h-3.6L8.8 10.8c-.2.4-.7.5-1 .2L4.8 8.4c-.4-.4-1-.3-1.3.2-.3.4-.2 1 .2 1.3l3.2 2.7c.6.5 1.5.5 2.1 0l.8-.7V15l-2.4 5.3c-.2.5 0 1 .5 1.3.5.2 1 0 1.3-.5l2.7-5.9c.2-.4.6-.6 1-.6s.8.2 1 .6l2.7 5.9c.2.4.7.6 1.1.6.2 0 .4 0 .6-.1.5-.2.7-.8.5-1.3L15.2 15v-3.1l.8.7c.6.5 1.5.5 2.1 0l3.2-2.7c.4-.3.5-.9.2-1.3z"
      />
    </svg>
  );
}
