import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { DarkPalette, LightPalette, type Palette } from "@/constants/theme";

type Mode = "light" | "dark" | "system";
type Scheme = "light" | "dark";
const KEY = "@lex/theme-mode";

type Ctx = {
  mode: Mode;
  scheme: Scheme;
  palette: Palette;
  setMode: (m: Mode) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>("system");

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "system") setModeState(v);
    });
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  };

  const scheme: Scheme =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const palette = scheme === "dark" ? DarkPalette : LightPalette;

  return (
    <ThemeCtx.Provider value={{ mode, scheme, palette, setMode }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
