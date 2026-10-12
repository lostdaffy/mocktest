// The mobile app says which version it is in an X-App-Version header, from
// 1.2.0 on. Older installs send nothing, so "no header" means "an app older
// than 1.2.0" - or the admin panel / a browser, which never reach the checks
// that use this (they are admin accounts).

function versionParts(v) {
  return String(v || "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

// a >= b, comparing 1.10.0 above 1.9.0 the way a person would.
function atLeast(a, b) {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return true;
}

function appVersion(req) {
  return req.headers["x-app-version"] || null;
}

// True for an install that refreshes the signed-in user by itself (1.2.0+).
function refreshesUserItself(req) {
  const v = appVersion(req);
  return !!v && atLeast(v, "1.2.0");
}

module.exports = { atLeast, appVersion, refreshesUserItself };
