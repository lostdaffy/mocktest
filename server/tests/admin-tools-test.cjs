// The admin's tools for running the app: blocking a student, a message to
// many students at once (broadcast), and the payments view. Runs the real
// server against a throwaway in-memory MongoDB; push notifications are
// recorded, never sent.
//
//   node tests/admin-tools-test.cjs
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));
const jwt = require(path.join(SERVER, "node_modules/jsonwebtoken"));
const bcrypt = require(path.join(SERVER, "node_modules/bcryptjs"));
const PORT = 5103;
const BASE = `http://127.0.0.1:${PORT}/api`;
const JWT_SECRET = "test_secret_" + "y".repeat(40);
const PUSH_LOG = path.join(os.tmpdir(), `rv-push-${Date.now()}.jsonl`);

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};
async function api(method, p, { token, body } = {}) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}
const pushes = () => (fs.existsSync(PUSH_LOG) ? fs.readFileSync(PUSH_LOG, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri() + "admin_tools_test";
  const env = {
    ...process.env, MONGO_URI: uri, JWT_SECRET, PORT: String(PORT), PUSH_LOG,
    TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "", TWILIO_PHONE_NUMBER: "",
    EMAIL_USER: "", EMAIL_APP_PASSWORD: "", RAZORPAY_KEY_ID: "", RAZORPAY_KEY_SECRET: "", ALLOWED_ORIGINS: "",
  };
  const srv = spawn(process.execPath, ["-r", path.join(__dirname, "admin-tools-stub.cjs"), "server.js"], { cwd: SERVER, env });
  let log = "";
  srv.stdout.on("data", (d) => (log += d));
  srv.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 80 && !/Server running/.test(log); i++) await wait(250);
  if (!/Server running/.test(log)) { console.log(log); throw new Error("server did not start"); }

  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection("users");
  const subs = mongoose.connection.db.collection("subscriptions");
  const hash = await bcrypt.hash("secret123", 4);
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const mk = (o) => users.insertOne({ role: "student", referralCode: `R${Math.random().toString(36).slice(2, 8)}`, passwordHash: hash, ...o });

  const admin = await mk({ name: "Admin", phone: "9000000000", role: "admin", pushToken: "ExponentPushToken[admin]" });
  const adminToken = jwt.sign({ id: admin.insertedId.toString(), sessionId: "x" }, JWT_SECRET);
  const asAdmin = (m, p, body) => api(m, p, { token: adminToken, body });

  const s1 = await mk({ name: "Asha", phone: "9100000001", examGoals: ["SSC_CGL"], pushToken: "ExponentPushToken[s1]", subscriptionStatus: "active", subscriptionExpiresAt: future });
  await mk({ name: "Bilal", phone: "9100000002", examGoals: ["SSC_CGL", "RRB_NTPC"], pushToken: "ExponentPushToken[s2]" });
  await mk({ name: "Chetna", phone: "9100000003", examGoals: ["SSC_CGL"], pushToken: "ExponentPushToken[s3]" });
  await mk({ name: "Dev", phone: "9100000004", examGoals: ["RRB_NTPC"] }); // no notifications on this phone
  const blocked = await mk({ name: "Eshan", phone: "9100000005", examGoals: ["SSC_CGL"], pushToken: "ExponentPushToken[blocked]", blockedAt: new Date() });

  // ================================================================ block
  let r = await api("POST", "/auth/login", { body: { phone: "9100000002", password: "secret123" } });
  check("a student signs in", r.status === 200 && r.json.token, `${r.status} ${r.json.message || ""}`);
  const bilalToken = r.json.token;
  const bilalId = r.json.user?._id || r.json.user?.id;
  check("...and their token works", (await api("GET", "/auth/me", { token: bilalToken })).status === 200);

  r = await asAdmin("PATCH", `/admin/users/${bilalId}/block`, { blocked: true, reason: "Account shared with 4 people" });
  check("the admin blocks a student", r.status === 200 && r.json.blocked === true, `${r.status} ${r.json.message}`);
  r = await api("GET", "/auth/me", { token: bilalToken });
  check("...their open session stops at once", r.status === 401 && r.json.reason === "ACCOUNT_BLOCKED" && r.json.code === "TOKEN_INVALID", `${r.status} ${JSON.stringify(r.json)}`);
  r = await api("POST", "/auth/login", { body: { phone: "9100000002", password: "secret123" } });
  check("...they cannot sign in again, and are told why", r.status === 403 && r.json.code === "ACCOUNT_BLOCKED" && /blocked/i.test(r.json.message), `${r.status} ${r.json.message}`);
  r = await api("POST", "/auth/login", { body: { phone: "9100000002", password: "wrong-one" } });
  check("...a wrong password says nothing about the block", r.status === 401 && !/blocked/i.test(r.json.message || ""), `${r.status} ${r.json.message}`);

  r = await asAdmin("GET", `/admin/users/${bilalId}`);
  check("the support view shows the block and its reason", r.json.flags?.blocked === true && r.json.flags?.blockedReason === "Account shared with 4 people");
  r = await asAdmin("GET", "/admin/users?blocked=yes");
  check("the users list can show only blocked students", r.status === 200 && (r.json.users || []).length === 2, `${(r.json.users || []).map((u) => u.name)}`);
  r = await asAdmin("PATCH", `/admin/users/${admin.insertedId}/block`, { blocked: true });
  check("the admin account cannot be blocked", r.status === 403);

  r = await asAdmin("PATCH", `/admin/users/${bilalId}/block`, { blocked: false });
  check("the admin unblocks them", r.status === 200 && r.json.blocked === false);
  r = await api("POST", "/auth/login", { body: { phone: "9100000002", password: "secret123" } });
  check("...and they sign in as before", r.status === 200 && r.json.token, `${r.status}`);
  const bilalToken2 = r.json.token;
  r = await api("POST", "/auth/login", { body: { phone: "9100000001", password: "secret123" } });
  const ashaToken = r.json.token;

  // ================================================================ broadcast
  r = await asAdmin("POST", "/admin/broadcasts/preview", { audience: { kind: "all" } });
  check("preview: everyone means the students, not the admin or the blocked", r.json.students === 4 && r.json.phones === 3, `${r.json.students}/${r.json.phones}`);
  const ssc = (r.json.exams || []).find((e) => e.exam === "SSC_CGL");
  check("preview: the exams to choose from, with their students", ssc?.students === 3 && (r.json.exams || []).some((e) => e.exam === "RRB_NTPC" && e.students === 2), JSON.stringify(r.json.exams));
  r = await asAdmin("POST", "/admin/broadcasts/preview", { audience: { kind: "paid" } });
  check("preview: paid students", r.json.students === 1, `${r.json.students}`);
  r = await asAdmin("POST", "/admin/broadcasts/preview", { audience: { kind: "free" } });
  check("preview: free students", r.json.students === 3, `${r.json.students}`);

  r = await asAdmin("POST", "/admin/broadcasts", { title: "", body: "x" });
  check("a message needs a title", r.status === 400);
  r = await asAdmin("POST", "/admin/broadcasts", { title: "x".repeat(66), body: "y" });
  check("a title longer than the phone shows is refused", r.status === 400);
  r = await asAdmin("POST", "/admin/broadcasts", { title: "Hi", body: "y", audience: { kind: "exam" } });
  check("an exam audience needs the exam", r.status === 400);
  r = await asAdmin("POST", "/admin/broadcasts", { title: "Hi", body: "y", audience: { kind: "all" }, screen: "ExamSeries" });
  check("'open mock series' needs one exam", r.status === 400);

  r = await asAdmin("POST", "/admin/broadcasts", { title: "New SSC CGL mocks", body: "Five full mocks are up. Try one today.", audience: { kind: "exam", exam: "SSC_CGL" }, screen: "ExamSeries" });
  check("the admin sends to one exam's students", r.status === 201 && r.json.broadcast?.students === 3, `${r.status} ${r.json.message}`);
  const firstId = r.json.broadcast?._id;
  let sent;
  for (let i = 0; i < 40; i++) {
    sent = (await asAdmin("GET", "/admin/broadcasts")).json.items?.find((b) => b._id === firstId);
    if (sent?.status === "done") break;
    await wait(150);
  }
  check("...it finishes, with the counts", sent?.status === "done" && sent.phones === 3 && sent.delivered === 3, JSON.stringify(sent && { s: sent.status, p: sent.phones, d: sent.delivered }));
  const tokens = pushes().flatMap((p) => p.tokens).sort();
  check("...the push went to exactly that exam's phones", JSON.stringify(tokens) === JSON.stringify(["ExponentPushToken[s1]", "ExponentPushToken[s2]", "ExponentPushToken[s3]"]), tokens.join(","));
  check("...never to the admin or a blocked student", !tokens.includes("ExponentPushToken[admin]") && !tokens.includes("ExponentPushToken[blocked]"));
  check("...and says which exam's mocks to open", pushes()[0]?.data?.screen === "ExamSeries" && pushes()[0]?.data?.examStage === "SSC_CGL");

  r = await asAdmin("POST", "/admin/broadcasts", { title: "New SSC CGL mocks", body: "Five full mocks are up. Try one today.", audience: { kind: "all" } });
  check("the same message twice within 10 minutes is refused", r.status === 409, `${r.status}`);

  r = await asAdmin("POST", "/admin/broadcasts", { title: "Premium: live test Sunday", body: "Sunday 10 AM, all-India rank.", audience: { kind: "paid" }, screen: "LiveTab" });
  check("a message to paid students only", r.status === 201 && r.json.broadcast?.students === 1);
  await wait(500);

  r = await api("GET", "/tests/notifications", { token: bilalToken2 });
  const bilalFeed = (r.json.items || []).filter((i) => i.kind === "announcement");
  check("the message is in an SSC student's Notifications list", bilalFeed.some((i) => i.title === "New SSC CGL mocks" && i.action?.screen === "ExamSeries" && i.action?.params?.examStage === "SSC_CGL"), JSON.stringify(bilalFeed));
  check("...a paid-only message is not in a free student's list", !bilalFeed.some((i) => /Premium/.test(i.title)));
  r = await api("GET", "/tests/notifications", { token: ashaToken });
  check("...and is in the paid student's", (r.json.items || []).some((i) => /Premium/.test(i.title)));
  r = await api("GET", "/admin/broadcasts", { token: bilalToken2 });
  check("a student cannot see or send broadcasts", r.status === 403);

  // ================================================================ payments
  const now = new Date();
  const base = { startDate: now, endDate: future };
  await subs.insertMany([
    { ...base, user: s1.insertedId, plan: "quarterly", amount: 149, status: "paid", razorpayOrderId: "order_A1", razorpayPaymentId: "pay_A1", couponCode: "LAUNCH50", createdAt: now },
    { ...base, user: s1.insertedId, plan: "yearly", amount: 0, status: "paid", razorpayOrderId: `manual_1_${s1.insertedId}`, createdAt: now },
    { ...base, user: blocked.insertedId, plan: "half_yearly", amount: 249, status: "created", razorpayOrderId: "order_B1", createdAt: now },
    { ...base, user: s1.insertedId, plan: "yearly", amount: 399, status: "paid", razorpayOrderId: "order_C1", createdAt: new Date("2025-01-10T10:00:00Z") },
  ]);
  await users.updateOne({ _id: blocked.insertedId }, { $set: { name: "=HYPERLINK(\"x\")" } });

  r = await asAdmin("GET", "/admin/payments/summary");
  check("summary: today's money is the real payment only", r.json.today?.amount === 149 && r.json.today?.count === 1, JSON.stringify(r.json.today));
  check("summary: all time", r.json.all?.amount === 548 && r.json.all?.count === 2, JSON.stringify(r.json.all));
  check("summary: free grants and unfinished orders counted apart", r.json.grants === 1 && r.json.pendingWeek === 1);
  check("summary: coupon use", r.json.coupons?.[0]?.code === "LAUNCH50" && r.json.coupons[0].count === 1);

  r = await asAdmin("GET", "/admin/payments");
  check("the list has every order, newest first", r.json.total === 4 && r.json.items?.[r.json.items.length - 1]?.amount === 399);
  check("...each says what it is", ["paid", "grant", "pending"].every((k) => r.json.items.some((i) => i.kind === k)));
  check("...the paid total of the view counts real payments, not free grants", r.json.paidInView?.count === 2 && r.json.paidInView?.amount === 548, JSON.stringify(r.json.paidInView));
  check("...a free grant shows no order id", r.json.items.find((i) => i.kind === "grant")?.razorpayOrderId === null);
  r = await asAdmin("GET", "/admin/payments?kind=pending");
  check("filter: orders never paid", r.json.total === 1 && r.json.items[0].plan === "half_yearly");
  r = await asAdmin("GET", "/admin/payments?q=9100000001");
  check("search by phone", r.json.total === 3);
  r = await asAdmin("GET", "/admin/payments?q=pay_A1");
  check("search by Razorpay id", r.json.total === 1 && r.json.items[0].razorpayPaymentId === "pay_A1");
  r = await asAdmin("GET", "/admin/payments?from=2025-01-01&to=2025-01-31");
  check("filter by dates (IST)", r.json.total === 1 && r.json.paidInView.amount === 399);

  r = await asAdmin("GET", "/admin/payments/export");
  const lines = r.text.replace(/^﻿/, "").trim().split("\n");
  check("CSV export: a header and one line per order", r.status === 200 && lines.length === 5 && /^Date \(IST\),Status/.test(lines[0]), `${lines.length}`);
  check("...a name that looks like a formula cannot run in Excel", lines.some((l) => l.includes("'=HYPERLINK")), lines.find((l) => /HYPERLINK/.test(l)));
  r = await api("GET", "/admin/payments", { token: ashaToken });
  check("a student cannot see payments", r.status === 403);

  srv.kill();
  await mongoose.disconnect();
  await mem.stop();
  try { fs.unlinkSync(PUSH_LOG); } catch {}
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
