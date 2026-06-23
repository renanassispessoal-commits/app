import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from "react-native-svg";
import { colors, radius, spacing } from "@/src/theme";
import { getToken } from "@/src/api/client";

const PURPLE = "#7B2CBF";
const PURPLE_DEEP = "#3C096C";

export default function Index() {
  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (t) router.replace("/host/dashboard");
    })();
  }, []);

  return (
    <View style={styles.container}>
      {/* Layered purple-on-black background */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient
              id="bgGlow"
              cx="50%"
              cy="35%"
              rx="70%"
              ry="55%"
              fx="50%"
              fy="35%"
            >
              <Stop offset="0%" stopColor={PURPLE} stopOpacity={0.45} />
              <Stop offset="55%" stopColor={PURPLE_DEEP} stopOpacity={0.25} />
              <Stop offset="100%" stopColor="#000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="#050008" />
          <Rect width="100%" height="100%" fill="url(#bgGlow)" />
        </Svg>
      </View>

      {/* subtle bottom shade for CTAs */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={styles.bottomShade}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Top brand mark */}
        <View style={styles.topBar} testID="brand-dot">
          <View style={styles.brandPill}>
            <View style={styles.brandDot} />
            <Text style={styles.brandLabel}>TE ACHEI · APP</Text>
          </View>
        </View>

        {/* Metallic Logo */}
        <View style={styles.logoBlock}>
          <Svg width="100%" height={220} viewBox="0 0 360 220">
            <Defs>
              {/* metallic silver-purple gradient */}
              <SvgLinearGradient
                id="metal"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0%" stopColor="#F4E4FF" stopOpacity={1} />
                <Stop offset="35%" stopColor="#C99CFF" stopOpacity={1} />
                <Stop offset="55%" stopColor="#6A1FB0" stopOpacity={1} />
                <Stop offset="80%" stopColor="#E8C6FF" stopOpacity={1} />
                <Stop offset="100%" stopColor="#9D4EDD" stopOpacity={1} />
              </SvgLinearGradient>
              <SvgLinearGradient
                id="stroke"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
                <Stop offset="100%" stopColor="#7B2CBF" stopOpacity={0.5} />
              </SvgLinearGradient>
            </Defs>

            {/* "TE" — top line */}
            <SvgText
              x="180"
              y="92"
              textAnchor="middle"
              fontSize="90"
              fontWeight="900"
              fontFamily="System"
              fill="#1A0030"
              opacity={0.9}
            >
              TE
            </SvgText>
            <SvgText
              x="180"
              y="90"
              textAnchor="middle"
              fontSize="90"
              fontWeight="900"
              fontFamily="System"
              fill="url(#metal)"
              stroke="url(#stroke)"
              strokeWidth={1.2}
            >
              TE
            </SvgText>

            {/* "ACHEI" — bottom line */}
            <SvgText
              x="180"
              y="172"
              textAnchor="middle"
              fontSize="76"
              fontWeight="900"
              fontFamily="System"
              fill="#1A0030"
              opacity={0.9}
              letterSpacing="2"
            >
              ACHEI
            </SvgText>
            <SvgText
              x="180"
              y="170"
              textAnchor="middle"
              fontSize="76"
              fontWeight="900"
              fontFamily="System"
              fill="url(#metal)"
              stroke="url(#stroke)"
              strokeWidth={1.2}
              letterSpacing="2"
            >
              <TSpan>ACHEI</TSpan>
            </SvgText>

            {/* tagline */}
            <SvgText
              x="180"
              y="208"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              letterSpacing="6"
              fontFamily="System"
              fill="#D8B4FE"
            >
              O ROLÊ COMEÇA AQUI
            </SvgText>
          </Svg>

          <Text style={styles.tagline}>
            Escaneie o QR Code da festa, encontre quem está perto e dê o
            primeiro passo.
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.ctaBlock}>
          <Pressable
            testID="cta-user"
            onPress={() => router.push("/user/auth")}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={["#9D4EDD", "#5A189A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.primaryBtnText}>Entrar como Usuário</Text>
          </Pressable>
          <Pressable
            testID="cta-host"
            onPress={() => router.push("/host/login")}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.secondaryBtnText}>Login Anfitrião</Text>
          </Pressable>
          <Text style={styles.footnote}>
            18+ · Use com responsabilidade
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050008" },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  topBar: { alignItems: "center" },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(157,78,221,0.45)",
    backgroundColor: "rgba(60,9,108,0.35)",
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C77DFF",
    shadowColor: "#C77DFF",
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  brandLabel: {
    color: "#E0AAFF",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
  },
  logoBlock: { alignItems: "center", gap: spacing.lg, marginTop: spacing.xl },
  tagline: {
    color: "#CDB4DB",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
    paddingHorizontal: spacing.lg,
  },
  ctaBlock: { gap: spacing.md },
  primaryBtn: {
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.5)",
    shadowColor: "#9D4EDD",
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "rgba(199,125,255,0.35)",
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: "center",
    backgroundColor: "rgba(20,5,35,0.7)",
  },
  secondaryBtnText: {
    color: "#E0AAFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  footnote: {
    color: "#6B4E7A",
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  // referenced colors fallback (kept to satisfy linter if colors imported elsewhere)
  _unused: { color: colors.onSurface },
});
