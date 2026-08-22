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

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { GOOGLE_SIGNIN_ENABLED } from "../config/google";

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
   LOGIN SCREEN
========================================================= */

export default function LoginScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    login,
    requestOtp,
    loginWithOtp,
  } = useAuth();

  const [mode, setMode] =
    useState("password");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPass, setShowPass] =
    useState(false);

  const [otp, setOtp] =
    useState("");

  const [otpSent, setOtpSent] =
    useState(false);

  const [focused, setFocused] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
     SWITCH MODE
  ======================================================= */

  function switchMode(next) {
    setMode(next);
    setError("");
    setOtpSent(false);
    setOtp("");
    setFocused(null);
  }

  /* =======================================================
     PASSWORD LOGIN
  ======================================================= */

  async function handlePasswordLogin() {
    if (!phone || !password) {
      setError(
        "Enter your phone number and password"
      );
      return;
    }

    if (phone.length !== 10) {
      setError(
        "Enter a valid 10-digit mobile number"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(phone, password);
    } catch (err) {
      if (
        err.response?.data?.code ===
        "GOOGLE_ACCOUNT"
      ) {
        setError(
          err.response.data.message
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     SEND OTP
  ======================================================= */

  async function handleSendOtp() {
    if (phone.length !== 10) {
      setError(
        "Enter a valid 10-digit mobile number"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await requestOtp(phone);
      setOtpSent(true);
      setFocused("otp");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't send OTP"
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     RESEND OTP
  ======================================================= */

  async function handleResendOtp() {
    if (resending) return;

    setError("");
    setResending(true);

    try {
      await requestOtp(phone);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't resend OTP"
      );
    } finally {
      setResending(false);
    }
  }

  /* =======================================================
     OTP LOGIN
  ======================================================= */

  async function handleOtpLogin() {
    if (otp.length !== 6) {
      setError(
        "Enter the 6-digit code"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await loginWithOtp(
        phone,
        otp
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  const iconColor = (key) =>
    focused === key
      ? colors.brand
      : colors.slateSoft;

  const field = (key) => [
    styles.inputWrap,
    focused === key &&
      styles.inputWrapFocused,
  ];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop:
              Math.max(
                insets.top,
                16
              ) + spacing.md,

            paddingBottom:
              Math.max(
                insets.bottom,
                16
              ) + spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === "ios"
            ? "interactive"
            : "on-drag"
        }
        showsVerticalScrollIndicator={
          false
        }
        bounces={false}
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <View
          style={styles.brandWrap}
          pointerEvents="box-none"
        >
          <View
            style={styles.logoBox}
            pointerEvents="none"
          >
            <Image
              source={RANKVEER_LOGO}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text
            style={styles.brandTag}
          >
            Practice smarter. Score higher.
          </Text>
        </View>

        {/* =================================================
            LOGIN CARD
        ================================================= */}

        <View
          style={styles.card}
        >
          <Text
            style={styles.title}
          >
            Welcome back
          </Text>

          <Text
            style={styles.subtitle}
          >
            Sign in to continue your preparation
          </Text>

          {/* =================================================
              MODE TOGGLE
          ================================================= */}

          <View
            style={styles.modeToggle}
          >
            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === "password" &&
                  styles.modeTabActive,
              ]}
              onPress={() =>
                switchMode(
                  "password"
                )
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="lock-closed-outline"
                size={15}
                color={
                  mode === "password"
                    ? colors.brand
                    : colors.slate
                }
              />

              <Text
                style={[
                  styles.modeTabText,
                  mode ===
                    "password" &&
                    styles.modeTabTextActive,
                ]}
              >
                Password
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                mode === "otp" &&
                  styles.modeTabActive,
              ]}
              onPress={() =>
                switchMode("otp")
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={15}
                color={
                  mode === "otp"
                    ? colors.brand
                    : colors.slate
                }
              />

              <Text
                style={[
                  styles.modeTabText,
                  mode === "otp" &&
                    styles.modeTabTextActive,
                ]}
              >
                OTP
              </Text>
            </TouchableOpacity>
          </View>

          {/* =================================================
              PHONE
          ================================================= */}

          <Text
            style={styles.label}
          >
            Phone number
          </Text>

          <View
            style={field("phone")}
          >
            <Ionicons
              name="call-outline"
              size={18}
              color={iconColor(
                "phone"
              )}
            />

            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={
                colors.slateSoft
              }
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={10}
              editable={
                !(mode === "otp" && otpSent)
              }
              value={phone}
              onChangeText={(value) => {
                const clean =
                  value.replace(
                    /[^0-9]/g,
                    ""
                  );

                setPhone(clean);

                if (error) {
                  setError("");
                }
              }}
              onFocus={() =>
                setFocused("phone")
              }
              onBlur={() =>
                setFocused(null)
              }
              returnKeyType={
                mode === "password"
                  ? "next"
                  : "done"
              }
            />
          </View>

          {/* =================================================
              PASSWORD
          ================================================= */}

          {mode === "password" ? (
            <>
              <Text
                style={styles.label}
              >
                Password
              </Text>

              <View
                style={field("pass")}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={iconColor(
                    "pass"
                  )}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Your password"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  secureTextEntry={
                    !showPass
                  }
                  textContentType="password"
                  autoComplete="password"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);

                    if (error) {
                      setError("");
                    }
                  }}
                  onFocus={() =>
                    setFocused("pass")
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                  returnKeyType="done"
                  onSubmitEditing={
                    handlePasswordLogin
                  }
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPass(
                      (value) =>
                        !value
                    )
                  }
                  hitSlop={{
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10,
                  }}
                  activeOpacity={0.7}
                  style={
                    styles.eyeButton
                  }
                >
                  <Ionicons
                    name={
                      showPass
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={19}
                    color={
                      colors.slateSoft
                    }
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={
                  styles.forgotWrap
                }
                onPress={() =>
                  navigation.navigate(
                    "ForgotPassword"
                  )
                }
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.forgot
                  }
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </>
          ) : otpSent ? (
            /* =================================================
               OTP SENT
            ================================================= */
            <>
              <Text
                style={styles.label}
              >
                Verification code
              </Text>

              <View
                style={field("otp")}
              >
                <Ionicons
                  name="keypad-outline"
                  size={18}
                  color={iconColor(
                    "otp"
                  )}
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.otpInput,
                  ]}
                  placeholder="6-digit code"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={6}
                  value={otp}
                  onChangeText={(value) => {
                    const clean =
                      value.replace(
                        /[^0-9]/g,
                        ""
                      );

                    setOtp(clean);

                    if (error) {
                      setError("");
                    }
                  }}
                  onFocus={() =>
                    setFocused("otp")
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={
                    handleOtpLogin
                  }
                />
              </View>

              <View
                style={styles.otpInfo}
              >
                <View
                  style={
                    styles.otpInfoIcon
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={15}
                    color={
                      colors.brand
                    }
                  />
                </View>

                <Text
                  style={
                    styles.otpInfoText
                  }
                  numberOfLines={2}
                >
                  Verification code sent to{" "}
                  <Text
                    style={
                      styles.otpPhone
                    }
                  >
                    +91 {phone}
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                onPress={
                  handleResendOtp
                }
                disabled={resending}
                style={
                  styles.forgotWrap
                }
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.forgot
                  }
                >
                  {resending
                    ? "Sending..."
                    : "Resend code"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            /* =================================================
               OTP INITIAL
            ================================================= */
            <View
              style={styles.otpHint}
            >
              <View
                style={
                  styles.otpHintIcon
                }
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={
                    colors.brand
                  }
                />
              </View>

              <View
                style={
                  styles.otpHintCopy
                }
              >
                <Text
                  style={
                    styles.otpHintTitle
                  }
                >
                  Login with OTP
                </Text>

                <Text
                  style={
                    styles.otpHintText
                  }
                >
                  We'll send a 6-digit
                  verification code to
                  your mobile.
                </Text>
              </View>
            </View>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {error ? (
            <View
              style={styles.errorBox}
            >
              <View
                style={styles.errorIcon}
              >
                <Ionicons
                  name="alert-circle"
                  size={15}
                  color={
                    colors.danger
                  }
                />
              </View>

              <Text
                style={styles.errorText}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* =================================================
              MAIN BUTTON
          ================================================= */}

          <TouchableOpacity
            onPress={
              mode === "password"
                ? handlePasswordLogin
                : otpSent
                ? handleOtpLogin
                : handleSendOtp
            }
            disabled={loading}
            activeOpacity={0.86}
            style={styles.buttonTouchable}
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
                    {mode ===
                    "password"
                      ? "Sign In"
                      : otpSent
                      ? "Verify & Sign In"
                      : "Send OTP"}
                  </Text>

                  <View
                    style={
                      styles.buttonArrow
                    }
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={15}
                      color="#FFFFFF"
                    />
                  </View>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* =================================================
              GOOGLE
          ================================================= */}

          {GOOGLE_SIGNIN_ENABLED && (
            <>
              <View
                style={
                  styles.dividerRow
                }
              >
                <View
                  style={
                    styles.dividerLine
                  }
                />

                <View
                  style={
                    styles.dividerBadge
                  }
                >
                  <Text
                    style={
                      styles.dividerText
                    }
                  >
                    OR
                  </Text>
                </View>

                <View
                  style={
                    styles.dividerLine
                  }
                />
              </View>

              <View
                style={
                  styles.googleButtonWrap
                }
              >
                <GoogleSignInButton
                  label="Continue with Google"
                />
              </View>
            </>
          )}
        </View>

        {/* =================================================
            FOOTER
        ================================================= */}

        <View
          style={styles.footer}
        >
          <Text
            style={styles.footerText}
          >
            New here?{" "}
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                "Signup"
              )
            }
            activeOpacity={0.7}
          >
            <Text
              style={styles.footerLink}
            >
              Create an account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     GENERAL
  ======================================================= */

  keyboard: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    flexGrow: 1,

    backgroundColor: colors.bg,

    paddingHorizontal: spacing.lg,

    justifyContent: "center",

    zIndex: 10,
  },

  /* =======================================================
     BRAND
  ======================================================= */

  brandWrap: {
    alignItems: "center",

    marginBottom: spacing.xl,

    paddingHorizontal: 8,

    zIndex: 20,

    elevation: 20,
  },

  logoBox: {
    width: 190,
    height: 76,

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 7,

    overflow: "visible",

    zIndex: 20,
  },

  logoImage: {
    width: 180,
    height: 72,

    zIndex: 21,
  },

  brandTag: {
    ...type.small,

    color: colors.slate,

    marginTop: 1,

    textAlign: "center",

    fontWeight: "500",
  },

  /* =======================================================
     CARD
  ======================================================= */

  card: {
    backgroundColor: colors.surface,

    borderRadius: radius.xxl,

    padding: spacing.lg,

    borderWidth: 1,

    borderColor: colors.border,

    ...shadow.md,

    zIndex: 30,

    elevation: 10,
  },

  title: {
    ...type.h1,

    color: colors.ink,

    fontSize: 24,

    lineHeight: 30,

    letterSpacing: -0.5,
  },

  subtitle: {
    ...type.small,

    color: colors.slate,

    marginTop: 4,

    marginBottom: spacing.lg,

    lineHeight: 18,
  },

  /* =======================================================
     MODE TOGGLE
  ======================================================= */

  modeToggle: {
    flexDirection: "row",

    backgroundColor: colors.slateLight,

    borderRadius: radius.md,

    padding: 4,

    marginBottom: spacing.md,

    zIndex: 40,

    elevation: 5,
  },

  modeTab: {
    flex: 1,

    minHeight: 40,

    paddingVertical: 8,

    borderRadius: radius.sm,

    alignItems: "center",

    justifyContent: "center",

    flexDirection: "row",

    gap: 6,

    zIndex: 41,
  },

  modeTabActive: {
    backgroundColor: colors.surface,

    ...shadow.sm,
  },

  modeTabText: {
    ...type.small,

    fontWeight: "700",

    color: colors.slate,
  },

  modeTabTextActive: {
    color: colors.brand,
  },

  /* =======================================================
     INPUT
  ======================================================= */

  label: {
    ...type.tiny,

    fontWeight: "700",

    color: colors.inkSoft,

    marginBottom: 7,

    zIndex: 50,
  },

  inputWrap: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    backgroundColor: colors.bg,

    borderRadius: radius.md,

    paddingHorizontal: spacing.md,

    height: 54,

    marginBottom: spacing.md,

    borderWidth: 1.5,

    borderColor: colors.border,

    zIndex: 50,

    elevation: 2,
  },

  inputWrapFocused: {
    borderColor: colors.brand,

    backgroundColor: colors.brandTint,

    zIndex: 60,

    elevation: 4,
  },

  input: {
    flex: 1,

    minWidth: 0,

    height: "100%",

    fontSize: 15,

    color: colors.ink,

    fontWeight: "500",

    paddingVertical: 0,

    zIndex: 61,
  },

  otpInput: {
    letterSpacing: 6,

    fontWeight: "800",

    fontSize: 18,
  },

  eyeButton: {
    width: 34,

    height: 34,

    alignItems: "center",

    justifyContent: "center",

    zIndex: 70,

    elevation: 5,
  },

  /* =======================================================
     FORGOT
  ======================================================= */

  forgotWrap: {
    alignSelf: "flex-end",

    marginBottom: spacing.md,

    zIndex: 50,
  },

  forgot: {
    ...type.small,

    color: colors.brand,

    fontWeight: "700",
  },

  /* =======================================================
     OTP INFO
  ======================================================= */

  otpInfo: {
    flexDirection: "row",

    alignItems: "center",

    gap: 9,

    backgroundColor: colors.brandTint,

    borderWidth: 1,

    borderColor: colors.brandLight,

    borderRadius: radius.md,

    padding: 10,

    marginBottom: spacing.sm,

    zIndex: 40,
  },

  otpInfoIcon: {
    width: 31,

    height: 31,

    borderRadius: 10,

    backgroundColor: colors.surface,

    alignItems: "center",

    justifyContent: "center",
  },

  otpInfoText: {
    flex: 1,

    ...type.tiny,

    color: colors.slate,

    lineHeight: 16,

    fontWeight: "600",
  },

  otpPhone: {
    color: colors.brand,

    fontWeight: "800",
  },

  otpHint: {
    flexDirection: "row",

    alignItems: "center",

    gap: 10,

    backgroundColor: colors.brandTint,

    borderRadius: radius.md,

    borderWidth: 1,

    borderColor: colors.brandLight,

    padding: 11,

    marginBottom: spacing.md,

    zIndex: 40,
  },

  otpHintIcon: {
    width: 34,

    height: 34,

    borderRadius: 11,

    backgroundColor: colors.surface,

    alignItems: "center",

    justifyContent: "center",
  },

  otpHintCopy: {
    flex: 1,

    minWidth: 0,
  },

  otpHintTitle: {
    fontSize: 11.5,

    fontWeight: "800",

    color: colors.ink,

    marginBottom: 2,
  },

  otpHintText: {
    fontSize: 10.5,

    lineHeight: 15,

    color: colors.slate,
  },

  /* =======================================================
     ERROR
  ======================================================= */

  errorBox: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,

    backgroundColor: colors.dangerLight,

    padding: 10,

    borderRadius: radius.md,

    marginBottom: spacing.md,

    borderWidth: 1,

    borderColor: colors.dangerBorder,

    zIndex: 40,
  },

  errorIcon: {
    width: 25,

    height: 25,

    borderRadius: 8,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor:
      "rgba(255,255,255,0.55)",
  },

  errorText: {
    flex: 1,

    ...type.small,

    color: colors.danger,

    lineHeight: 17,
  },

  /* =======================================================
     BUTTON
  ======================================================= */

  buttonTouchable: {
    zIndex: 50,

    elevation: 4,
  },

  button: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 9,

    height: 54,

    borderRadius: radius.md,

    ...shadow.brand,
  },

  buttonText: {
    color: "#FFFFFF",

    fontSize: 15.5,

    fontWeight: "800",
  },

  buttonArrow: {
    width: 25,

    height: 25,

    borderRadius: 13,

    backgroundColor:
      "rgba(255,255,255,0.14)",

    alignItems: "center",

    justifyContent: "center",
  },

  /* =======================================================
     GOOGLE
  ======================================================= */

  googleButtonWrap: {
    zIndex: 50,

    elevation: 4,
  },

  /* =======================================================
     DIVIDER
  ======================================================= */

  dividerRow: {
    flexDirection: "row",

    alignItems: "center",

    gap: 9,

    marginVertical: spacing.md,

    zIndex: 40,
  },

  dividerLine: {
    flex: 1,

    height: 1,

    backgroundColor: colors.border,
  },

  dividerBadge: {
    paddingHorizontal: 5,
  },

  dividerText: {
    ...type.tiny,

    color: colors.slateSoft,

    fontWeight: "800",

    letterSpacing: 0.5,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    marginTop: spacing.lg,

    paddingBottom: 4,

    zIndex: 40,
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