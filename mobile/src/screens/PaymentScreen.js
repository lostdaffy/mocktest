import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { WebView } from "react-native-webview";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

// Builds the HTML page that loads Razorpay's Checkout.js and opens the
// payment modal. This runs inside a WebView, so no native linking/EAS
// build is needed - works directly in Expo Go.
function buildCheckoutHtml({ keyId, amount, orderId, description }) {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body style="margin:0;background:#F7F8FC;">
    <script>
      function postToApp(data) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
      var options = {
        key: "${keyId}",
        amount: "${amount * 100}",
        currency: "INR",
        name: "Smart Test Engine",
        description: "${description}",
        order_id: "${orderId}",
        handler: function (response) {
          postToApp({ status: "success", ...response });
        },
        modal: {
          ondismiss: function () {
            postToApp({ status: "cancelled" });
          },
        },
        theme: { color: "#1053F3" },
      };
      var rzp = new Razorpay(options);
      rzp.on("payment.failed", function (response) {
        postToApp({ status: "failed", error: response.error });
      });
      rzp.open();
    </script>
  </body>
</html>`;
}

export default function PaymentScreen({ route, navigation }) {
  const { plan, amount, label, credits = 0 } = route.params;
  const { refreshUser } = useAuth();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [useCredits, setUseCredits] = useState(credits > 0);
  const [showCheckout, setShowCheckout] = useState(false);
  const handledRef = useRef(false);

  async function createOrder() {
    setLoading(true);
    try {
      const res = await api.post("/payments/create-order", { plan, useCredits });
      setOrderData(res.data);
      setShowCheckout(true);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Couldn't create the order");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  async function handleMessage(event) {
    if (handledRef.current) return; // avoid double-processing
    let data;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (e) {
      return;
    }

    if (data.status === "success") {
      handledRef.current = true;
      setProcessing(true);
      try {
        await api.post("/payments/verify", {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          subscriptionId: orderData.subscriptionId,
        });

        // Refetch full user profile so subscription status is accurately reflected everywhere
        await refreshUser();

        Alert.alert("Payment successful", "Your subscription is now active", [
          { text: "OK", onPress: () => navigation.navigate("Home") },
        ]);
      } catch (err) {
        Alert.alert("Verification failed", "The payment went through but we couldn't verify it. Please contact support.");
        navigation.goBack();
      } finally {
        setProcessing(false);
      }
    } else if (data.status === "cancelled") {
      handledRef.current = true;
      navigation.goBack();
    } else if (data.status === "failed") {
      handledRef.current = true;
      Alert.alert("Payment failed", data.error?.description || "The payment didn't go through. Please try again.");
      navigation.goBack();
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Preparing your order…</Text>
      </View>
    );
  }

  if (processing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loadingText}>Payment verify ho raha hai...</Text>
      </View>
    );
  }

  // Step 1: Confirm screen - shows price, lets student toggle referral credits
  if (!showCheckout) {
    const maxDiscount = Math.min(credits, Math.floor(amount * 0.5));
    const discount = useCredits ? maxDiscount : 0;
    const payable = amount - discount;

    return (
      <View style={styles.confirmContainer}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmPlan}>{label}</Text>
          <View style={styles.priceLine}>
            <Text style={styles.priceLineLabel}>Plan price</Text>
            <Text style={styles.priceLineValue}>₹{amount}</Text>
          </View>

          {credits > 0 && (
            <TouchableOpacity style={styles.creditToggle} onPress={() => setUseCredits((v) => !v)}>
              <View style={[styles.checkbox, useCredits && styles.checkboxActive]}>
                {useCredits && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.creditToggleText}>
                Use ₹{maxDiscount} referral credit (up to 50% off)
              </Text>
            </TouchableOpacity>
          )}

          {discount > 0 && (
            <View style={styles.priceLine}>
              <Text style={[styles.priceLineLabel, { color: colors.success }]}>Credit discount</Text>
              <Text style={[styles.priceLineValue, { color: colors.success }]}>- ₹{discount}</Text>
            </View>
          )}

          <View style={styles.divider} />
          <View style={styles.priceLine}>
            <Text style={styles.totalLabel}>Payable</Text>
            <Text style={styles.totalValue}>₹{payable}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.payButton} onPress={createOrder}>
          <Text style={styles.payButtonText}>Pay ₹{payable}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Razorpay checkout WebView
  const html = buildCheckoutHtml({
    keyId: orderData.keyId,
    amount: orderData.finalAmount,
    orderId: orderData.orderId,
    description: `${label} Plan Subscription`,
  });

  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: spacing.md, color: colors.slate, fontSize: 13 },
  confirmContainer: { flex: 1, backgroundColor: colors.slateLight, padding: spacing.lg, justifyContent: "center" },
  confirmCard: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  confirmPlan: { fontSize: 18, fontWeight: "800", color: colors.ink, marginBottom: spacing.md },
  priceLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  priceLineLabel: { fontSize: 14, color: colors.slate },
  priceLineValue: { fontSize: 14, fontWeight: "600", color: colors.ink },
  creditToggle: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkmark: { color: "#fff", fontWeight: "800", fontSize: 13 },
  creditToggleText: { flex: 1, fontSize: 13, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalLabel: { fontSize: 16, fontWeight: "800", color: colors.ink },
  totalValue: { fontSize: 20, fontWeight: "800", color: colors.brand },
  payButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 15, alignItems: "center", marginTop: spacing.lg },
  payButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelText: { color: colors.slate, textAlign: "center", marginTop: spacing.md, fontWeight: "600" },
});