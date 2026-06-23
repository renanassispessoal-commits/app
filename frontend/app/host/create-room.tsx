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
import { api } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function CreateRoom() {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Dê um nome para sua sala");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/rooms", { name, description: desc });
      router.replace({ pathname: "/host/room", params: { id: res.data.id } });
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao criar sala");
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
          <Text style={styles.headerTitle}>Nova sala</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.content}>
          <View>
            <Text style={styles.title}>Crie a sala{"\n"}do seu rolê.</Text>
            <Text style={styles.sub}>
              Um QR Code único será gerado para os convidados entrarem.
            </Text>
            <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
              <Text style={styles.label}>Nome do rolê</Text>
              <TextInput
                testID="name-input"
                value={name}
                onChangeText={setName}
                placeholder="Festa da Beatriz"
                placeholderTextColor={colors.onSurfaceTertiary}
                style={styles.input}
              />
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                testID="desc-input"
                value={desc}
                onChangeText={setDesc}
                placeholder="Sábado, 21h, House do Marco"
                placeholderTextColor={colors.onSurfaceTertiary}
                multiline
                style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              />
              {error ? (
                <Text testID="error-text" style={styles.err}>
                  {error}
                </Text>
              ) : null}
            </View>
          </View>
          <Pressable
            testID="create-submit"
            onPress={submit}
            disabled={loading}
            style={[styles.cta, loading && { opacity: 0.5 }]}
          >
            <Text style={styles.ctaTxt}>
              {loading ? "Criando..." : "Criar sala"}
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
    paddingTop: spacing.lg,
    justifyContent: "space-between",
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.onSurface,
    fontSize: 38,
    fontWeight: "300",
    letterSpacing: -1,
    lineHeight: 42,
  },
  sub: { color: colors.onSurfaceTertiary, fontSize: 14, marginTop: spacing.md },
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
