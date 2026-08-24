import { Link } from "react-router-dom";
import { RiArrowRightSLine, RiLoader4Line } from "@remixicon/react";

/* =========================================================
   Shared building blocks for every admin page.
   Anything repeated on 3+ pages belongs here rather than
   being re-typed as a long Tailwind class string.
========================================================= */

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------
   PAGE HEADER
--------------------------------------------------------- */

export function PageHeader({ eyebrow, title, subtitle, actions, backTo, backLabel }) {
  return (
    <div className="mb-7">
      {backTo && (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline mb-2"
        >
          <RiArrowRightSLine size={16} className="rotate-180" />
          {backLabel || "Back"}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-extrabold tracking-[0.12em] text-brand mb-1.5">
              {eyebrow.toUpperCase()}
            </p>
          )}
          <h1 className="font-display text-2xl sm:text-[26px] font-extrabold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   CARD
--------------------------------------------------------- */

export function Card({ children, className, padded = true, hover = false, as: Tag = "div", ...rest }) {
  return (
    <Tag className={cx("rv-card", padded && "p-5", hover && "rv-card-hover", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionTitle({ title, hint, right }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        {hint && <span className="text-xs text-slate-soft">{hint}</span>}
      </div>
      {right}
    </div>
  );
}

/* ---------------------------------------------------------
   BUTTON
--------------------------------------------------------- */

const BUTTON_VARIANTS = {
  primary: "rv-btn-primary",
  secondary: "rv-btn-secondary",
  ghost: "rv-btn-ghost",
  danger: "rv-btn-danger",
};

const BUTTON_SIZES = {
  sm: "!px-3 !py-1.5 !text-[13px]",
  md: "",
  lg: "!px-5 !py-3 !text-[15px]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className,
  disabled,
  ...rest
}) {
  return (
    <button
      className={cx(BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <RiLoader4Line size={16} className="animate-spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------
   BADGE
--------------------------------------------------------- */

const BADGE_TONES = {
  brand: "bg-brand/10 text-brand",
  success: "bg-success-light text-success",
  danger: "bg-danger-light text-danger",
  warn: "bg-warn-light text-warn",
  info: "bg-info-light text-info",
  neutral: "bg-slate-light text-slate",
  easy: "bg-easy-bg text-easy",
  medium: "bg-medium-bg text-medium",
  hard: "bg-hard-bg text-hard",
  advanced: "bg-advanced-bg text-advanced",
};

export function Badge({ children, tone = "neutral", dot = false, className }) {
  return (
    <span className={cx("rv-badge", BADGE_TONES[tone] || BADGE_TONES.neutral, className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------
   STAT CARD
--------------------------------------------------------- */

export function StatCard({ label, value, hint, icon: Icon, tone = "brand" }) {
  const toneClass = BADGE_TONES[tone] || BADGE_TONES.brand;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate">{label}</p>
          <p className="font-display text-[28px] leading-tight font-extrabold text-ink mt-1">{value}</p>
          {hint && <p className="text-xs text-slate-soft mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div className={cx("w-10 h-10 rounded-sm flex items-center justify-center shrink-0", toneClass)}>
            <Icon size={19} />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------
   FORM FIELD
--------------------------------------------------------- */

export function Field({ label, hint, children, className }) {
  return (
    <div className={className}>
      {label && <label className="rv-label">{label}</label>}
      {children}
      {hint && <p className="text-xs text-slate-soft mt-1.5">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...rest }) {
  return <input className={cx("rv-input", className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={cx("rv-input cursor-pointer", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }) {
  return <textarea className={cx("rv-input resize-y", className)} {...rest} />;
}

export function Checkbox({ label, className, ...rest }) {
  return (
    <label className={cx("flex items-center gap-2.5 text-sm text-ink-soft cursor-pointer select-none", className)}>
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-border-strong text-brand focus:ring-brand/30 cursor-pointer accent-brand"
        {...rest}
      />
      {label}
    </label>
  );
}

/* ---------------------------------------------------------
   EMPTY / LOADING / ERROR STATES
--------------------------------------------------------- */

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="rv-card border-dashed flex flex-col items-center text-center px-6 py-12">
      {Icon && (
        <div className="w-14 h-14 rounded-md bg-brand/10 text-brand flex items-center justify-center mb-4">
          <Icon size={26} />
        </div>
      )}
      <p className="font-display text-base font-bold text-ink">{title}</p>
      {text && <p className="text-sm text-slate mt-1.5 max-w-sm leading-relaxed">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <RiLoader4Line size={26} className="animate-spin text-brand mb-3" />
      <p className="text-sm font-medium text-slate">{label}</p>
    </div>
  );
}

// Row-shaped placeholder, sized to match the list cards it stands in for.
export function SkeletonList({ rows = 3 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rv-card p-5 flex items-center gap-4">
          <div className="rv-skeleton w-11 h-11 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="rv-skeleton h-3.5 w-1/3" />
            <div className="rv-skeleton h-3 w-1/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ALERT_TONES = {
  info: "bg-info-light text-info border-info-border",
  warn: "bg-warn-light text-warn border-warn-border",
  danger: "bg-danger-light text-danger border-danger-border",
  success: "bg-success-light text-success border-success-border",
};

export function Alert({ tone = "info", children, className }) {
  return (
    <div className={cx("border rounded-sm px-4 py-3 text-sm leading-relaxed", ALERT_TONES[tone], className)}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------
   MODAL
--------------------------------------------------------- */

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }) {
  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm animate-fade-in">
      <div className={cx("bg-surface rounded-lg w-full flex flex-col max-h-[88vh] shadow-lift", widths[size])}>
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
            {subtitle && <p className="text-xs text-slate mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xs text-slate hover:bg-slate-light hover:text-ink transition-colors shrink-0 grid place-items-center"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5 flex-1">{children}</div>

        {footer && <div className="p-5 border-t border-border flex flex-wrap gap-3">{footer}</div>}
      </div>
    </div>
  );
}
