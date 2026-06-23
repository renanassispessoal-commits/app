import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { api, getUser, saveUser } from "@/src/api/client";
import { maskCpf, unmaskCpf, validCpf } from "@/src/utils/cpf";
import { colors, radius, spacing } from "@/src/theme";

const PURPLE = "#9D4EDD";
const PURPLE_DEEP = "#5A189A";

export default function UserAuth() {
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const u = await getUser();
      if (u?.id) router.replace("/user/join");
    })();
  }, []);

  const continueAction = async () => {
    setError("");
    if (!validCpf(cpf)) {
      setError("CPF inválido. Confira os dígitos.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/users/lookup", { cpf: unmaskCpf(cpf) });
      await saveUser(res.data);
      router.replace("/user/join");
    } catch (e: any) {
      if (e?.response?.status === 404) {
        router.push({
          pathname: "/user/signup",
          params: { cpf: unmaskCpf(cpf) },
        });
      } else {
        setError(e?.response?.data?.detail || "Erro ao verificar CPF");
      }
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
          <Text style={styles.headerTitle}>Entrar</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.content}>
          <View>
            <Text style={styles.brand}>TE ACHEI</Text>
            <Text style={styles.title}>Acesso com{"\n"}CPF.</Text>
            <Text style={styles.sub}>
              Seu CPF garante que cada perfil é único, +18 e seguro. Ele fica
              guardado e seu perfil é o mesmo em todos os rolês.
            </Text>
          </View>

          <View style={{ gap: spacing.md }}>
            <Text style={styles.label}>CPF</Text>
            <TextInput
              testID="cpf-input"
              value={cpf}
              onChangeText={(t) => setCpf(maskCpf(t))}
              placeholder="000.000.000-00"
              placeholderTextColor="#5C4870"
              keyboardType="number-pad"
              maxLength={14}
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
              testID="continue-btn"
              onPress={continueAction}
              disabled={loading || cpf.length < 14}
              style={[
                styles.cta,
                (loading || cpf.length < 14) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.ctaTxt}>
                {loading ? "Verificando..." : "Continuar"}
              </Text>
            </Pressable>
            <Text style={styles.footnote}>
              Ao continuar você confirma ter 18+ anos. Validação automática por
              algoritmo oficial.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050008" },
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
    backgroundColor: "rgba(60,9,108,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.3)",
  },
  headerTitle: { color: "#E0AAFF", fontSize: 16, fontWeight: "700" },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: "space-between",
  },
  brand: {
    color: PURPLE,
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
    color: "#CDB4DB",
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
    maxWidth: 320,
  },
  label: {
    color: "#CDB4DB",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(20,5,35,0.7)",
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderRadius: radius.md,
    fontSize: 18,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.4)",
  },
  err: { color: colors.error, fontSize: 13 },
  cta: {
    backgroundColor: PURPLE_DEEP,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.5)",
  },
  ctaTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footnote: {
    color: "#6B4E7A",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
