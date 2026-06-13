import { View } from "react-native";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "./themed-text";

/** The Lex & Co. brass "L" seal — the brand mark, drawn (no asset needed). */
export function Seal({ size = 96 }: { size?: number }) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(2, size * 0.03),
        borderColor: palette.brand,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.card,
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.78,
          height: size * 0.78,
          borderRadius: (size * 0.78) / 2,
          borderWidth: 1,
          borderColor: palette.brand,
          opacity: 0.5,
        }}
      />
      <ThemedText
        style={{
          fontFamily: Fonts.serif,
          fontSize: size * 0.5,
          fontStyle: "italic",
          color: palette.brand,
          lineHeight: size * 0.58,
        }}
      >
        L
      </ThemedText>
    </View>
  );
}
