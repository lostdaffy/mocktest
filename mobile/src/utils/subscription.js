
export function isSubscribed(user) {
  return !!(
    user?.subscriptionStatus === "active" &&
    user?.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > new Date()
  );
}