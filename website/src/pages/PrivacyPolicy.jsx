import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { site, legalName, SupportEmail, BusinessAddress, GrievanceOfficer } from "../components/SiteInfo";

export const meta = {
  title: "Privacy Policy – Rankveer",
  description: "How Rankveer collects, uses, shares and protects your information, and the choices you have.",
};

export default function PrivacyPolicy() {
  return (
    <>
      <PageHero kicker="Legal" title="Privacy policy" note={`Effective ${site.policyEffectiveDate}`} />

      <section className="pb-24">
        <div className="wrap">
          <article className="legal-card prose-legal">
            <p>
              This policy explains how <strong>{legalName}</strong> ("{site.brandName}", "we", "us") collects, uses and protects your
              information when you use the {site.brandName} mobile app and the website at {site.siteUrl} (together, the "Service"). By
              using the Service you agree to this policy.
            </p>

            <h2>1. Information we collect</h2>

            <h3>Information you give us</h3>
            <ul>
              <li><strong>Account details:</strong> your name, mobile number and, if you choose to add one, your email address.</li>
              <li><strong>Password:</strong> stored only as a one-way encrypted hash. We cannot see your actual password.</li>
              <li><strong>Preferences:</strong> the exams you're preparing for, the subjects you select and your preferred language.</li>
              <li><strong>Messages to us:</strong> anything you send when you contact support or report a question.</li>
            </ul>

            <h3>Information created as you use the Service</h3>
            <ul>
              <li><strong>Learning activity:</strong> tests you attempt, your answers, time taken per question, scores, accuracy, rank, chapter progress, bookmarks and topic-wise performance.</li>
              <li><strong>Live exam integrity signals:</strong> during a live exam, the number of times and the total time you leave the app. This is used only to review attempts for fairness.</li>
              <li><strong>Subscription and payment records:</strong> the plan you bought, amount, date, payment status, and the order and payment reference IDs issued by our payment processor.</li>
              <li><strong>Referral information:</strong> your referral code, who referred you, and referral credits.</li>
              <li><strong>Device and technical data:</strong> a push notification token for your device, the app version, and your IP address and request logs, which our servers record for security and abuse prevention.</li>
            </ul>

            <div className="callout">
              <p>
                <strong>We never receive or store your card, UPI or bank account details.</strong> Payments are handled entirely by our
                payment processor, Razorpay.
              </p>
            </div>

            <h2>2. How we use your information</h2>
            <ul>
              <li>To create and secure your account, including sending one-time passwords (OTPs) and allowing one active device at a time.</li>
              <li>To run tests, calculate scores and ranks, and show your results, solutions and analysis.</li>
              <li>To personalise your practice, for example recommending weak topics or a daily test.</li>
              <li>To send notifications you have allowed, such as reminders before a live exam.</li>
              <li>To process purchases, activate plans, apply referral credits and coupons, and handle refunds.</li>
              <li>To keep live exams fair, prevent fraud and misuse, and enforce our <Link to="/terms/">terms</Link>.</li>
              <li>To improve question quality using combined statistics, such as how often a question is answered wrongly.</li>
              <li>To respond to your requests and meet our legal obligations.</li>
            </ul>
            <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>

            <h2>3. What other users can see</h2>
            <p>
              When a live exam ends, its leaderboard shows participants' <strong>names</strong> alongside their rank, score and accuracy to
              other users. Your mobile number and email address are never shown to other users.
            </p>

            <h2>4. Who we share information with</h2>
            <p>We share information only with service providers who help us run the Service, and only what they need:</p>
            <ul>
              <li><strong>Razorpay</strong> — payment processing.</li>
              <li><strong>An SMS provider (currently Twilio)</strong> — delivering OTP messages to your mobile number.</li>
              <li><strong>Expo push notification service</strong>, which delivers through Google Firebase Cloud Messaging on Android — sending notifications to your device.</li>
              <li><strong>MongoDB Atlas</strong> — secure database hosting.</li>
              <li><strong>Render</strong> — hosting for our application servers.</li>
              <li><strong>Our website hosting provider</strong> — serving this website.</li>
            </ul>
            <p>We use AI services to help create practice questions. Your personal information is not sent to these services.</p>
            <p>
              Some of these providers may process data on servers outside India. We may also disclose information where required by law, to
              protect our rights or users' safety, or as part of a merger or sale of the business.
            </p>

            <h2>5. How long we keep information</h2>
            <p>
              We keep your information for as long as your account is active. If you ask us to delete your account, we delete or anonymise
              your personal information within 30 days, except records we must keep by law — such as payment and invoice records needed for
              tax and accounting — which we keep only for the period the law requires.
            </p>

            <h2>6. Your choices and rights</h2>
            <ul>
              <li><strong>Access and correction:</strong> you can view and edit your name, email and language in the app, or ask us for a copy of your information.</li>
              <li><strong>Deletion:</strong> you can ask us to delete your account and data — see <Link to="/delete-account/">how to delete your account</Link>.</li>
              <li><strong>Notifications:</strong> you can turn off notifications at any time in your phone's settings.</li>
              <li><strong>Withdrawing consent:</strong> you can stop using the Service and request deletion at any time.</li>
            </ul>

            <h2>7. Security</h2>
            <p>
              We use encrypted connections (HTTPS), hashed passwords, access controls and rate limiting to protect your information. No method
              of transmission or storage is completely secure, so we cannot guarantee absolute security, but we work to protect your data and
              will act promptly if we learn of a breach.
            </p>

            <h2>8. Children</h2>
            <p>
              The Service is meant for people preparing for competitive exams. If you are under 18, please use the Service with the consent and
              supervision of a parent or guardian. If you believe a child has given us personal information without that consent, contact us
              and we will delete it.
            </p>

            <h2>9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. We will change the effective date above, and for significant changes we will notify
              you in the app or by other reasonable means.
            </p>

            <h2>10. Contact and grievance officer</h2>
            <p>
              For questions, requests or complaints about your privacy, contact our Grievance Officer,{" "}
              <strong><GrievanceOfficer /></strong>, at <SupportEmail />.
            </p>
            <p>Postal address: <BusinessAddress /></p>
            <p>We aim to acknowledge complaints within 24 hours and resolve them within 15 days.</p>
          </article>
        </div>
      </section>
    </>
  );
}
