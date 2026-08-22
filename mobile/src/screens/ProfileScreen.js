import {
  useLayoutEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";

import AppAlert from "../components/AppAlert";

import { Ionicons } from "@expo/vector-icons";

import { LinearGradient } from "expo-linear-gradient";

import api from "../api/client";

import {
  useAuth,
} from "../context/AuthContext";

import {
  isSubscribed,
} from "../utils/subscription";

import {
  colors,
  gradients,
  spacing,
  radius,
  shadow,
  card,
} from "../theme/theme";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/* =========================================================
   PROFILE SCREEN
========================================================= */

export default function ProfileScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    user,
    logout,
    refreshUser,
  } = useAuth();

  const [savingLang, setSavingLang] =
    useState(false);

  const [email, setEmail] =
    useState(user?.email || "");

  const [savingEmail, setSavingEmail] =
    useState(false);

  /* =======================================================
     HIDE NATIVE HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     SAVE EMAIL
  ======================================================= */

  async function saveEmail() {
    const cleanEmail =
      email.trim().toLowerCase();

    const currentEmail =
      (user?.email || "")
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      cleanEmail === currentEmail
    ) {
      return;
    }

    setSavingEmail(true);

    try {
      await api.patch(
        "/auth/profile",
        {
          email: cleanEmail,
        }
      );

      await refreshUser();

      AppAlert.alert(
        "Email updated",
        "Your email address has been saved successfully."
      );
    } catch (err) {
      AppAlert.alert(
        "Couldn't save",
        err.response?.data?.message ||
          "Please try again"
      );
    } finally {
      setSavingEmail(false);
    }
  }

  /* =======================================================
     CHANGE LANGUAGE
  ======================================================= */

  async function changeLanguage(
    lang
  ) {
    if (
      user?.preferredLanguage ===
      lang
    ) {
      return;
    }

    setSavingLang(true);

    try {
      await api.patch(
        "/auth/profile",
        {
          preferredLanguage: lang,
        }
      );

      await refreshUser();
    } catch (err) {
      AppAlert.alert(
        "Couldn't update",
        err.response?.data?.message ||
          "Please try again"
      );
    } finally {
      setSavingLang(false);
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  function confirmLogout() {
    AppAlert.alert(
      "Log out?",
      "You'll need to sign in again to access your account.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log out",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
  }

  /* =======================================================
     USER DATA
  ======================================================= */

  const activeSubscription =
    isSubscribed(user);

  const language =
    user?.preferredLanguage || "en";

  const firstLetter =
    user?.name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || "?";

  const expiryDate =
    user?.subscriptionExpiresAt
      ? new Date(
          user.subscriptionExpiresAt
        ).toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
            year: "numeric",
          }
        )
      : null;

  const currentEmail =
    (user?.email || "")
      .trim()
      .toLowerCase();

  const enteredEmail =
    email.trim().toLowerCase();

  const emailChanged =
    enteredEmail &&
    enteredEmail !== currentEmail;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingTop: Math.max(
            insets.top + 8,
            18
          ),
          paddingBottom:
            spacing.xxl +
            insets.bottom,
        }}
      >
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <View style={styles.header}>
          <View>
            <Text
              style={styles.headerTitle}
            >
              Profile
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Account & preferences
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.75}
            onPress={refreshUser}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={colors.slate}
            />
          </TouchableOpacity>
        </View>

        {/* =================================================
            PROFILE HERO
        ================================================= */}

        <View
          style={styles.profileHero}
        >
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
            style={
              styles.profileGradient
            }
          >
            {/* Decorative background */}

            <View
              style={
                styles.heroCircleOne
              }
            />

            <View
              style={
                styles.heroCircleTwo
              }
            />

            <View
              style={
                styles.heroRing
              }
            />

            {/* Profile top */}

            <View
              style={
                styles.profileTop
              }
            >
              {/* Avatar */}

              <View
                style={styles.avatar}
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {firstLetter}
                </Text>

                <View
                  style={
                    styles.onlineDot
                  }
                />
              </View>

              {/* User information */}

              <View
                style={
                  styles.profileInfo
                }
              >
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {user?.name ||
                    "Student"}
                </Text>

                <Text
                  style={
                    styles.contact
                  }
                  numberOfLines={1}
                >
                  {user?.phone ||
                    user?.email ||
                    "Welcome back"}
                </Text>
              </View>

              {/* Plan */}

              <View
                style={[
                  styles.planBadge,
                  activeSubscription &&
                    styles.planBadgePremium,
                ]}
              >
                <Ionicons
                  name={
                    activeSubscription
                      ? "star"
                      : "person-outline"
                  }
                  size={12}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.planBadgeText
                  }
                >
                  {activeSubscription
                    ? "Premium"
                    : "Free"}
                </Text>
              </View>
            </View>

            {/* Status strip */}

            <View
              style={
                styles.profileStatus
              }
            >
              <View
                style={
                  styles.statusLeft
                }
              >
                <View
                  style={[
                    styles.statusIcon,
                    activeSubscription
                      ? styles.statusIconPremium
                      : styles.statusIconFree,
                  ]}
                >
                  <Ionicons
                    name={
                      activeSubscription
                        ? "shield-checkmark"
                        : "sparkles"
                    }
                    size={14}
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={
                    styles.statusContent
                  }
                >
                  <Text
                    style={
                      styles.statusTitle
                    }
                    numberOfLines={1}
                  >
                    {activeSubscription
                      ? "Premium access active"
                      : "Start your preparation"}
                  </Text>

                  <Text
                    style={
                      styles.statusSub
                    }
                    numberOfLines={1}
                  >
                    {activeSubscription
                      ? expiryDate
                        ? `Valid till ${expiryDate}`
                        : "All premium features unlocked"
                      : "Upgrade to unlock all tests"}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={16}
                color="rgba(255,255,255,0.72)"
              />
            </View>
          </LinearGradient>
        </View>

        {/* =================================================
            ACCOUNT
        ================================================= */}

        <SectionLabel
          title="Account"
          subtitle="Manage your learning account"
        />

        <ProfileRow
          icon="star"
          tint={colors.warn}
          bg={colors.warnLight}
          title="Subscription"
          sub={
            activeSubscription
              ? expiryDate
                ? `Active · Valid till ${expiryDate}`
                : "Premium membership active"
              : "Upgrade to unlock premium tests"
          }
          active={
            activeSubscription
          }
          onPress={() =>
            navigation.navigate(
              "Subscription"
            )
          }
        />

        <ProfileRow
          icon="gift"
          tint={colors.success}
          bg={colors.successLight}
          title="Refer & Earn"
          sub="Invite friends and earn rewards"
          onPress={() =>
            navigation.navigate(
              "Referral"
            )
          }
        />

        <ProfileRow
          icon="time"
          tint={colors.brand}
          bg={colors.brandLight}
          title="Test History"
          sub="Review your previous attempts"
          onPress={() =>
            navigation.navigate(
              "HistoryTab"
            )
          }
        />

        <ProfileRow
          icon="stats-chart"
          tint={colors.advanced}
          bg={colors.advancedBg}
          title="My Analysis"
          sub="See your strengths and gaps"
          onPress={() =>
            navigation.navigate(
              "Analysis"
            )
          }
        />

        {/* =================================================
            PREFERENCES
        ================================================= */}

        <SectionLabel
          title="Preferences"
          subtitle="Customize your test experience"
        />

        {/* =================================================
            LANGUAGE
        ================================================= */}

        <View
          style={styles.settingCard}
        >
          <View
            style={styles.settingTop}
          >
            <View
              style={[
                styles.settingIcon,
                {
                  backgroundColor:
                    colors.brandLight,
                },
              ]}
            >
              <Ionicons
                name="language-outline"
                size={18}
                color={colors.brand}
              />
            </View>

            <View
              style={
                styles.settingHeading
              }
            >
              <Text
                style={
                  styles.settingTitle
                }
              >
                Question Language
              </Text>

              <Text
                style={
                  styles.settingHint
                }
              >
                Choose the language used during tests
              </Text>
            </View>

            {savingLang && (
              <ActivityIndicator
                size="small"
                color={colors.brand}
              />
            )}
          </View>

          <View
            style={styles.languageRow}
          >
            <LanguageButton
              label="English"
              active={
                language === "en"
              }
              disabled={
                savingLang
              }
              onPress={() =>
                changeLanguage(
                  "en"
                )
              }
            />

            <LanguageButton
              label="हिंदी"
              active={
                language === "hi"
              }
              disabled={
                savingLang
              }
              onPress={() =>
                changeLanguage(
                  "hi"
                )
              }
            />
          </View>
        </View>

        {/* =================================================
            EMAIL
        ================================================= */}

        <View
          style={styles.settingCard}
        >
          <View
            style={styles.settingTop}
          >
            <View
              style={[
                styles.settingIcon,
                {
                  backgroundColor:
                    colors.successLight,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={
                  colors.success
                }
              />
            </View>

            <View
              style={
                styles.settingHeading
              }
            >
              <Text
                style={
                  styles.settingTitle
                }
              >
                Email Address
              </Text>

              <Text
                style={
                  styles.settingHint
                }
              >
                Used for password reset and account recovery
              </Text>
            </View>
          </View>

          <View
            style={styles.emailRow}
          >
            <TextInput
              style={
                styles.emailInput
              }
              value={email}
              onChangeText={
                setEmail
              }
              placeholder="you@example.com"
              placeholderTextColor={
                colors.slateSoft
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                !emailChanged &&
                  styles.saveButtonDisabled,
              ]}
              onPress={
                saveEmail
              }
              disabled={
                savingEmail ||
                !emailChanged
              }
              activeOpacity={
                0.85
              }
            >
              {savingEmail ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.saveButtonText
                  }
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <TouchableOpacity
          style={
            styles.logoutButton
          }
          onPress={
            confirmLogout
          }
          activeOpacity={0.75}
        >
          <View
            style={
              styles.logoutIcon
            }
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={
                colors.danger
              }
            />
          </View>

          <View
            style={
              styles.logoutContent
            }
          >
            <Text
              style={
                styles.logoutTitle
              }
            >
              Log out
            </Text>

            <Text
              style={
                styles.logoutSub
              }
            >
              Sign out from this account
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.danger}
          />
        </TouchableOpacity>

        <Text
          style={
            styles.versionText
          }
        >
          Your account · Secure & private
        </Text>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   SECTION LABEL
========================================================= */

function SectionLabel({
  title,
  subtitle,
}) {
  return (
    <View
      style={
        styles.sectionHeader
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.sectionSubtitle
        }
      >
        {subtitle}
      </Text>
    </View>
  );
}

/* =========================================================
   PROFILE ROW
========================================================= */

function ProfileRow({
  icon,
  tint,
  bg,
  title,
  sub,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={
        styles.profileRow
      }
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor:
              bg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={tint}
        />
      </View>

      <View
        style={
          styles.rowContent
        }
      >
        <View
          style={
            styles.rowTitleLine
          }
        >
          <Text
            style={
              styles.rowTitle
            }
            numberOfLines={1}
          >
            {title}
          </Text>

          {active && (
            <View
              style={
                styles.activePill
              }
            >
              <View
                style={
                  styles.activeDot
                }
              />

              <Text
                style={
                  styles.activePillText
                }
              >
                ACTIVE
              </Text>
            </View>
          )}
        </View>

        <Text
          style={
            styles.rowSub
          }
          numberOfLines={2}
        >
          {sub}
        </Text>
      </View>

      <View
        style={
          styles.arrowWrap
        }
      >
        <Ionicons
          name="chevron-forward"
          size={15}
          color={
            colors.slateSoft
          }
        />
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   LANGUAGE BUTTON
========================================================= */

function LanguageButton({
  label,
  active,
  disabled,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.languageButton,
        active &&
          styles.languageButtonActive,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
    >
      {active && (
        <Ionicons
          name="checkmark-circle"
          size={15}
          color="#FFFFFF"
        />
      )}

      <Text
        style={[
          styles.languageText,
          active &&
            styles.languageTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* =====================================================
       GENERAL
    ===================================================== */

    container: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      paddingHorizontal: 18,
      paddingBottom: 14,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    headerTitle: {
      fontSize: 22,
      lineHeight: 27,
      fontWeight: "800",
      color: colors.ink,
      letterSpacing: -0.5,
    },

    headerSubtitle: {
      fontSize: 11,
      lineHeight: 15,
      color: colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    /* =====================================================
       PROFILE HERO
    ===================================================== */

    profileHero: {
      marginHorizontal: 18,
      marginBottom: 23,
      borderRadius: 22,
      overflow: "hidden",
      ...shadow.brand,
    },

    profileGradient: {
      minHeight: 170,
      padding: 15,
      justifyContent:
        "space-between",
      overflow: "hidden",
    },

    heroCircleOne: {
      position:
        "absolute",
      width: 175,
      height: 175,
      borderRadius: 88,
      right: -88,
      top: -98,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroCircleTwo: {
      position:
        "absolute",
      width: 105,
      height: 105,
      borderRadius: 53,
      left: -60,
      bottom: -65,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    heroRing: {
      position:
        "absolute",
      width: 140,
      height: 140,
      borderRadius: 70,
      borderWidth: 18,
      borderColor:
        "rgba(255,255,255,0.05)",
      right: -38,
      bottom: -57,
    },

    profileTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor:
        "rgba(255,255,255,0.18)",
      borderWidth: 2,
      borderColor:
        "rgba(255,255,255,0.32)",
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
    },

    avatarText: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "900",
    },

    onlineDot: {
      position:
        "absolute",
      width: 12,
      height: 12,
      borderRadius: 6,
      right: -2,
      bottom: -2,
      backgroundColor:
        "#34D399",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    profileInfo: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
      marginRight: 7,
    },

    name: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -0.3,
    },

    contact: {
      fontSize: 11,
      lineHeight: 15,
      color:
        "rgba(255,255,255,0.76)",
      marginTop: 2,
      fontWeight: "500",
    },

    planBadge: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius:
        radius.full,
      backgroundColor:
        "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.14)",
    },

    planBadgePremium: {
      backgroundColor:
        "rgba(255,255,255,0.20)",
    },

    planBadgeText: {
      fontSize: 9.5,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    /* =====================================================
       PROFILE STATUS
    ===================================================== */

    profileStatus: {
      marginTop: 16,
      minHeight: 54,
      borderRadius: 15,
      paddingHorizontal: 11,
      paddingVertical: 8,
      backgroundColor:
        "rgba(0,0,0,0.10)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.10)",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    statusLeft: {
      flexDirection:
        "row",
      alignItems:
        "center",
      flex: 1,
      minWidth: 0,
    },

    statusIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 9,
      backgroundColor:
        "rgba(255,255,255,0.16)",
    },

    statusIconPremium: {
      backgroundColor:
        "rgba(255,255,255,0.20)",
    },

    statusIconFree: {
      backgroundColor:
        "rgba(255,255,255,0.14)",
    },

    statusContent: {
      flex: 1,
      minWidth: 0,
    },

    statusTitle: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    statusSub: {
      fontSize: 9,
      lineHeight: 12,
      color:
        "rgba(255,255,255,0.68)",
      marginTop: 1,
      fontWeight: "500",
    },

    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      marginHorizontal: 18,
      marginBottom: 10,
    },

    sectionTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.ink,
      letterSpacing: -0.3,
    },

    sectionSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color: colors.slate,
      marginTop: 2,
    },

    /* =====================================================
       ACCOUNT ROW
    ===================================================== */

    profileRow: {
      marginHorizontal: 18,
      marginBottom: 9,
      minHeight: 70,
      padding: 11,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        colors.border,
      flexDirection:
        "row",
      alignItems:
        "center",
      ...shadow.soft,
    },

    rowIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    rowContent: {
      flex: 1,
      minWidth: 0,
    },

    rowTitleLine: {
      flexDirection:
        "row",
      alignItems:
        "center",
      minWidth: 0,
    },

    rowTitle: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.ink,
      flexShrink: 1,
    },

    rowSub: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slateSoft,
      fontWeight: "500",
      marginTop: 2,
    },

    activePill: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginLeft: 7,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.successLight,
    },

    activeDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        colors.success,
    },

    activePillText: {
      fontSize: 6.5,
      fontWeight: "900",
      color: colors.success,
      letterSpacing: 0.3,
    },

    arrowWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor:
        colors.slateLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 7,
    },

    /* =====================================================
       SETTING CARD
    ===================================================== */

    settingCard: {
      marginHorizontal: 18,
      marginBottom: 10,
      padding: 13,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    settingTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    settingHeading: {
      flex: 1,
      minWidth: 0,
    },

    settingTitle: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.ink,
    },

    settingHint: {
      fontSize: 10,
      lineHeight: 14,
      color:
        colors.slateSoft,
      marginTop: 2,
      fontWeight: "500",
    },

    /* =====================================================
       LANGUAGE
    ===================================================== */

    languageRow: {
      flexDirection:
        "row",
      gap: 8,
      marginTop: 13,
    },

    languageButton: {
      flex: 1,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        colors.bg,
      borderWidth: 1.5,
      borderColor:
        colors.border,
      alignItems:
        "center",
      justifyContent:
        "center",
      flexDirection:
        "row",
      gap: 5,
    },

    languageButtonActive: {
      backgroundColor:
        colors.brand,
      borderColor:
        colors.brand,
    },

    languageText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.slate,
    },

    languageTextActive: {
      color: "#FFFFFF",
    },

    /* =====================================================
       EMAIL
    ===================================================== */

    emailRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      marginTop: 13,
    },

    emailInput: {
      flex: 1,
      height: 46,
      backgroundColor:
        colors.bg,
      borderRadius: 13,
      paddingHorizontal: 13,
      fontSize: 13,
      color: colors.ink,
      fontWeight: "600",
      borderWidth: 1.5,
      borderColor:
        colors.border,
    },

    saveButton: {
      height: 46,
      minWidth: 67,
      paddingHorizontal: 15,
      borderRadius: 13,
      backgroundColor:
        colors.brand,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    saveButtonDisabled: {
      backgroundColor:
        colors.slateSoft,
    },

    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },

    /* =====================================================
       LOGOUT
    ===================================================== */

    logoutButton: {
      marginHorizontal: 18,
      marginTop: 8,
      minHeight: 65,
      padding: 11,
      borderRadius: 18,
      backgroundColor:
        colors.dangerLight,
      borderWidth: 1,
      borderColor:
        colors.dangerBorder,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    logoutIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    logoutContent: {
      flex: 1,
    },

    logoutTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.danger,
    },

    logoutSub: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.danger,
      opacity: 0.7,
      marginTop: 2,
    },

    versionText: {
      textAlign: "center",
      fontSize: 9,
      color: colors.slateSoft,
      marginTop: 15,
    },
  });