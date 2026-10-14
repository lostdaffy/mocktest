import AsyncStorage from "@react-native-async-storage/async-storage";

// When the student last opened Notifications. Home shows the bell's dot
// only for something newer than this - the dot used to be drawn always,
// with or without anything to see.

const KEY = "notificationsSeenAt";

export async function getSeenAt() {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}

export async function markSeen(at = new Date()) {
  try {
    await AsyncStorage.setItem(KEY, new Date(at).toISOString());
  } catch {
    // a missed write only means the dot shows once more
  }
}

/** True when any item is newer than the last visit. */
export function hasUnseen(items, seenAt) {
  if (!items?.length) return false;
  if (!seenAt) return true;
  return items.some((i) => i.at && new Date(i.at) > seenAt);
}
