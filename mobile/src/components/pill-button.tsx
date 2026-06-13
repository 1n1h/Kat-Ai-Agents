import { GlassView } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "./themed-text";

type Variant = "primary" | "ink" | "outline" | "ghost" | "onDark" | "glass";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { minHeight: number; fontSize: number }> = {
  sm: { minHeight: 38, fontSize: 14 },
  md: { minHeight: 50, fontSize: 16 },
  lg: { minHeight: 58, fontSize: 17 },
};

export function PillButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  disabled,
  leadingIcon,
  trailingIcon,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}) {
  const { palette } = useTheme();
  const s = SIZES[size];

  const fill =
    variant === "primary"
      ? palette.brand
      : variant === "ink"
        ? palette.ink
        : variant === "onDark"
          ? "#FFFFFF"
          : variant === "glass"
            ? "rgba(255,255,255,0.18)"
            : variant === "outline"
              ? palette.bg
              : "transparent";

  const textColor =
    variant === "primary"
      ? "#FFFFFF"
      : variant === "ink"
        ? palette.inkInverse
        : variant === "onDark"
          ? "#0F1B26"
          : variant === "glass"
            ? "#FFFFFF"
            : variant === "ghost"
              ? palette.inkSoft
              : palette.ink;

  const base: ViewStyle = {
    minHeight: s.minHeight,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: fill,
    alignSelf: fullWidth ? "stretch" : "flex-start",
    opacity: disabled || loading ? 0.5 : 1,
    ...(variant === "outline"
      ? { borderWidth: 1.5, borderColor: palette.ink }
      : null),
    ...(variant === "glass"
      ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.30)", overflow: "hidden" }
      : null),
  };

  const Inner = (
    <View style={[base, { width: "100%" }]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {leadingIcon}
          <ThemedText
            variant="body"
            style={{ color: textColor, fontWeight: "700", fontSize: s.fontSize }}
          >
            {label}
          </ThemedText>
          {trailingIcon}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        { alignSelf: fullWidth ? "stretch" : "flex-start" },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {variant === "glass" ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor="rgba(255,255,255,0.08)"
          style={{ width: "100%", borderRadius: Radius.pill }}
        >
          {Inner}
        </GlassView>
      ) : (
        Inner
      )}
    </Pressable>
  );
}
