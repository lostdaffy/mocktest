// Coupon usage-limit test. Runs the real createOrder/verifyPayment
// controllers against a throwaway in-memory MongoDB, with Razorpay's SDK
// stubbed out - no network, no real money, production DB untouched.
const path = require("path");
const crypto = require("crypto");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = require("path").resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

// Stub the razorpay package before the controller requires it.
const razorpayPath = require.resolve("razorpay", { paths: [SERVER] });
let orderCounter = 0;
require.cache[razorpayPath] = {
  id: razorpayPath,
  filename: razorpayPath,
  loaded: true,
  exports: class FakeRazorpay {
    constructor() {
      this.orders = {
        create: async (o) => ({ id: `order_fake_${++orderCounter}`, amount: o.amount, currency: "INR" }),
      };
    }
  },
};

const KEY_SECRET = "fake_live_secret";
process.env.RAZORPAY_KEY_ID = "rzp_live_faketestkey";
process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
process.env.JWT_SECRET = "test_secret_" + "x".repeat(40);

// Stub res: captures status + body from the controllers.
function fakeRes() {
  const r = { statusCode: 200, body: null };
  r.status = (s) => { r.statusCode = s; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "coupon_test");

  const User = require(path.join(SERVER, "models/User"));
  const Coupon = require(path.join(SERVER, "models/Coupon"));
  const Subscription = require(path.join(SERVER, "models/Subscription"));
  const { createOrder, verifyPayment, paymentsEnabled } = require(path.join(SERVER, "controllers/paymentController"));

  check("payments enabled with live keys", paymentsEnabled());

  const mkUser = (n) => User.create({ name: `Student ${n}`, phone: `90000000${n}`, email: `s${n}@test.com`, passwordHash: "x", referralCode: `REF${n}` });
  const u1 = await mkUser(21), u2 = await mkUser(22), u3 = await mkUser(23);

  // A single-use ₹1 test coupon - exactly the case that was broken.
  await Coupon.create({ code: "TEST1", type: "fixed_price", value: 1, maxUses: 1 });

  const order = async (user, code) => {
    const res = fakeRes();
    await createOrder({ body: { plan: "yearly", couponCode: code }, user: { _id: user._id } }, res);
    return res;
  };
  const pay = async (orderId) => {
    const paymentId = "pay_" + orderId;
    const signature = crypto.createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    const res = fakeRes();
    await verifyPayment({ body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } }, res);
    return res;
  };
  const usedCount = async () => (await Coupon.findOne({ code: "TEST1" })).usedCount;

  // ---- student 1 buys with the coupon
  let r = await order(u1, "TEST1");
  check("coupon applied: yearly 449 -> 1", r.body?.finalAmount === 1, `finalAmount ${r.body?.finalAmount}`);
  const sub = await Subscription.findById(r.body.subscriptionId);
  check("coupon code is SAVED on the order (the bug)", sub.couponCode === "TEST1", `stored: ${sub.couponCode}`);

  check("count still 0 before payment", (await usedCount()) === 0);
  r = await pay(sub.razorpayOrderId);
  check("payment activates the subscription", r.statusCode === 200, JSON.stringify(r.body?.message));
  check("count goes to 1 after payment", (await usedCount()) === 1, `usedCount ${await usedCount()}`);

  const buyer = await User.findById(u1._id);
  check("student is subscribed", buyer.subscriptionStatus === "active" && buyer.subscriptionPlan === "yearly");

  // ---- the actual complaint: a used-up coupon must stop working
  r = await order(u2, "TEST1");
  check("second student is refused (usage limit)", r.statusCode === 400 && /usage limit/i.test(r.body.message), `${r.statusCode} ${r.body?.message}`);

  // ---- same student can't reuse a coupon that still has uses left
  await Coupon.updateOne({ code: "TEST1" }, { maxUses: 5 });
  r = await order(u1, "TEST1");
  check("same student can't use the same coupon twice", r.statusCode === 400 && /already used/i.test(r.body.message), `${r.statusCode} ${r.body?.message}`);

  // ---- a different student can still use it while uses remain
  r = await order(u3, "TEST1");
  check("another student may use it while uses remain", r.statusCode === 200 && r.body.finalAmount === 1, `${r.statusCode}`);
  const sub3 = await Subscription.findById(r.body.subscriptionId);
  await pay(sub3.razorpayOrderId);
  check("count reaches 2", (await usedCount()) === 2, `usedCount ${await usedCount()}`);

  // ---- paying twice for one order must not double-count
  await pay(sub3.razorpayOrderId);
  check("re-verifying the same payment doesn't count twice", (await usedCount()) === 2, `usedCount ${await usedCount()}`);

  // ---- race: 3 students paying on the LAST remaining use
  await Coupon.updateOne({ code: "TEST1" }, { maxUses: 3 }); // 2 used, 1 left
  const racers = await Promise.all([31, 32, 33].map((n) => mkUser(n)));
  const orders = [];
  for (const u of racers) {
    const o = await order(u, "TEST1");
    if (o.statusCode === 200) orders.push((await Subscription.findById(o.body.subscriptionId)).razorpayOrderId);
  }
  await Promise.all(orders.map((id) => pay(id)));
  const finalCount = await usedCount();
  check("count never exceeds maxUses under a race", finalCount <= 3, `usedCount ${finalCount}, paid orders ${orders.length}`);

  // ---- open checkouts hold a use: 3 students can't all pay on 1 remaining use
  await Coupon.deleteOne({ code: "HOLD" });
  await Coupon.create({ code: "HOLD", type: "fixed_price", value: 1, maxUses: 1 });
  const holders = await Promise.all([41, 42, 43].map((n) => mkUser(n)));
  const opened = [];
  for (const u of holders) {
    const o = await order(u, "HOLD");
    if (o.statusCode === 200) opened.push((await Subscription.findById(o.body.subscriptionId)).razorpayOrderId);
  }
  check("only 1 of 3 students gets a checkout on a single-use coupon", opened.length === 1, `opened ${opened.length}`);
  await Promise.all(opened.map((id) => pay(id)));
  check("single-use coupon ends at exactly 1 use", (await Coupon.findOne({ code: "HOLD" })).usedCount === 1);

  // ---- a student's own abandoned checkout must not lock them out
  await Coupon.deleteOne({ code: "RETRY" });
  await Coupon.create({ code: "RETRY", type: "fixed_price", value: 1, maxUses: 1 });
  const retryUser = await mkUser(44);
  await order(retryUser, "RETRY"); // opens checkout, walks away
  r = await order(retryUser, "RETRY"); // comes back and tries again
  check("student can retry their own abandoned checkout", r.statusCode === 200, `${r.statusCode} ${r.body?.message || ""}`);

  // ---- a hold older than 15 minutes stops blocking others
  await Subscription.collection.updateMany({ couponCode: "RETRY" }, { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } });
  const laterUser = await mkUser(45);
  r = await order(laterUser, "RETRY");
  check("an abandoned checkout releases the coupon after 15 min", r.statusCode === 200, `${r.statusCode} ${r.body?.message || ""}`);

  // ---- inactive / expired coupons
  await Coupon.create({ code: "OFF", type: "percent", value: 50, isActive: false });
  r = await order(racers[0], "OFF");
  check("inactive coupon refused", r.statusCode === 400, r.body?.message);
  await Coupon.create({ code: "OLD", type: "percent", value: 50, expiresAt: new Date(Date.now() - 1000) });
  r = await order(racers[0], "OLD");
  check("expired coupon refused", r.statusCode === 400, r.body?.message);
  r = await order(racers[0], "NOPE");
  check("unknown coupon refused", r.statusCode === 400, r.body?.message);

  // ---- a coupon made for one plan works only on that plan (Diwali ₹1 on 1 Month)
  const Plan = require(path.join(SERVER, "models/Plan"));
  const { clearPlanCache } = require(path.join(SERVER, "services/plans"));
  const { validateCoupon, createCoupon, setCouponPlans } = require(path.join(SERVER, "controllers/couponController"));
  await Plan.updateOne({ key: "monthly" }, { couponsAllowed: true });
  await Plan.updateOne({ key: "yearly" }, { couponsAllowed: false });
  clearPlanCache();
  const make = async (body) => { const res = fakeRes(); await createCoupon({ body }, res); return res; };
  r = await make({ code: "diwali", type: "fixed_price", value: 1, plans: ["monthly"] });
  check("coupon can be made for the 1 Month plan only", r.statusCode === 201 && r.body.coupon.plans.join() === "monthly", JSON.stringify(r.body?.coupon?.plans));
  r = await make({ code: "BADPLAN", type: "percent", value: 10, plans: ["monthly", "no_such_plan"] });
  check("unknown plan in the list is refused", r.statusCode === 400 && /Unknown plan/.test(r.body.message), r.body?.message);

  const orderPlan = async (user, plan, code) => { const res = fakeRes(); await createOrder({ body: { plan, couponCode: code }, user: { _id: user._id } }, res); return res; };
  const diwaliUser = await mkUser(51);
  r = await orderPlan(diwaliUser, "monthly", "DIWALI");
  check("DIWALI on 1 Month: ₹59 -> ₹1", r.statusCode === 200 && r.body.finalAmount === 1, `${r.statusCode} ${r.body?.finalAmount ?? r.body?.message}`);
  r = await orderPlan(diwaliUser, "yearly", "DIWALI");
  check("DIWALI on a plan with coupons off is refused", r.statusCode === 400, r.body?.message);
  // Even if the yearly plan takes coupons again later, DIWALI stays 1-Month-only.
  await Plan.updateOne({ key: "yearly" }, { couponsAllowed: true });
  clearPlanCache();
  r = await orderPlan(diwaliUser, "yearly", "DIWALI");
  check("DIWALI refused on yearly even when yearly takes coupons", r.statusCode === 400 && /not valid for this plan/.test(r.body.message), r.body?.message);
  const val = async (code, plan) => { const res = fakeRes(); await validateCoupon({ query: { code, plan } }, res); return res.body; };
  check("app preview: DIWALI valid on 1 Month", (await val("DIWALI", "monthly")).finalAmount === 1);
  check("app preview: DIWALI not valid on yearly", (await val("DIWALI", "yearly")).valid === false);
  r = await orderPlan(diwaliUser, "yearly", "OLD");
  check("a coupon with no plan list still follows the plan's own switch", r.statusCode === 400 && /expired/.test(r.body.message), r.body?.message);
  // ---- one person, one use: two checkouts paid together give ONE month
  await Coupon.create({ code: "ONCE", type: "fixed_price", value: 1, plans: ["monthly"] });
  const twice = await mkUser(52);
  const oA = await orderPlan(twice, "monthly", "ONCE");
  const oB = await orderPlan(twice, "monthly", "ONCE");
  check("same student can open two checkouts (own retry)", oA.statusCode === 200 && oB.statusCode === 200);
  const idA = (await Subscription.findById(oA.body.subscriptionId)).razorpayOrderId;
  const idB = (await Subscription.findById(oB.body.subscriptionId)).razorpayOrderId;
  await Promise.all([pay(idA), pay(idB)]);
  const tw = await User.findById(twice._id);
  const days = Math.round((tw.subscriptionExpiresAt - Date.now()) / 86400000);
  check("both paid at once -> only one month added", days >= 27 && days <= 32, `${days} days`);
  const dupes = await Subscription.countDocuments({ user: twice._id, duplicateCoupon: true });
  check("the second payment is recorded as a duplicate", dupes === 1, `duplicates ${dupes}`);
  check("coupon counted once for that student", (await Coupon.findOne({ code: "ONCE" })).usedCount === 1);
  r = await orderPlan(twice, "monthly", "ONCE");
  check("a third try is refused at checkout", r.statusCode === 400 && /already used/.test(r.body.message), r.body?.message);

  // ---- a repeat notice for the SAME payment (webhook after a crash) still grants it
  const crash = await mkUser(53);
  const oC = await orderPlan(crash, "monthly", "ONCE");
  const subC = await Subscription.findById(oC.body.subscriptionId);
  // as if the claim was written and the server died before saving the order
  await User.updateOne({ _id: crash._id }, { $addToSet: { usedCoupons: "ONCE" }, $set: { "couponClaims.ONCE": subC.razorpayOrderId } });
  await pay(subC.razorpayOrderId);
  const cr = await User.findById(crash._id);
  check("retry of the claiming order still adds the month", cr.subscriptionStatus === "active" && !(await Subscription.findById(subC._id)).duplicateCoupon);

  const dw = await Coupon.findOne({ code: "DIWALI" });
  const pr = fakeRes();
  await setCouponPlans({ params: { id: dw._id }, body: { plans: [] } }, pr);
  check("plan list can be cleared from the admin", pr.statusCode === 200 && pr.body.coupon.plans.length === 0);

  await mongoose.disconnect();
  await mem.stop();

  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
