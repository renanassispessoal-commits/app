import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
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

export default function JoinRoom() {
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const scannedRef = useRef(false);

  const tryJoin = async (rawCode: string) => {
    setError("");
    setLoading(true);
    try {
      const c = rawCode.trim().toUpperCase();
      const res = await api.get(`/rooms/by-code/${c}`);
      router.push({
        pathname: "/user/profile",
        params: { code: res.data.code, roomName: res.data.name },
      });
    } catch (e: any) {
      scannedRef.current = false;
      setError(e?.response?.data?.detail || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const onScan = (result: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    tryJoin(result.data);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.headerSafe} edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Entrar na sala</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <View style={styles.cameraWrap}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onScan}
          />
        ) : (
          <View style={styles.permissionBox}>
            <Ionicons name="qr-code-outline" size={64} color={colors.brand} />
            <Text style={styles.permTitle}>Use a câmera</Text>
            <Text style={styles.permSub}>
              Permita o acesso à câmera para ler o QR Code da festa.
            </Text>
            <Pressable
              testID="perm-btn"
              onPress={requestPermission}
              style={styles.permBtn}
            >
              <Text style={styles.permBtnText}>Permitir câmera</Text>
            </Pressable>
          </View>
        )}
        {permission?.granted && (
          <View pointerEvents="none" style={styles.scanFrame} />
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.bottomCard}
      >
        <Text style={styles.cardTitle}>ou insira o código</Text>
        <View style={styles.codeRow}>
          <TextInput
            testID="code-input"
            placeholder="EX: A3F9X1"
            placeholderTextColor={colors.onSurfaceTertiary}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            style={styles.codeInput}
          />
          <Pressable
            testID="join-btn"
            onPress={() => tryJoin(code)}
            disabled={code.length < 4 || loading}
            style={[
              styles.joinBtn,
              (code.length < 4 || loading) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.joinBtnText}>
              {loading ? "..." : "Entrar"}
            </Text>
          </Pressable>
        </View>
        {error ? (
          <Text testID="error-text" style={styles.errText}>
            {error}
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerSafe: { backgroundColor: colors.surface, zIndex: 2 },
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
  headerTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "600" },
  cameraWrap: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
    margin: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  permTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "600" },
  permSub: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
  },
  permBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  permBtnText: { color: "#fff", fontWeight: "600" },
  scanFrame: {
    width: 220,
    height: 220,
    borderColor: colors.brand,
    borderWidth: 2,
    borderRadius: radius.md,
  },
  bottomCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  codeRow: { flexDirection: "row", gap: spacing.sm },
  codeInput: {
    flex: 1,
    backgroundColor: colors.surfaceTertiary,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    fontSize: 18,
    letterSpacing: 3,
    fontWeight: "600",
  },
  joinBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    justifyContent: "center",
  },
  joinBtnText: { color: "#fff", fontWeight: "700" },
  errText: { color: colors.error, fontSize: 13 },
});
