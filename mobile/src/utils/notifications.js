import Constants from "expo-constants";

// Expo Go dropped native push-notification support in SDK 53 - and it's not
// a soft failure: merely IMPORTING expo-notifications inside Expo Go throws
// at module-load time, which crashed the whole app on startup ("runtime not
// ready"). So the module is never statically imported here; it's required
// lazily, and only once we know we're not running inside Expo Go.
//
// Net effect: push works in a real dev/production build, and is silently
// skipped in Expo Go so day-to-day development isn't blocked.
const isExpoGo = Constants.executionEnvironment === "storeClient";

function loadNotifications() {
  if (isExpoGo) return null;
  try {
    return require("expo-notifications");
  } catch (err) {
    return null;
  }
}

// Called once at app start (App.js). Without this, a notification arriving
// while the app is already open is silently dropped instead of showing a
// banner - e.g. the "live exam starts in 15 min" reminder mid-session.
export function configureNotificationHandler() {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Requests permission and grabs this device's Expo push token, then persists
// it server-side (see AuthContext.js, called right after
// login/signup/OTP/Google - whichever the student used). Never throws - a
// student who denies the permission, or is on Expo Go / a simulator with no
// push capability, should just carry on using the app normally.
export async function registerForPushNotifications(api) {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (!token) return;

    await api.post("/auth/push-token", { token });
  } catch (err) {
    // Push is a nice-to-have (live exam reminders) - never let it block or
    // crash the login flow.
    console.log("Push notification registration skipped:", err.message);
  }
}
