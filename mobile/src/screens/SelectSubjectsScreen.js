import {
  useCallback,
  useEffect,
  useLayoutEffect,
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

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppAlert from "../components/AppAlert";
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
    icon: "calculator-outline",
    bg: "#EEF3FF",
    accent: "#3B7BFF",
  },
  {
    icon: "language-outline",
    bg: "#ECFDF5",
    accent: "#10B981",
  },
  {
    icon: "flask-outline",
    bg: "#FFF7ED",
    accent: "#F59E0B",
  },
  {
    icon: "book-outline",
    bg: "#FDF2F8",
    accent: "#EC4899",
  },
  {
    icon: "globe-outline",
    bg: "#F0F9FF",
    accent: "#0EA5E9",
  },
  {
    icon: "bulb-outline",
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
     HIDE HEADER
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

      const subjects =
        allRes.data?.subjects || [];

      const mySubjects =
        myRes.data?.subjects || [];

      setAll(subjects);

      setSelected(
        mySubjects.map(
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
     SUMMARY
  ======================================================= */

  const selectionText = useMemo(() => {
    if (selected.length === 0) {
      return "Choose subjects for your practice";
    }

    if (selected.length === 1) {
      return "1 subject selected";
    }

    return `${selected.length} subjects selected`;
  }, [selected.length]);

  const selectionProgress =
    all.length > 0
      ? Math.min(
          selected.length / all.length,
          1
        )
      : 0;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View style={styles.centered}>
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
        keyExtractor={(item) =>
          item._id
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            116 + insets.bottom,
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
                    insets.top + 8,
                    18
                  ),
                },
              ]}
            >
              <TouchableOpacity
                style={styles.headerButton}
                activeOpacity={0.75}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={colors.ink}
                />
              </TouchableOpacity>

              <View style={styles.headerContent}>
                <Text
                  style={styles.headerTitle}
                  numberOfLines={1}
                >
                  Manage Subjects
                </Text>

                <Text style={styles.headerSubtitle}>
                  Personalize your practice
                </Text>
              </View>

              <TouchableOpacity
                style={styles.headerButton}
                activeOpacity={0.75}
                onPress={load}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={colors.slate}
                />
              </TouchableOpacity>
            </View>

            {/* =================================================
                HERO
            ================================================= */}

            <View style={styles.heroWrap}>
              <LinearGradient
                colors={gradients.brand}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={styles.hero}
              >
                <View
                  style={styles.heroOrbOne}
                />

                <View
                  style={styles.heroOrbTwo}
                />

                <View
                  style={styles.heroIcon}
                >
                  <Ionicons
                    name="options-outline"
                    size={23}
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={styles.heroContent}
                >
                  <View
                    style={styles.heroBadge}
                  >
                    <Ionicons
                      name="sparkles"
                      size={10}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.heroBadgeText
                      }
                    >
                      PERSONALIZE
                    </Text>
                  </View>

                  <Text
                    style={styles.heroTitle}
                  >
                    Build your practice
                  </Text>

                  <Text
                    style={styles.heroSubtitle}
                  >
                    Select the subjects you
                    want to focus on.
                  </Text>
                </View>
              </LinearGradient>
            </View>

            {/* =================================================
                SELECTION SUMMARY
            ================================================= */}

            <View
              style={
                styles.selectionSummary
              }
            >
              <View
                style={
                  styles.summaryTop
                }
              >
                <View
                  style={
                    styles.summaryText
                  }
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Your Subjects
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    {selectionText}
                  </Text>
                </View>

                <View
                  style={
                    styles.selectionBadge
                  }
                >
                  <Text
                    style={
                      styles.selectionNumber
                    }
                  >
                    {selected.length}
                  </Text>

                  <Text
                    style={
                      styles.selectionLabel
                    }
                  >
                    SELECTED
                  </Text>
                </View>
              </View>

              {/* PROGRESS */}

              {all.length > 0 && (
                <View
                  style={
                    styles.progressArea
                  }
                >
                  <View
                    style={
                      styles.progressTrack
                    }
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${
                            selectionProgress *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={
                      styles.progressText
                    }
                  >
                    {selected.length} of{" "}
                    {all.length}
                  </Text>
                </View>
              )}

              {/* SELECT ALL */}

              {all.length > 0 && (
                <TouchableOpacity
                  style={
                    styles.selectAllButton
                  }
                  activeOpacity={0.75}
                  onPress={toggleAll}
                >
                  <View
                    style={
                      styles.selectAllIcon
                    }
                  >
                    <Ionicons
                      name={
                        allSelected
                          ? "remove-outline"
                          : "checkmark-done"
                      }
                      size={14}
                      color={
                        colors.brand
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.selectAllText
                    }
                  >
                    {allSelected
                      ? "Clear all subjects"
                      : "Select all subjects"}
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={
                      colors.slateSoft
                    }
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* =================================================
                SECTION
            ================================================= */}

            <View
              style={
                styles.listHeader
              }
            >
              <View
                style={
                  styles.listHeaderText
                }
              >
                <Text
                  style={
                    styles.listTitle
                  }
                >
                  Available Subjects
                </Text>

                <Text
                  style={
                    styles.listSubtitle
                  }
                >
                  Tap any subject to add or remove
                </Text>
              </View>

              <View
                style={
                  styles.totalBadge
                }
              >
                <Text
                  style={
                    styles.totalBadgeText
                  }
                >
                  {all.length}
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState />
        }
        renderItem={({
          item,
          index,
        }) => {
          const active =
            selected.includes(
              item.name
            );

          const meta =
            SUBJECT_META[
              index %
                SUBJECT_META.length
            ];

          const chapterCount =
            item.chapters?.length || 0;

          return (
            <SubjectCard
              item={item}
              meta={meta}
              active={active}
              chapterCount={
                chapterCount
              }
              onPress={() =>
                toggle(item.name)
              }
            />
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
              Math.max(
                spacing.md +
                  insets.bottom,
                12
              ),
          },
        ]}
      >
        <View
          style={styles.footerInfo}
        >
          <View
            style={
              styles.footerCountCircle
            }
          >
            <Text
              style={
                styles.footerCountValue
              }
            >
              {selected.length}
            </Text>
          </View>

          <View
            style={
              styles.footerText
            }
          >
            <Text
              style={
                styles.footerTitle
              }
            >
              {selected.length === 0
                ? "No subjects selected"
                : `${selected.length} ${
                    selected.length === 1
                      ? "subject"
                      : "subjects"
                  } selected`}
            </Text>

            <Text
              style={
                styles.footerSubtitle
              }
            >
              Your changes will apply to practice
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={
            styles.saveWrapper
          }
          onPress={save}
          disabled={saving}
          activeOpacity={0.86}
        >
          <LinearGradient
            colors={
              selected.length === 0
                ? [
                    "#64748B",
                    "#475569",
                  ]
                : gradients.brand
            }
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 0,
            }}
            style={
              styles.saveButton
            }
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
                      ? "remove-circle-outline"
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
   SUBJECT CARD
========================================================= */

function SubjectCard({
  item,
  meta,
  active,
  chapterCount,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.subjectCard,
        active &&
          styles.subjectCardActive,
      ]}
      activeOpacity={0.78}
      onPress={onPress}
    >
      {/* ACTIVE ACCENT */}

      {active && (
        <View
          style={[
            styles.activeAccent,
            {
              backgroundColor:
                meta.accent,
            },
          ]}
        />
      )}

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
          <Text
            style={styles.emojiIcon}
          >
            {item.icon}
          </Text>
        ) : (
          <Ionicons
            name={meta.icon}
            size={21}
            color={
              active
                ? colors.brand
                : meta.accent
            }
          />
        )}
      </View>

      {/* CONTENT */}

      <View
        style={styles.subjectContent}
      >
        <View
          style={styles.nameRow}
        >
          <Text
            style={[
              styles.name,
              active &&
                styles.nameActive,
            ]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </View>

        <View
          style={styles.metaRow}
        >
          <View
            style={styles.metaItem}
          >
            <Ionicons
              name="layers-outline"
              size={12}
              color={
                colors.slateSoft
              }
            />

            <Text
              style={styles.meta}
            >
              {chapterCount}{" "}
              {chapterCount === 1
                ? "chapter"
                : "chapters"}
            </Text>
          </View>

          {active && (
            <View
              style={
                styles.selectedMini
              }
            >
              <View
                style={
                  styles.selectedDot
                }
              />

              <Text
                style={
                  styles.selectedMiniText
                }
              >
                Selected
              </Text>
            </View>
          )}
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
        {active ? (
          <Ionicons
            name="checkmark"
            size={15}
            color="#FFFFFF"
          />
        ) : (
          <View
            style={
              styles.checkboxInner
            }
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState() {
  return (
    <View
      style={styles.empty}
    >
      <View
        style={styles.emptyIcon}
      >
        <Ionicons
          name="library-outline"
          size={28}
          color={colors.brand}
        />
      </View>

      <Text
        style={styles.emptyTitle}
      >
        No subjects available
      </Text>

      <Text
        style={styles.emptyText}
      >
        Subjects will appear here when
        they become available.
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =====================================================
     GENERAL
  ===================================================== */

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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
    ...shadow.soft,
  },

  loadingText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: colors.slate,
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    minHeight: 67,
    paddingHorizontal: 18,
    paddingBottom: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },

  headerTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.35,
  },

  headerSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slate,
    marginTop: 2,
    fontWeight: "500",
  },

  /* =====================================================
     HERO
  ===================================================== */

  heroWrap: {
    marginHorizontal: 18,
    marginBottom: 17,
  },

  hero: {
    minHeight: 124,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...shadow.brand,
  },

  heroOrbOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -74,
    top: -86,
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  heroOrbTwo: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    left: -48,
    bottom: -58,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  heroContent: {
    flex: 1,
    minWidth: 0,
    zIndex: 2,
  },

  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    marginBottom: 7,
  },

  heroBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },

  heroSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color:
      "rgba(255,255,255,0.78)",
    marginTop: 3,
    maxWidth: 230,
  },

  /* =====================================================
     SUMMARY
  ===================================================== */

  selectionSummary: {
    marginHorizontal: 18,
    marginBottom: 21,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryText: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.25,
  },

  sectionSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slate,
    marginTop: 2,
  },

  selectionBadge: {
    minWidth: 51,
    height: 43,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  selectionNumber: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
    color: colors.brand,
  },

  selectionLabel: {
    fontSize: 6.5,
    lineHeight: 9,
    fontWeight: "900",
    color: colors.slateSoft,
    letterSpacing: 0.35,
    marginTop: 1,
  },

  progressArea: {
    marginTop: 13,
  },

  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.slateLight,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.brand,
  },

  progressText: {
    fontSize: 8.5,
    lineHeight: 12,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 4,
  },

  selectAllButton: {
    minHeight: 40,
    marginTop: 12,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },

  selectAllIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  selectAllText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "800",
    color: colors.ink,
  },

  /* =====================================================
     LIST HEADER
  ===================================================== */

  listHeader: {
    marginHorizontal: 18,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  listHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  listTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },

  listSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slate,
    marginTop: 2,
  },

  totalBadge: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  totalBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.brand,
  },

  /* =====================================================
     SUBJECT CARD
  ===================================================== */

  subjectCard: {
    position: "relative",
    marginHorizontal: 18,
    marginBottom: 9,
    padding: 11,
    minHeight: 72,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...shadow.soft,
  },

  subjectCardActive: {
    backgroundColor: colors.brandTint,
    borderColor: colors.brandLight,
  },

  activeAccent: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: 2,
  },

  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    marginRight: 11,
  },

  emojiIcon: {
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
    flex: 1,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: "800",
    color: colors.ink,
  },

  nameActive: {
    color: colors.brand,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 5,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  meta: {
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.slateSoft,
    fontWeight: "600",
    marginLeft: 4,
  },

  selectedMini: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 9,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.brandLight,
  },

  selectedDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand,
    marginRight: 4,
  },

  selectedMiniText: {
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "800",
    color: colors.brand,
  },

  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 9,
    borderWidth: 1.6,
    borderColor: colors.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  checkboxActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },

  checkboxInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },

  /* =====================================================
     EMPTY
  ===================================================== */

  empty: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 55,
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptyTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.ink,
  },

  emptyText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.slate,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 285,
  },

  /* =====================================================
     FOOTER
  ===================================================== */

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 75,
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.lg,
  },

  footerInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },

  footerCountCircle: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  footerCountValue: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    color: colors.brand,
  },

  footerText: {
    flex: 1,
    minWidth: 0,
  },

  footerTitle: {
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "800",
    color: colors.ink,
  },

  footerSubtitle: {
    fontSize: 8,
    lineHeight: 12,
    color: colors.slateSoft,
    marginTop: 1,
  },

  saveWrapper: {
    width: 145,
  },

  saveButton: {
    height: 47,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...shadow.brand,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
});