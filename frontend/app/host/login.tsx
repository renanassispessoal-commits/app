import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, saveToken } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function HostLogin() {
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/host/login", { email, password });
      await saveToken(res.data.access_token);
      if (!res.data.host?.plan) {
        router.replace("/host/plans");
      } else {
        router.replace("/host/dashboard");
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.headerRow}>
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Anfitrião</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.content}>
          <View>
            <Text style={styles.brand}>TE ACHEI</Text>
            <Text style={styles.title}>Bem-vindo de{"\n"}volta.</Text>
            <Text style={styles.sub}>
              Acesse seu painel para criar salas e acompanhar seu rolê.
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
            />
            <Text style={styles.label}>Senha</Text>
            <TextInput
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
            />
            {error ? (
              <Text testID="error-text" style={styles.err}>
                {error}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: spacing.md }}>
            <Pressable
              testID="login-btn"
              onPress={submit}
              disabled={loading}
              style={[styles.cta, loading && { opacity: 0.5 }]}
            >
              <Text style={styles.ctaTxt}>
                {loading ? "Entrando..." : "Entrar"}
              </Text>
            </Pressable>
            <Pressable
              testID="register-btn"
              onPress={() => router.push("/host/register")}
            >
              <Text style={styles.linkTxt}>
                Não tem conta?{" "}
                <Text style={{ color: colors.brand, fontWeight: "600" }}>
                  Criar conta
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "600" },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: "space-between",
  },
  brand: {
    color: colors.brand,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontSize: 42,
    fontWeight: "300",
    letterSpacing: -1,
    lineHeight: 46,
  },
  sub: {
    color: colors.onSurfaceTertiary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
    maxWidth: 280,
  },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  err: { color: colors.error, fontSize: 13 },
  cta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  ctaTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkTxt: { color: colors.onSurfaceTertiary, textAlign: "center" },
});
