import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

export default function SelectSubjectsScreen({ navigation }) {
  const [allSubjects, setAllSubjects] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [catalogRes, myRes] = await Promise.all([api.get("/subjects"), api.get("/subjects/my")]);
      setAllSubjects(catalogRes.data.subjects);
      setSelected(myRes.data.subjects.map((s) => s.name));
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  function toggle(name) {
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  async function save() {
    if (selected.length === 0) {
      Alert.alert("Ek subject to choose karo", "Kam se kam ek subject select karna zaroori hai");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/subjects/my", { subjects: selected });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", "Save nahi ho paya");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.title}>Apne Subjects Choose Karo</Text>
        <Text style={styles.subtitle}>
          Jo subjects aap padh rahe ho, wahi select karo. Inke chapters ka practice mil jayega.
        </Text>

        {allSubjects.map((subj) => {
          const isSelected = selected.includes(subj.name);
          return (
            <TouchableOpacity
              key={subj._id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => toggle(subj.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                <Text style={styles.icon}>{subj.icon}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.name, isSelected && styles.nameSelected]}>{subj.name}</Text>
                <Text style={styles.meta}>{subj.chapters?.length || 0} chapters</Text>
              </View>

              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Ionicons name="checkmark" size={15} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sticky footer so the count + action are always visible */}
      <View style={styles.footer}>
        <Text style={styles.count}>
          {selected.length} subject{selected.length !== 1 ? "s" : ""} selected
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Karo</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.slateLight },

  title: { fontSize: 21, fontWeight: "800", color: colors.ink, marginTop: 8 },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 4, marginBottom: spacing.lg, lineHeight: 19 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.brandLight },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: { backgroundColor: "#fff" },
  icon: { fontSize: 24 },

  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  nameSelected: { color: colors.brand },
  meta: { fontSize: 12, color: colors.slate, marginTop: 2 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.brand, borderColor: colors.brand },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  count: { fontSize: 13, color: colors.slate, fontWeight: "600" },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.brand,
    paddingHorizontal: 24,
    height: 46,
    borderRadius: radius.md,
  },
  saveButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});