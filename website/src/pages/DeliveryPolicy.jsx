import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { site, SupportEmail, BusinessAddress } from "../components/SiteInfo";

export const meta = {
  title: "Delivery Policy – Rankveer",
  description: "How and when Rankveer plans are delivered after purchase. Rankveer is a digital service with no physical shipping.",
};

export default function DeliveryPolicy() {
  return (
    <>
      <PageHero kicker="Legal" title="Shipping & delivery policy" note={`Effective ${site.policyEffectiveDate}`} />

      <section className="pb-24">
        <div className="wrap">
          <article className="legal-card prose-legal">
            <h2>1. Digital service — nothing is shipped</h2>
            <p>
              {site.brandName} sells access to an online practice service. <strong>No physical goods are sold or shipped</strong>, and there
              are no shipping or delivery charges.
            </p>

            <h2>2. How your plan is delivered</h2>
            <p>
              Your plan is delivered to your {site.brandName} account inside the app. It is activated <strong>automatically and immediately</strong>{" "}
              once your payment is confirmed, and the app shows your active plan and its end date. You can use it on the device where you are
              logged in with your registered mobile number.
            </p>

            <h2>3. If activation is delayed</h2>
            <p>
              In rare cases, such as a delay in payment confirmation from your bank, activation can take a few minutes. If your plan is still
              not active <strong>24 hours</strong> after a successful payment, contact <SupportEmail /> with your registered mobile number and
              Razorpay payment ID, and we will activate it or refund you as described in our{" "}
              <Link to="/refund-policy/">refund &amp; cancellation policy</Link>.
            </p>

            <h2>4. Contact</h2>
            <p>Email: <SupportEmail /></p>
            <p>Postal address: <BusinessAddress /></p>
          </article>
        </div>
      </section>
    </>
  );
}
