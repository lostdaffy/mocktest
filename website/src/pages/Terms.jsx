import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { site, legalName, SupportEmail, BusinessAddress, JurisdictionCity } from "../components/SiteInfo";

export const meta = {
  title: "Terms & Conditions – Rankveer",
  description: "The terms that apply when you use the Rankveer app and website, including plans, live exams and acceptable use.",
};

export default function Terms() {
  return (
    <>
      <PageHero kicker="Legal" title="Terms & conditions" note={`Effective ${site.policyEffectiveDate}`} />

      <section className="pb-24">
        <div className="wrap">
          <article className="legal-card prose-legal">
            <p>
              These terms are an agreement between you and <strong>{legalName}</strong> ("{site.brandName}", "we", "us") for your use of the{" "}
              {site.brandName} mobile app and the website at {site.siteUrl} (the "Service"). By creating an account or using the Service, you
              agree to these terms and to our <Link to="/privacy-policy/">privacy policy</Link>. If you do not agree, please do not use the
              Service.
            </p>

            <h2>1. About the Service</h2>
            <p>
              {site.brandName} is an online practice platform for competitive exams. It offers practice questions, mock tests, previous year
              papers, live exams and performance analysis.
            </p>
            <div className="callout">
              <p>
                <strong>{site.brandName} is independent.</strong> We are not affiliated with, endorsed by or connected to SSC, the Railway
                Recruitment Boards, UPPRPB, IBPS, CBSE or any other exam-conducting or government body. Using the Service does not guarantee
                selection, marks or any result in any exam.
              </p>
            </div>

            <h2>2. Your account</h2>
            <ul>
              <li>You must provide accurate information, including a mobile number you own, and keep it up to date.</li>
              <li>You are responsible for keeping your password safe and for all activity on your account.</li>
              <li>Your account is for your personal use only. Sharing it with others is not allowed.</li>
              <li>For security, an account can be logged in on only one device at a time. Logging in on a new device logs out the previous one.</li>
              <li>If you are under 18, you may use the Service only with the consent of a parent or guardian.</li>
            </ul>

            <h2>3. Free plan and paid plans</h2>
            <ul>
              <li>The free plan gives limited access to some features. We may change what the free plan includes.</li>
              <li>Paid plans are for a fixed period (for example 3, 6 or 12 months), paid once in advance. <strong>Plans do not renew automatically.</strong></li>
              <li>A plan starts as soon as payment is confirmed. If you buy a plan while one is still active, the new period is added after your current plan ends.</li>
              <li>Prices are shown in Indian Rupees in the app before you pay. We may change prices for future purchases; this never affects a plan you have already bought.</li>
              <li>Refunds are covered by our <Link to="/refund-policy/">refund &amp; cancellation policy</Link>.</li>
            </ul>

            <h2>4. Referral credits and coupons</h2>
            <ul>
              <li>Referral credits have no cash value, cannot be transferred or withdrawn, and can only be used as a discount on a plan, up to the limit shown at checkout.</li>
              <li>Referral rewards are a limited-time offer. We may change the reward amount or end the programme at any time; credits already earned stay usable unless they were obtained through misuse.</li>
              <li>Coupons are subject to the conditions shown with them and cannot be combined with referral credits on the same purchase.</li>
              <li>Credits or discounts gained through fake accounts, self-referrals or other misuse may be cancelled.</li>
            </ul>

            <h2>5. Live exams</h2>
            <ul>
              <li>Each live exam starts at a fixed time and ends at a fixed time for all participants. Joining late does not give you extra time.</li>
              <li>When the exam ends, every attempt is submitted automatically.</li>
              <li>Ranks and leaderboards are published after the exam ends. Leaderboards show participants' names.</li>
              <li>We record limited signals, such as leaving the app during the exam, to review attempts for fairness. Attempts involving unfair means may be removed from rankings.</li>
              <li>Live exam schedules may occasionally change or be cancelled for technical or other reasons.</li>
            </ul>

            <h2>6. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>copy, record, publish, sell or share questions, solutions or other content from the Service;</li>
              <li>create multiple accounts to get around free-plan limits or to earn referral rewards;</li>
              <li>use bots, scrapers or automated tools, or attempt to access the Service in ways it was not designed for;</li>
              <li>interfere with, disrupt, or try to gain unauthorised access to the Service or its systems;</li>
              <li>reverse engineer or modify the app, except where the law allows it; or</li>
              <li>use the Service for anything unlawful or harmful.</li>
            </ul>

            <h2>7. Content and intellectual property</h2>
            <p>
              The app, website, design, practice questions, explanations, analysis and other material we create belong to {legalName} or our
              licensors and are protected by law. Previous year questions originate from public examinations; our selection, arrangement,
              translations and explanations of them are our own work. You may use the Service only for your own personal, non-commercial
              preparation.
            </p>

            <h2>8. Accuracy of content</h2>
            <p>
              We work hard to keep questions, answers and solutions accurate, but mistakes can happen, and our answers may sometimes differ from
              official answer keys. Please use the report option in the app if you find an error. We are not responsible for decisions you make
              based on content in the Service.
            </p>

            <h2>9. Availability</h2>
            <p>
              We aim to keep the Service available at all times, but we do not guarantee it will be uninterrupted or error-free. We may update,
              change or discontinue features.
            </p>

            <h2>10. Limitation of liability</h2>
            <p>
              The Service is provided "as is" and "as available". To the fullest extent permitted by law, we are not liable for any indirect,
              incidental or consequential loss, including loss of data or exam outcomes. Our total liability for any claim relating to the
              Service is limited to the amount you paid us in the three months before the claim arose.
            </p>

            <h2>11. Suspension and termination</h2>
            <p>
              You may stop using the Service and <Link to="/delete-account/">delete your account</Link> at any time. We may suspend or close
              accounts that break these terms. If an account is closed for a breach, any remaining plan period may be forfeited without refund.
            </p>

            <h2>12. Governing law</h2>
            <p>
              These terms are governed by the laws of India. Any dispute is subject to the exclusive jurisdiction of the courts at{" "}
              <JurisdictionCity />.
            </p>

            <h2>13. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. We will change the effective date above, and for significant changes we will notify
              you in the app. Continuing to use the Service after changes means you accept them.
            </p>

            <h2>14. Contact</h2>
            <p>Questions about these terms? Write to <SupportEmail />.</p>
            <p>Postal address: <BusinessAddress /></p>
          </article>
        </div>
      </section>
    </>
  );
}
