import { View, Text, StyleSheet, TouchableOpacity, Linking, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getColors, spacing, radius } from "../theme/theme";

// Google Play rejected the first release under its Misleading Claims policy:
// an app that gives information about government exams has to say plainly
// that it is not a government app, and link to the official source for each
// exam. The store description carries the same list - keep the two in step
// (mobile/store-listing.md).
export const OFFICIAL_SOURCES = [
  { name: "Staff Selection Commission (SSC)", url: "https://ssc.gov.in" },
  { name: "Railway Recruitment Boards (RRB)", url: "https://www.rrbapply.gov.in" },
  { name: "Indian Railways", url: "https://indianrailways.gov.in" },
  { name: "IBPS", url: "https://www.ibps.in" },
  { name: "CTET (CBSE)", url: "https://ctet.nic.in" },
  { name: "UP Police Recruitment & Promotion Board", url: "https://uppbpb.gov.in" },
  { name: "UPSSSC", url: "https://upsssc.gov.in" },
  { name: "Indian Army (Agniveer)", url: "https://joinindianarmy.nic.in" },
];

export default function OfficialSources({ style }) {
  const colors = getColors(useColorScheme() === "dark");

  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <View style={styles.titleRow}>
        <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
        <Text style={[styles.title, { color: colors.ink }]}>Not a government app</Text>
      </View>

      <Text style={[styles.text, { color: colors.slate }]}>
        RankVeer is an independent, private exam-preparation app. It does not represent and is not
        affiliated with any government body. For official notifications, syllabus, dates and results,
        always check the official website:
      </Text>
      <Text style={[styles.textHi, { color: colors.slate }]}>
        RankVeer एक निजी तैयारी ऐप है, सरकारी ऐप नहीं। आधिकारिक सूचना और रिज़ल्ट के लिए नीचे दी गई
        आधिकारिक वेबसाइट देखें।
      </Text>

      {OFFICIAL_SOURCES.map((s) => (
        <TouchableOpacity
          key={s.url}
          style={[styles.link, { borderTopColor: colors.borderSoft }]}
          onPress={() => Linking.openURL(s.url)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkName, { color: colors.ink }]}>{s.name}</Text>
            <Text style={[styles.linkUrl, { color: colors.brand }]}>{s.url.replace("https://", "")}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.slateSoft} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
  },
  textHi: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  linkName: {
    fontSize: 13,
    fontWeight: "600",
  },
  linkUrl: {
    fontSize: 12,
    marginTop: 1,
  },
});
