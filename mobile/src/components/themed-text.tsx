import { Text, type TextProps } from "react-native";
import { Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Variant = keyof typeof Typography;
type Tone = "default" | "muted" | "accent" | "soft" | "inverse";

export function ThemedText({
  variant = "body",
  tone = "default",
  style,
  ...props
}: TextProps & { variant?: Variant; tone?: Tone }) {
  const { palette } = useTheme();
  const color =
    tone === "muted"
      ? palette.inkMuted
      : tone === "soft"
        ? palette.inkSoft
        : tone === "accent"
          ? palette.brand
          : tone === "inverse"
            ? palette.inkInverse
            : palette.ink;
  return <Text style={[Typography[variant], { color }, style]} {...props} />;
}
