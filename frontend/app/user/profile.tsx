import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, saveParticipant } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

const INTEREST_OPTIONS = [
  "Música",
  "Dança",
  "Cerveja",
  "Drinks",
  "Funk",
  "Sertanejo",
  "Rock",
  "Eletrônica",
  "Cinema",
  "Esportes",
  "Viagem",
  "Arte",
];

export default function UserProfile() {
  const { code, roomName } = useLocalSearchParams<{
    code: string;
    roomName: string;
  }>();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!res.canceled && res.assets[0]?.base64) {
      setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
    }
  };

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const submit = async () => {
    setError("");
    if (!name || !age || !photo) {
      setError("Preencha nome, idade e foto.");
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setError("Idade deve ser entre 18 e 99.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/participants/join", {
        room_code: code,
        name,
        age: ageNum,
        bio,
        interests,
        photo,
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
      setError(e?.response?.data?.detail || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable
            testID="back-btn"
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <View>
            <Text style={styles.headerLabel}>VOCÊ ESTÁ EM</Text>
            <Text style={styles.headerTitle}>{roomName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Crie seu perfil para o rolê</Text>

          <View style={styles.photoSection}>
            <Pressable
              testID="photo-pick"
              onPress={pickFromGallery}
              style={styles.photoBox}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoImg} />
              ) : (
                <Ionicons name="image" size={32} color={colors.brand} />
              )}
            </Pressable>
            <View style={{ gap: spacing.sm, flex: 1 }}>
              <Pressable
                testID="photo-camera"
                onPress={takePhoto}
                style={styles.photoBtn}
              >
                <Ionicons
                  name="camera"
                  size={18}
                  color={colors.onSurface}
                />
                <Text style={styles.photoBtnText}>Tirar foto</Text>
              </Pressable>
              <Pressable
                testID="photo-gallery"
                onPress={pickFromGallery}
                style={styles.photoBtn}
              >
                <Ionicons name="images" size={18} color={colors.onSurface} />
                <Text style={styles.photoBtnText}>Galeria</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            testID="name-input"
            value={name}
            onChangeText={setName}
            placeholder="Como te chamam?"
            placeholderTextColor={colors.onSurfaceTertiary}
            style={styles.input}
          />

          <Text style={styles.label}>Idade</Text>
          <TextInput
            testID="age-input"
            value={age}
            onChangeText={setAge}
            placeholder="18+"
            placeholderTextColor={colors.onSurfaceTertiary}
            keyboardType="number-pad"
            maxLength={2}
            style={styles.input}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            testID="bio-input"
            value={bio}
            onChangeText={setBio}
            placeholder="Diga algo curto e interessante..."
            placeholderTextColor={colors.onSurfaceTertiary}
            multiline
            maxLength={140}
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          />

          <Text style={styles.label}>Interesses</Text>
          <View style={styles.chipRow}>
            {INTEREST_OPTIONS.map((i) => {
              const active = interests.includes(i);
              return (
                <Pressable
                  key={i}
                  testID={`interest-${i}`}
                  onPress={() => toggleInterest(i)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && { color: colors.onBrandPrimary },
                    ]}
                  >
                    {i}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <Text testID="error-text" style={styles.err}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            testID="submit-btn"
            onPress={submit}
            disabled={loading}
            style={[styles.cta, loading && { opacity: 0.6 }]}
          >
            <Text style={styles.ctaText}>
              {loading ? "Entrando..." : "Entrar na sala"}
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
  headerLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 2,
    textAlign: "center",
  },
  headerTitle: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  title: {
    color: colors.onSurface,
    fontSize: 28,
    fontWeight: "300",
    marginBottom: spacing.xl,
    letterSpacing: -0.5,
  },
  photoSection: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  photoBox: {
    width: 120,
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImg: { width: "100%", height: "100%" },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  photoBtnText: { color: colors.onSurface, fontWeight: "500" },
  label: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    fontSize: 16,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  chipText: { color: colors.onSurface, fontSize: 13, fontWeight: "500" },
  err: { color: colors.error, marginTop: spacing.md },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
