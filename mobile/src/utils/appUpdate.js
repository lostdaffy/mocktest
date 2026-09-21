import Constants from "expo-constants";
import api from "../api/client";

// Version of THIS installed build, from app.json's "version". Bump that
// field for every Play Store release, or the update check has nothing to
// compare against.
export function getInstalledVersion() {
  return Constants.expoConfig?.version || "0.0.0";
}

// Numeric, segment-by-segment comparison: "1.10.0" is newer than "1.9.0",
// which a plain string comparison gets wrong.
// Returns -1 if a < b, 0 if equal, 1 if a > b.
export function compareVersions(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

// Asks the backend whether this build is still allowed to run.
//
// FAILS OPEN: no network, backend asleep, a timeout - all of these return
// "not required". A student in a patchy-signal area must never be locked out
// of the app just because this one check couldn't complete; the next
// launch will simply try again.
export async function checkForRequiredUpdate() {
  try {
    const res = await api.get("/app-config", { timeout: 8000 });
    const { minVersion, androidStoreUrl, updateMessage } = res.data || {};
    const installed = getInstalledVersion();

    if (minVersion && compareVersions(installed, minVersion) < 0) {
      return {
        required: true,
        installedVersion: installed,
        minVersion,
        storeUrl: androidStoreUrl,
        message: updateMessage,
      };
    }
  } catch (err) {
    console.log("Update check skipped:", err.message);
  }

  return { required: false };
}
