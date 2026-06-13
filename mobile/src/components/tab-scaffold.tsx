import { type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "./themed-text";

export function TabScaffold({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.lg,
            paddingBottom: Spacing.xxl + 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText
            variant="display"
            style={{ fontSize: 34, lineHeight: 38, letterSpacing: -1 }}
          >
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText
              variant="body"
              tone="soft"
              style={{ fontSize: 15, marginTop: Spacing.xs }}
            >
              {subtitle}
            </ThemedText>
          ) : null}
          <View style={{ marginTop: Spacing.xl }}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Reusable empty/loading/error card. */
export function EmptyCard({
  icon,
  heading,
  body,
}: {
  icon?: ReactNode;
  heading: string;
  body?: string;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: palette.bgRaised,
        borderWidth: 1,
        borderColor: palette.divider,
        padding: Spacing.xl,
        alignItems: "center",
        gap: Spacing.md,
      }}
    >
      {icon}
      <ThemedText variant="heading" style={{ fontSize: 18, textAlign: "center" }}>
        {heading}
      </ThemedText>
      {body ? (
        <ThemedText
          variant="body"
          tone="soft"
          style={{ fontSize: 14, textAlign: "center", maxWidth: 280 }}
        >
          {body}
        </ThemedText>
      ) : null}
    </View>
  );
}
