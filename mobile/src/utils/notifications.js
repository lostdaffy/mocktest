import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Requests permission and grabs this device's Expo push token, then hands
// it to the caller to persist server-side (see AuthContext.js, called right
// after login/signup/OTP/Google - whichever the student used). Never
// throws - a student who denies the permission, or is on a simulator with
// no push capability, should just carry on using the app normally.
export async function registerForPushNotifications(api) {
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
