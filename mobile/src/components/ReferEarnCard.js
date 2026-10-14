import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import AppAlert from "./AppAlert";
import { colors } from "../theme/theme";

// Refer & Earn, last on Home, for every student - one compact row: what a
// friend's sign-up earns, the student's code, and Invite (the phone's share
// sheet). Tapping the row opens the full Refer & Earn screen. Reward and the
// share message come from the server, so they never drift from what is paid.

export default function ReferEarnCard({ navigation }) {
  const [info, setInfo] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .get("/payments/referral-info")
        .then((res) => alive && setInfo(res.data || null))
        .catch(() => alive && setInfo(null));
      return () => {
        alive = false;
      };
    }, [])
  );

  // The offer can be switched off on the server; then the card goes too.
  if (!info || info.offerActive === false) return null;

  const reward = Number(info.rewardPerSignup || 0);
  const friends = Number(info.referralCount || 0);
  const code = info.referralCode || "";

  async function invite() {
    if (!info.shareMessage) return navigation.navigate("Referral");
    try {
      await Share.share({ message: info.shareMessage });
    } catch {
      AppAlert.alert("Couldn't share", "Please try again");
    }
  }

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate("Referral")}>
      <View style={styles.icon}>
        <Text style={styles.gift}>🎁</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {reward ? `Earn ₹${reward} per friend` : "Refer & Earn"}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {code ? `Code ${code}` : "Invite your friends"}
          {friends ? ` · ${friends} joined` : ""}
        </Text>
      </View>
      <TouchableOpacity style={styles.invite} activeOpacity={0.85} onPress={invite} accessibilityRole="button">
        <Ionicons name="share-social" size={14} color="#FFFFFF" />
        <Text style={styles.inviteText}>Invite</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" },
  gift: { fontSize: 20 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14.5, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 12, fontWeight: "600", color: colors.slate, marginTop: 2 },
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: colors.brand,
  },
  inviteText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
});
