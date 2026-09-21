import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { site, SupportEmail } from "../components/SiteInfo";

export const meta = {
  title: "Delete Your Account – Rankveer",
  description: "How to request deletion of your Rankveer account and data, what gets deleted, and what we keep.",
};

export default function DeleteAccount() {
  return (
    <>
      <PageHero
        kicker="Support"
        title={`Delete your ${site.brandName} account`}
        lead="You can ask us to permanently delete your account and the data linked to it at any time."
      />

      <section className="pb-24">
        <div className="wrap">
          <article className="legal-card prose-legal">
            <h2>Delete it yourself in the app (instant)</h2>
            <ol>
              <li>Open the {site.brandName} app and go to <strong>Profile</strong>.</li>
              <li>Tap <strong>Delete account</strong>.</li>
              <li>Enter your password and tap <strong>Delete forever</strong>. Your account is deleted immediately.</li>
            </ol>

            <h2>Or request deletion by email</h2>
            <p>If you no longer have the app or can't sign in:</p>
            <ol>
              <li>Send an email to <SupportEmail /> with the subject <strong>"Delete my account"</strong>.</li>
              <li>Include the <strong>mobile number registered</strong> with your {site.brandName} account.</li>
              <li>
                To protect you, we will confirm the request is really from you before deleting anything — for example by asking you to reply
                from your registered email or to confirm a code sent to your mobile number.
              </li>
            </ol>
            <p>
              We complete deletion within <strong>30 days</strong> of confirming your request and will let you know when it is done.
            </p>

            <h2>What is deleted</h2>
            <ul>
              <li>Your profile: name, mobile number, email address and preferences</li>
              <li>Your test attempts, answers, scores, ranks, analysis and chapter progress</li>
              <li>Your bookmarks and question reports</li>
              <li>Your referral code and any unused referral credits</li>
              <li>Your device's notification token</li>
            </ul>

            <h2>What we keep, and why</h2>
            <ul>
              <li><strong>Payment and invoice records</strong> — kept only for the period required by Indian tax and accounting laws, then deleted.</li>
              <li><strong>Live exam leaderboards</strong> — your entries are removed or anonymised so your name no longer appears.</li>
              <li>
                <strong>A scrambled record of your mobile number</strong> — a one-way code (not the number itself) kept for up to 12
                months, only so the same number can't delete and re-register to claim sign-up offers or free tests again. It
                can't be turned back into your number.
              </li>
              <li><strong>Combined statistics</strong> — anonymous totals, such as how many people answered a question correctly, which cannot identify you.</li>
            </ul>

            <div className="callout">
              <p>
                <strong>Before you delete:</strong> deletion is permanent and cannot be undone. Any time left on an active plan is lost and is
                not refunded. If you only want to stop notifications, you can turn them off in your phone's settings instead.
              </p>
            </div>

            <h2>Questions</h2>
            <p>
              Contact <SupportEmail />. You can read more about how we handle data in our <Link to="/privacy-policy/">privacy policy</Link>.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
