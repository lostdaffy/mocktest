import { site } from "./SiteInfo";
import { GooglePlayIcon, PhoneIcon } from "./icons";

// The one download button. Points at Google Play; before the app was listed
// it fell back to the website APK, and with neither it says "coming soon".
// tone "dark" sits on light backgrounds, "light" on the brand gradient.
export default function PlayButton({ tone = "dark", size = "lg", className = "" }) {
  const sizing = size === "sm" ? "rounded-sm px-3.5 py-2 gap-2" : "rounded-[14px] px-5 py-3 gap-3";
  const colours =
    tone === "light"
      ? "bg-white text-ink hover:text-ink shadow-[0_12px_28px_-12px_rgb(0_0_0/0.35)]"
      : "bg-ink text-white hover:text-white shadow-[0_12px_26px_-12px_rgb(14_26_71/0.6)]";

  if (site.playStoreUrl) {
    return (
      <a
        href={site.playStoreUrl}
        target="_blank"
        rel="noopener"
        className={`inline-flex items-center justify-center whitespace-nowrap font-semibold leading-tight transition duration-200 hover:-translate-y-px active:scale-[0.98] ${sizing} ${colours} ${className}`}
      >
        <GooglePlayIcon className={size === "sm" ? "!h-5 !w-5" : "!h-7 !w-7"} />
        <span className="text-left">
          {size !== "sm" && <span className="block text-[11px] font-medium uppercase tracking-[0.08em] opacity-75">Get it on</span>}
          <span className={`block font-display ${size === "sm" ? "text-sm" : "text-[19px]"} font-semibold tracking-[-0.01em]`}>Google Play</span>
        </span>
      </a>
    );
  }

  if (site.apkUrl) {
    return (
      <a href={site.apkUrl} download className={`btn ${tone === "light" ? "btn-light" : "btn-primary"} ${size === "sm" ? "btn-sm" : "btn-lg"} ${className}`}>
        <PhoneIcon />
        Download Android app
      </a>
    );
  }

  return (
    <span aria-disabled="true" className={`btn btn-soon ${tone === "light" ? "btn-light" : "btn-secondary"} ${className}`}>
      <PhoneIcon />
      Android app — coming soon
    </span>
  );
}
