import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

export type LocationResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: "denied" | "blocked" | "unavailable"; message: string };

/**
 * Request foreground location permission and fetch the current coordinates.
 * - "denied": user can still be asked again (canAskAgain = true)
 * - "blocked": user permanently denied; must open Settings
 * - "unavailable": failed to acquire fix (GPS off, timeout, etc.)
 */
export async function ensureLocation(): Promise<LocationResult> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) {
        return {
          ok: false,
          reason: "blocked",
          message:
            "Permissão de localização bloqueada. Abra as Configurações do app e libere a localização.",
        };
      }
      perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          return {
            ok: false,
            reason: "blocked",
            message:
              "Permissão de localização bloqueada. Abra as Configurações do app e libere a localização.",
          };
        }
        return {
          ok: false,
          reason: "denied",
          message: "Precisamos da sua localização para validar o rolê.",
        };
      }
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      ok: true,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch (e) {
    return {
      ok: false,
      reason: "unavailable",
      message:
        "Não foi possível obter sua localização. Verifique se o GPS está ligado.",
    };
  }
}

export function openAppSettings() {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  } else {
    Linking.openSettings();
  }
}
