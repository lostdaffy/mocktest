import {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  LinearGradient,
} from "expo-linear-gradient";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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
  type,
  shadow,
  card,
} from "../theme/theme";

/* =========================================================
   DATA
========================================================= */

const BENEFITS = [
  {
    icon: "infinite-outline",
    text: "Unlimited access to all mock tests",
  },
  {
    icon: "library-outline",
    text: "Full previous-year question library",
  },
  {
    icon: "layers-outline",
    text: "Chapter-wise practice — easy to advanced",
  },
  {
    icon: "trophy-outline",
    text: "Live exams with all-India ranking",
  },
  {
    icon: "analytics-outline",
    text: "Detailed analysis of every attempt",
  },
  {
    icon: "close-circle-outline",
    text: "Cancel anytime",
  },
];

const PLANS = [
  {
    id: "half_yearly",
    label: "6 Months",
    price: 149,
    mrp: 299,
    perDay: "₹0.82/day",
    off: "50% OFF",
  },
  {
    id: "yearly",
    label: "12 Months",
    price: 249,
    mrp: 999,
    perDay: "₹0.68/day",
    off: "75% OFF",
    best: true,
  },
];

/* =========================================================
   SCREEN
========================================================= */

export default function SubscriptionScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const { user } = useAuth();

  const [credits, setCredits] =
    useState(0);

  const [selected, setSelected] =
    useState("yearly");

  const [loadingCredits, setLoadingCredits] =
    useState(true);

  /* =======================================================
     LOAD REFERRAL CREDIT
  ======================================================= */

  const loadCredits =
    useCallback(async () => {
      setLoadingCredits(true);

      try {
        const res =
          await api.get(
            "/payments/referral-info"
          );

        setCredits(
          Number(
            res.data?.credits || 0
          )
        );
      } catch (err) {
        // Referral credit is non-critical.
        setCredits(0);
      } finally {
        setLoadingCredits(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadCredits();
    }, [loadCredits])
  );

  /* =======================================================
     STATE
  ======================================================= */

  const isActive =
    isSubscribed(user);

  const plan =
    PLANS.find(
      (item) =>
        item.id === selected
    ) || PLANS[1];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop:
              Math.max(
                insets.top + 8,
                spacing.lg
              ),
            paddingBottom:
              150 + insets.bottom,
          },
        ]}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
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

          <View style={styles.topBarContent}>
            <Text style={styles.topBarTitle}>
              Premium
            </Text>

            <Text style={styles.topBarSub}>
              Upgrade your preparation
            </Text>
          </View>

          <View style={styles.topBarIcon}>
            <Ionicons
              name="sparkles"
              size={17}
              color={colors.brand}
            />
          </View>
        </View>

        {/* =================================================
            PREMIUM HERO
        ================================================= */}

        <LinearGradient
          colors={gradients.premium}
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
              name={
                isActive
                  ? "checkmark"
                  : "star"
              }
              size={23}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons
                name="sparkles"
                size={10}
                color="#FFFFFF"
              />

              <Text
                style={styles.heroBadgeText}
              >
                {isActive
                  ? "PREMIUM ACTIVE"
                  : "RANKVEER PREMIUM"}
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              {isActive
                ? "You're Premium"
                : "Unlock your full potential"}
            </Text>

            <Text style={styles.heroSub}>
              {isActive
                ? "Everything is unlocked. Keep practising and keep climbing."
                : "Every mock, every PYQ and every practice session — without limits."}
            </Text>
          </View>
        </LinearGradient>

        {/* =================================================
            CREDIT
        ================================================= */}

        {credits > 0 && (
          <TouchableOpacity
            style={styles.creditBanner}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                "Referral"
              )
            }
          >
            <View
              style={styles.creditIcon}
            >
              <Ionicons
                name="gift"
                size={17}
                color={colors.success}
              />
            </View>

            <View
              style={styles.creditContent}
            >
              <Text
                style={styles.creditTitle}
              >
                Referral credit available
              </Text>

              <Text
                style={styles.creditSub}
              >
                ₹{credits} will apply
                automatically at checkout
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={colors.success}
            />
          </TouchableOpacity>
        )}

        {/* =================================================
            BENEFITS
        ================================================= */}

        <SectionHeading
          title="Everything you need"
          subtitle="Built for serious preparation"
        />

        <View style={styles.benefitsCard}>
          {BENEFITS.map(
            (benefit, index) => (
              <View
                key={benefit.text}
                style={[
                  styles.benefitRow,
                  index !==
                    BENEFITS.length - 1 &&
                    styles.benefitBorder,
                ]}
              >
                <View
                  style={
                    styles.benefitIcon
                  }
                >
                  <Ionicons
                    name={benefit.icon}
                    size={15}
                    color={
                      colors.success
                    }
                  />
                </View>

                <Text
                  style={
                    styles.benefitText
                  }
                >
                  {benefit.text}
                </Text>

                <Ionicons
                  name="checkmark"
                  size={15}
                  color={colors.success}
                />
              </View>
            )
          )}
        </View>

        {/* =================================================
            PLANS
        ================================================= */}

        <SectionHeading
          title="Choose your plan"
          subtitle="More time means better value"
        />

        <View style={styles.plansWrap}>
          {PLANS.map((item) => {
            const active =
              selected === item.id;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.planCard,
                  active &&
                    styles.planCardActive,
                ]}
                activeOpacity={0.82}
                onPress={() =>
                  setSelected(
                    item.id
                  )
                }
              >
                {/* BEST VALUE */}

                {item.best && (
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
                      styles.bestBadge
                    }
                  >
                    <Ionicons
                      name="sparkles"
                      size={9}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.bestBadgeText
                      }
                    >
                      BEST VALUE
                    </Text>
                  </LinearGradient>
                )}

                {/* RADIO */}

                <View
                  style={[
                    styles.radio,
                    active &&
                      styles.radioActive,
                  ]}
                >
                  {active && (
                    <View
                      style={
                        styles.radioDot
                      }
                    />
                  )}
                </View>

                {/* PLAN INFO */}

                <View
                  style={
                    styles.planContent
                  }
                >
                  <View
                    style={
                      styles.planTitleRow
                    }
                  >
                    <Text
                      style={[
                        styles.planTitle,
                        active &&
                          styles.planTitleActive,
                      ]}
                    >
                      {item.label}
                    </Text>

                    <View
                      style={
                        styles.offBadge
                      }
                    >
                      <Text
                        style={
                          styles.offText
                        }
                      >
                        {item.off}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.planPerDay
                    }
                  >
                    Just {item.perDay}
                  </Text>

                  {item.best && (
                    <Text
                      style={
                        styles.planHint
                      }
                    >
                      Best value for long-term
                      preparation
                    </Text>
                  )}
                </View>

                {/* PRICE */}

                <View
                  style={
                    styles.priceBlock
                  }
                >
                  <Text
                    style={
                      styles.mrp
                    }
                  >
                    ₹{item.mrp}
                  </Text>

                  <Text
                    style={[
                      styles.price,
                      active &&
                        styles.priceActive,
                    ]}
                  >
                    ₹{item.price}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* =================================================
            REFERRAL
        ================================================= */}

        <TouchableOpacity
          style={
            styles.referralCard
          }
          activeOpacity={0.78}
          onPress={() =>
            navigation.navigate(
              "Referral"
            )
          }
        >
          <LinearGradient
            colors={[
              colors.brandTint,
              "#FFFFFF",
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
              styles.referralGradient
            }
          >
            <View
              style={
                styles.referralIcon
              }
            >
              <Ionicons
                name="gift-outline"
                size={18}
                color={colors.brand}
              />
            </View>

            <View
              style={
                styles.referralContent
              }
            >
              <Text
                style={
                  styles.referralTitle
                }
              >
                Refer friends, pay less
              </Text>

              <Text
                style={
                  styles.referralSub
                }
              >
                Earn ₹30–₹50 credit per
                successful referral
              </Text>
            </View>

            <View
              style={
                styles.referralArrow
              }
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.brand}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* =================================================
            TRUST
        ================================================= */}

        <View style={styles.trustRow}>
          <TrustItem
            icon="shield-checkmark-outline"
            text="Secure payment"
          />

          <View
            style={styles.trustDivider}
          />

          <TrustItem
            icon="card-outline"
            text="UPI · Card · Wallet"
          />

          <View
            style={styles.trustDivider}
          />

          <TrustItem
            icon="lock-closed-outline"
            text="Safe checkout"
          />
        </View>
      </ScrollView>

      {/* =================================================
          STICKY FOOTER
      ================================================= */}

      <View
        style={[
          styles.footer,
          {
            paddingBottom:
              Math.max(
                spacing.md +
                  insets.bottom,
                spacing.lg
              ),
          },
        ]}
      >
        <View
          style={styles.footerPrice}
        >
          <Text
            style={styles.footerFrom}
          >
            {credits > 0
              ? "After credit"
              : "Total"}
          </Text>

          <View
            style={styles.footerAmountRow}
          >
            <Text
              style={styles.footerAmount}
            >
              ₹
              {Math.max(
                plan.price -
                  credits,
                0
              )}
            </Text>

            {credits > 0 && (
              <Text
                style={
                  styles.footerOriginal
                }
              >
                ₹{plan.price}
              </Text>
            )}
          </View>

          <Text
            style={styles.footerLabel}
          >
            {plan.label.toLowerCase()}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.buyWrapper}
          activeOpacity={0.86}
          onPress={() =>
            navigation.navigate(
              "Payment",
              {
                plan: plan.id,
                amount: plan.price,
                label: plan.label,
                credits,
              }
            )
          }
        >
          <LinearGradient
            colors={gradients.brand}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 0,
            }}
            style={styles.buyButton}
          >
            <Text
              style={
                styles.buyButtonText
              }
            >
              {isActive
                ? "Renew Now"
                : "Continue to Payment"}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={17}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  title,
  subtitle,
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      <Text style={styles.sectionSubtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

/* =========================================================
   TRUST ITEM
========================================================= */

function TrustItem({
  icon,
  text,
}) {
  return (
    <View style={styles.trustItem}>
      <Ionicons
        name={icon}
        size={13}
        color={colors.slateSoft}
      />

      <Text
        style={styles.trustText}
        numberOfLines={1}
      >
        {text}
      </Text>
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

  scrollContent: {
    paddingHorizontal: spacing.lg,
  },

  /* =====================================================
     TOP BAR
  ===================================================== */

  topBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },

  topBarContent: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 11,
  },

  topBarTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.3,
  },

  topBarSub: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.slate,
    marginTop: 1,
  },

  topBarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor:
      colors.brandLight,
  },

  /* =====================================================
     HERO
  ===================================================== */

  hero: {
    minHeight: 178,
    borderRadius: radius.xxl,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 13,
    ...shadow.md,
  },

  heroContent: {
    flex: 1,
    minWidth: 0,
    zIndex: 5,
  },

  heroIcon: {
    position: "absolute",
    right: 17,
    top: 17,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor:
      "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
  },

  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor:
      "rgba(255,255,255,0.15)",
    marginBottom: 10,
  },

  heroBadgeText: {
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.55,
  },

  heroTitle: {
    maxWidth: "86%",
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.45,
  },

  heroSub: {
    maxWidth: "90%",
    fontSize: 11,
    lineHeight: 17,
    color:
      "rgba(255,255,255,0.82)",
    marginTop: 6,
  },

  heroOrbOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -85,
    top: -92,
    borderWidth: 25,
    borderColor:
      "rgba(255,255,255,0.08)",
  },

  heroOrbTwo: {
    position: "absolute",
    width: 95,
    height: 95,
    borderRadius: 48,
    right: 20,
    bottom: -58,
    backgroundColor:
      "rgba(255,255,255,0.07)",
  },

  /* =====================================================
     CREDIT
  ===================================================== */

  creditBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      colors.successLight,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 17,
    borderWidth: 1,
    borderColor:
      colors.successBorder,
  },

  creditIcon: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  creditContent: {
    flex: 1,
    minWidth: 0,
  },

  creditTitle: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "900",
    color: "#065F46",
  },

  creditSub: {
    fontSize: 9.5,
    lineHeight: 14,
    color: "#047857",
    marginTop: 1,
  },

  /* =====================================================
     SECTION
  ===================================================== */

  sectionHeading: {
    marginTop: 5,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.slateSoft,
    marginTop: 2,
  },

  /* =====================================================
     BENEFITS
  ===================================================== */

  benefitsCard: {
    ...card,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  benefitRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  benefitBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor:
      colors.successLight,
    alignItems: "center",
    justifyContent: "center",
  },

  benefitText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.inkSoft,
    fontWeight: "600",
  },

  /* =====================================================
     PLANS
  ===================================================== */

  plansWrap: {
    gap: 10,
    marginBottom: 17,
  },

  planCard: {
    minHeight: 92,
    ...card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 14,
    borderWidth: 1.2,
    borderColor: colors.border,
    position: "relative",
  },

  planCardActive: {
    borderWidth: 1.8,
    borderColor: colors.brand,
    backgroundColor:
      colors.brandTint,
    ...shadow.brand,
  },

  bestBadge: {
    position: "absolute",
    right: 13,
    top: -9,
    minHeight: 19,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 5,
  },

  bestBadgeText: {
    fontSize: 7,
    lineHeight: 9,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.45,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  radioActive: {
    borderColor: colors.brand,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },

  planContent: {
    flex: 1,
    minWidth: 0,
  },

  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  planTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    color: colors.ink,
  },

  planTitleActive: {
    color: colors.brand,
  },

  offBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor:
      colors.dangerLight,
  },

  offText: {
    fontSize: 7.5,
    lineHeight: 10,
    fontWeight: "900",
    color: colors.danger,
  },

  planPerDay: {
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.slate,
    marginTop: 4,
    fontWeight: "600",
  },

  planHint: {
    fontSize: 8.5,
    lineHeight: 12,
    color: colors.brand,
    marginTop: 2,
    fontWeight: "700",
  },

  priceBlock: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },

  mrp: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.slateSoft,
    textDecorationLine:
      "line-through",
    fontWeight: "600",
  },

  price: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 1,
  },

  priceActive: {
    color: colors.brand,
  },

  /* =====================================================
     REFERRAL
  ===================================================== */

  referralCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.brandLight,
  },

  referralGradient: {
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
  },

  referralIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  referralContent: {
    flex: 1,
    minWidth: 0,
  },

  referralTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    color: colors.ink,
  },

  referralSub: {
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.slate,
    marginTop: 2,
  },

  referralArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  /* =====================================================
     TRUST
  ===================================================== */

  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },

  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },

  trustText: {
    fontSize: 8.5,
    lineHeight: 12,
    color: colors.slateSoft,
    fontWeight: "600",
  },

  trustDivider: {
    width: 1,
    height: 13,
    backgroundColor: colors.border,
    marginHorizontal: 9,
  },

  /* =====================================================
     FOOTER
  ===================================================== */

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 80,
    backgroundColor:
      colors.surface,
    borderTopWidth: 1,
    borderTopColor:
      colors.border,
    paddingHorizontal:
      spacing.lg,
    paddingTop: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.lg,
  },

  footerPrice: {
    width: 78,
    minWidth: 70,
  },

  footerFrom: {
    fontSize: 7.5,
    lineHeight: 10,
    color: colors.slateSoft,
    fontWeight: "700",
  },

  footerAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },

  footerAmount: {
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
    color: colors.ink,
  },

  footerOriginal: {
    fontSize: 9,
    lineHeight: 13,
    color: colors.slateSoft,
    textDecorationLine:
      "line-through",
  },

  footerLabel: {
    fontSize: 8.5,
    lineHeight: 12,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 1,
  },

  buyWrapper: {
    flex: 1,
    minWidth: 0,
  },

  buyButton: {
    height: 52,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
    ...shadow.brand,
  },

  buyButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "900",
  },
});