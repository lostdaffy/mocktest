import {
  useCallback,
  useLayoutEffect,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from "react-native";

import AppAlert from "../components/AppAlert";

import {
  useFocusEffect,
} from "@react-navigation/native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  LinearGradient,
} from "expo-linear-gradient";

import api from "../api/client";

import {
  colors,
  gradients,
  spacing,
  radius,
  type,
  shadow,
  card,
} from "../theme/theme";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/* =========================================================
   SCREEN
========================================================= */

export default function ReferralScreen({
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const [info, setInfo] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  /* =======================================================
     HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     LOAD
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);
      setError(false);

      try {
        const res =
          await api.get(
            "/payments/referral-info"
          );

        setInfo(
          res.data || null
        );
      } catch (err) {
        console.log(
          "Referral info loading error:",
          err
        );

        setInfo(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =======================================================
     SHARE
  ======================================================= */

  async function shareCode() {
    if (!info?.shareMessage) {
      return;
    }

    try {
      await Share.share({
        message:
          info.shareMessage,
      });
    } catch (err) {
      AppAlert.alert(
        "Couldn't share",
        "Please try again"
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={
            styles.loaderCircle
          }
        >
          <ActivityIndicator
            size="small"
            color={
              colors.brand
            }
          />
        </View>

        <Text
          style={
            styles.loadingTitle
          }
        >
          Loading referrals
        </Text>

        <Text
          style={
            styles.loadingSubtitle
          }
        >
          Preparing your referral details...
        </Text>
      </View>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !info) {
    return (
      <View
        style={[
          styles.errorContainer,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={
            styles.errorIcon
          }
        >
          <Ionicons
            name="cloud-offline-outline"
            size={27}
            color={
              colors.brand
            }
          />
        </View>

        <Text
          style={
            styles.errorTitle
          }
        >
          Couldn't load referrals
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          Please check your connection
          and try again.
        </Text>

        <TouchableOpacity
          style={
            styles.retryButton
          }
          activeOpacity={0.8}
          onPress={load}
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.retryButtonText
            }
          >
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The API field is referralCredits - reading `info.credits` meant the
  // balance always rendered as ₹0 no matter how much a student had earned.
  const credits =
    Number(
      info.referralCredits || 0
    );

  const referralCount =
    Number(
      info.referralCount || 0
    );

  // Reward amount and the limited-time flag both come from the server
  // (config/referral.js) so the wording here can never drift from what
  // students actually get credited.
  const reward =
    Number(
      info.rewardPerSignup || 0
    );

  const offerActive =
    info.offerActive !== false;

  const maxDiscountPercent =
    Number(
      info.maxDiscountPercent || 50
    );

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingTop:
            Math.max(
              insets.top + 8,
              18
            ),
          paddingHorizontal: 18,
          paddingBottom:
            spacing.xxl +
            insets.bottom +
            10,
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            style={
              styles.headerButton
            }
            activeOpacity={0.75}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={
                colors.ink
              }
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerContent
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Refer & Earn
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Invite friends and earn credit
            </Text>
          </View>

        </View>

        {/* =================================================
            HERO
        ================================================= */}

        <View
          style={
            styles.heroWrap
          }
        >
          <LinearGradient
            colors={[
              "#047857",
              "#059669",
              "#10B981",
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
              styles.hero
            }
          >
            <View
              style={
                styles.heroOrbOne
              }
            />

            <View
              style={
                styles.heroOrbTwo
              }
            />

            <View
              style={
                styles.heroRing
              }
            />

            <View
              style={
                styles.heroContent
              }
            >
              <View
                style={
                  styles.heroBadge
                }
              >
                <Ionicons
                  name="gift-outline"
                  size={11}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.heroBadgeText
                  }
                >
                  REFER & EARN
                </Text>
              </View>

              <Text
                style={
                  styles.heroTitle
                }
              >
                Refer friends,
                {"\n"}
                pay less.
              </Text>

              <Text
                style={
                  styles.heroSubtitle
                }
              >
                Earn ₹{reward} credit every
                time a friend installs the app
                with your code.
              </Text>

              {offerActive && (
                <View
                  style={
                    styles.limitedBadge
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={11}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.limitedBadgeText
                    }
                  >
                    LIMITED TIME OFFER
                  </Text>
                </View>
              )}
            </View>

            <View
              style={
                styles.heroArtwork
              }
            >
              <View
                style={
                  styles.heroGift
                }
              >
                <Ionicons
                  name="gift"
                  size={30}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.heroCoin
                }
              >
                <Text
                  style={
                    styles.heroCoinText
                  }
                >
                  ₹
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* =================================================
            STATS
        ================================================= */}

        <View
          style={
            styles.statsRow
          }
        >
          <View
            style={
              styles.statCard
            }
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    colors.successLight,
                },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={16}
                color={
                  colors.success
                }
              />
            </View>

            <Text
              style={[
                styles.statValue,
                {
                  color:
                    colors.success,
                },
              ]}
            >
              ₹{credits}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              Credit balance
            </Text>
          </View>

          <View
            style={
              styles.statCard
            }
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    colors.brandLight,
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={
                  colors.brand
                }
              />
            </View>

            <Text
              style={
                styles.statValue
              }
            >
              {referralCount}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              Referrals
            </Text>
          </View>
        </View>

        {/* =================================================
            REFERRAL CODE
        ================================================= */}

        <View
          style={
            styles.codeCard
          }
        >
          <View
            style={
              styles.codeHeader
            }
          >
            <View>
              <Text
                style={
                  styles.codeLabel
                }
              >
                YOUR REFERRAL CODE
              </Text>

              <Text
                style={
                  styles.codeHint
                }
              >
                Share this code with friends
              </Text>
            </View>

            <View
              style={
                styles.codeIcon
              }
            >
              <Ionicons
                name="ticket-outline"
                size={17}
                color={
                  colors.brand
                }
              />
            </View>
          </View>

          <View
            style={
              styles.codeBox
            }
          >
            <Text
              style={
                styles.codeText
              }
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {info.referralCode ||
                "—"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={shareCode}
            activeOpacity={0.85}
            style={
              styles.shareButtonWrap
            }
          >
            <LinearGradient
              colors={
                gradients.brand
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
                styles.shareButton
              }
            >
              <Ionicons
                name="share-social"
                size={17}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.shareButtonText
                }
              >
                Share Code
              </Text>

              <Ionicons
                name="arrow-forward"
                size={15}
                color="rgba(255,255,255,0.75)"
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              How it works
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Three simple steps to earn credit
            </Text>
          </View>

          <View
            style={
              styles.stepCount
            }
          >
            <Text
              style={
                styles.stepCountText
              }
            >
              3 STEPS
            </Text>
          </View>
        </View>

        <View
          style={
            styles.stepsCard
          }
        >
          <Step
            num="1"
            icon="share-social-outline"
            title="Share your code"
            desc="Send your referral code to friends on WhatsApp, Telegram or anywhere."
          />

          <View
            style={
              styles.stepLine
            }
          />

          <Step
            num="2"
            icon="person-add-outline"
            title="They sign up"
            desc="Your friend enters the code while creating their account."
          />

          <View
            style={
              styles.stepLine
            }
          />

          <Step
            num="3"
            icon="wallet-outline"
            title="You earn credit"
            desc={`₹${reward} lands in your balance as soon as they sign up — no purchase needed.`}
            last
          />
        </View>

        {/* =================================================
            USE CREDIT
        ================================================= */}

        {credits > 0 && (
          <TouchableOpacity
            style={
              styles.useCreditCard
            }
            onPress={() =>
              navigation.navigate(
                "Subscription"
              )
            }
            activeOpacity={0.78}
          >
            <View
              style={
                styles.creditIcon
              }
            >
              <Ionicons
                name="pricetag"
                size={17}
                color={
                  colors.success
                }
              />
            </View>

            <View
              style={
                styles.creditContent
              }
            >
              <Text
                style={
                  styles.useCreditTitle
                }
              >
                Use your ₹{credits} credit
              </Text>

              <Text
                style={
                  styles.useCreditSub
                }
              >
                Applied automatically at checkout
              </Text>
            </View>

            <View
              style={
                styles.creditArrow
              }
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  colors.success
                }
              />
            </View>
          </TouchableOpacity>
        )}

        {/* =================================================
            NOTE
        ================================================= */}

        <View
          style={
            styles.noteCard
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={
              colors.slateSoft
            }
          />

          <Text
            style={
              styles.note
            }
          >
            Credit is earned the moment your friend signs up with your code,
            and is used when you buy a subscription — it can cover up to{" "}
            {maxDiscountPercent}% of a plan.
            {offerActive
              ? " This is a limited-time offer and may be withdrawn later; credit you've already earned stays yours."
              : ""}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   STEP
========================================================= */

function Step({
  num,
  icon,
  title,
  desc,
}) {
  return (
    <View
      style={
        styles.step
      }
    >
      <View
        style={
          styles.stepLeft
        }
      >
        <LinearGradient
          colors={
            gradients.brand
          }
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={
            styles.stepNum
          }
        >
          <Text
            style={
              styles.stepNumText
            }
          >
            {num}
          </Text>
        </LinearGradient>
      </View>

      <View
        style={
          styles.stepContent
        }
      >
        <View
          style={
            styles.stepTitleRow
          }
        >
          <View
            style={
              styles.stepIcon
            }
          >
            <Ionicons
              name={icon}
              size={14}
              color={
                colors.brand
              }
            />
          </View>

          <Text
            style={
              styles.stepTitle
            }
          >
            {title}
          </Text>
        </View>

        <Text
          style={
            styles.stepDesc
          }
        >
          {desc}
        </Text>
      </View>
    </View>
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
       LOADING
    ===================================================== */

    loadingContainer: {
      flex: 1,
      backgroundColor:
        colors.bg,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loaderCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 12,
      ...shadow.soft,
    },

    loadingTitle: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      color:
        colors.ink,
    },

    loadingSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
    },

    /* =====================================================
       ERROR
    ===================================================== */

    errorContainer: {
      flex: 1,
      backgroundColor:
        colors.bg,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
    },

    errorIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    errorTitle: {
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "900",
      color:
        colors.ink,
      marginBottom: 5,
      textAlign: "center",
    },

    errorText: {
      fontSize: 11.5,
      lineHeight: 18,
      color:
        colors.slate,
      textAlign: "center",
      maxWidth: 280,
    },

    retryButton: {
      height: 42,
      paddingHorizontal: 18,
      borderRadius: 13,
      backgroundColor:
        colors.brand,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
      marginTop: 17,
      ...shadow.brand,
    },

    retryButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 57,
      paddingBottom: 13,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerButton: {
      width: 41,
      height: 41,
      borderRadius: 14,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.soft,
    },

    headerContent: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 11,
    },

    headerTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "900",
      color:
        colors.ink,
      letterSpacing:
        -0.35,
    },

    headerSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    /* =====================================================
       HERO
    ===================================================== */

    heroWrap: {
      marginBottom: 15,
    },

    hero: {
      minHeight: 174,
      borderRadius: 23,
      paddingHorizontal: 18,
      paddingVertical: 18,
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      ...shadow.brand,
    },

    heroContent: {
      flex: 1,
      minWidth: 0,
      zIndex: 5,
    },

    heroBadge: {
      alignSelf:
        "flex-start",
      height: 25,
      paddingHorizontal: 8,
      borderRadius:
        radius.full,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.13)",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginBottom: 8,
    },

    heroBadgeText: {
      fontSize: 7.5,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: 0.6,
    },

    heroTitle: {
      fontSize: 21,
      lineHeight: 26,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },

    heroSubtitle: {
      maxWidth: 220,
      fontSize: 10.5,
      lineHeight: 16,
      color:
        "rgba(255,255,255,0.78)",
      marginTop: 5,
    },

    limitedBadge: {
      flexDirection:
        "row",
      alignItems:
        "center",
      alignSelf:
        "flex-start",
      gap: 4,
      marginTop: 9,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius:
        radius.full,
      backgroundColor:
        "rgba(255,255,255,0.18)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.28)",
    },

    limitedBadgeText: {
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.6,
      color: "#FFFFFF",
    },

    heroArtwork: {
      width: 83,
      height: 112,
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
      marginLeft: 7,
    },

    heroGift: {
      width: 68,
      height: 78,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.22)",
      alignItems:
        "center",
      justifyContent:
        "center",
      transform: [
        {
          rotate: "6deg",
        },
      ],
    },

    heroCoin: {
      position:
        "absolute",
      right: -1,
      bottom: 4,
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor:
        "#FBBF24",
      borderWidth: 3,
      borderColor:
        "rgba(255,255,255,0.25)",
      alignItems:
        "center",
      justifyContent:
        "center",
      transform: [
        {
          rotate: "-8deg",
        },
      ],
    },

    heroCoinText: {
      fontSize: 17,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    heroOrbOne: {
      position:
        "absolute",
      width: 205,
      height: 205,
      borderRadius: 103,
      right: -91,
      top: -110,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroOrbTwo: {
      position:
        "absolute",
      width: 105,
      height: 105,
      borderRadius: 53,
      left: -50,
      bottom: -69,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    heroRing: {
      position:
        "absolute",
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 18,
      borderColor:
        "rgba(255,255,255,0.035)",
      right: -70,
      bottom: -82,
    },

    /* =====================================================
       STATS
    ===================================================== */

    statsRow: {
      flexDirection:
        "row",
      gap: 10,
      marginBottom: 15,
    },

    statCard: {
      ...card,
      flex: 1,
      minHeight: 100,
      paddingVertical: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        "#FFFFFF",
    },

    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    statValue: {
      fontSize: 21,
      lineHeight: 25,
      fontWeight: "900",
      color:
        colors.ink,
      marginTop: 6,
    },

    statLabel: {
      fontSize: 8.5,
      lineHeight: 11,
      color:
        colors.slateSoft,
      fontWeight: "600",
      marginTop: 1,
    },

    /* =====================================================
       REFERRAL CODE
    ===================================================== */

    codeCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 15,
      marginBottom: 21,
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    codeHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 12,
    },

    codeLabel: {
      fontSize: 8,
      lineHeight: 11,
      fontWeight: "900",
      color:
        colors.slateSoft,
      letterSpacing: 1,
    },

    codeHint: {
      fontSize: 10,
      lineHeight: 14,
      color:
        colors.slate,
      marginTop: 2,
    },

    codeIcon: {
      width: 35,
      height: 35,
      borderRadius: 12,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    codeBox: {
      minHeight: 70,
      borderRadius: 16,
      backgroundColor:
        colors.brandLight,
      borderWidth: 1,
      borderColor:
        "rgba(59,123,255,0.14)",
      borderStyle:
        "dashed",
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 12,
      marginBottom: 11,
    },

    codeText: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "900",
      color:
        colors.brand,
      letterSpacing: 4,
      textAlign: "center",
    },

    shareButtonWrap: {
      width: "100%",
    },

    shareButton: {
      minHeight: 48,
      borderRadius: 14,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
      paddingHorizontal: 14,
      ...shadow.brand,
    },

    shareButtonText: {
      flex: 1,
      textAlign: "center",
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "900",
      marginLeft: 14,
    },

    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 11,
    },

    sectionTitle: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "900",
      color:
        colors.ink,
      letterSpacing:
        -0.35,
    },

    sectionSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
    },

    stepCount: {
      height: 31,
      paddingHorizontal: 9,
      borderRadius: 11,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    stepCountText: {
      fontSize: 7,
      fontWeight: "900",
      color:
        colors.slateSoft,
      letterSpacing: 0.5,
    },

    /* =====================================================
       STEPS
    ===================================================== */

    stepsCard: {
      ...card,
      padding: 14,
      marginBottom: 15,
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        "#FFFFFF",
    },

    step: {
      flexDirection:
        "row",
      minHeight: 59,
    },

    stepLeft: {
      width: 34,
      alignItems:
        "center",
    },

    stepNum: {
      width: 29,
      height: 29,
      borderRadius: 10,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.brand,
    },

    stepNumText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    stepContent: {
      flex: 1,
      minWidth: 0,
      paddingLeft: 6,
    },

    stepTitleRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      minWidth: 0,
    },

    stepIcon: {
      width: 25,
      height: 25,
      borderRadius: 8,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 6,
    },

    stepTitle: {
      ...type.bodyStrong,
      fontSize: 13,
      lineHeight: 18,
      color:
        colors.ink,
      flexShrink: 1,
    },

    stepDesc: {
      ...type.small,
      fontSize: 10.5,
      lineHeight: 17,
      color:
        colors.slate,
      marginTop: 3,
      paddingRight: 4,
    },

    stepLine: {
      width: 1.5,
      height: 15,
      backgroundColor:
        colors.border,
      marginLeft: 14,
      marginVertical: 4,
    },

    /* =====================================================
       USE CREDIT
    ===================================================== */

    useCreditCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
      backgroundColor:
        colors.successLight,
      borderRadius: 17,
      padding: 12,
      borderWidth: 1,
      borderColor:
        colors.successBorder,
      marginBottom: 14,
    },

    creditIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor:
        "rgba(255,255,255,0.72)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    creditContent: {
      flex: 1,
      minWidth: 0,
    },

    useCreditTitle: {
      ...type.bodyStrong,
      fontSize: 13,
      color:
        "#065F46",
    },

    useCreditSub: {
      ...type.tiny,
      fontSize: 9,
      color:
        "#047857",
      fontWeight: "500",
      marginTop: 2,
    },

    creditArrow: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor:
        "rgba(255,255,255,0.72)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    /* =====================================================
       NOTE
    ===================================================== */

    noteCard: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      justifyContent:
        "center",
      gap: 6,
      paddingHorizontal: 9,
      marginTop: 1,
    },

    note: {
      flex: 1,
      ...type.tiny,
      fontSize: 9,
      color:
        colors.slateSoft,
      textAlign: "left",
      lineHeight: 16,
      fontWeight: "500",
    },
  });