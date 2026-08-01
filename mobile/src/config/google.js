// Fill these in after creating OAuth 2.0 Client IDs in Google Cloud Console
// (console.cloud.google.com -> APIs & Services -> Credentials -> Create
// Credentials -> OAuth client ID). See PLACEMENT_GUIDE.md for the full
// step-by-step - this is the one piece only you can set up, since it needs
// your own Google account and app package name.
//
// Minimum to get going TODAY: just the Web client ID works for testing in
// Expo Go via the auth proxy. Android/iOS client IDs matter once you build
// a standalone app for the Play Store / App Store (a production build
// can't use the Expo proxy).
export const GOOGLE_WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";
export const GOOGLE_ANDROID_CLIENT_ID = "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com";
export const GOOGLE_IOS_CLIENT_ID = "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com";