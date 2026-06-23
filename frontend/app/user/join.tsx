import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
import {
  api,
  clearUser,
  getUser,
  saveParticipant,
} from "@/src/api/client";
import { ensureLocation, openAppSettings } from "@/src/utils/location";
import { colors, radius, spacing } from "@/src/theme";

const PURPLE = "#9D4EDD";

export default function JoinRoom() {
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locBlocked, setLocBlocked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const u = await getUser();
      if (!u?.id) {
        router.replace("/user/auth");
        return;
      }
      setUser(u);
    })();
  }, []);

  const tryJoin = async (rawCode: string) => {
    setError("");
    setLoading(true);
    const c = rawCode.trim().toUpperCase();
    try {
      // require location BEFORE attempting join
      const loc = await ensureLocation();
      if (!loc.ok) {
        setError(loc.message);
        setLocBlocked(loc.reason === "blocked");
        scannedRef.current = false;
        return;
      }
      const res = await api.post("/participants/join", {
        room_code: c,
        user_id: user.id,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      await saveParticipant({
        ...res.data.participant,
        room: res.data.room,
      });
      router.replace({
        pathname: "/user/deck",
        params: {
          roomId: res.data.room.id,
          participantId: res.data.participant.id,
        },
      });
    } catch (e: any) {
      scannedRef.current = false;
      setError(e?.response?.data?.detail || "Não foi possível entrar");
    } finally {
      setLoading(false);
    }
  };

  const onScan = (result: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    tryJoin(result.data);
  };

  const logout = async () => {
    await clearUser();
    router.replace("/");
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
          <Pressable
            testID="logout-btn"
            onPress={logout}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={20} color="#E0AAFF" />
          </Pressable>
        </View>
        {user?.name ? (
          <Text style={styles.heyTxt}>Olá, {user.name.split(" ")[0]} 👋</Text>
        ) : null}
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
            <Ionicons name="qr-code-outline" size={64} color={PURPLE} />
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
        <View style={styles.locHint}>
          <Ionicons name="location" size={14} color={PURPLE} />
          <Text style={styles.locHintTxt}>
            Sua localização será usada para validar que você está no rolê.
          </Text>
        </View>
        <Text style={styles.cardTitle}>ou insira o código</Text>
        <View style={styles.codeRow}>
          <TextInput
            testID="code-input"
            placeholder="EX: A3F9X1"
            placeholderTextColor="#5C4870"
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
        {locBlocked && (
          <Pressable
            testID="open-settings"
            onPress={openAppSettings}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsTxt}>Abrir configurações</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050008" },
  headerSafe: { backgroundColor: "#050008", zIndex: 2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  heyTxt: {
    color: "#CDB4DB",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    fontSize: 13,
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
  cameraWrap: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden",
    margin: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.3)",
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
    color: "#CDB4DB",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 260,
  },
  permBtn: {
    marginTop: spacing.md,
    backgroundColor: "#5A189A",
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.5)",
  },
  permBtnText: { color: "#fff", fontWeight: "700" },
  scanFrame: {
    width: 220,
    height: 220,
    borderColor: PURPLE,
    borderWidth: 2,
    borderRadius: radius.md,
  },
  bottomCard: {
    backgroundColor: "rgba(20,5,35,0.95)",
    padding: spacing.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(157,78,221,0.3)",
  },
  locHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(60,9,108,0.4)",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  locHintTxt: { color: "#CDB4DB", fontSize: 12, flex: 1, lineHeight: 16 },
  cardTitle: {
    color: "#CDB4DB",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  codeRow: { flexDirection: "row", gap: spacing.sm },
  codeInput: {
    flex: 1,
    backgroundColor: "rgba(60,9,108,0.4)",
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    fontSize: 18,
    letterSpacing: 3,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.3)",
  },
  joinBtn: {
    backgroundColor: "#5A189A",
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.5)",
  },
  joinBtnText: { color: "#fff", fontWeight: "700" },
  errText: { color: colors.error, fontSize: 13 },
  settingsBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  settingsTxt: {
    color: PURPLE,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});
