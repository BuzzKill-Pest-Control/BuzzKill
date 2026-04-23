import type { SVGProps } from "react";

type IconName =
  | "shield"
  | "check"
  | "clock"
  | "home"
  | "building"
  | "phone"
  | "mail"
  | "map"
  | "cal"
  | "doc"
  | "leaf"
  | "arrow"
  | "menu"
  | "x";

type IconProps = {
  name: IconName;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "name">;

export default function Icon({ name, className = "lu", ...rest }: IconProps) {
  const paths: Record<IconName, JSX.Element> = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    check: <polyline points="20 6 9 17 4 12" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    home: (
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    ),
    building: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="9" y1="6" x2="9" y2="6" />
        <line x1="15" y1="6" x2="15" y2="6" />
        <line x1="9" y1="10" x2="9" y2="10" />
        <line x1="15" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="9" y2="14" />
        <line x1="15" y1="14" x2="15" y2="14" />
        <line x1="10" y1="22" x2="10" y2="18" />
        <line x1="14" y1="22" x2="14" y2="18" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    mail: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <polyline points="22 6 12 13 2 6" />
      </>
    ),
    map: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
    cal: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    doc: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="15" y2="17" />
      </>
    ),
    leaf: (
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1.2 4.6 1.2 9.64-.81 12.56A7.15 7.15 0 0 1 11 20z M2 22c5 0 9-3 11-9" />
    ),
    arrow: (
      <>
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </>
    ),
    menu: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    ),
    x: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
  };
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      {paths[name]}
    </svg>
  );
}
