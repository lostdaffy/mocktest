import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getColors, spacing, radius } from "../theme/theme";

// Google Play rejected the first release under its Misleading Claims policy:
// an app that gives information about government exams has to say plainly
// that it is not a government app, and link to the official source for each
// exam. The store description carries the same list - keep the two in step
// (mobile/store-listing.md).
//
// It is not a card on every page any more - that crowded the exam lists. The
// statement lives in one place (Profile), as a slim row that opens on tap,
// and as a one-line note on the Welcome screen (see AffiliationNote).
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

// The one-line version, for a footer.
export function AffiliationNote({ style, color }) {
  const colors = getColors(useColorScheme() === "dark");
  return (
    <Text style={[styles.note, { color: color || colors.slateSoft }, style]}>
      Rankveer is an independent app, not affiliated with any government body.
    </Text>
  );
}

export default function OfficialSources({ style }) {
  const colors = getColors(useColorScheme() === "dark");
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      <TouchableOpacity style={styles.titleRow} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
        <Text style={[styles.title, { color: colors.ink }]}>About Rankveer · official sources</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.slateSoft} />
      </TouchableOpacity>

      {open && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={[styles.text, { color: colors.slate }]}>
            Rankveer is an independent, private exam-preparation app. It does not represent and is not affiliated with any government
            body. For official notifications, syllabus, dates and results, always check the official website:
          </Text>
          <Text style={[styles.textHi, { color: colors.slate }]}>
            Rankveer एक निजी तैयारी ऐप है, सरकारी ऐप नहीं। आधिकारिक सूचना और रिज़ल्ट के लिए नीचे दी गई आधिकारिक वेबसाइट देखें।
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  note: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
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
