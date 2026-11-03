// Plan management test: the real admin routes + the real createOrder, against a
// throwaway in-memory MongoDB. Razorpay is stubbed - no network, no money.
const path = require("path");
const http = require("http");
const bcrypt = require("bcryptjs");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const express = require(path.join(SERVER, "node_modules/express"));

const razorpayPath = require.resolve("razorpay", { paths: [SERVER] });
let orderCounter = 0;
const orderAmounts = [];
require.cache[razorpayPath] = {
  id: razorpayPath, filename: razorpayPath, loaded: true,
  exports: class FakeRazorpay {
    constructor() { this.orders = { create: async (o) => { orderAmounts.push(o.amount); return { id: `order_fake_${++orderCounter}`, amount: o.amount, currency: "INR" }; } }; }
  },
};
process.env.RAZORPAY_KEY_ID = "rzp_live_faketestkey";
process.env.RAZORPAY_KEY_SECRET = "fake_live_secret";
process.env.JWT_SECRET = "test_secret_" + "x".repeat(40);

const results = [];
const check = (name, cond, detail = "") => {
  results.push(!!cond);
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "plans_test");

  const User = require(path.join(SERVER, "models/User"));
  const Subscription = require(path.join(SERVER, "models/Subscription"));
  const AdminAudit = require(path.join(SERVER, "models/AdminAudit"));
  const Plan = require(path.join(SERVER, "models/Plan"));
  const { clearPlanCache } = require(path.join(SERVER, "services/plans"));

  const PASS = "Correct-Horse-9";
  const admin = await User.create({ name: "Admin", phone: "9000000001", email: "a@t.com", role: "admin", passwordHash: await bcrypt.hash(PASS, 4), referralCode: "ADM1" });
  const student = await User.create({ name: "Stu", phone: "9000000002", email: "s@t.com", passwordHash: "x", referralCode: "STU1", activeSessionId: "x" });
  const adminTok = jwt.sign({ id: admin._id.toString() }, process.env.JWT_SECRET);
  const stuTok = jwt.sign({ id: student._id.toString(), sessionId: "x" }, process.env.JWT_SECRET);

  const app = express();
  app.use(express.json());
  app.use(require(path.join(SERVER, "middleware/sanitize")).sanitize);
  app.use("/admin/plans", require(path.join(SERVER, "routes/adminPlanRoutes")));
  app.use("/payments", require(path.join(SERVER, "routes/paymentRoutes")));
  app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: "err" }); });
  const srv = http.createServer(app);
  await new Promise((r) => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;

  const call = async (method, url, { tok = adminTok, pass, body } = {}) => {
    const r = await fetch(base + url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}`, ...(pass ? { "X-Confirm-Password": pass } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  // ---- reading
  let r = await call("GET", "/admin/plans");
  check("the 4 original plans are seeded and on sale", r.status === 200 && r.body.plans.length === 4 && r.body.plans.every((p) => p.active), `${r.body.plans?.length}`);
  r = await call("GET", "/payments/plans", { tok: stuTok });
  check("student sees the same 4 plans, prices unchanged", r.body.plans.map((p) => `${p.id}:${p.price}`).join() === "monthly:59,quarterly:149,half_yearly:249,yearly:449");

  // ---- who may write
  r = await call("GET", "/admin/plans", { tok: stuTok });
  check("a student can't even list admin plans", r.status === 403);
  r = await call("POST", "/admin/plans", { tok: stuTok, pass: PASS, body: { key: "hack", name: "x", months: 1, price: 1 } });
  check("a student can't create a plan, even with a password", r.status === 403);
  r = await call("POST", "/admin/plans", { body: { key: "two_year", name: "24 Months", months: 24, price: 799 } });
  check("admin token alone (no password) is refused", r.status === 403 && r.body.code === "CONFIRM_REQUIRED");
  r = await call("POST", "/admin/plans", { pass: "wrong-password", body: { key: "two_year", name: "24 Months", months: 24, price: 799 } });
  check("wrong password is refused", r.status === 403 && r.body.code === "CONFIRM_WRONG");
  check("nothing was created by the refused calls", (await Plan.countDocuments()) === 4);

  // ---- create / validate
  r = await call("POST", "/admin/plans", { pass: PASS, body: { key: "two_year", name: "24 Months", months: 24, price: 799, mrp: 3599, badge: "BEST" } });
  check("admin + password creates a plan", r.status === 201 && r.body.plan.key === "two_year");
  check("a new plan starts OFF sale", r.body.plan.active === false);
  const twoYear = r.body.plan;
  r = await call("POST", "/admin/plans", { pass: PASS, body: { key: "two_year", name: "dup", months: 24, price: 799 } });
  check("duplicate id refused", r.status === 409);
  for (const [label, body] of [
    ["price as text", { key: "bad_one", name: "x", months: 1, price: "59" }],
    ["fractional price", { key: "bad_two", name: "x", months: 1, price: 59.5 }],
    ["negative price", { key: "bad_three", name: "x", months: 1, price: -5 }],
    ["huge price", { key: "bad_four", name: "x", months: 1, price: 999999 }],
    ["0 months", { key: "bad_five", name: "x", months: 0, price: 59 }],
    ["50 months", { key: "bad_six", name: "x", months: 50, price: 59 }],
    ["bad id", { key: "Bad Id!", name: "x", months: 1, price: 59 }],
    ["mrp below price", { key: "bad_seven", name: "x", months: 1, price: 100, mrp: 50 }],
    ["credit 150%", { key: "bad_eight", name: "x", months: 1, price: 59, creditPercent: 150 }],
  ]) {
    r = await call("POST", "/admin/plans", { pass: PASS, body });
    check(`rejects ${label}`, r.status === 400, `${r.status}`);
  }
  r = await call("POST", "/admin/plans", { pass: PASS, body: { key: "cheap_one", name: "Cheap", months: 1, price: 5 } });
  check("a very low price needs an extra acknowledgement", r.status === 409 && r.body.code === "NEEDS_ACK");
  r = await call("POST", "/admin/plans", { pass: PASS, body: { key: "inject", name: "x", months: 1, price: 59, active: true, createdBy: "evil", _id: "abc", $set: { price: 1 } } });
  check("extra / operator fields in the body can't set protected fields", r.status === 201 && r.body.plan.active === false && String(r.body.plan.createdBy) === String(admin._id));
  const inject = r.body.plan;
  await call("DELETE", `/admin/plans/${inject._id}`, { pass: PASS });

  // ---- off-sale plan can't be bought; on-sale plan is charged the DB price
  const { createOrder } = require(path.join(SERVER, "controllers/paymentController"));
  const fakeRes = () => { const x = { statusCode: 200, body: null }; x.status = (s) => { x.statusCode = s; return x; }; x.json = (b) => { x.body = b; return x; }; return x; };
  const buy = async (plan) => { const res = fakeRes(); await createOrder({ body: { plan }, user: { _id: student._id } }, res); return res; };
  let o = await buy("two_year");
  check("a plan that is OFF sale can't be bought", o.statusCode === 400);
  o = await buy("does_not_exist");
  check("an unknown plan can't be bought", o.statusCode === 400);

  r = await call("PATCH", `/admin/plans/${twoYear._id}/active`, { pass: PASS, body: { active: true } });
  check("admin puts it on sale", r.status === 200 && r.body.plan.active === true);
  o = await buy("two_year");
  check("order is charged the server price (₹799), 24 months stamped", o.statusCode === 200 && o.body.finalAmount === 799 && orderAmounts.at(-1) === 79900);
  const sub = await Subscription.findOne({ razorpayOrderId: o.body.orderId });
  check("the order remembers its length", sub.months === 24);

  // ---- price change: applies to NEW orders only; guard for big jumps
  r = await call("PATCH", `/admin/plans/${twoYear._id}`, { pass: PASS, body: { price: 99 } });
  check("a price drop of more than half needs acknowledgement", r.status === 409 && r.body.code === "NEEDS_ACK");
  r = await call("PATCH", `/admin/plans/${twoYear._id}`, { pass: PASS, body: { price: 99, acknowledge: true } });
  check("…and goes through once acknowledged", r.status === 200 && r.body.plan.price === 99);
  o = await buy("two_year");
  check("new orders use the new price", o.body.finalAmount === 99);
  check("the earlier open order keeps its ₹799", (await Subscription.findOne({ razorpayOrderId: sub.razorpayOrderId })).amount === 799);
  r = await call("PATCH", `/admin/plans/${twoYear._id}`, { pass: PASS, body: { price: 150 } });
  check("a normal edit (₹99 -> ₹150, under 2x) needs no acknowledgement", r.status === 200 && r.body.plan.price === 150);
  r = await call("PATCH", `/admin/plans/${twoYear._id}`, { pass: PASS, body: { key: "renamed", _id: "x" } });
  check("the plan id can't be changed", r.status === 400 || (await Plan.findById(twoYear._id)).key === "two_year");

  // ---- the last plan on sale can't be removed
  await call("PATCH", `/admin/plans/${twoYear._id}/active`, { pass: PASS, body: { active: false } });
  const all = (await call("GET", "/admin/plans")).body.plans;
  let lastErr = null;
  for (const p of all.filter((p) => p.active)) {
    const x = await call("PATCH", `/admin/plans/${p._id}/active`, { pass: PASS, body: { active: false } });
    if (x.status === 409) lastErr = x;
  }
  check("the last plan on sale can't be switched off", lastErr && lastErr.status === 409);
  check("at least one plan is still on sale", (await Plan.countDocuments({ active: true })) >= 1);

  // ---- delete vs archive
  r = await call("DELETE", `/admin/plans/${twoYear._id}`, { pass: PASS });
  check("a plan with a payment on record can't be deleted", r.status === 409 && r.body.code === "IN_USE");
  r = await call("POST", `/admin/plans/${twoYear._id}/archive`, { pass: PASS, body: { archive: true } });
  check("…it is archived instead", r.status === 200 && !!r.body.plan.archivedAt && r.body.plan.active === false);
  r = await call("PATCH", `/admin/plans/${twoYear._id}/active`, { pass: PASS, body: { active: true } });
  check("an archived plan can't go on sale until restored", r.status === 400);
  const fresh = await call("POST", "/admin/plans", { pass: PASS, body: { key: "scratch", name: "Scratch", months: 2, price: 99 } });
  r = await call("DELETE", `/admin/plans/${fresh.body.plan._id}`, { pass: PASS });
  check("a never-sold plan can be deleted", r.status === 200 && !(await Plan.findById(fresh.body.plan._id)));

  // ---- audit trail
  const rows = await AdminAudit.find({}).sort({ at: 1 }).lean();
  const acts = rows.map((x) => x.action);
  check("every change is in the audit log", ["plan.create", "plan.activate", "plan.update", "plan.archive", "plan.delete"].every((a) => acts.includes(a)), acts.join(","));
  check("the wrong-password attempt is logged", acts.includes("auth.confirm_failed"));
  const upd = rows.find((x) => x.action === "plan.update");
  check("an update logs before and after", upd && upd.before && upd.after && upd.before.price !== upd.after.price);
  check("the audit rows name the admin", rows.every((x) => String(x.actor) === String(admin._id)));

  // ---- brute force lock
  let locked = null;
  for (let i = 0; i < 7; i++) locked = await call("PATCH", `/admin/plans/${twoYear._id}`, { pass: "nope" + i, body: { name: "x" } });
  check("repeated wrong passwords lock confirmation", locked.status === 429 && locked.body.code === "CONFIRM_LOCKED", `${locked.status}`);
  r = await call("PATCH", `/admin/plans/${twoYear._id}`, { pass: PASS, body: { name: "x" } });
  check("while locked even the right password is refused", r.status === 429);

  srv.close();
  await mongoose.disconnect();
  await mem.stop();
  const bad = results.filter((x) => !x).length;
  console.log(`\n${results.length - bad}/${results.length} passed`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
