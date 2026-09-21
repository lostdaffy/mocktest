import rawConfig from "../../site.config.json";

// Contact and legal details live in site.config.json so they're edited in
// one place and can never disagree between the footer, contact page and
// policies - exactly the kind of mismatch a payment-gateway reviewer flags.
export const site = {
  ...rawConfig,
  siteUrl: String(rawConfig.siteUrl || "").replace(/\/$/, ""),
};

export const legalName = site.legalName || site.brandName;

// A yellow stand-in for a value that hasn't been filled in yet. Deliberately
// loud: it's far better to notice it on review than to ship a blank.
function Placeholder({ label }) {
  return <span className="placeholder">{label} – add in site.config.json</span>;
}

export function SupportEmail({ className }) {
  if (!site.supportEmail) return <Placeholder label="support email" />;
  return (
    <a href={`mailto:${site.supportEmail}`} className={className}>
      {site.supportEmail}
    </a>
  );
}

export function BusinessAddress() {
  return site.businessAddress || <Placeholder label="business address" />;
}

export function GrievanceOfficer() {
  return site.grievanceOfficerName || <Placeholder label="grievance officer name" />;
}

export function JurisdictionCity() {
  return site.jurisdictionCity || <Placeholder label="city" />;
}
