import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { site, legalName, SupportEmail, BusinessAddress } from "../components/SiteInfo";

export const meta = {
  title: "Refund & Cancellation Policy – Rankveer",
  description: "When Rankveer plan purchases can be refunded, how to request a refund and how long it takes.",
};

export default function RefundPolicy() {
  return (
    <>
      <PageHero kicker="Legal" title="Refund & cancellation policy" note={`Effective ${site.policyEffectiveDate}`} />

      <section className="pb-24">
        <div className="wrap">
          <article className="legal-card prose-legal">
            <p>
              This policy applies to plans purchased in the {site.brandName} app from <strong>{legalName}</strong>.
            </p>

            <h2>1. Cancellation</h2>
            <p>
              {site.brandName} plans are <strong>one-time, prepaid purchases</strong> for a fixed period. They do not renew automatically and
              you are never charged again unless you choose to buy another plan — so there is no subscription to cancel. Your access simply
              continues until the end of the period you paid for.
            </p>

            <h2>2. When you are eligible for a refund</h2>
            <p>
              Because a plan is a digital service that is activated immediately, purchases are generally non-refundable. We will refund you in
              full if:
            </p>
            <ul>
              <li><strong>You were charged but your plan was not activated</strong>, and we are unable to activate it within 48 hours of you reporting it; or</li>
              <li><strong>You were charged more than once</strong> for the same purchase — the extra payment is refunded; or</li>
              <li><strong>A technical fault on our side</strong> prevented you from using the plan for a significant part of its period, and we could not fix it.</li>
            </ul>

            <h2>3. When refunds are not given</h2>
            <ul>
              <li>You changed your mind after the plan was activated.</li>
              <li>You did not use the plan, or used only part of it.</li>
              <li>Your exam was postponed, cancelled or its pattern changed.</li>
              <li>Your account was suspended or closed for breaking our <Link to="/terms/">terms</Link>.</li>
              <li>Referral credits and coupon discounts — these are never refunded as cash.</li>
            </ul>

            <h2>4. How to request a refund</h2>
            <p>
              Write to <SupportEmail /> within <strong>7 days of the payment</strong> and include:
            </p>
            <ul>
              <li>your registered mobile number;</li>
              <li>the date and amount of the payment; and</li>
              <li>the Razorpay payment ID (starts with <code>pay_</code>), which you can find in your payment confirmation SMS or email.</li>
            </ul>

            <h2>5. Processing time</h2>
            <p>
              We reply to refund requests within 2 working days. Approved refunds are sent to your original payment method and usually appear
              within <strong>5–7 working days</strong>, depending on your bank or UPI provider.
            </p>

            <h2>6. Contact</h2>
            <p>For any payment issue, contact <SupportEmail />.</p>
            <p>Postal address: <BusinessAddress /></p>
          </article>
        </div>
      </section>
    </>
  );
}
