// Stroke icons used across the site. They inherit colour from `currentColor`
// and size from the `.icon` class (see index.css), so callers only pass a
// className to override either.

function Svg({ className = "", children, ...rest }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const CheckIcon = (props) => (
  <Svg {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const PhoneIcon = (props) => (
  <Svg {...props}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
    <path d="M11 18h2" />
  </Svg>
);

export const ClockIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const TrophyIcon = (props) => (
  <Svg {...props}>
    <path d="M8 21h8M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 6h2.5a.5.5 0 0 1 .5.5V8a3 3 0 0 1-3 3M7 6H4.5a.5.5 0 0 0-.5.5V8a3 3 0 0 0 3 3" />
  </Svg>
);

export const LayersIcon = (props) => (
  <Svg {...props}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);

export const ShieldCheckIcon = (props) => (
  <Svg {...props}>
    <path d="M12 3 4.5 6v5.5c0 4.7 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.8 7.5-9.5V6L12 3Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const BroadcastIcon = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.48M7.76 16.24a6 6 0 0 1 0-8.48M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" />
  </Svg>
);

export const LanguageIcon = (props) => (
  <Svg {...props}>
    <path d="M4 5h8M8 3v2M10.5 5c-.9 3.6-3.3 6.6-6.5 8.5M6 9c1.3 2.1 3 3.6 5 4.5" />
    <path d="m13 21 4-9 4 9M14.6 17.5h4.8" />
  </Svg>
);

export const ClipboardCheckIcon = (props) => (
  <Svg {...props}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4.5v-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
    <path d="m9 13 2 2 4-4" />
  </Svg>
);

export const FileTextIcon = (props) => (
  <Svg {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Svg>
);

export const TrendingUpIcon = (props) => (
  <Svg {...props}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Svg>
);

export const BarChartIcon = (props) => (
  <Svg {...props}>
    <path d="M4 20h16" />
    <rect x="5" y="11" width="3" height="6" rx="1" />
    <rect x="10.5" y="6" width="3" height="11" rx="1" />
    <rect x="16" y="9" width="3" height="8" rx="1" />
  </Svg>
);

export const BellIcon = (props) => (
  <Svg {...props}>
    <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9Z" />
    <path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0" />
  </Svg>
);

export const MailIcon = (props) => (
  <Svg {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </Svg>
);

export const CallIcon = (props) => (
  <Svg {...props}>
    <path d="M21 16.5v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 3.1 3.7 2 2 0 0 1 5.1 1.5h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L9.1 9.4a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z" />
  </Svg>
);

export const MapPinIcon = (props) => (
  <Svg {...props}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);
