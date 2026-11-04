// "Send message to one student": the real controller and broadcast service against
// a throwaway in-memory MongoDB; the push service is stubbed (nothing is sent).
const path = require("path");
const { MongoMemoryServer } = require("mongodb-memory-server");
const SERVER = path.resolve(__dirname, "..");
const mongoose = require(path.join(SERVER, "node_modules/mongoose"));

const pushed = [];
const pushPath = require.resolve(path.join(SERVER, "services/pushService"));
require.cache[pushPath] = {
  id: pushPath, filename: pushPath, loaded: true,
  exports: { sendPushNotifications: async (tokens, msg) => { pushed.push({ tokens, msg }); return { sent: tokens.length, errors: [] }; } },
};

const results = [];
const check = (name, cond, detail = "") => { results.push(!!cond); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`); };
const fakeRes = () => { const r = { statusCode: 200, body: null }; r.status = (s) => { r.statusCode = s; return r; }; r.json = (b) => { r.body = b; return r; }; return r; };

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri() + "msg_test");
  const User = require(path.join(SERVER, "models/User"));
  const Broadcast = require(path.join(SERVER, "models/Broadcast"));
  const { sendMessageToUser } = require(path.join(SERVER, "controllers/adminUserController"));
  const { forStudent } = require(path.join(SERVER, "services/broadcast"));

  const mk = (n, extra = {}) => User.create({ name: `S${n}`, phone: `91000000${n}`, email: `s${n}@t.com`, passwordHash: "x", referralCode: `R${n}`, ...extra });
  const nitesh = await mk(11, { name: "Nitesh Kumar", pushToken: "ExponentPushToken[nitesh]" });
  const other = await mk(12, { pushToken: "ExponentPushToken[other]" });
  const noPhone = await mk(13);
  const admin = await mk(14, { role: "admin", pushToken: "ExponentPushToken[admin]" });
  const blocked = await mk(15, { blockedAt: new Date(), pushToken: "ExponentPushToken[blocked]" });

  const send = async (id, body) => { const res = fakeRes(); await sendMessageToUser({ params: { id: String(id) }, body }, res); return res; };
  const gift = { title: "A gift for you", body: "Rankveer has given you 1 month of Premium, free.", screen: "HomeTab" };

  let r = await send(nitesh._id, gift);
  check("message to one student goes through", r.statusCode === 201 && r.body.onPhone === true, r.body.message);
  check("exactly ONE phone got the push - not everyone", pushed.length === 1 && pushed[0].tokens.length === 1 && pushed[0].tokens[0] === "ExponentPushToken[nitesh]");
  check("the push carries the written text", pushed[0].msg.title === gift.title && pushed[0].msg.body === gift.body);

  const feedN = await forStudent(await User.findById(nitesh._id).lean());
  const feedO = await forStudent(await User.findById(other._id).lean());
  check("it is in Nitesh's Notifications list", feedN.some((x) => x.title === gift.title));
  check("it is NOT in anyone else's list", !feedO.some((x) => x.title === gift.title));

  r = await send(noPhone._id, { title: "Gift", body: "Hello, new gift for you" });
  check("a student whose phone has no token still gets it in the app list", r.statusCode === 201 && r.body.onPhone === false && /no notification token/i.test(r.body.message));
  check("…and no push went out for them", pushed.length === 1);

  r = await send(other._id, gift);
  check("the same text to a DIFFERENT student is allowed", r.statusCode === 201);
  r = await send(nitesh._id, gift);
  check("the same text to the SAME student within 10 minutes is refused", r.statusCode === 409, `${r.statusCode}`);

  r = await send(admin._id, gift);
  check("admin accounts can't be messaged", r.statusCode === 400);
  r = await send(blocked._id, gift);
  check("blocked accounts can't be messaged", r.statusCode === 400);
  r = await send(new mongoose.Types.ObjectId(), gift);
  check("unknown student: 404", r.statusCode === 404);
  r = await send(nitesh._id, { title: "", body: "x" });
  check("empty title refused", r.statusCode === 400);
  r = await send(nitesh._id, { title: "x".repeat(66), body: "ok body" });
  check("a title over 65 characters is refused", r.statusCode === 400);
  r = await send(nitesh._id, { title: "Ok title", body: "y".repeat(241) });
  check("a message over 240 characters is refused", r.statusCode === 400);

  const saved = await Broadcast.findOne({ title: gift.title, "audience.kind": "user" }).lean();
  check("it is recorded in the broadcast history as one student", saved && saved.students === 1 && String(saved.audience.userId) === String(nitesh._id));

  // The old group audiences must still behave.
  const { startBroadcast, audienceFilter } = require(path.join(SERVER, "services/broadcast"));
  check("an 'all' broadcast still excludes admin and blocked", (await User.countDocuments(audienceFilter({ kind: "all" }))) === 3);
  let bad = null; try { await startBroadcast({ title: "T", body: "B", audience: { kind: "user", userId: "not-an-id" } }); } catch (e) { bad = e; }
  check("a broken user id is refused, never widened to everyone", bad && bad.status === 400);

  await mongoose.disconnect(); await mem.stop();
  const fail = results.filter((x) => !x).length;
  console.log(`\n${results.length - fail}/${results.length} passed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
