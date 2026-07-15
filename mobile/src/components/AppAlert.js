import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, spacing, radius, type, shadow } from "../theme/theme";

// Drop-in replacement for React Native's Alert.alert - same call signature
// (title, message, buttons, options) - so existing call sites only need
// "Alert.alert(" swapped for "AppAlert.alert(" plus the import line.
// The native Alert.alert looks like a browser confirm() dialog; this looks
// like it belongs to the app.

const TYPE_META = {
  success: { icon: "checkmark-circle", grad: gradients.success },
  danger: { icon: "close-circle", grad: gradients.danger },
  warning: { icon: "alert-circle", grad: gradients.premium },
  info: { icon: "information-circle", grad: gradients.brand },
};

// Best-effort guess when the caller doesn't pass an explicit type - keeps
// the swap from Alert.alert nearly free (no need to touch every call site's
// wording), while still picking a sensible icon/color most of the time.
function inferType(title = "") {
  const t = title.toLowerCase();
  if (/(error|failed|fail|wrong|invalid|couldn.?t|not found|denied|locked)/.test(t)) return "danger";
  if (/(success|great|done|thanks|saved|updated|submitted|welcome|congrat)/.test(t)) return "success";
  if (/(leave|submit test|delete|remove|log out|confirm|sure|warning|premium|upgrade)/.test(t)) return "warning";
  return "info";
}

let showFn = null;

const AppAlert = {
  alert(title, message, buttons, options) {
    const type = options?.type || inferType(title);
    if (showFn) {
      showFn({ title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }], type });
    }
  },
};

export default AppAlert;

export function AppAlertHost() {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState(null);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    showFn = (payload) => {
      setContent(payload);
      setVisible(true);
    };
    return () => {
      showFn = null;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  function close(onPress) {
    Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setVisible(false);
      onPress?.();
    });
  }

  if (!content) return null;
  const meta = TYPE_META[content.type] || TYPE_META.info;
  const multiButton = content.buttons.length > 1;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => close()}>
      <TouchableWithoutFeedback onPress={() => {}}>
        <View style={styles.backdrop}>
          <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
            <LinearGradient colors={meta.grad} style={styles.iconWrap}>
              <Ionicons name={meta.icon} size={26} color="#fff" />
            </LinearGradient>

            {content.title ? <Text style={styles.title}>{content.title}</Text> : null}
            {content.message ? <Text style={styles.message}>{content.message}</Text> : null}

            <View style={[styles.buttonRow, !multiButton && styles.buttonRowSingle]}>
              {content.buttons.map((btn, idx) => {
                const isDestructive = btn.style === "destructive";
                const isCancel = btn.style === "cancel";
                const isPrimary = !isDestructive && !isCancel;

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => close(btn.onPress)}
                    style={multiButton ? { flex: 1 } : { width: "100%" }}
                  >
                    {isPrimary ? (
                      <LinearGradient colors={meta.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnPrimary}>
                        <Text style={styles.btnPrimaryText}>{btn.text}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.btnPlain, isDestructive && styles.btnDestructive]}>
                        <Text style={[styles.btnPlainText, isDestructive && styles.btnDestructiveText]}>{btn.text}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,41,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadow.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadow.brand,
  },
  title: { ...type.h2, color: colors.ink, textAlign: "center" },
  message: { ...type.body, color: colors.slate, textAlign: "center", marginTop: 8, lineHeight: 20 },

  buttonRow: { flexDirection: "row", gap: 10, marginTop: spacing.lg, width: "100%" },
  buttonRowSingle: { flexDirection: "column" },

  btnPrimary: {
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.brand,
  },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  btnPlain: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPlainText: { color: colors.inkSoft, fontSize: 15, fontWeight: "700" },
  btnDestructive: { backgroundColor: colors.dangerLight },
  btnDestructiveText: { color: colors.danger },
});