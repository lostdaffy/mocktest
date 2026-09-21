import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { site, legalName, SupportEmail, BusinessAddress, GrievanceOfficer } from "../components/SiteInfo";
import { CallIcon, ClockIcon, MailIcon, MapPinIcon, ShieldCheckIcon } from "../components/icons";

export const meta = {
  title: "Contact Us – Rankveer",
  description: "Get help with your Rankveer account, payments or live exams. Email, address and support hours.",
};

function ContactCard({ Icon, tint, title, hint, children }) {
  return (
    <div className="card flex gap-4 p-6">
      <span className={`icon-tile ${tint}`}>
        <Icon />
      </span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-bold">{title}</h2>
        <p className="mt-1 text-[15px] text-slate">{hint}</p>
        <p className="mt-2 text-base font-semibold text-ink [overflow-wrap:anywhere] [&_a]:text-brand">{children}</p>
      </div>
    </div>
  );
}

export default function Contact() {
  return (
    <>
      <PageHero
        kicker="Support"
        title="We're here to help"
        lead="Questions about your account, a payment, a live exam or a question you think is wrong? Get in touch."
      />

      <section className="pb-24">
        <div className="wrap">
          <div className="mx-auto grid max-w-[980px] gap-4 md:grid-cols-2">
            <ContactCard Icon={MailIcon} tint="tint-blue" title="Email" hint="The fastest way to reach us.">
              <SupportEmail />
            </ContactCard>

            {site.supportPhone && (
              <ContactCard Icon={CallIcon} tint="tint-green" title="Phone" hint="During support hours.">
                <a href={`tel:${site.supportPhone}`}>{site.supportPhone}</a>
              </ContactCard>
            )}

            <ContactCard Icon={ClockIcon} tint="tint-orange" title="Support hours" hint="We reply to emails within one working day.">
              {site.supportHours}
            </ContactCard>

            <ContactCard Icon={MapPinIcon} tint="tint-violet" title="Address" hint={legalName}>
              <BusinessAddress />
            </ContactCard>

            <ContactCard Icon={ShieldCheckIcon} tint="tint-teal" title="Grievance officer" hint="For complaints about privacy or content.">
              <GrievanceOfficer />
            </ContactCard>
          </div>

          <div className="callout mx-auto mt-4 max-w-[980px]">
            <p>
              <strong className="text-ink">Payment issue?</strong> Include your registered mobile number and the Razorpay payment ID (starts
              with <code>pay_</code>) so we can find your transaction straight away. See also our{" "}
              <Link to="/refund-policy/">refund &amp; cancellation policy</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
