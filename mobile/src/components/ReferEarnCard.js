import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import AppAlert from "./AppAlert";

// Refer & Earn on Home, for every student.
//
// It used to be a small row at the bottom of Home, shown only to premium
// students with nothing else to show there - most students never saw it.
// Now it is a card of its own: what a friend's sign-up earns, the student's
// code, and an Invite button that opens the phone's share sheet straight
// away. "Details" leads to the full Refer & Earn screen. The reward and the
// share message come from the server, so they never drift from what is paid.

const GREEN = "#047857";
const GREEN_SOFT = "#ECFDF5";

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
  const credits = Number(info.referralCredits || 0);
  const friends = Number(info.referralCount || 0);
  const code = info.referralCode || info.code || "";

  async function invite() {
    if (!info.shareMessage) return navigation.navigate("Referral");
    try {
      await Share.share({ message: info.shareMessage });
    } catch {
      AppAlert.alert("Couldn't share", "Please try again");
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.giftBox}>
          <Text style={styles.gift}>🎁</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>REFER & EARN</Text>
          <Text style={styles.title}>
            {reward ? `Get ₹${reward} credit for every friend who joins` : "Invite your friends to RankVeer"}
          </Text>
          <Text style={styles.sub}>Study together, and use your credit on Premium.</Text>
        </View>
      </View>

      <View style={styles.middle}>
        {!!code && (
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>YOUR CODE</Text>
            <Text style={styles.code} selectable>
              {code}
            </Text>
          </View>
        )}
        <View style={styles.stat}>
          <Text style={styles.statValue}>{friends}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>₹{credits}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.invite} activeOpacity={0.85} onPress={invite} accessibilityRole="button">
          <Ionicons name="share-social" size={17} color="#FFFFFF" />
          <Text style={styles.inviteText}>Invite friends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.details}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("Referral")}
          accessibilityRole="button"
        >
          <Text style={styles.detailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={14} color={GREEN} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#BBE7D3",
    padding: 16,
    shadowColor: GREEN,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  giftBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  gift: { fontSize: 30 },
  eyebrow: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8, color: GREEN },
  title: { fontSize: 17, lineHeight: 22, fontWeight: "800", color: "#101936", marginTop: 3 },
  sub: { fontSize: 12.5, lineHeight: 17, color: "#667085", marginTop: 3 },

  middle: { flexDirection: "row", alignItems: "stretch", gap: 8, marginTop: 14 },
  codeBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#86D4B0",
    backgroundColor: GREEN_SOFT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  codeLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8, color: GREEN },
  code: { fontSize: 17, fontWeight: "900", letterSpacing: 1.5, color: "#064E3B", marginTop: 2 },
  stat: {
    minWidth: 66,
    borderRadius: 14,
    backgroundColor: "#F7F8FC",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  statValue: { fontSize: 16, fontWeight: "900", color: "#101936" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#667085", marginTop: 1 },

  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  invite: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inviteText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  details: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBE7D3",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  detailsText: { fontSize: 14, fontWeight: "800", color: GREEN },
});
