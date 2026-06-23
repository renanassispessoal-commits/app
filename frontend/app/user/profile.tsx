// Deprecated screen — profile creation moved to /user/signup as part of CPF login flow.
// Kept as redirect for any cached route reference.
import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";

export default function ProfileRedirect() {
  useEffect(() => {
    router.replace("/user/auth");
  }, []);
  return <View />;
}
