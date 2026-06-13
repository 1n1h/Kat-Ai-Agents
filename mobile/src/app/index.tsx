import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PillButton } from "@/components/pill-button";
import { Seal } from "@/components/seal";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function Welcome() {
  const { palette, scheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <LinearGradient
        colors={[palette.pastelStart, palette.pastelMid, palette.pastelEnd]}
        locations={[0, 0.55, 1]}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: scheme === "dark" ? 0.85 : 0.6,
        }}
        pointerEvents="none"
      />
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: Spacing.xl,
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: Spacing.lg,
            }}
          >
            <Seal size={120} />
            <ThemedText
              variant="display"
              style={{ letterSpacing: -1, textAlign: "center" }}
            >
              Lex & Co.
            </ThemedText>
            <ThemedText
              variant="body"
              tone="soft"
              style={{
                fontSize: 17,
                lineHeight: 24,
                maxWidth: 320,
                textAlign: "center",
              }}
            >
              AI case management.{"\n"}Drafted, cited, and verified.
            </ThemedText>
          </View>

          <View style={{ paddingBottom: Spacing.lg, gap: Spacing.md }}>
            <PillButton
              label="Open the workspace"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.replace("/workspace")}
              trailingIcon={
                <SymbolView name="arrow.right" size={16} tintColor="#FFFFFF" />
              }
            />
            <ThemedText
              variant="caption"
              tone="muted"
              style={{ textAlign: "center" }}
            >
              Privileged & confidential.
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
