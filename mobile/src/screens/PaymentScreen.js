import {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import AppAlert from "../components/AppAlert";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";

import {
  colors,
  spacing,
  radius,
  type,
  shadow,
  gradients,
} from "../theme/theme";

import { LinearGradient } from "expo-linear-gradient";

/* =========================================================
   RAZORPAY CHECKOUT HTML
========================================================= */

function buildCheckoutHtml({
  keyId,
  amount,
  orderId,
  description,
}) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>

  <body
    style="
      margin:0;
      background:#F7F8FC;
    "
  >

    <script>
      function postToApp(data) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify(data)
        );
      }

      var options = {
        key: "${keyId}",
        amount: "${amount * 100}",
        currency: "INR",
        name: "Rankveer",
        description: "${description}",
        order_id: "${orderId}",

        handler: function (response) {
          postToApp({
            status: "success",
            ...response
          });
        },

        modal: {
          ondismiss: function () {
            postToApp({
              status: "cancelled"
            });
          },
        },

        theme: {
          color: "#1053F3"
        },
      };

      var rzp = new Razorpay(options);

      rzp.on(
        "payment.failed",
        function (response) {
          postToApp({
            status: "failed",
            error: response.error
          });
        }
      );

      rzp.open();
    </script>

  </body>
</html>
`;
}

/* =========================================================
   PAYMENT SCREEN
========================================================= */

export default function PaymentScreen({
  route,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    plan,
    amount,
    label,
    credits = 0,
  } = route.params;

  const { refreshUser } = useAuth();

  const [orderData, setOrderData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [useCredits, setUseCredits] =
    useState(credits > 0);

  const [showCheckout, setShowCheckout] =
    useState(false);

  const handledRef = useRef(false);

  /* =======================================================
     COUPON
  ======================================================= */

  const [couponInput, setCouponInput] =
    useState("");

  const [applyingCoupon, setApplyingCoupon] =
    useState(false);

  const [appliedCoupon, setAppliedCoupon] =
    useState(null);

  const [couponError, setCouponError] =
    useState("");

  /* =======================================================
     APPLY COUPON
  ======================================================= */

  async function handleApplyCoupon() {
    const code =
      couponInput.trim();

    if (!code) {
      setCouponError(
        "Enter a coupon code"
      );
      return;
    }

    setApplyingCoupon(true);
    setCouponError("");

    try {
      const res =
        await api.get(
          "/payments/validate-coupon",
          {
            params: {
              code,
              plan,
            },
          }
        );

      if (res.data.valid) {
        setAppliedCoupon({
          code:
            code.toUpperCase(),

          finalAmount:
            res.data.finalAmount,

          discount:
            res.data.discount,
        });

        // Coupon and referral credits cannot stack.
        setUseCredits(false);
      } else {
        setCouponError(
          res.data.message ||
            "Invalid coupon"
        );
      }
    } catch (err) {
      setCouponError(
        err.response?.data
          ?.message ||
          "Couldn't check coupon"
      );
    } finally {
      setApplyingCoupon(false);
    }
  }

  /* =======================================================
     REMOVE COUPON
  ======================================================= */

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  /* =======================================================
     CREATE ORDER
  ======================================================= */

  async function createOrder() {
    setLoading(true);

    try {
      const res =
        await api.post(
          "/payments/create-order",
          {
            plan,

            useCredits:
              !appliedCoupon &&
              useCredits,

            couponCode:
              appliedCoupon?.code,
          }
        );

      setOrderData(
        res.data
      );

      setShowCheckout(true);
    } catch (err) {
      AppAlert.alert(
        "Payment unavailable",
        err.response?.data
          ?.message ||
          "Couldn't create the order",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     PAYMENT MESSAGE
  ======================================================= */

  async function handleMessage(
    event
  ) {
    if (handledRef.current)
      return;

    let data;

    try {
      data = JSON.parse(
        event.nativeEvent.data
      );
    } catch (e) {
      return;
    }

    /* -------------------------------------------------------
       SUCCESS
    ------------------------------------------------------- */

    if (
      data.status ===
      "success"
    ) {
      handledRef.current =
        true;

      setProcessing(true);

      try {
        await api.post(
          "/payments/verify",
          {
            razorpay_order_id:
              data.razorpay_order_id,

            razorpay_payment_id:
              data.razorpay_payment_id,

            razorpay_signature:
              data.razorpay_signature,

            subscriptionId:
              orderData.subscriptionId,
          }
        );

        await refreshUser();

        AppAlert.alert(
          "Payment successful",
          "Your subscription is now active.",
          [
            {
              text: "Continue",
              onPress: () =>
                navigation.navigate(
                  "Home"
                ),
            },
          ]
        );
      } catch (err) {
        AppAlert.alert(
          "Verification failed",
          "The payment went through but we couldn't verify it. Please contact support.",
          [
            {
              text: "OK",
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } finally {
        setProcessing(false);
      }

      return;
    }

    /* -------------------------------------------------------
       CANCELLED
    ------------------------------------------------------- */

    if (
      data.status ===
      "cancelled"
    ) {
      handledRef.current =
        true;

      navigation.goBack();

      return;
    }

    /* -------------------------------------------------------
       FAILED
    ------------------------------------------------------- */

    if (
      data.status ===
      "failed"
    ) {
      handledRef.current =
        true;

      AppAlert.alert(
        "Payment failed",
        data.error
          ?.description ||
          "The payment didn't go through. Please try again.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.goBack(),
          },
        ]
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
          styles.centered,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={
            styles.loaderIcon
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={27}
            color={
              colors.brand
            }
          />
        </View>

        <ActivityIndicator
          size="small"
          color={
            colors.brand
          }
          style={
            styles.loaderSpinner
          }
        />

        <Text
          style={
            styles.loadingTitle
          }
        >
          Preparing payment
        </Text>

        <Text
          style={
            styles.loadingText
          }
        >
          Creating your secure
          payment order…
        </Text>
      </View>
    );
  }

  /* =======================================================
     PROCESSING
  ======================================================= */

  if (processing) {
    return (
      <View
        style={[
          styles.centered,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={
            styles.loaderIcon
          }
        >
          <Ionicons
            name="shield-checkmark"
            size={27}
            color={
              colors.success
            }
          />
        </View>

        <ActivityIndicator
          size="small"
          color={
            colors.brand
          }
          style={
            styles.loaderSpinner
          }
        />

        <Text
          style={
            styles.loadingTitle
          }
        >
          Verifying payment
        </Text>

        <Text
          style={
            styles.loadingText
          }
        >
          Please wait while we
          activate your subscription.
        </Text>
      </View>
    );
  }

  /* =======================================================
     CHECKOUT WEBVIEW
  ======================================================= */

  if (showCheckout) {
    const html =
      buildCheckoutHtml({
        keyId:
          orderData.keyId,

        amount:
          orderData.finalAmount,

        orderId:
          orderData.orderId,

        description:
          `${label} Plan Subscription`,
      });

    return (
      <View
        style={[
          styles.webViewContainer,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <WebView
          originWhitelist={[
            "*",
          ]}
          source={{
            html,
          }}
          onMessage={
            handleMessage
          }
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View
              style={
                styles.webLoader
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  colors.brand
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Opening secure
                checkout…
              </Text>
            </View>
          )}
        />
      </View>
    );
  }

  /* =======================================================
     PAYMENT SUMMARY
  ======================================================= */

  const creditDiscount =
    !appliedCoupon &&
    useCredits
      ? Math.min(
          credits,
          Math.floor(
            amount * 0.5
          )
        )
      : 0;

  const payable =
    appliedCoupon
      ? appliedCoupon.finalAmount
      : amount - creditDiscount;

  return (
    <KeyboardAvoidingView
      style={
        styles.confirmContainer
      }
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.confirmContent,
          {
            paddingTop:
              Math.max(
                insets.top,
                10
              ) + spacing.sm,

            paddingBottom:
              insets.bottom +
              spacing.xl,
          },
        ]}
      >
        {/* =================================================
            TOP HEADER
        ================================================= */}

        <View
          style={
            styles.topHeader
          }
        >
          <TouchableOpacity
            style={
              styles.backButton
            }
            onPress={() =>
              navigation.goBack()
            }
            activeOpacity={0.75}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-back"
              size={19}
              color={
                colors.ink
              }
            />
          </TouchableOpacity>

          <View
            style={
              styles.secureHeader
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={
                colors.success
              }
            />

            <Text
              style={
                styles.secureText
              }
            >
              Secure checkout
            </Text>
          </View>
        </View>

        {/* =================================================
            PAGE INTRO
        ================================================= */}

        <View
          style={
            styles.pageIntro
          }
        >
          <Text
            style={
              styles.pageTitle
            }
          >
            Complete your
            purchase
          </Text>

          <Text
            style={
              styles.pageSubtitle
            }
          >
            Review your plan and
            choose your payment
            options.
          </Text>
        </View>

        {/* =================================================
            PLAN CARD
        ================================================= */}

        <View
          style={
            styles.planCard
          }
        >
          <View
            style={
              styles.planTop
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
                styles.planIcon
              }
            >
              <Ionicons
                name="diamond-outline"
                size={21}
                color="#FFFFFF"
              />
            </LinearGradient>

            <View
              style={
                styles.planInfo
              }
            >
              <Text
                style={
                  styles.planEyebrow
                }
              >
                RANKVEER PLAN
              </Text>

              <Text
                style={
                  styles.confirmPlan
                }
                numberOfLines={2}
              >
                {label}
              </Text>
            </View>

            <View
              style={
                styles.planPrice
              }
            >
              <Text
                style={
                  styles.planPriceValue
                }
              >
                ₹{amount}
              </Text>

              <Text
                style={
                  styles.planPriceLabel
                }
              >
                plan price
              </Text>
            </View>
          </View>

          <View
            style={
              styles.planDivider
            }
          />

          <View
            style={
              styles.planBenefitRow
            }
          >
            <View
              style={
                styles.benefitItem
              }
            >
              <Ionicons
                name="flash-outline"
                size={14}
                color={
                  colors.brand
                }
              />

              <Text
                style={
                  styles.benefitText
                }
              >
                Instant access
              </Text>
            </View>

            <View
              style={
                styles.benefitItem
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={
                  colors.success
                }
              />

              <Text
                style={
                  styles.benefitText
                }
              >
                Secure payment
              </Text>
            </View>
          </View>
        </View>

        {/* =================================================
            COUPON
        ================================================= */}

        <View
          style={
            styles.sectionBlock
          }
        >
          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Have a coupon?
              </Text>

              <Text
                style={
                  styles.sectionHint
                }
              >
                Apply a code to save
                on your purchase.
              </Text>
            </View>

            <View
              style={
                styles.tagIcon
              }
            >
              <Ionicons
                name="pricetag-outline"
                size={15}
                color={
                  colors.brand
                }
              />
            </View>
          </View>

          {appliedCoupon ? (
            <View
              style={
                styles.couponApplied
              }
            >
              <View
                style={
                  styles.couponAppliedLeft
                }
              >
                <View
                  style={
                    styles.couponSuccessIcon
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={
                    styles.couponAppliedCopy
                  }
                >
                  <Text
                    style={
                      styles.couponAppliedCode
                    }
                  >
                    {appliedCoupon.code}
                  </Text>

                  <Text
                    style={
                      styles.couponSaved
                    }
                  >
                    ₹
                    {
                      appliedCoupon.discount
                    }{" "}
                    saved
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={
                  removeCoupon
                }
                style={
                  styles.removeButton
                }
                hitSlop={8}
              >
                <Text
                  style={
                    styles.removeText
                  }
                >
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View
                style={
                  styles.couponInputRow
                }
              >
                <View
                  style={
                    styles.couponInputWrap
                  }
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={17}
                    color={
                      colors.slateSoft
                    }
                  />

                  <TextInput
                    value={
                      couponInput
                    }
                    onChangeText={(
                      text
                    ) => {
                      setCouponInput(
                        text.toUpperCase()
                      );

                      setCouponError(
                        ""
                      );
                    }}
                    placeholder="Enter coupon code"
                    placeholderTextColor={
                      colors.slateSoft
                    }
                    autoCapitalize="characters"
                    autoCorrect={
                      false
                    }
                    style={
                      styles.couponInput
                    }
                  />
                </View>

                <TouchableOpacity
                  onPress={
                    handleApplyCoupon
                  }
                  disabled={
                    applyingCoupon ||
                    !couponInput.trim()
                  }
                  activeOpacity={
                    0.8
                  }
                  style={[
                    styles.couponApplyButton,
                    (!couponInput.trim() ||
                      applyingCoupon) &&
                      styles.couponApplyDisabled,
                  ]}
                >
                  {applyingCoupon ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.brand
                      }
                    />
                  ) : (
                    <Text
                      style={
                        styles.couponApplyText
                      }
                    >
                      Apply
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {couponError ? (
                <View
                  style={
                    styles.couponErrorRow
                  }
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={14}
                    color={
                      colors.danger
                    }
                  />

                  <Text
                    style={
                      styles.couponError
                    }
                  >
                    {couponError}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* =================================================
            REFERRAL CREDITS
        ================================================= */}

        {credits > 0 &&
          !appliedCoupon && (
            <TouchableOpacity
              style={[
                styles.creditCard,
                useCredits &&
                  styles.creditCardActive,
              ]}
              onPress={() =>
                setUseCredits(
                  (value) =>
                    !value
                )
              }
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  useCredits &&
                    styles.checkboxActive,
                ]}
              >
                {useCredits && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#FFFFFF"
                  />
                )}
              </View>

              <View
                style={
                  styles.creditCopy
                }
              >
                <View
                  style={
                    styles.creditTitleRow
                  }
                >
                  <Text
                    style={
                      styles.creditTitle
                    }
                  >
                    Use referral credits
                  </Text>

                  <View
                    style={
                      styles.creditBadge
                    }
                  >
                    <Text
                      style={
                        styles.creditBadgeText
                      }
                    >
                      SAVE
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.creditDescription
                  }
                >
                  Use ₹
                  {Math.min(
                    credits,
                    Math.floor(
                      amount * 0.5
                    )
                  )}{" "}
                  credit and save
                  up to 50%.
                </Text>
              </View>

              <Ionicons
                name={
                  useCredits
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={
                  useCredits
                    ? colors.brand
                    : colors.slateSoft
                }
              />
            </TouchableOpacity>
          )}

        {/* =================================================
            ORDER SUMMARY
        ================================================= */}

        <View
          style={
            styles.summaryCard
          }
        >
          <View
            style={
              styles.summaryHeader
            }
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              Order summary
            </Text>

            <Ionicons
              name="receipt-outline"
              size={17}
              color={
                colors.slateSoft
              }
            />
          </View>

          <View
            style={
              styles.summaryLine
            }
          >
            <Text
              style={
                styles.summaryLabel
              }
            >
              Plan price
            </Text>

            <Text
              style={
                styles.summaryValue
              }
            >
              ₹{amount}
            </Text>
          </View>

          {creditDiscount > 0 && (
            <View
              style={
                styles.summaryLine
              }
            >
              <Text
                style={
                  styles.summaryDiscountLabel
                }
              >
                Referral credit
              </Text>

              <Text
                style={
                  styles.summaryDiscountValue
                }
              >
                - ₹{creditDiscount}
              </Text>
            </View>
          )}

          {appliedCoupon && (
            <View
              style={
                styles.summaryLine
              }
            >
              <Text
                style={
                  styles.summaryDiscountLabel
                }
              >
                Coupon (
                {
                  appliedCoupon.code
                }
                )
              </Text>

              <Text
                style={
                  styles.summaryDiscountValue
                }
              >
                - ₹
                {
                  appliedCoupon.discount
                }
              </Text>
            </View>
          )}

          <View
            style={
              styles.summaryDivider
            }
          />

          <View
            style={
              styles.totalRow
            }
          >
            <View>
              <Text
                style={
                  styles.totalLabel
                }
              >
                Total payable
              </Text>

              <Text
                style={
                  styles.totalHint
                }
              >
                Inclusive of selected
                discounts
              </Text>
            </View>

            <Text
              style={
                styles.totalValue
              }
            >
              ₹{payable}
            </Text>
          </View>
        </View>

        {/* =================================================
            PAY BUTTON
        ================================================= */}

        <TouchableOpacity
          onPress={
            createOrder
          }
          activeOpacity={0.88}
          style={
            styles.payButtonWrap
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
              styles.payButton
            }
          >
            <View
              style={
                styles.payButtonIcon
              }
            >
              <Ionicons
                name="lock-closed"
                size={13}
                color="#FFFFFF"
              />
            </View>

            <Text
              style={
                styles.payButtonText
              }
            >
              Pay ₹{payable}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* =================================================
            SECURITY NOTE
        ================================================= */}

        <View
          style={
            styles.securityNote
          }
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={
              colors.success
            }
          />

          <Text
            style={
              styles.securityText
            }
          >
            Your payment is securely
            processed by Razorpay.
          </Text>
        </View>

        {/* =================================================
            CANCEL
        ================================================= */}

        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          style={
            styles.cancelButton
          }
          activeOpacity={0.7}
        >
          <Text
            style={
              styles.cancelText
            }
          >
            Cancel and go back
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* =====================================================
       GLOBAL
    ===================================================== */

    centered: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        colors.bg,

      paddingHorizontal:
        spacing.xl,
    },

    loaderIcon: {
      width: 58,
      height: 58,

      borderRadius: 19,

      backgroundColor:
        colors.brandTint,

      borderWidth: 1,

      borderColor:
        colors.brandLight,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    loaderSpinner: {
      marginTop: 18,
    },

    loadingTitle: {
      marginTop: 12,

      fontSize: 16,

      lineHeight: 21,

      fontWeight:
        "800",

      color:
        colors.ink,

      textAlign:
        "center",
    },

    loadingText: {
      marginTop: 5,

      color:
        colors.slate,

      fontSize: 12.5,

      lineHeight: 18,

      textAlign:
        "center",
    },

    /* =====================================================
       CONFIRM CONTAINER
    ===================================================== */

    confirmContainer: {
      flex: 1,

      backgroundColor:
        colors.bg,
    },

    confirmContent: {
      paddingHorizontal:
        spacing.lg,
    },

    /* =====================================================
       TOP HEADER
    ===================================================== */

    topHeader: {
      minHeight: 44,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom:
        spacing.lg,
    },

    backButton: {
      width: 42,
      height: 42,

      borderRadius: 14,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      alignItems:
        "center",

      justifyContent:
        "center",

      ...shadow.sm,
    },

    secureHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      paddingHorizontal: 10,

      height: 31,

      borderRadius:
        radius.full,

      backgroundColor:
        colors.successLight,

      borderWidth: 1,

      borderColor:
        colors.successBorder,
    },

    secureText: {
      fontSize: 10,

      lineHeight: 13,

      fontWeight:
        "700",

      color:
        colors.success,
    },

    /* =====================================================
       INTRO
    ===================================================== */

    pageIntro: {
      marginBottom:
        spacing.lg,
    },

    pageTitle: {
      ...type.h1,

      fontSize: 26,

      lineHeight: 32,

      letterSpacing:
        -0.55,

      color:
        colors.ink,

      fontWeight:
        "800",
    },

    pageSubtitle: {
      marginTop: 5,

      maxWidth: 310,

      fontSize: 12.5,

      lineHeight: 19,

      color:
        colors.slate,
    },

    /* =====================================================
       PLAN CARD
    ===================================================== */

    planCard: {
      backgroundColor:
        colors.surface,

      borderRadius:
        radius.xl,

      padding: spacing.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      marginBottom:
        spacing.lg,

      ...shadow.md,
    },

    planTop: {
      flexDirection:
        "row",

      alignItems:
        "center",

      minWidth: 0,
    },

    planIcon: {
      width: 48,
      height: 48,

      borderRadius: 15,

      alignItems:
        "center",

      justifyContent:
        "center",

      ...shadow.brand,
    },

    planInfo: {
      flex: 1,

      minWidth: 0,

      marginLeft: 11,

      paddingRight: 8,
    },

    planEyebrow: {
      fontSize: 8.5,

      lineHeight: 12,

      fontWeight:
        "800",

      letterSpacing:
        0.8,

      color:
        colors.brand,

      marginBottom: 2,
    },

    confirmPlan: {
      fontSize: 15,

      lineHeight: 20,

      fontWeight:
        "800",

      color:
        colors.ink,
    },

    planPrice: {
      alignItems:
        "flex-end",

      minWidth: 70,
    },

    planPriceValue: {
      fontSize: 18,

      lineHeight: 23,

      fontWeight:
        "800",

      color:
        colors.ink,
    },

    planPriceLabel: {
      fontSize: 8.5,

      lineHeight: 12,

      color:
        colors.slateSoft,

      marginTop: 1,
    },

    planDivider: {
      height: 1,

      backgroundColor:
        colors.border,

      marginVertical:
        spacing.md,
    },

    planBenefitRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 15,

      flexWrap:
        "wrap",
    },

    benefitItem: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,
    },

    benefitText: {
      fontSize: 10,

      lineHeight: 14,

      fontWeight:
        "600",

      color:
        colors.slate,
    },

    /* =====================================================
       SECTION
    ===================================================== */

    sectionBlock: {
      marginBottom:
        spacing.lg,
    },

    sectionHeadingRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 9,
    },

    sectionTitle: {
      fontSize: 14,

      lineHeight: 19,

      fontWeight:
        "800",

      color:
        colors.ink,
    },

    sectionHint: {
      fontSize: 10,

      lineHeight: 14,

      color:
        colors.slateSoft,

      marginTop: 2,
    },

    tagIcon: {
      width: 34,
      height: 34,

      borderRadius: 11,

      backgroundColor:
        colors.brandTint,

      borderWidth: 1,

      borderColor:
        colors.brandLight,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    /* =====================================================
       COUPON
    ===================================================== */

    couponInputRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,
    },

    couponInputWrap: {
      flex: 1,

      height: 48,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      backgroundColor:
        colors.surface,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      paddingHorizontal: 12,
    },

    couponInput: {
      flex: 1,

      minWidth: 0,

      height: 46,

      color:
        colors.ink,

      fontSize: 13,

      fontWeight:
        "700",

      letterSpacing:
        0.7,

      paddingVertical: 0,
    },

    couponApplyButton: {
      height: 48,

      minWidth: 72,

      paddingHorizontal: 14,

      borderRadius:
        radius.md,

      backgroundColor:
        colors.brandTint,

      borderWidth: 1,

      borderColor:
        colors.brandLight,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    couponApplyDisabled: {
      opacity: 0.5,
    },

    couponApplyText: {
      color:
        colors.brand,

      fontSize: 12,

      fontWeight:
        "800",
    },

    couponErrorRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      marginTop: 7,
    },

    couponError: {
      flex: 1,

      fontSize: 10.5,

      lineHeight: 15,

      color:
        colors.danger,
    },

    couponApplied: {
      minHeight: 58,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      backgroundColor:
        colors.successLight,

      borderRadius:
        radius.md,

      borderWidth: 1,

      borderColor:
        colors.successBorder,

      paddingHorizontal: 12,

      paddingVertical: 9,
    },

    couponAppliedLeft: {
      flexDirection:
        "row",

      alignItems:
        "center",

      minWidth: 0,

      flex: 1,
    },

    couponSuccessIcon: {
      width: 28,
      height: 28,

      borderRadius: 9,

      backgroundColor:
        colors.success,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 9,
    },

    couponAppliedCopy: {
      minWidth: 0,
    },

    couponAppliedCode: {
      fontSize: 12,

      lineHeight: 16,

      fontWeight:
        "800",

      color:
        colors.success,

      letterSpacing:
        0.6,
    },

    couponSaved: {
      fontSize: 9.5,

      lineHeight: 13,

      color:
        colors.slate,

      marginTop: 1,

      fontWeight:
        "600",
    },

    removeButton: {
      paddingLeft: 12,

      paddingVertical: 5,
    },

    removeText: {
      fontSize: 10.5,

      fontWeight:
        "700",

      color:
        colors.slate,
    },

    /* =====================================================
       CREDIT CARD
    ===================================================== */

    creditCard: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        colors.surface,

      borderRadius:
        radius.lg,

      borderWidth: 1,

      borderColor:
        colors.border,

      padding: 13,

      marginBottom:
        spacing.lg,
    },

    creditCardActive: {
      backgroundColor:
        colors.brandTint,

      borderColor:
        colors.brandLight,
    },

    checkbox: {
      width: 24,
      height: 24,

      borderRadius: 7,

      borderWidth: 1.8,

      borderColor:
        colors.border,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 10,
    },

    checkboxActive: {
      backgroundColor:
        colors.brand,

      borderColor:
        colors.brand,
    },

    creditCopy: {
      flex: 1,

      minWidth: 0,

      marginRight: 8,
    },

    creditTitleRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,

      flexWrap:
        "wrap",
    },

    creditTitle: {
      fontSize: 12,

      lineHeight: 16,

      fontWeight:
        "800",

      color:
        colors.ink,
    },

    creditBadge: {
      paddingHorizontal: 5,

      paddingVertical: 2,

      borderRadius: 5,

      backgroundColor:
        colors.successLight,
    },

    creditBadgeText: {
      fontSize: 7,

      fontWeight:
        "900",

      letterSpacing:
        0.5,

      color:
        colors.success,
    },

    creditDescription: {
      fontSize: 9.5,

      lineHeight: 14,

      color:
        colors.slate,

      marginTop: 2,
    },

    /* =====================================================
       SUMMARY
    ===================================================== */

    summaryCard: {
      backgroundColor:
        colors.surface,

      borderRadius:
        radius.xl,

      padding: spacing.md,

      borderWidth: 1,

      borderColor:
        colors.border,

      marginBottom:
        spacing.md,

      ...shadow.sm,
    },

    summaryHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 8,
    },

    summaryTitle: {
      fontSize: 13,

      lineHeight: 18,

      fontWeight:
        "800",

      color:
        colors.ink,
    },

    summaryLine: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingVertical: 5,
    },

    summaryLabel: {
      fontSize: 11.5,

      lineHeight: 16,

      color:
        colors.slate,
    },

    summaryValue: {
      fontSize: 11.5,

      lineHeight: 16,

      fontWeight:
        "700",

      color:
        colors.ink,
    },

    summaryDiscountLabel: {
      flex: 1,

      fontSize: 11,

      lineHeight: 15,

      color:
        colors.success,

      paddingRight: 10,
    },

    summaryDiscountValue: {
      fontSize: 11,

      lineHeight: 15,

      fontWeight:
        "700",

      color:
        colors.success,
    },

    summaryDivider: {
      height: 1,

      backgroundColor:
        colors.border,

      marginVertical: 9,
    },

    totalRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    totalLabel: {
      fontSize: 14,

      lineHeight: 19,

      fontWeight:
        "800",

      color:
        colors.ink,
    },

    totalHint: {
      fontSize: 8.5,

      lineHeight: 12,

      color:
        colors.slateSoft,

      marginTop: 2,
    },

    totalValue: {
      fontSize: 23,

      lineHeight: 28,

      fontWeight:
        "900",

      color:
        colors.brand,

      letterSpacing:
        -0.3,
    },

    /* =====================================================
       PAY BUTTON
    ===================================================== */

    payButtonWrap: {
      borderRadius:
        radius.md,

      overflow:
        "hidden",

      ...shadow.brand,
    },

    payButton: {
      minHeight: 55,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 9,

      paddingHorizontal: 17,
    },

    payButtonIcon: {
      width: 23,
      height: 23,

      borderRadius: 8,

      backgroundColor:
        "rgba(255,255,255,0.16)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    payButtonText: {
      flex: 1,

      color:
        "#FFFFFF",

      fontSize: 15,

      fontWeight:
        "800",

      textAlign:
        "center",
    },

    /* =====================================================
       SECURITY
    ===================================================== */

    securityNote: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,

      marginTop: 11,

      paddingHorizontal: 10,
    },

    securityText: {
      fontSize: 9.5,

      lineHeight: 14,

      color:
        colors.slate,

      fontWeight:
        "500",

      textAlign:
        "center",
    },

    /* =====================================================
       CANCEL
    ===================================================== */

    cancelButton: {
      alignItems:
        "center",

      justifyContent:
        "center",

      minHeight: 40,

      marginTop: 3,
    },

    cancelText: {
      color:
        colors.slate,

      fontSize: 11,

      lineHeight: 15,

      fontWeight:
        "700",
    },

    /* =====================================================
       WEBVIEW
    ===================================================== */

    webViewContainer: {
      flex: 1,

      backgroundColor:
        colors.bg,
    },

    webLoader: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        colors.bg,
    },
  });