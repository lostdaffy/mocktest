// "Send test notification" in the admin's user view: one notification to one
// account's phone, never anyone else's, and an honest answer when it cannot
// go. Runs in this process with Expo stubbed - nothing leaves the machine.
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");

const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

// Expo, stubbed: what was asked of it, and what it answers.
const asked = [];
let answer = (tokens) => ({ sent: tokens.length, errors: [] });
require.cache[require.resolve(path.join(SERVER, "services/pushService"))] = {
  exports: { sendPushNotifications: async (tokens, msg) => { asked.push({ tokens, ...msg }); return answer(tokens); } },
};

function call(fn, params) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(body) { resolve({ status: this.statusCode, body }); },
    };
    fn({ params, body: {} }, res);
  });
}

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "test_push");
  const User = require(path.join(SERVER, "models/User"));
  const { sendTestPush } = require(path.join(SERVER, "controllers/adminUserController"));

  const me = await User.create({ name: "Satya", phone: "9000000001", referralCode: "ME1", pushToken: "ExponentPushToken[mine]" });
  await User.create({ name: "Other", phone: "9000000002", referralCode: "OT1", pushToken: "ExponentPushToken[other]" });
  const none = await User.create({ name: "No Token", phone: "9000000003", referralCode: "NT1", pushError: "permission denied" });
  const fresh = await User.create({ name: "Fresh", phone: "9000000004", referralCode: "FR1" });

  let r = await call(sendTestPush, { id: String(me._id) });
  check("it sends", r.status === 200 && r.body.sent === 1, JSON.stringify(r.body));
  check("...to that one phone only", asked.length === 1 && asked[0].tokens.join() === "ExponentPushToken[mine]", JSON.stringify(asked));
  check("...and says it is a test", /test/i.test(asked[0]?.title || ""), asked[0]?.title);

  r = await call(sendTestPush, { id: String(none._id) });
  check("no token: says why (the phone's own reason)", r.status === 409 && /permission denied/.test(r.body.message), r.body.message);
  r = await call(sendTestPush, { id: String(fresh._id) });
  check("no token and no reason: says the phone has not registered", r.status === 409 && /not registered/.test(r.body.message), r.body.message);
  check("...and nothing was sent for either", asked.length === 1, String(asked.length));

  answer = () => ({ sent: 0, errors: ["DeviceNotRegistered"] });
  r = await call(sendTestPush, { id: String(me._id) });
  check("Expo refuses: reported, not called a success", r.status === 502 && /DeviceNotRegistered/.test(r.body.message), r.body.message);

  r = await call(sendTestPush, { id: String(new mongoose.Types.ObjectId()) });
  check("an unknown account is a 404", r.status === 404, String(r.status));

  // The route is admin-only.
  const routes = require("fs").readFileSync(path.join(SERVER, "routes/adminUserRoutes.js"), "utf8");
  check("the route sits behind protect + adminOnly", /router\.post\("\/:id\/test-push", protect, adminOnly/.test(routes));

  await mongoose.disconnect();
  await mem.stop();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
