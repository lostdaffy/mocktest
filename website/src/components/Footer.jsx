import { Link } from "react-router-dom";
import { site, legalName } from "./SiteInfo";

/* global __BUILD_YEAR__ */

function FooterColumn({ title, children }) {
  return (
    <div>
      <h2 className="font-sans text-[13px] font-bold uppercase tracking-[0.08em]">{title}</h2>
      <ul className="mt-4 grid gap-2.5 text-[14.5px]">{children}</ul>
    </div>
  );
}

const linkClass = "text-slate [overflow-wrap:anywhere] hover:text-brand";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface pt-16">
      <div className="wrap grid gap-9 sm:grid-cols-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr]">
        <div className="sm:col-span-3 lg:col-span-1">
          <Link to="/" className="inline-block" aria-label={`${site.brandName} home`}>
            <img src="/images/logo.png" alt={site.brandName} width="166" height="44" loading="lazy" className="h-10 w-auto" />
          </Link>
          <p className="mt-4 max-w-[340px] text-[14.5px] text-slate">
            Mock tests, previous year papers and live exams for SSC, Railway, UP Police, Banking and CTET — in Hindi and English.
          </p>
        </div>

        <FooterColumn title="Product">
          <li><a href="/#features" className={linkClass}>Features</a></li>
          <li><a href="/#live-exams" className={linkClass}>Live exams</a></li>
          <li><a href="/#pricing" className={linkClass}>Pricing</a></li>
          <li><a href="/#faq" className={linkClass}>FAQ</a></li>
        </FooterColumn>

        <FooterColumn title="Support">
          <li><Link to="/contact/" className={linkClass}>Contact us</Link></li>
          <li><Link to="/delete-account/" className={linkClass}>Delete your account</Link></li>
          {site.supportEmail && (
            <li><a href={`mailto:${site.supportEmail}`} className={linkClass}>{site.supportEmail}</a></li>
          )}
        </FooterColumn>

        <FooterColumn title="Legal">
          <li><Link to="/privacy-policy/" className={linkClass}>Privacy policy</Link></li>
          <li><Link to="/terms/" className={linkClass}>Terms &amp; conditions</Link></li>
          <li><Link to="/refund-policy/" className={linkClass}>Refund &amp; cancellation</Link></li>
          <li><Link to="/delivery-policy/" className={linkClass}>Delivery policy</Link></li>
        </FooterColumn>
      </div>

      <div className="wrap mt-12 grid gap-2 border-t border-line py-6 text-[13px] text-slate lg:grid-cols-[auto_1fr] lg:items-center lg:gap-8">
        <p>© {__BUILD_YEAR__} {legalName}. All rights reserved.</p>
        <p className="lg:text-right">
          {site.brandName} is an independent practice platform and is not affiliated with SSC, RRB, UPPRPB, IBPS, CBSE or any government body.
        </p>
      </div>
    </footer>
  );
}
