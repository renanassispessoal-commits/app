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
import { api, saveUser } from "@/src/api/client";
import {
  birthdateToISO,
  calcAge,
  maskBirthdate,
  maskCpf,
} from "@/src/utils/cpf";
import { colors, radius, spacing } from "@/src/theme";

const PURPLE = "#9D4EDD";
const PURPLE_DEEP = "#5A189A";

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

export default function UserSignup() {
  const { cpf } = useLocalSearchParams<{ cpf: string }>();
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
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
    if (!name.trim() || !photo) {
      setError("Preencha nome e foto.");
      return;
    }
    const iso = birthdateToISO(birthdate);
    if (!iso) {
      setError("Data de nascimento inválida (use DD/MM/AAAA).");
      return;
    }
    const age = calcAge(iso);
    if (age < 18) {
      setError(`Acesso permitido apenas a maiores de 18 anos (você tem ${age}).`);
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/users", {
        cpf,
        name: name.trim(),
        birthdate: iso,
        bio: bio.trim(),
        interests,
        photo,
      });
      await saveUser(res.data);
      router.replace("/user/join");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao criar perfil");
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
          >
            <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Crie seu perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Perfil único para todos os rolês</Text>

          <View style={styles.photoSection}>
            <Pressable
              testID="photo-pick"
              onPress={takePhoto}
              style={styles.photoBox}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoImg} />
              ) : (
                <Ionicons name="camera" size={32} color={"#C77DFF"} />
              )}
            </Pressable>
            <View style={{ gap: spacing.sm, flex: 1 }}>
              <Pressable
                testID="photo-camera"
                onPress={takePhoto}
                style={styles.photoBtn}
              >
                <Ionicons name="camera" size={18} color="#E0AAFF" />
                <Text style={styles.photoBtnText}>
                  {photo ? "Tirar nova foto" : "Tirar foto agora"}
                </Text>
              </Pressable>
              <View style={styles.noGalleryNote}>
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={"#C77DFF"}
                />
                <Text style={styles.noGalleryTxt}>
                  Sem galeria: a foto precisa ser tirada agora pra garantir
                  perfil real, sem fakes.
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            testID="name-input"
            value={name}
            onChangeText={setName}
            placeholder="Como te chamam?"
            placeholderTextColor="#5C4870"
            style={styles.input}
          />

          <Text style={styles.label}>Data de nascimento</Text>
          <TextInput
            testID="birthdate-input"
            value={birthdate}
            onChangeText={(t) => setBirthdate(maskBirthdate(t))}
            placeholder="DD/MM/AAAA"
            placeholderTextColor="#5C4870"
            keyboardType="number-pad"
            maxLength={10}
            style={styles.input}
          />

          <Text style={styles.label}>CPF (guardado)</Text>
          <TextInput
            testID="cpf-readonly"
            editable={false}
            value={cpf ? maskCpf(cpf) : ""}
            style={[styles.input, { opacity: 0.7 }]}
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            testID="bio-input"
            value={bio}
            onChangeText={setBio}
            placeholder="Diga algo curto e interessante..."
            placeholderTextColor="#5C4870"
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
                      active && { color: "#fff", fontWeight: "700" },
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
            style={[styles.cta, loading && { opacity: 0.5 }]}
          >
            <Text style={styles.ctaText}>
              {loading ? "Criando..." : "Criar perfil"}
            </Text>
          </Pressable>
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
  title: {
    color: colors.onSurface,
    fontSize: 24,
    fontWeight: "300",
    marginBottom: spacing.xl,
    letterSpacing: -0.3,
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
    backgroundColor: "rgba(20,5,35,0.6)",
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.4)",
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
    backgroundColor: "rgba(60,9,108,0.4)",
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.3)",
  },
  photoBtnText: { color: "#E0AAFF", fontWeight: "600" },
  noGalleryNote: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: "rgba(157,78,221,0.1)",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.3)",
  },
  noGalleryTxt: {
    color: "#CDB4DB",
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  label: {
    color: "#CDB4DB",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: "rgba(20,5,35,0.7)",
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.3)",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,5,35,0.6)",
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.3)",
  },
  chipActive: {
    backgroundColor: PURPLE_DEEP,
    borderColor: PURPLE,
  },
  chipText: { color: "#E0AAFF", fontSize: 13, fontWeight: "500" },
  err: { color: colors.error, marginTop: spacing.md, fontSize: 13 },
  footer: {
    padding: spacing.lg,
    backgroundColor: "#050008",
    borderTopWidth: 1,
    borderTopColor: "rgba(157,78,221,0.2)",
  },
  cta: {
    backgroundColor: PURPLE_DEEP,
    paddingVertical: 18,
    borderRadius: radius.pill,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.5)",
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
