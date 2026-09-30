import type { SVGProps } from "react";

/** Menu pictograms, drawn as vectors so they stay sharp at any size. */
type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <path d="M7 4.2c0-1 1.1-1.6 1.9-1.1l11.3 7.4c.8.5.8 1.6 0 2.1L8.9 20c-.8.5-1.9-.1-1.9-1.1Z" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <circle cx="12" cy="7.2" r="3.4" />
      <circle cx="5.2" cy="8.6" r="2.5" />
      <circle cx="18.8" cy="8.6" r="2.5" />
      <path d="M5.8 20c0-3.9 2.8-6.6 6.2-6.6s6.2 2.7 6.2 6.6Z" />
      <path d="M.8 18.6c0-3 1.9-5.1 4.4-5.1 1 0 1.8.3 2.5.8-1.4 1.3-2.3 3.1-2.5 5.2H1.6a.8.8 0 0 1-.8-.9ZM23.2 18.6c0-3-1.9-5.1-4.4-5.1-1 0-1.8.3-2.5.8 1.4 1.3 2.3 3.1 2.5 5.2h3.6a.8.8 0 0 0 .8-.9Z" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.7}>
      <path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5Z" />
      <path d="M12 6.5v13" />
      <path d="M5.5 8.2c1.8-.1 3.4.2 4.6.8M5.5 11.2c1.8-.1 3.4.2 4.6.8M18.5 8.2c-1.8-.1-3.4.2-4.6.8M18.5 11.2c-1.8-.1-3.4.2-4.6.8" strokeWidth={1.2} />
    </svg>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.7}>
      <rect x="2.6" y="5.4" width="9.5" height="14" rx="1.6" transform="rotate(-14 7.3 12.4)" />
      <rect x="8" y="3.6" width="10" height="15" rx="1.8" fill="currentColor" fillOpacity={0.18} />
      <rect x="12.2" y="5.6" width="9.5" height="14.4" rx="1.8" transform="rotate(10 17 12.8)" fill="currentColor" fillOpacity={0.3} />
      <path d="m17 10.4 1.6 2.3-1.6 2.3-1.6-2.3Z" fill="currentColor" transform="rotate(10 17 12.8)" />
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M7 3.5h10v5.2a5 5 0 0 1-10 0Z" fill="currentColor" fillOpacity={0.25} />
      <path d="M7 5.2H3.8c0 3 1.4 4.8 3.7 5.1M17 5.2h3.2c0 3-1.4 4.8-3.7 5.1M12 13.7v3.3M8.5 20.5h7M9.5 17h5v3.5h-5Z" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <rect x="3.5" y="13" width="4" height="7.5" rx="0.8" />
      <rect x="10" y="9" width="4" height="11.5" rx="0.8" />
      <rect x="16.5" y="4" width="4" height="16.5" rx="0.8" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.8}>
      <path d="M2.5 3.5h2.6l2.4 11.2h10.8l2.2-8H6.3" />
      <path d="M9 9.5h9.6M9.6 12h8.2" strokeWidth={1.3} />
      <circle cx="9.3" cy="19" r="1.5" fill="currentColor" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function MedalIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.7}>
      <path d="m8.2 14.2-2.4 7 3.2-1.2 1.9 2.6 1.1-5.4M15.8 14.2l2.4 7-3.2-1.2-1.9 2.6-1.1-5.4" />
      <circle cx="12" cy="9" r="6.5" />
      <path
        d="m12 5.4 1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5L8.4 8l2.5-.3Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10.3 1.8h3.4l.5 2.7c.7.2 1.3.5 1.9.9l2.3-1.5 2.4 2.4-1.5 2.3c.4.6.7 1.2.9 1.9l2.7.5v3.4l-2.7.5c-.2.7-.5 1.3-.9 1.9l1.5 2.3-2.4 2.4-2.3-1.5c-.6.4-1.2.7-1.9.9l-.5 2.7h-3.4l-.5-2.7c-.7-.2-1.3-.5-1.9-.9l-2.3 1.5-2.4-2.4 1.5-2.3c-.4-.6-.7-1.2-.9-1.9l-2.7-.5v-3.4l2.7-.5c.2-.7.5-1.3.9-1.9L3.6 6.3 6 3.9l2.3 1.5c.6-.4 1.2-.7 1.9-.9ZM12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z"
      />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <circle cx="12" cy="8" r="4.3" />
      <path d="M3.8 21c0-4.6 3.7-7.7 8.2-7.7s8.2 3.1 8.2 7.7Z" />
    </svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2.6}>
      <path d="M20 12H5M11 5l-7 7 7 7" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={3}>
      <path d="m9 4.5 7.5 7.5L9 19.5" />
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={1.7}>
      <path d="M2.5 5.5 8.5 3l7 2.5 6-2.5v15.5l-6 2.5-7-2.5-6 2.5Z" />
      <path d="M8.5 3v15.5M15.5 5.5V21" />
      <path d="M4.5 13.5c1.2-1.8 2.5-1.8 3.3-.6M10 10c1.5.5 2.4 1.7 3.5 1.2M17 9.5c1 .8 1.7 2 2.5 1.5" strokeWidth={1.2} strokeDasharray="1.2 1.6" />
    </svg>
  );
}

export function HelmetIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="none" fill="currentColor">
      <path d="M12.6 3C6.9 3 2.5 7.4 2.5 13c0 2.8.9 5 2.4 6.6.5.5 1.1.9 1.9.9h9.6c1.3 0 2.4-.8 2.8-2l.5-1.4h-6.9a1.6 1.6 0 0 1-1.6-1.6v-2.4c0-.9.7-1.6 1.6-1.6h9.7C22 7.4 17.8 3 12.6 3Z" />
      <path d="M13.9 12.6h7.6c0 1.2-.1 2.3-.4 3.2h-7.2Z" opacity={0.55} />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <circle cx="12" cy="12" r="4.4" fill="currentColor" />
      <path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8" />
    </svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="M3.3 17.5a9.5 9.5 0 1 1 17.4 0" />
      <path d="M12 14.2 16.5 8.8" strokeWidth={2.4} />
      <circle cx="12" cy="14.5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M6 10.5l1 .6M12 6.5v1.2M18 10.5l-1 .6" strokeWidth={1.6} />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <path d="m4 20 1-4.6L15.6 4.8a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.6 19Z" />
      <path d="m13.8 6.6 3.6 3.6" />
    </svg>
  );
}

/** A chequered flag on its pole; `double` crosses two of them. */
export function FlagIcon({ double = false, ...props }: IconProps & { double?: boolean }) {
  const flag = (
    <g>
      <path d="M5 21.5 7.8 3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M7.8 3.4c3.3-1.3 5.6 1.4 9.4.1l-1.4 8.3c-3.7 1.3-6-1.3-9.3 0Z" fill="#fff" stroke="currentColor" strokeWidth={1} />
      <path
        d="M9.8 3.1 9.4 5.6 11.8 5.8 12.2 3.4ZM14.4 3.9 14 6.3 16.6 5.9 17 3.5ZM7.4 5.7 7 8.2 9.4 8.1 9.4 5.6ZM11.8 5.8 11.4 8.3 14 8.6 14 6.3ZM9.4 8.1 9 10.6 11.2 10.9 11.4 8.3ZM14 8.6 13.6 11.2 16.1 10.6 16.6 8.1Z"
        fill="#111"
      />
    </g>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      {double ? (
        <>
          <g transform="translate(-2.5 1) rotate(-12 12 12) scale(0.92)">{flag}</g>
          <g transform="translate(24.5 1) scale(-0.92 0.92) rotate(-12 12 12)">{flag}</g>
        </>
      ) : (
        flag
      )}
    </svg>
  );
}
