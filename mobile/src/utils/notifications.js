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
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Requests permission and grabs this device's Expo push token, then persists
// it server-side (see AuthContext.js, called right after
// login/signup/OTP - whichever the student used). Never throws - a
// student who denies the permission, or is on Expo Go / a simulator with no
// push capability, should just carry on using the app normally.
//
// When the phone cannot get a token, the reason goes to the server instead
// ({ error }), so the admin can see why a student gets no notifications -
// before this, every failure was swallowed and nobody could tell.
export async function registerForPushNotifications(api) {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  const report = (error) => api.post("/auth/push-token", { error }).catch(() => {});

  try {
    // Android 8+ shows nothing without a channel, and on Android 13+ the
    // permission prompt only appears once a channel exists.
    const { Platform } = require("react-native");
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Reminders and results",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      report("Notification permission not given on this phone");
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse?.data;
    if (!token) {
      report("The phone returned no push token");
      return;
    }

    await api.post("/auth/push-token", { token });
  } catch (err) {
    // Push is a nice-to-have - never let it block or crash the login flow.
    const msg = String(err?.message || err);
    console.log("Push notification registration skipped:", msg);
    report(/firebase|fcm|google-services/i.test(msg) ? `Push is not set up in this app build (Firebase): ${msg}` : msg);
  }
}
