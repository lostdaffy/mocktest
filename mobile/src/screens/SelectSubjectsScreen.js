import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import AppAlert from "../components/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

export default function SelectSubjectsScreen({ navigation }) {
  const [all, setAll] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [allRes, myRes] = await Promise.all([api.get("/subjects"), api.get("/subjects/my")]);
      setAll(allRes.data.subjects || []);
      setSelected((myRes.data.subjects || []).map((s) => s._id));
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }

  function toggle(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (selected.length === 0) {
      AppAlert.alert("Pick at least one", "Select the subjects you want to practise");
      return;
    }
    setSaving(true);
    try {
      await api.post("/subjects/select", { subjectIds: selected });
      navigation.goBack();
    } catch (err) {
      AppAlert.alert("Couldn't save", "Please try again");
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
      <FlatList
        data={all}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Choose your subjects</Text>
            <Text style={styles.subtitle}>
              Pick what you're studying. You can change this anytime.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const active = selected.includes(item._id);
          return (
            <TouchableOpacity
              style={[styles.subjectCard, active && styles.subjectCardActive]}
              onPress={() => toggle(item._id)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Text style={styles.icon}>{item.icon}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.name, active && styles.nameActive]}>{item.name}</Text>
                <Text style={styles.meta}>{item.chapters?.length || 0} chapters</Text>
              </View>

              <View style={[styles.checkbox, active && styles.checkboxActive]}>
                {active && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={styles.countWrap}>
          <Text style={styles.countValue}>{selected.length}</Text>
          <Text style={styles.countLabel}>selected</Text>
        </View>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={save}
          disabled={saving || selected.length === 0}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selected.length === 0 ? [colors.slateSoft, colors.slate] : gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save</Text>
                <Ionicons name="checkmark" size={17} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  header: { marginTop: 6, marginBottom: spacing.lg },
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.small, color: colors.slate, marginTop: 5, lineHeight: 18 },

  subjectCard: { ...card, flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, marginBottom: 10 },
  subjectCardActive: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.brandTint },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.brandLight },
  icon: { fontSize: 22 },

  name: { ...type.h3, color: colors.ink },
  nameActive: { color: colors.brand },
  meta: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 2 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: colors.brand, borderColor: colors.brand },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.lg,
  },
  countWrap: { alignItems: "center", minWidth: 60 },
  countValue: { fontSize: 22, fontWeight: "800", color: colors.brand },
  countLabel: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 52,
    borderRadius: radius.md,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});