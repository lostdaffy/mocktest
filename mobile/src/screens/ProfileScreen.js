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

import { useAuth } from "../context/AuthContext";

import {
  isSubscribed,
} from "../utils/subscription";

import {
  colors,
  gradients,
  spacing,
  radius,
  shadow,
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
  const insets =
    useSafeAreaInsets();

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
        err.response?.data
          ?.message ||
          "Please try again."
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
        err.response?.data
          ?.message ||
          "Please try again."
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
    user?.preferredLanguage ||
    "en";

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
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            spacing.xxl +
            insets.bottom +
            10,
        }}
      >
        {/* =================================================
            PREMIUM TOP AREA
        ================================================= */}

        <LinearGradient
          colors={[
            "#090C55",
            "#1714A4",
            "#3214D8",
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={[
            styles.topArea,
            {
              paddingTop:
                Math.max(
                  insets.top,
                  10
                ) + 8,
            },
          ]}
        >
          {/* Decorative circles */}

          <View
            style={
              styles.topGlowOne
            }
          />

          <View
            style={
              styles.topGlowTwo
            }
          />

          {/* HEADER */}

          <View
            style={styles.header}
          >
            <View
              style={
                styles.headerText
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                Profile
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Account & preferences
              </Text>
            </View>

            <View
              style={
                styles.headerActions
              }
            >
              <TouchableOpacity
                style={
                  styles.headerCircle
                }
                activeOpacity={
                  0.75
                }
                onPress={
                  refreshUser
                }
              >
                <Ionicons
                  name="refresh-outline"
                  size={19}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View
                style={
                  styles.notificationWrap
                }
              >
                <TouchableOpacity
                  style={
                    styles.headerCircle
                  }
                  activeOpacity={
                    0.75
                  }
                >
                  <Ionicons
                    name="notifications-outline"
                    size={19}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <View
                  style={
                    styles.notificationDot
                  }
                />
              </View>
            </View>
          </View>

          {/* =================================================
              PROFILE CARD
          ================================================= */}

          <View
            style={
              styles.profileCardWrap
            }
          >
            <LinearGradient
              colors={[
                "#293DEB",
                "#3A21E8",
                "#6518E9",
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={
                styles.profileCard
              }
            >
              {/* Decorative artwork */}

              <View
                style={
                  styles.profileGlowOne
                }
              />

              <View
                style={
                  styles.profileGlowTwo
                }
              />

              <View
                style={
                  styles.profileWave
                }
              />

              {/* USER */}

              <View
                style={
                  styles.profileMain
                }
              >
                {/* AVATAR */}

                <View
                  style={
                    styles.avatarOuter
                  }
                >
                  <View
                    style={
                      styles.avatar
                    }
                  >
                    <Text
                      style={
                        styles.avatarText
                      }
                    >
                      {firstLetter}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.onlineDot
                    }
                  />
                </View>

                {/* INFO */}

                <View
                  style={
                    styles.profileInfo
                  }
                >
                  <Text
                    style={
                      styles.profileName
                    }
                    numberOfLines={1}
                  >
                    {user?.name ||
                      "Student"}
                  </Text>

                  <View
                    style={
                      styles.contactRow
                    }
                  >
                    <Ionicons
                      name="call-outline"
                      size={13}
                      color="rgba(255,255,255,0.88)"
                    />

                    <Text
                      style={
                        styles.contactText
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {user?.phone ||
                        user?.email ||
                        "Welcome back"}
                    </Text>
                  </View>

                  {/* PREMIUM */}

                  <View
                    style={
                      styles.premiumBadge
                    }
                  >
                    <Ionicons
                      name={
                        activeSubscription
                          ? "star"
                          : "person-outline"
                      }
                      size={12}
                      color="#FFD93D"
                    />

                    <Text
                      style={
                        styles.premiumBadgeText
                      }
                    >
                      {activeSubscription
                        ? "Premium"
                        : "Free"}
                    </Text>
                  </View>
                </View>

                {/* EDIT */}

                <TouchableOpacity
                  style={
                    styles.editButton
                  }
                  activeOpacity={
                    0.75
                  }
                >
                  <Ionicons
                    name="pencil-outline"
                    size={17}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              {/* =================================================
                  ACCESS STATUS
              ================================================= */}

              <TouchableOpacity
                style={
                  styles.accessCard
                }
                activeOpacity={
                  0.82
                }
                onPress={() =>
                  navigation.navigate(
                    "Subscription"
                  )
                }
              >
                <View
                  style={
                    styles.accessIcon
                  }
                >
                  <Ionicons
                    name={
                      activeSubscription
                        ? "shield-checkmark"
                        : "sparkles"
                    }
                    size={21}
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={
                    styles.accessText
                  }
                >
                  <Text
                    style={
                      styles.accessTitle
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {activeSubscription
                      ? "Premium access active"
                      : "Unlock Premium access"}
                  </Text>

                  <Text
                    style={
                      styles.accessSubtitle
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {activeSubscription
                      ? expiryDate
                        ? `Valid till ${expiryDate}`
                        : "All premium features unlocked"
                      : "Get unlimited tests & analytics"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="rgba(255,255,255,0.9)"
                />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </LinearGradient>

        {/* =================================================
            WHITE CONTENT AREA
        ================================================= */}

        <View
          style={
            styles.contentArea
          }
        >
          {/* =================================================
              ACCOUNT
          ================================================= */}

          <SectionHeader
            title="Account"
            subtitle="Manage your learning account"
          />

          <View
            style={
              styles.groupCard
            }
          >
            <ProfileRow
              icon="star"
              tint={colors.warn}
              bg={colors.warnLight}
              title="Subscription"
              sub={
                activeSubscription
                  ? expiryDate
                    ? `Active  •  Valid till ${expiryDate}`
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

            <Divider />

            <ProfileRow
              icon="gift"
              tint={colors.success}
              bg={
                colors.successLight
              }
              title="Refer & Earn"
              sub="Invite friends and earn rewards"
              onPress={() =>
                navigation.navigate(
                  "Referral"
                )
              }
            />

            <Divider />

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

            <Divider />

            <ProfileRow
              icon="stats-chart"
              tint={
                colors.advanced
              }
              bg={
                colors.advancedBg
              }
              title="My Analysis"
              sub="See your strengths and gaps"
              onPress={() =>
                navigation.navigate(
                  "Analysis"
                )
              }
            />
          </View>

          {/* =================================================
              PREFERENCES
          ================================================= */}

          <SectionHeader
            title="Preferences"
            subtitle="Customize your test experience"
          />

          {/* LANGUAGE */}

          <View
            style={
              styles.settingCard
            }
          >
            <View
              style={
                styles.settingHeader
              }
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
                  size={20}
                  color={
                    colors.brand
                  }
                />
              </View>

              <View
                style={
                  styles.settingInfo
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
                    styles.settingSubtitle
                  }
                >
                  Choose the language used during tests
                </Text>
              </View>

              {savingLang && (
                <ActivityIndicator
                  size="small"
                  color={
                    colors.brand
                  }
                />
              )}
            </View>

            <View
              style={
                styles.languageRow
              }
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

          {/* EMAIL */}

          <View
            style={
              styles.settingCard
            }
          >
            <View
              style={
                styles.settingHeader
              }
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
                  size={20}
                  color={
                    colors.success
                  }
                />
              </View>

              <View
                style={
                  styles.settingInfo
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
                    styles.settingSubtitle
                  }
                >
                  Used for password reset and account recovery
                </Text>
              </View>
            </View>

            <View
              style={
                styles.emailRow
              }
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
                autoCorrect={
                  false
                }
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
                    Update
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
              styles.logoutCard
            }
            onPress={
              confirmLogout
            }
            activeOpacity={
              0.78
          }
          >
            <View
              style={
                styles.logoutIcon
              }
            >
              <Ionicons
                name="log-out-outline"
                size={21}
                color={
                  colors.danger
                }
              />
            </View>

            <View
              style={
                styles.logoutInfo
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
                  styles.logoutSubtitle
                }
              >
                Sign out from this account
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.danger
              }
            />
          </TouchableOpacity>

          {/* =================================================
              SECURITY
          ================================================= */}

          <View
            style={
              styles.securityFooter
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={
                colors.brand
              }
            />

            <Text
              style={
                styles.securityText
              }
            >
              Your account
            </Text>

            <View
              style={
                styles.securityDot
              }
            />

            <Text
              style={
                styles.securityText
              }
            >
              Secure & private
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
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
   DIVIDER
========================================================= */

function Divider() {
  return (
    <View
      style={
        styles.divider
      }
    />
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
      activeOpacity={0.75}
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
          size={20}
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
                styles.activeBadge
              }
            >
              <Text
                style={
                  styles.activeBadgeText
                }
              >
                Active
              </Text>
            </View>
          )}
        </View>

        <Text
          style={
            styles.rowSubtitle
          }
          numberOfLines={2}
        >
          {sub}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color={
          colors.slateSoft
        }
      />
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
      activeOpacity={0.8}
    >
      {active && (
        <Ionicons
          name="checkmark-circle"
          size={16}
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
       BASE
    ===================================================== */

    container: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    /* =====================================================
       TOP AREA
    ===================================================== */

    topArea: {
      minHeight: 355,
      paddingHorizontal: 0,
      paddingBottom: 0,
      overflow: "hidden",
    },

    topGlowOne: {
      position:
        "absolute",
      width: 230,
      height: 230,
      borderRadius: 115,
      backgroundColor:
        "rgba(87,72,255,0.18)",
      right: -100,
      top: -70,
    },

    topGlowTwo: {
      position:
        "absolute",
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor:
        "rgba(32,117,255,0.10)",
      left: -100,
      top: 40,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      paddingHorizontal: 18,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      fontSize: 25,
      lineHeight: 31,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },

    headerSubtitle: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
      color:
        "rgba(255,255,255,0.76)",
      fontWeight: "500",
    },

    headerActions: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
    },

    headerCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        "rgba(255,255,255,0.07)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.18)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    notificationWrap: {
      position:
        "relative",
    },

    notificationDot: {
      position:
        "absolute",
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        "#8B5CF6",
      right: 1,
      top: -1,
      borderWidth: 1.5,
      borderColor:
        "#15158C",
    },

    /* =====================================================
       PROFILE CARD
    ===================================================== */

    profileCardWrap: {
      marginTop: 18,
      marginHorizontal: 18,
      marginBottom: -1,
      borderRadius: 24,
      overflow: "hidden",
      ...shadow.brand,
    },

    profileCard: {
      minHeight: 238,
      padding: 16,
      overflow: "hidden",
    },

    profileGlowOne: {
      position:
        "absolute",
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor:
        "rgba(255,255,255,0.08)",
      right: -90,
      top: -80,
    },

    profileGlowTwo: {
      position:
        "absolute",
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        "rgba(255,255,255,0.08)",
      left: -40,
      bottom: -35,
    },

    profileWave: {
      position:
        "absolute",
      width: 280,
      height: 180,
      borderRadius: 140,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.08)",
      right: -65,
      top: 15,
      transform: [
        {
          rotate: "-18deg",
        },
      ],
    },

    profileMain: {
      flexDirection:
        "row",
      alignItems:
        "center",
      minWidth: 0,
    },

    /* =====================================================
       AVATAR
    ===================================================== */

    avatarOuter: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        "rgba(255,255,255,0.42)",
      position:
        "relative",
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    avatar: {
      width: 63,
      height: 63,
      borderRadius: 32,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    avatarText: {
      color: "#FFFFFF",
      fontSize: 31,
      lineHeight: 38,
      fontWeight: "900",
    },

    onlineDot: {
      position:
        "absolute",
      width: 14,
      height: 14,
      borderRadius: 7,
      right: -1,
      bottom: 0,
      backgroundColor:
        "#34D399",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    /* =====================================================
       PROFILE INFO
    ===================================================== */

    profileInfo: {
      flex: 1,
      minWidth: 0,
      marginLeft: 13,
      marginRight: 8,
    },

    profileName: {
      color: "#FFFFFF",
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "900",
      letterSpacing: -0.3,
    },

    contactRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
      marginTop: 4,
    },

    contactText: {
      flexShrink: 1,
      color:
        "rgba(255,255,255,0.78)",
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: "500",
    },

    premiumBadge: {
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      marginTop: 8,
      paddingHorizontal: 10,
      height: 29,
      borderRadius:
        radius.full,
      backgroundColor:
        "rgba(17,12,112,0.45)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.12)",
    },

    premiumBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    editButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.14)",
      alignItems:
        "center",
      justifyContent:
        "center",
      alignSelf:
        "flex-start",
    },

    /* =====================================================
       ACCESS CARD
    ===================================================== */

    accessCard: {
      minHeight: 72,
      marginTop: 20,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 17,
      backgroundColor:
        "rgba(19,12,142,0.30)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.13)",
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    accessIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      backgroundColor:
        "rgba(117,77,255,0.72)",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    accessText: {
      flex: 1,
      minWidth: 0,
      marginRight: 8,
    },

    accessTitle: {
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    accessSubtitle: {
      fontSize: 10,
      lineHeight: 14,
      color:
        "rgba(255,255,255,0.68)",
      marginTop: 2,
    },

    /* =====================================================
       CONTENT
    ===================================================== */

    contentArea: {
      backgroundColor:
        colors.bg,
      paddingTop: 24,
    },

    /* =====================================================
       SECTION HEADER
    ===================================================== */

    sectionHeader: {
      marginHorizontal: 18,
      marginBottom: 10,
      marginTop: 2,
    },

    sectionTitle: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "900",
      color: colors.ink,
      letterSpacing: -0.35,
    },

    sectionSubtitle: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    /* =====================================================
       GROUP CARD
    ===================================================== */

    groupCard: {
      marginHorizontal: 18,
      marginBottom: 23,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        colors.border,
      overflow: "hidden",
      ...shadow.soft,
    },

    divider: {
      height: 1,
      backgroundColor:
        colors.border,
      marginLeft: 72,
    },

    /* =====================================================
       PROFILE ROW
    ===================================================== */

    profileRow: {
      minHeight: 72,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    rowIcon: {
      width: 45,
      height: 45,
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
      flexShrink: 1,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
      color: colors.ink,
    },

    rowSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    activeBadge: {
      marginLeft: 7,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.successLight,
    },

    activeBadgeText: {
      fontSize: 8,
      lineHeight: 11,
      fontWeight: "800",
      color:
        colors.success,
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
      borderRadius: 20,
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    settingHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    settingIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    settingInfo: {
      flex: 1,
      minWidth: 0,
    },

    settingTitle: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
      color: colors.ink,
    },

    settingSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
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
      height: 44,
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
      ...shadow.brand,
    },

    languageText: {
      fontSize: 12.5,
      fontWeight: "800",
      color:
        colors.slate,
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
      minWidth: 0,
      height: 45,
      backgroundColor:
        colors.bg,
      borderRadius: 13,
      paddingHorizontal: 12,
      color: colors.ink,
      fontSize: 11.5,
      fontWeight: "600",
      borderWidth: 1.5,
      borderColor:
        colors.border,
    },

    saveButton: {
      height: 45,
      minWidth: 72,
      paddingHorizontal: 13,
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
      opacity: 0.55,
    },

    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 11.5,
      fontWeight: "800",
    },

    /* =====================================================
       LOGOUT
    ===================================================== */

    logoutCard: {
      marginHorizontal: 18,
      marginTop: 3,
      minHeight: 70,
      padding: 12,
      borderRadius: 20,
      backgroundColor:
        "#FFF7F8",
      borderWidth: 1,
      borderColor:
        "#FFD9DE",
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    logoutIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        "#FFE7EA",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
    },

    logoutInfo: {
      flex: 1,
      minWidth: 0,
    },

    logoutTitle: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
      color:
        colors.danger,
    },

    logoutSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
    },

    /* =====================================================
       FOOTER
    ===================================================== */

    securityFooter: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 5,
      marginTop: 17,
      marginBottom: 5,
    },

    securityText: {
      fontSize: 10,
      lineHeight: 14,
      color:
        colors.slate,
      fontWeight: "500",
    },

    securityDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        colors.slateSoft,
      marginHorizontal: 2,
    },
  });