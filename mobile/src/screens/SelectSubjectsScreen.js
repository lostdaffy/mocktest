import {
  useCallback,
  useLayoutEffect,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";

import AppAlert from "../components/AppAlert";

import { Ionicons } from "@expo/vector-icons";

import { LinearGradient } from "expo-linear-gradient";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";

import {
  colors,
  gradients,
  spacing,
  radius,
  shadow,
  card,
} from "../theme/theme";

/* =========================================================
   SUBJECT META
========================================================= */

const SUBJECT_META = [
  {
    bg: "#EEF0FF",
    accent: "#5B5FEF",
  },
  {
    bg: "#ECFDF5",
    accent: "#10B981",
  },
  {
    bg: "#FFF7ED",
    accent: "#F59E0B",
  },
  {
    bg: "#FDF2F8",
    accent: "#EC4899",
  },
  {
    bg: "#F0F9FF",
    accent: "#0EA5E9",
  },
  {
    bg: "#F5F3FF",
    accent: "#8B5CF6",
  },
];

/* =========================================================
   SCREEN
========================================================= */

export default function SelectSubjectsScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const [all, setAll] = useState([]);
  const [selected, setSelected] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =======================================================
     HIDE NATIVE HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     LOAD
  ======================================================= */

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [allRes, myRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/subjects/my"),
      ]);

      setAll(allRes.data?.subjects || []);

      setSelected(
        (myRes.data?.subjects || []).map(
          (subject) => subject.name
        )
      );
    } catch (err) {
      console.log(
        "Select subjects loading error:",
        err
      );

      setAll([]);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* =======================================================
     TOGGLE
  ======================================================= */

  const toggle = useCallback((name) => {
    setSelected((prev) => {
      if (prev.includes(name)) {
        return prev.filter(
          (item) => item !== name
        );
      }

      return [...prev, name];
    });
  }, []);

  /* =======================================================
     SELECT ALL
  ======================================================= */

  const allSelected =
    all.length > 0 &&
    all.every((subject) =>
      selected.includes(subject.name)
    );

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected([]);
      return;
    }

    setSelected(
      all.map((subject) => subject.name)
    );
  }, [allSelected, all]);

  /* =======================================================
     SAVE
     
     IMPORTANT:
     Empty selection IS VALID.
     
     This allows user to remove every subject.
  ======================================================= */

  async function save() {
    if (saving) return;

    setSaving(true);

    try {
      await api.patch("/subjects/my", {
        subjects: selected,
      });

      navigation.goBack();
    } catch (err) {
      AppAlert.alert(
        "Couldn't save",
        err.response?.data?.message ||
          "Please try again"
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     HEADER TEXT
  ======================================================= */

  const selectionText = useMemo(() => {
    if (selected.length === 0) {
      return "No subjects selected";
    }

    if (selected.length === 1) {
      return "1 subject selected";
    }

    return `${selected.length} subjects selected`;
  }, [selected.length]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.loaderCircle}>
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
        </View>

        <Text style={styles.loadingText}>
          Loading subjects...
        </Text>
      </View>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.container}>
      <FlatList
        data={all}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            120 + insets.bottom,
        }}
        ListHeaderComponent={
          <>
            {/* =================================================
                HEADER
            ================================================= */}

            <View
              style={[
                styles.header,
                {
                  paddingTop: Math.max(
                    insets.top + 4,
                    16
                  ),
                },
              ]}
            >
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.75}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={21}
                  color={colors.ink}
                />
              </TouchableOpacity>

              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>
                  Manage Subjects
                </Text>

                <Text style={styles.headerSubtitle}>
                  Customize your practice
                </Text>
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                activeOpacity={0.75}
                onPress={load}
              >
                <Ionicons
                  name="refresh-outline"
                  size={19}
                  color={colors.slate}
                />
              </TouchableOpacity>
            </View>

            {/* =================================================
                INTRO HERO
            ================================================= */}

            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.introCard}
            >
              <View style={styles.introOrbOne} />
              <View style={styles.introOrbTwo} />

              <View style={styles.introIcon}>
                <Ionicons
                  name="library-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.introContent}>
                <Text style={styles.introTitle}>
                  Choose what you want to practise
                </Text>

                <Text style={styles.introText}>
                  Add or remove subjects anytime.
                  You can also keep your practice
                  empty if you don't want to practise
                  right now.
                </Text>
              </View>
            </LinearGradient>

            {/* =================================================
                SELECTION SUMMARY
            ================================================= */}

            <View style={styles.selectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  Available Subjects
                </Text>

                <Text style={styles.sectionSubtitle}>
                  {selectionText}
                </Text>
              </View>

              {all.length > 0 && (
                <TouchableOpacity
                  style={styles.selectAllButton}
                  activeOpacity={0.75}
                  onPress={toggleAll}
                >
                  <Ionicons
                    name={
                      allSelected
                        ? "close-circle-outline"
                        : "checkmark-done-outline"
                    }
                    size={14}
                    color={colors.brand}
                  />

                  <Text style={styles.selectAllText}>
                    {allSelected
                      ? "Clear all"
                      : "Select all"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="book-outline"
                size={28}
                color={colors.slateSoft}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No subjects available
            </Text>

            <Text style={styles.emptyText}>
              Subjects will appear here when they
              are available.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const active = selected.includes(
            item.name
          );

          const meta =
            SUBJECT_META[
              index % SUBJECT_META.length
            ];

          return (
            <TouchableOpacity
              style={[
                styles.subjectCard,
                active &&
                  styles.subjectCardActive,
              ]}
              activeOpacity={0.78}
              onPress={() =>
                toggle(item.name)
              }
            >
              {/* ICON */}

              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: active
                      ? colors.brandLight
                      : meta.bg,
                  },
                ]}
              >
                {item.icon ? (
                  <Text style={styles.icon}>
                    {item.icon}
                  </Text>
                ) : (
                  <Ionicons
                    name="book-outline"
                    size={21}
                    color={meta.accent}
                  />
                )}
              </View>

              {/* CONTENT */}

              <View style={styles.subjectContent}>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.name,
                      active &&
                        styles.nameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  {active && (
                    <View style={styles.selectedPill}>
                      <Text
                        style={
                          styles.selectedPillText
                        }
                      >
                        SELECTED
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="layers-outline"
                    size={11}
                    color={colors.slateSoft}
                  />

                  <Text style={styles.meta}>
                    {item.chapters?.length || 0}{" "}
                    chapters
                  </Text>
                </View>
              </View>

              {/* CHECK */}

              <View
                style={[
                  styles.checkbox,
                  active &&
                    styles.checkboxActive,
                ]}
              >
                {active && (
                  <Ionicons
                    name="checkmark"
                    size={15}
                    color="#FFFFFF"
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* =====================================================
          STICKY FOOTER
      ===================================================== */}

      <View
        style={[
          styles.footer,
          {
            paddingBottom:
              spacing.md + insets.bottom,
          },
        ]}
      >
        <View style={styles.footerCount}>
          <Text style={styles.footerCountValue}>
            {selected.length}
          </Text>

          <Text style={styles.footerCountLabel}>
            selected
          </Text>
        </View>

        <TouchableOpacity
          style={styles.saveWrapper}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              selected.length === 0
                ? [
                    colors.slate,
                    colors.slateSoft,
                  ]
                : gradients.brand
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />
            ) : (
              <>
                <Ionicons
                  name={
                    selected.length === 0
                      ? "close-circle-outline"
                      : "checkmark-circle-outline"
                  }
                  size={17}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  {selected.length === 0
                    ? "Remove All"
                    : "Save Changes"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  loaderCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    ...shadow.soft,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  headerContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  headerTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 2,
    fontWeight: "500",
  },

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  /* =======================================================
     INTRO
  ======================================================= */

  introCard: {
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 20,
    minHeight: 116,
    borderRadius: 21,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...shadow.brand,
  },

  introOrbOne: {
    position: "absolute",
    width: 125,
    height: 125,
    borderRadius: 63,
    right: -60,
    top: -70,
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  introOrbTwo: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    right: 55,
    bottom: -55,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  introIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  introContent: {
    flex: 1,
    zIndex: 2,
  },

  introTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  introText: {
    fontSize: 10.5,
    lineHeight: 16,
    color: "rgba(255,255,255,0.78)",
    marginTop: 4,
  },

  /* =======================================================
     SELECTION HEADER
  ======================================================= */

  selectionHeader: {
    marginHorizontal: 18,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.25,
  },

  sectionSubtitle: {
    fontSize: 10,
    color: colors.slate,
    marginTop: 2,
  },

  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandLight,
  },

  selectAllText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.brand,
  },

  /* =======================================================
     SUBJECT CARD
  ======================================================= */

  subjectCard: {
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 12,
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
  },

  subjectCardActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTint,
    borderWidth: 1.5,
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  icon: {
    fontSize: 21,
  },

  subjectContent: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  name: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.ink,
  },

  nameActive: {
    color: colors.brand,
  },

  selectedPill: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.brandLight,
  },

  selectedPillText: {
    fontSize: 6.5,
    fontWeight: "900",
    color: colors.brand,
    letterSpacing: 0.3,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },

  meta: {
    fontSize: 9.5,
    color: colors.slateSoft,
    fontWeight: "600",
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 1.7,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    backgroundColor: "#FFFFFF",
  },

  checkboxActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  empty: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 55,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink,
  },

  emptyText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.slate,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.lg,
  },

  footerCount: {
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  footerCountValue: {
    fontSize: 21,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.brand,
  },

  footerCountLabel: {
    fontSize: 8.5,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 1,
  },

  saveWrapper: {
    flex: 1,
  },

  saveButton: {
    height: 50,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});