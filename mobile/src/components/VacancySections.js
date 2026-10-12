import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { spacing, radius } from "../theme/theme";

// "Upcoming exam mock series" on top, then "Previous exam mock series": one
// card per recruitment notice, with its exam, year and series name. The admin
// decides which section a notice is in. Nothing shows when there is none.

function VacancyCard({ v, colors, onPress }) {
  const count = v.tests?.length || 0;
  const done = (v.tests || []).filter((t) => t.attemptStatus === "completed").length;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.exam, { color: colors.slate }]}>
          {v.examName} · {v.year}
        </Text>
        <Text style={[styles.series, { color: colors.ink }]} numberOfLines={2}>
          {v.seriesName}
        </Text>
        <Text style={[styles.meta, { color: count ? colors.brand : colors.slate }]}>
          {count ? `${count} mock${count === 1 ? "" : "s"}${done ? ` · ${done} done` : ""}` : "Mocks coming soon"}
        </Text>
        {!!v.notes && (
          <Text style={[styles.notes, { color: colors.slate }]} numberOfLines={2}>
            {v.notes}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.slate} />
    </TouchableOpacity>
  );
}

export default function VacancySections({ navigation, colors }) {
  const [data, setData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .get("/vacancies/series")
        .then((res) => alive && setData(res.data))
        .catch(() => alive && setData(null));
      return () => {
        alive = false;
      };
    }, [])
  );

  if (!data || (!data.upcoming?.length && !data.previous?.length)) return null;

  const open = (v) =>
    navigation.navigate("ExamSeries", {
      examStage: v.examType,
      examName: v.seriesName,
      vacancyId: v._id,
    });

  return (
    <View style={styles.wrap}>
      {[
        ["upcoming", "Upcoming exam mock series", "Mocks for exams whose notification is out"],
        ["previous", "Previous exam mock series", "Mocks for exams already held"],
      ].map(([key, title, hint]) =>
        data[key]?.length ? (
          <View key={key} style={styles.section}>
            <Text style={[styles.heading, { color: colors.ink }]}>{title}</Text>
            <Text style={[styles.hint, { color: colors.slate }]}>{hint}</Text>
            {data[key].map((v) => (
              <VacancyCard key={v._id} v={v} colors={colors} onPress={() => open(v)} />
            ))}
          </View>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  section: { marginBottom: spacing.lg },
  heading: { fontSize: 17, fontWeight: "800", marginBottom: 2 },
  hint: { fontSize: 12, marginBottom: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exam: { fontSize: 12, fontWeight: "600" },
  series: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  meta: { fontSize: 12, fontWeight: "700", marginTop: 6 },
  notes: { fontSize: 12, marginTop: 4 },
});
