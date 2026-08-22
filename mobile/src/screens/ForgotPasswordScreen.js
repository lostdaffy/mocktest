import { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
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
  type,
  shadow,
} from "../theme/theme";

/* =========================================================
   RANKVEER LOGO
========================================================= */

const RANKVEER_LOGO = require(
  "../../assets/brand-logo.png"
);

/* =========================================================
   FORGOT PASSWORD SCREEN
========================================================= */

export default function ForgotPasswordScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] =
    useState("");

  const [showPass, setShowPass] =
    useState(false);

  const [focused, setFocused] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [sentTo, setSentTo] =
    useState("");

  /* =======================================================
     REQUEST OTP
  ======================================================= */

  async function requestOtp() {
    const cleanPhone =
      phone.replace(/\D/g, "");

    if (!cleanPhone) {
      setError(
        "Enter your phone number"
      );
      return;
    }

    if (cleanPhone.length !== 10) {
      setError(
        "Enter a valid 10-digit mobile number"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post(
        "/auth/request-otp",
        {
          phone: cleanPhone,
        }
      );

      setPhone(cleanPhone);
      setSentTo(cleanPhone);
      setOtp("");
      setNewPassword("");
      setFocused(null);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Couldn't send the code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     RESET PASSWORD
  ======================================================= */

  async function resetPassword() {
    const cleanOtp =
      otp.replace(/\D/g, "");

    if (!cleanOtp || !newPassword) {
      setError(
        "Enter the verification code and your new password"
      );
      return;
    }

    if (cleanOtp.length !== 6) {
      setError(
        "Enter the 6-digit verification code"
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        "Password must be at least 6 characters"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await api.post(
        "/auth/reset-password",
        {
          phone,
          otp: cleanOtp,
          newPassword,
        }
      );

      AppAlert.alert(
        "Password reset",
        "Your password has been updated. You can now sign in.",
        [
          {
            text: "Sign in",
            onPress: () =>
              navigation.navigate(
                "Login"
              ),
          },
        ]
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Reset failed. Check the code and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     CHANGE NUMBER
  ======================================================= */

  function goBackToPhone() {
    if (loading) return;

    setError("");
    setOtp("");
    setNewPassword("");
    setFocused(null);
    setStep(1);
  }

  /* =======================================================
     FIELD HELPERS
  ======================================================= */

  const field = (key) => [
    styles.inputWrap,
    focused === key &&
    styles.inputWrapFocused,
  ];

  const iconColor = (key) =>
    focused === key
      ? colors.brand
      : colors.slateSoft;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View style={styles.screen}>

        {/* =================================================
            BACKGROUND DECORATIONS
            IMPORTANT: pointerEvents NONE
        ================================================= */}

        <View
          pointerEvents="none"
          style={[
            styles.bgCircle,
            styles.bgCircleTopRight,
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.bgCircleInner,
            styles.bgCircleTopRightInner,
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.bgCircle,
            styles.bgCircleBottomLeft,
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.bgCircleInner,
            styles.bgCircleBottomLeftInner,
          ]}
        />

        {/* LEFT DOTS */}

        <View
          pointerEvents="none"
          style={[
            styles.dots,
            styles.dotsLeft,
          ]}
        >
          {Array.from({
            length: 35,
          }).map((_, index) => (
            <View
              key={`left-${index}`}
              style={styles.dot}
            />
          ))}
        </View>

        {/* RIGHT DOTS */}

        <View
          pointerEvents="none"
          style={[
            styles.dots,
            styles.dotsRight,
          ]}
        >
          {Array.from({
            length: 30,
          }).map((_, index) => (
            <View
              key={`right-${index}`}
              style={styles.dot}
            />
          ))}
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop:
                Math.max(
                  insets.top,
                  12
                ) + spacing.md,

              paddingBottom:
                Math.max(
                  insets.bottom,
                  12
                ) + spacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          {/* =================================================
              BACK TO LOGIN
          ================================================= */}

          <TouchableOpacity
            style={styles.topBack}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate(
                "Login"
              )
            }
          >
            <View
              style={
                styles.topBackIcon
              }
            >
              <Ionicons
                name="chevron-back"
                size={17}
                color={colors.ink}
              />
            </View>

            <Text
              style={
                styles.topBackText
              }
            >
              Sign in
            </Text>
          </TouchableOpacity>

          {/* =================================================
              BRAND
          ================================================= */}

          <View
            style={styles.brandWrap}
          >
            <Image
              source={
                RANKVEER_LOGO
              }
              style={
                styles.logoImage
              }
              resizeMode="contain"
            />

            <Text
              style={
                styles.brandTag
              }
            >
              Practice smarter. Score higher.
            </Text>
          </View>

          {/* =================================================
              CARD
          ================================================= */}

          <View
            style={styles.card}
          >

            {/* =================================================
                HEADING
            ================================================= */}

            <View
              style={
                styles.headingRow
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                {step === 1
                  ? "Reset password"
                  : "Create new password"}
              </Text>

              <Text
                style={
                  styles.headingEmoji
                }
              >
                {step === 1
                  ? "🔐"
                  : "✨"}
              </Text>
            </View>

            <Text
              style={
                styles.subtitle
              }
            >
              {step === 1
                ? "We'll help you get back into your account"
                : `Verification code sent to +91 ${sentTo}`}
            </Text>

            {/* =================================================
                STEP 1
            ================================================= */}

            {step === 1 ? (
              <>
                {/* PHONE LABEL */}

                <Text
                  style={styles.label}
                >
                  Phone number
                </Text>

                {/* PHONE INPUT */}

                <View
                  style={field(
                    "phone"
                  )}
                >
                  <View
                    style={
                      styles.inputIconBox
                    }
                  >
                    <Ionicons
                      name="call-outline"
                      size={19}
                      color={iconColor(
                        "phone"
                      )}
                    />
                  </View>

                  <Text
                    style={
                      styles.countryCode
                    }
                  >
                    +91
                  </Text>

                  <View
                    style={
                      styles.inputDivider
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="10-digit mobile number"
                    placeholderTextColor={
                      colors.slateSoft
                    }
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={true}
                    value={phone}
                    onChangeText={(value) => {
                      const cleaned =
                        value.replace(
                          /\D/g,
                          ""
                        );

                      setPhone(
                        cleaned
                      );
                      setError("");
                    }}
                    onFocus={() =>
                      setFocused(
                        "phone"
                      )
                    }
                    onBlur={() =>
                      setFocused(null)
                    }
                    returnKeyType="done"
                    onSubmitEditing={
                      requestOtp
                    }
                  />
                </View>

                {/* INFO */}

                <InfoBox />

                {/* ERROR */}

                <ErrorBox
                  error={error}
                />

                {/* BUTTON */}

                <PrimaryButton
                  loading={loading}
                  text="Send verification code"
                  icon="arrow-forward"
                  onPress={
                    requestOtp
                  }
                />
              </>
            ) : (
              /* =================================================
                 STEP 2
              ================================================= */

              <>
                <View
                  style={
                    styles.cardIntro
                  }
                >
                  <View
                    style={[
                      styles.cardIntroIcon,
                      styles.successIntroIcon,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={
                        colors.success
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.cardIntroCopy
                    }
                  >
                    <Text
                      style={
                        styles.cardIntroTitle
                      }
                    >
                      Verify and reset
                    </Text>

                    <Text
                      style={
                        styles.cardIntroText
                      }
                    >
                      Enter the code from your SMS
                      and choose a new password.
                    </Text>
                  </View>
                </View>

                {/* =================================================
                    OTP
                ================================================= */}

                <Text
                  style={styles.label}
                >
                  Verification code
                </Text>

                <View
                  style={field("otp")}
                >
                  <View
                    style={
                      styles.inputIconBox
                    }
                  >
                    <Ionicons
                      name="keypad-outline"
                      size={19}
                      color={iconColor(
                        "otp"
                      )}
                    />
                  </View>

                  <TextInput
                    style={[
                      styles.input,
                      styles.otpInput,
                    ]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={
                      colors.slateSoft
                    }
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={true}
                    value={otp}
                    onChangeText={(value) => {
                      const cleaned =
                        value.replace(
                          /\D/g,
                          ""
                        );

                      setOtp(
                        cleaned
                      );
                      setError("");
                    }}
                    onFocus={() =>
                      setFocused(
                        "otp"
                      )
                    }
                    onBlur={() =>
                      setFocused(null)
                    }
                    autoFocus
                    returnKeyType="next"
                  />
                </View>

                {/* =================================================
                    PASSWORD
                ================================================= */}

                <Text
                  style={styles.label}
                >
                  New password
                </Text>

                <View
                  style={field("pass")}
                >
                  <View
                    style={
                      styles.inputIconBox
                    }
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={19}
                      color={iconColor(
                        "pass"
                      )}
                    />
                  </View>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="At least 6 characters"
                    placeholderTextColor={
                      colors.slateSoft
                    }
                    secureTextEntry={
                      !showPass
                    }
                    editable={true}
                    value={
                      newPassword
                    }
                    onChangeText={(value) => {
                      setNewPassword(
                        value
                      );
                      setError("");
                    }}
                    onFocus={() =>
                      setFocused(
                        "pass"
                      )
                    }
                    onBlur={() =>
                      setFocused(null)
                    }
                    returnKeyType="done"
                    onSubmitEditing={
                      resetPassword
                    }
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowPass(
                        (value) =>
                          !value
                      )
                    }
                    hitSlop={10}
                    style={
                      styles.eyeButton
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={
                        showPass
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={20}
                      color={
                        colors.slateSoft
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* PASSWORD HINT */}

                <View
                  style={
                    styles.passwordHint
                  }
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={14}
                    color={
                      newPassword.length >=
                        6
                        ? colors.success
                        : colors.slateSoft
                    }
                  />

                  <Text
                    style={
                      styles.passwordHintText
                    }
                  >
                    Use at least 6 characters
                  </Text>
                </View>

                {/* ERROR */}

                <ErrorBox
                  error={error}
                />

                {/* BUTTON */}

                <PrimaryButton
                  loading={loading}
                  text="Reset password"
                  icon="checkmark"
                  onPress={
                    resetPassword
                  }
                />

                {/* CHANGE NUMBER */}

                <TouchableOpacity
                  style={
                    styles.changeNumber
                  }
                  activeOpacity={0.7}
                  onPress={
                    goBackToPhone
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={14}
                    color={
                      colors.brand
                    }
                  />

                  <Text
                    style={
                      styles.changeNumberText
                    }
                  >
                    Change phone number
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* =================================================
              SECURITY FOOTER
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
                colors.slateSoft
              }
            />

            <Text
              style={
                styles.securityText
              }
            >
              Your account information is
              kept secure
            </Text>
          </View>

          {/* =================================================
              LOGIN FOOTER
          ================================================= */}

          <View
            style={styles.footer}
          >
            <Text
              style={
                styles.footerText
              }
            >
              Remember your password?{" "}
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  "Login"
                )
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.footerLink
                }
              >
                Sign in
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox() {
  return (
    <View
      style={styles.infoBox}
    >
      <View
        style={styles.infoIcon}
      >
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={colors.brand}
        />
      </View>

      <Text
        style={styles.infoText}
      >
        We'll send a verification code
        to this number.
      </Text>
    </View>
  );
}

/* =========================================================
   ERROR BOX
========================================================= */

function ErrorBox({ error }) {
  if (!error) return null;

  return (
    <View
      style={styles.errorBox}
    >
      <View
        style={styles.errorIcon}
      >
        <Ionicons
          name="alert-circle"
          size={16}
          color={colors.danger}
        />
      </View>

      <Text
        style={styles.errorText}
      >
        {error}
      </Text>
    </View>
  );
}

/* =========================================================
   PRIMARY BUTTON
========================================================= */

function PrimaryButton({
  loading,
  text,
  icon,
  onPress,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.86}
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
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator
            color="#FFFFFF"
            size="small"
          />
        ) : (
          <>
            <Text
              style={
                styles.buttonText
              }
            >
              {text}
            </Text>

            <View
              style={
                styles.buttonIcon
              }
            >
              <Ionicons
                name={icon}
                size={16}
                color="#FFFFFF"
              />
            </View>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({

  /* =======================================================
     ROOT
  ======================================================= */

  keyboard: {
    flex: 1,
    backgroundColor: "#F8F7FF",
  },

  screen: {
    flex: 1,
    backgroundColor: "#F8F7FF",
    overflow: "hidden",
  },

  scroll: {
    flex: 1,
    zIndex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },

  /* =======================================================
     BACKGROUND
  ======================================================= */

  bgCircle: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor:
      "rgba(126,92,245,0.10)",
  },

  bgCircleInner: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor:
      "rgba(135,99,255,0.10)",
  },

  bgCircleTopRight: {
    width: 270,
    height: 270,
    right: -150,
    top: -160,
  },

  bgCircleTopRightInner: {
    width: 210,
    height: 210,
    right: -120,
    top: -125,
  },

  bgCircleBottomLeft: {
    width: 320,
    height: 320,
    left: -200,
    bottom: -180,
  },

  bgCircleBottomLeftInner: {
    width: 245,
    height: 245,
    left: -155,
    bottom: -145,
  },

  dots: {
    position: "absolute",
    width: 105,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    opacity: 0.55,
  },

  dotsLeft: {
    left: 7,
    top: 150,
  },

  dotsRight: {
    right: 6,
    top: 225,
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#D6C9FF",
  },

  /* =======================================================
     BACK BUTTON
  ======================================================= */

  topBack: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
    marginTop: 2,
    zIndex: 20,
    elevation: 5,
  },

  topBackIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor:
      "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },

  topBackText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate,
  },

  /* =======================================================
     BRAND
  ======================================================= */

  brandWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: 4,
    zIndex: 10,
  },

  logoImage: {
    width: 300,
    height: 88,
    maxWidth: "100%",
  },

  brandTag: {
    ...type.small,
    color: colors.slate,
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },

  /* =======================================================
     CARD
  ======================================================= */

  card: {
    width: "100%",

    backgroundColor:
      "rgba(255,255,255,0.98)",

    borderRadius: 27,

    padding: spacing.lg,

    borderWidth: 1,

    borderColor:
      "rgba(255,255,255,0.95)",

    shadowColor: "#1C2650",

    shadowOffset: {
      width: 0,
      height: 9,
    },

    shadowOpacity: 0.13,

    shadowRadius: 22,

    elevation: 8,

    zIndex: 20,
  },

  /* =======================================================
     HEADING
  ======================================================= */

  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  title: {
    flexShrink: 1,

    ...type.h1,

    color: "#172B4D",

    fontSize: 24,

    lineHeight: 31,

    fontWeight: "800",

    letterSpacing: -0.5,
  },

  headingEmoji: {
    fontSize: 24,
    marginLeft: 7,
  },

  subtitle: {
    ...type.small,

    color: "#71809B",

    fontSize: 13.5,

    lineHeight: 20,

    marginTop: 2,

    marginBottom: spacing.lg,
  },

  /* =======================================================
     CARD INTRO
  ======================================================= */

  cardIntro: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  cardIntroIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,

    backgroundColor: "#F5F1FF",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  successIntroIcon: {
    backgroundColor: "#EEF9F3",
  },

  cardIntroCopy: {
    flex: 1,
    minWidth: 0,
  },

  cardIntroTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    color: "#172D51",
  },

  cardIntroText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slate,
    marginTop: 1,
  },

  /* =======================================================
     LABEL
  ======================================================= */

  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: "#172D51",
    marginBottom: 8,
  },

  /* =======================================================
     INPUT
  ======================================================= */

  inputWrap: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 16,

    paddingHorizontal: 11,

    height: 56,

    marginBottom: spacing.md,

    borderWidth: 1.5,

    borderColor: "#E0DCF5",

    /*
     * Important:
     * Keep input above decorative elements.
     */
    zIndex: 20,

    elevation: 3,
  },

  inputWrapFocused: {
    borderColor: "#7050E7",

    backgroundColor: "#FCFBFF",

    zIndex: 30,

    elevation: 5,

    shadowColor: "#7050E7",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,

    shadowRadius: 7,
  },

  inputIconBox: {
    width: 37,
    height: 37,

    borderRadius: 11,

    backgroundColor: "#F5F1FF",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 9,
  },

  input: {
    flex: 1,

    minWidth: 0,

    height: "100%",

    fontSize: 15,

    color: "#172D51",

    fontWeight: "500",

    paddingVertical: 0,

    paddingHorizontal: 0,

    zIndex: 50,
  },

  countryCode: {
    fontSize: 13,

    fontWeight: "700",

    color: "#172D51",

    marginRight: 9,
  },

  inputDivider: {
    width: 1,

    height: 21,

    backgroundColor:
      colors.border,

    marginRight: 8,
  },

  otpInput: {
    letterSpacing: 6,

    fontSize: 18,

    fontWeight: "800",
  },

  eyeButton: {
    width: 32,
    height: 32,

    alignItems: "center",
    justifyContent: "center",

    zIndex: 60,
  },

  /* =======================================================
     INFO BOX
  ======================================================= */

  infoBox: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#F6F3FF",

    padding: 11,

    borderRadius: 14,

    marginBottom: 14,

    borderWidth: 1,

    borderColor: "#E4DDF8",
  },

  infoIcon: {
    width: 30,
    height: 30,

    borderRadius: 10,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    marginRight: 8,
  },

  infoText: {
    flex: 1,

    fontSize: 10.5,

    lineHeight: 15,

    color: colors.brand,

    fontWeight: "600",
  },

  /* =======================================================
     ERROR
  ======================================================= */

  errorBox: {
    flexDirection: "row",

    alignItems: "flex-start",

    gap: 8,

    backgroundColor:
      colors.dangerLight,

    paddingHorizontal: 11,

    paddingVertical: 10,

    borderRadius: 13,

    marginBottom: 14,

    borderWidth: 1,

    borderColor:
      colors.dangerBorder,
  },

  errorIcon: {
    width: 24,
    height: 24,

    borderRadius: 8,

    backgroundColor:
      "rgba(255,255,255,0.55)",

    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    flex: 1,

    fontSize: 10.5,

    lineHeight: 15,

    color: colors.danger,

    fontWeight: "600",
  },

  /* =======================================================
     PASSWORD HINT
  ======================================================= */

  passwordHint: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    marginTop: -5,

    marginBottom: 14,
  },

  passwordHintText: {
    fontSize: 9.5,

    color: colors.slateSoft,

    fontWeight: "600",
  },

  /* =======================================================
     BUTTON
  ======================================================= */

  button: {
    height: 55,

    borderRadius: 16,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 9,

    paddingHorizontal: 15,

    ...shadow.brand,
  },

  buttonText: {
    color: "#FFFFFF",

    fontSize: 15.5,

    fontWeight: "800",
  },

  buttonIcon: {
    width: 27,
    height: 27,

    borderRadius: 14,

    backgroundColor:
      "rgba(255,255,255,0.15)",

    alignItems: "center",
    justifyContent: "center",
  },

  /* =======================================================
     CHANGE NUMBER
  ======================================================= */

  changeNumber: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    marginTop: 14,

    paddingVertical: 3,
  },

  changeNumberText: {
    fontSize: 10.5,

    color: colors.brand,

    fontWeight: "700",
  },

  /* =======================================================
     SECURITY FOOTER
  ======================================================= */

  securityFooter: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 5,

    marginTop: 17,

    paddingHorizontal: 10,
  },

  securityText: {
    fontSize: 9.5,

    color: colors.slateSoft,

    fontWeight: "600",

    textAlign: "center",
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    marginTop: 10,

    marginBottom: spacing.lg,

    flexWrap: "wrap",
  },

  footerText: {
    ...type.body,

    color: colors.slate,
  },

  footerLink: {
    ...type.bodyStrong,

    color: colors.brand,
  },
});