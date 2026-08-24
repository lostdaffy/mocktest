// Central place to tune the Refer & Earn programme.
//
// The reward is paid out on SIGNUP (when someone installs the app and
// registers using a referral code), not on purchase. That's a deliberate
// growth trade-off: a smaller, instant reward converts far better than a
// larger one gated behind the friend eventually buying a plan, which most
// referred users never reach.
//
// The credit itself is only *spendable* against a subscription purchase
// (see MAX_CREDIT_DISCOUNT_PERCENT in controllers/paymentController.js),
// so it still drives revenue - it just isn't gated on it.
module.exports = {
  // Credit (₹) the referrer earns for each friend who signs up with their code.
  REFERRAL_SIGNUP_REWARD: 5,

  // This is an introductory offer we intend to withdraw later - the exact
  // date isn't decided yet. Flip this to false to stop awarding new credits
  // (already-earned credits stay spendable). The app reads this flag to
  // show the "limited time" wording, so the messaging and the actual
  // behaviour can never drift apart.
  REFERRAL_OFFER_ACTIVE: true,
};
