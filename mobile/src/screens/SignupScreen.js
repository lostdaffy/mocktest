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

import { useAuth } from "../context/AuthContext";

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
   EXAMS
========================================================= */

const EXAMS = [
  {
    code: "SSC_CGL",
    label: "SSC",
    icon: "school-outline",
  },
  {
    code: "UP_POLICE",
    label: "UP Police",
    icon: "shield-checkmark-outline",
  },
  {
    code: "RAILWAY",
    label: "Railway",
    icon: "train-outline",
  },
  {
    code: "BANKING",
    label: "Banking",
    icon: "card-outline",
  },
  {
    code: "CTET",
    label: "CTET",
    icon: "person-outline",
  },
];

/* =========================================================
   SIGNUP SCREEN
========================================================= */

export default function SignupScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    signup,
    sendSignupOtp,
  } = useAuth();

  const [step, setStep] = useState(1);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPass, setShowPass] =
    useState(false);

  const [referralCode, setReferralCode] =
    useState("");

  const [selectedExam, setSelectedExam] =
    useState("SSC_CGL");

  const [otp, setOtp] =
    useState("");

  const [focused, setFocused] =
    useState(null);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

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
     SEND SIGNUP OTP
  ======================================================= */

  async function handleSendOtp() {
    const cleanName =
      name.trim();

    const cleanPhone =
      phone.replace(/\D/g, "");

    const cleanEmail =
      email.trim();

    if (
      !cleanName ||
      !cleanPhone ||
      !password
    ) {
      setError(
        "Name, phone and password are required"
      );
      return;
    }

    if (
      cleanPhone.length !== 10
    ) {
      setError(
        "Enter a valid 10-digit mobile number"
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendSignupOtp(
        cleanPhone
      );

      setPhone(cleanPhone);
      setEmail(cleanEmail);
      setName(cleanName);

      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't send OTP. Please try again."
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
      await sendSignupOtp(phone);

      AppAlert.alert(
        "OTP resent",
        "A new verification code has been sent to your number."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Couldn't resend OTP. Please try again."
      );
    } finally {
      setResending(false);
    }
  }

  /* =======================================================
     VERIFY + CREATE ACCOUNT
  ======================================================= */

  async function handleVerifyAndSignup() {
    const cleanOtp =
      otp.replace(/\D/g, "");

    if (cleanOtp.length !== 6) {
      setError(
        "Enter the 6-digit code"
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signup(
        name.trim(),
        phone,
        password,
        [selectedExam],
        email.trim(),
        referralCode.trim(),
        cleanOtp
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Sign-up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     GO BACK TO DETAILS
  ======================================================= */

  function editDetails() {
    if (loading) return;

    setError("");
    setOtp("");
    setStep(1);
  }

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
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <View
          style={styles.brandWrap}
        >
          <View
            style={styles.logoBox}
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
          </View>

          <Text
            style={styles.brandTag}
          >
            Practice smarter. Score higher.
          </Text>
        </View>

        {/* =================================================
            TITLE
        ================================================= */}

        <View
          style={styles.headingWrap}
        >
          <Text
            style={styles.title}
          >
            {step === 1
              ? "Create your account"
              : "Verify your number"}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {step === 1
              ? "Free to start — no card needed"
              : `Code sent to +91 ${phone}`}
          </Text>
        </View>

        {/* =================================================
            CARD
        ================================================= */}

        <View
          style={styles.card}
        >
          {step === 1 ? (
            <>
              {/* NAME */}

              <Text
                style={styles.label}
              >
                Full name
              </Text>

              <View
                style={field("name")}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={iconColor(
                    "name"
                  )}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  value={name}
                  onChangeText={
                    setName
                  }
                  onFocus={() =>
                    setFocused(
                      "name"
                    )
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* PHONE */}

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
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(value) =>
                    setPhone(
                      value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  onFocus={() =>
                    setFocused(
                      "phone"
                    )
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                  returnKeyType="next"
                />
              </View>

              {/* EMAIL */}

              <Text
                style={styles.label}
              >
                Email{" "}
                <Text
                  style={
                    styles.optional
                  }
                >
                  · optional
                </Text>
              </Text>

              <View
                style={field("email")}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={iconColor(
                    "email"
                  )}
                />

                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={
                    setEmail
                  }
                  onFocus={() =>
                    setFocused(
                      "email"
                    )
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                  returnKeyType="next"
                />
              </View>

              {/* PASSWORD */}

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
                  placeholder="At least 6 characters"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  secureTextEntry={
                    !showPass
                  }
                  value={password}
                  onChangeText={
                    setPassword
                  }
                  onFocus={() =>
                    setFocused(
                      "pass"
                    )
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                  returnKeyType="done"
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowPass(
                      (value) =>
                        !value
                    )
                  }
                  hitSlop={10}
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

              {/* EXAM */}

              <Text
                style={styles.label}
              >
                Which exam are you preparing for?
              </Text>

              <View
                style={
                  styles.examGrid
                }
              >
                {EXAMS.map(
                  (exam) => {
                    const active =
                      selectedExam ===
                      exam.code;

                    return (
                      <TouchableOpacity
                        key={
                          exam.code
                        }
                        style={[
                          styles.examChip,
                          active &&
                            styles.examChipActive,
                        ]}
                        onPress={() => {
                          setSelectedExam(
                            exam.code
                          );
                          setError(
                            ""
                          );
                        }}
                        activeOpacity={
                          0.75
                        }
                      >
                        <Ionicons
                          name={
                            exam.icon
                          }
                          size={14}
                          color={
                            active
                              ? "#FFFFFF"
                              : colors.slate
                          }
                        />

                        <Text
                          style={[
                            styles.examChipText,
                            active &&
                              styles.examChipTextActive,
                          ]}
                        >
                          {
                            exam.label
                          }
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              {/* REFERRAL */}

              <Text
                style={styles.label}
              >
                Referral code{" "}
                <Text
                  style={
                    styles.optional
                  }
                >
                  · optional
                </Text>
              </Text>

              <View
                style={field("ref")}
              >
                <Ionicons
                  name="gift-outline"
                  size={18}
                  color={iconColor(
                    "ref"
                  )}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Friend's code"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={referralCode}
                  onChangeText={
                    setReferralCode
                  }
                  onFocus={() =>
                    setFocused(
                      "ref"
                    )
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                />
              </View>

              {/* ERROR */}

              <ErrorBox
                error={error}
              />

              {/* BUTTON */}

              <PrimaryButton
                loading={loading}
                text="Send OTP"
                icon="arrow-forward"
                onPress={
                  handleSendOtp
                }
              />
            </>
          ) : (
            <>
              {/* OTP INTRO */}

              <View
                style={
                  styles.cardIntro
                }
              >
                <View
                  style={
                    styles.cardIntroIcon
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={
                      colors.brand
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
                    Verify your number
                  </Text>

                  <Text
                    style={
                      styles.cardIntroText
                    }
                  >
                    Enter the 6-digit code
                    sent to your mobile.
                  </Text>
                </View>
              </View>

              {/* OTP */}

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
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={
                    colors.slateSoft
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(value) =>
                    setOtp(
                      value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  onFocus={() =>
                    setFocused(
                      "otp"
                    )
                  }
                  onBlur={() =>
                    setFocused(null)
                  }
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={
                    handleVerifyAndSignup
                  }
                />
              </View>

              {/* INFO */}

              <View
                style={
                  styles.hintBox
                }
              >
                <View
                  style={
                    styles.hintIcon
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={
                      colors.brand
                    }
                  />
                </View>

                <Text
                  style={
                    styles.hintText
                  }
                >
                  This confirms the number
                  is really yours before
                  your account is created.
                </Text>
              </View>

              {/* ERROR */}

              <ErrorBox
                error={error}
              />

              {/* VERIFY BUTTON */}

              <PrimaryButton
                loading={loading}
                text="Verify & Create Account"
                icon="checkmark"
                onPress={
                  handleVerifyAndSignup
                }
              />

              {/* FOOTER ACTIONS */}

              <View
                style={
                  styles.stepFooterRow
                }
              >
                <TouchableOpacity
                  onPress={
                    handleResendOtp
                  }
                  disabled={
                    resending
                  }
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      styles.resend
                    }
                  >
                    {resending
                      ? "Sending..."
                      : "Didn't get the code? Resend"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={
                    editDetails
                  }
                  disabled={loading}
                  hitSlop={8}
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      styles.editLink
                    }
                  >
                    Edit details
                  </Text>
                </TouchableOpacity>
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
            style={
              styles.footerText
            }
          >
            Already have an account?{" "}
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
    </KeyboardAvoidingView>
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
        style={
          styles.errorIcon
        }
      >
        <Ionicons
          name="alert-circle"
          size={15}
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
        style={[
          styles.button,
          loading &&
            styles.buttonLoading,
        ]}
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
                size={15}
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
     GENERAL
  ======================================================= */

  keyboard: {
    flex: 1,
    backgroundColor:
      colors.bg,
  },

  scroll: {
    flex: 1,
    backgroundColor:
      colors.bg,
  },

  container: {
    flexGrow: 1,
    backgroundColor:
      colors.bg,

    paddingHorizontal:
      spacing.lg,

    justifyContent:
      "center",
  },

  /* =======================================================
     BRAND
  ======================================================= */

  brandWrap: {
    alignItems:
      "center",

    marginBottom:
      spacing.md,

    paddingHorizontal: 10,
  },

  logoBox: {
    width: 190,
    height: 76,

    alignItems:
      "center",

    justifyContent:
      "center",

    marginBottom: 5,

    overflow:
      "visible",
  },

  logoImage: {
    width: 180,
    height: 72,
  },

  brandTag: {
    ...type.small,

    color:
      colors.slate,

    marginTop: 1,

    textAlign:
      "center",

    fontWeight:
      "500",
  },

  /* =======================================================
     HEADING
  ======================================================= */

  headingWrap: {
    alignItems:
      "center",

    marginBottom:
      spacing.lg,
  },

  title: {
    ...type.h1,

    color:
      colors.ink,

    fontSize: 25,

    lineHeight: 31,

    fontWeight:
      "800",

    letterSpacing:
      -0.5,

    textAlign:
      "center",
  },

  subtitle: {
    ...type.small,

    color:
      colors.slate,

    marginTop: 4,

    lineHeight: 18,

    textAlign:
      "center",

    maxWidth: 310,
  },

  /* =======================================================
     CARD
  ======================================================= */

  card: {
    backgroundColor:
      colors.surface,

    borderRadius:
      radius.xxl,

    padding:
      spacing.lg,

    borderWidth: 1,

    borderColor:
      colors.border,

    ...shadow.md,
  },

  /* =======================================================
     INTRO
  ======================================================= */

  cardIntro: {
    flexDirection:
      "row",

    alignItems:
      "center",

    marginBottom:
      spacing.lg,
  },

  cardIntroIcon: {
    width: 39,
    height: 39,

    borderRadius: 12,

    backgroundColor:
      colors.brandTint,

    alignItems:
      "center",

    justifyContent:
      "center",

    marginRight: 10,
  },

  cardIntroCopy: {
    flex: 1,

    minWidth: 0,
  },

  cardIntroTitle: {
    fontSize: 13,

    lineHeight: 17,

    fontWeight:
      "800",

    color:
      colors.ink,
  },

  cardIntroText: {
    fontSize: 10.5,

    lineHeight: 15,

    color:
      colors.slate,

    marginTop: 1,
  },

  /* =======================================================
     LABEL
  ======================================================= */

  label: {
    ...type.tiny,

    fontSize: 10,

    fontWeight:
      "800",

    color:
      colors.inkSoft,

    marginBottom: 7,
  },

  optional: {
    fontWeight:
      "500",

    color:
      colors.slateSoft,
  },

  /* =======================================================
     INPUT
  ======================================================= */

  inputWrap: {
    flexDirection:
      "row",

    alignItems:
      "center",

    gap: 9,

    backgroundColor:
      colors.bg,

    borderRadius: 14,

    paddingHorizontal: 13,

    height: 53,

    marginBottom: 14,

    borderWidth: 1.5,

    borderColor:
      colors.border,
  },

  inputWrapFocused: {
    borderColor:
      colors.brand,

    backgroundColor:
      colors.brandTint,
  },

  input: {
    flex: 1,

    minWidth: 0,

    fontSize: 14.5,

    color:
      colors.ink,

    fontWeight:
      "500",

    paddingVertical: 0,
  },

  countryCode: {
    fontSize: 13,

    fontWeight:
      "700",

    color:
      colors.inkSoft,
  },

  inputDivider: {
    width: 1,

    height: 21,

    backgroundColor:
      colors.border,
  },

  otpInput: {
    letterSpacing: 5,

    fontWeight:
      "800",

    fontSize: 17,
  },

  eyeButton: {
    width: 30,
    height: 30,

    alignItems:
      "center",

    justifyContent:
      "center",
  },

  /* =======================================================
     EXAMS
  ======================================================= */

  examGrid: {
    flexDirection:
      "row",

    flexWrap:
      "wrap",

    gap: 8,

    marginBottom:
      spacing.md,
  },

  examChip: {
    flexDirection:
      "row",

    alignItems:
      "center",

    gap: 5,

    paddingHorizontal: 12,

    paddingVertical: 9,

    borderRadius:
      radius.full,

    backgroundColor:
      colors.bg,

    borderWidth: 1.5,

    borderColor:
      colors.border,
  },

  examChipActive: {
    backgroundColor:
      colors.brand,

    borderColor:
      colors.brand,

    ...shadow.sm,
  },

  examChipText: {
    ...type.small,

    fontSize: 11,

    fontWeight:
      "700",

    color:
      colors.slate,
  },

  examChipTextActive: {
    color:
      "#FFFFFF",
  },

  /* =======================================================
     HINT
  ======================================================= */

  hintBox: {
    flexDirection:
      "row",

    alignItems:
      "center",

    backgroundColor:
      colors.brandTint,

    padding: 11,

    borderRadius: 13,

    marginBottom: 14,

    borderWidth: 1,

    borderColor:
      colors.brandLight,
  },

  hintIcon: {
    width: 27,
    height: 27,

    borderRadius: 8,

    backgroundColor:
      colors.surface,

    alignItems:
      "center",

    justifyContent:
      "center",

    marginRight: 8,
  },

  hintText: {
    flex: 1,

    fontSize: 10,

    lineHeight: 15,

    color:
      colors.brand,

    fontWeight:
      "600",
  },

  /* =======================================================
     ERROR
  ======================================================= */

  errorBox: {
    flexDirection:
      "row",

    alignItems:
      "flex-start",

    gap: 8,

    backgroundColor:
      colors.dangerLight,

    padding: 10,

    borderRadius: 12,

    marginBottom: 14,

    borderWidth: 1,

    borderColor:
      colors.dangerBorder,
  },

  errorIcon: {
    width: 24,
    height: 24,

    borderRadius: 8,

    alignItems:
      "center",

    justifyContent:
      "center",

    backgroundColor:
      "rgba(255,255,255,0.55)",
  },

  errorText: {
    flex: 1,

    ...type.small,

    fontSize: 10.5,

    lineHeight: 16,

    color:
      colors.danger,

    fontWeight:
      "600",
  },

  /* =======================================================
     BUTTON
  ======================================================= */

  button: {
    height: 54,

    borderRadius:
      radius.md,

    flexDirection:
      "row",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap: 9,

    paddingHorizontal: 15,

    ...shadow.brand,
  },

  buttonLoading: {
    opacity: 0.82,
  },

  buttonText: {
    color:
      "#FFFFFF",

    fontSize: 15,

    fontWeight:
      "800",

    letterSpacing:
      -0.1,
  },

  buttonIcon: {
    width: 25,
    height: 25,

    borderRadius: 13,

    backgroundColor:
      "rgba(255,255,255,0.15)",

    alignItems:
      "center",

    justifyContent:
      "center",
  },

  /* =======================================================
     STEP FOOTER
  ======================================================= */

  stepFooterRow: {
    flexDirection:
      "row",

    justifyContent:
      "space-between",

    alignItems:
      "center",

    marginTop:
      spacing.md,
  },

  resend: {
    ...type.small,

    fontSize: 10.5,

    color:
      colors.brand,

    fontWeight:
      "700",
  },

  editLink: {
    ...type.small,

    fontSize: 10.5,

    color:
      colors.slate,

    fontWeight:
      "600",
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    flexDirection:
      "row",

    justifyContent:
      "center",

    alignItems:
      "center",

    marginTop:
      spacing.lg,

    paddingBottom: 4,
  },

  footerText: {
    ...type.body,

    fontSize: 13,

    color:
      colors.slate,
  },

  footerLink: {
    ...type.bodyStrong,

    fontSize: 13,

    color:
      colors.brand,
  },
});