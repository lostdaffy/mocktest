// Strips, from every request body, query and route params, the keys that can
// turn data into an attack:
//
// - a key starting with "$" ({ "phone": { "$ne": "" } }) - passed to a query
//   it becomes a database operator, and "find the user whose phone is not
//   empty" logs in as the first account;
// - "__proto__", "constructor", "prototype" - copied into an object they
//   reach every object in the server (prototype pollution).
//
// Values are left exactly as sent; only those keys go. Depth is capped so a
// deeply nested body cannot tie the server up.
const BAD = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEPTH = 20;

function clean(value, depth = 0) {
  if (!value || typeof value !== "object") return 0;
  if (depth > MAX_DEPTH) return 0;
  let removed = 0;
  if (Array.isArray(value)) {
    for (const v of value) removed += clean(v, depth + 1);
    return removed;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || BAD.has(key)) {
      delete value[key];
      removed++;
    } else {
      removed += clean(value[key], depth + 1);
    }
  }
  return removed;
}

function sanitize(req, res, next) {
  const removed = clean(req.body) + clean(req.query) + clean(req.params);
  if (removed) console.warn(`Sanitised ${removed} unsafe key(s) from ${req.method} ${req.originalUrl.split("?")[0]} (${req.ip})`);
  next();
}

module.exports = { sanitize, clean };
