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

export default function HostRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (password.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/host/register", { name, email, password });
      await saveToken(res.data.access_token);
      router.replace("/host/dashboard");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro no cadastro");
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
          <Text style={styles.headerTitle}>Criar conta</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Anfitrião do rolê.</Text>
          <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              testID="name-input"
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
            />
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="voce@email.com"
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
            />
            <Text style={styles.label}>Senha</Text>
            <TextInput
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={colors.onSurfaceTertiary}
              style={styles.input}
            />
            {error ? (
              <Text testID="error-text" style={styles.err}>
                {error}
              </Text>
            ) : null}
          </View>
          <Pressable
            testID="register-submit"
            onPress={submit}
            disabled={loading || !name || !email || !password}
            style={[
              styles.cta,
              (loading || !name || !email || !password) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.ctaTxt}>
              {loading ? "Criando..." : "Criar conta"}
            </Text>
          </Pressable>
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
  title: {
    color: colors.onSurface,
    fontSize: 36,
    fontWeight: "300",
    letterSpacing: -1,
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
});
