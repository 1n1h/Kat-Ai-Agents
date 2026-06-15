import TextRecognition from "@react-native-ml-kit/text-recognition";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Seal } from "@/components/seal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useMatters } from "@/hooks/use-matters";
import { useTheme } from "@/hooks/use-theme";
import { extractDocument, streamChat, transcribeAudio } from "@/lib/api";
import { agentName } from "@/lib/agents";
import type { Msg } from "@/lib/store";

export default function Assistant() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { active, appendMessage, matters, activeId, setActive, createMatter, deleteMatter } =
    useMatters();
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [reading, setReading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const scrollRef = useRef<ScrollView>(null);

  // Track the keyboard so the composer sits flush on top of it (no gap),
  // and on the tab bar when it's down — same approach as the reference app.
  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", (e) =>
      setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardWillHide", () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Cases drawer (slides in from the left — mirrors the reference app).
  const DRAWER_W = Math.min(width * 0.82, 320);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const openDrawer = () => {
    Haptics.selectionAsync().catch(() => {});
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerX, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerX, { toValue: -DRAWER_W, duration: 200, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setDrawerOpen(false));
  };
  const switchCase = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setActive(id);
    closeDrawer();
  };
  const newCase = () => {
    Alert.prompt?.("New case", "Name this matter", (name?: string) => {
      const n = (name ?? "").trim();
      if (n) {
        createMatter(n);
        closeDrawer();
      }
    });
  };

  const messages = active?.messages ?? [];
  const empty = messages.length === 0 && !live;

  /** On-device OCR (ML Kit). Reads text from an image URI into the composer. */
  async function recognizeUri(uri: string) {
    setReading(true);
    setStatus("Reading document…");
    try {
      const result = await TextRecognition.recognize(uri);
      const text = (result?.text ?? "").trim();
      if (text) {
        setDraft((d) => (d ? `${d}\n\n${text}` : text));
      } else {
        Alert.alert("Nothing found", "I couldn't read any text from that image.");
      }
    } catch {
      Alert.alert("Couldn't read it", "Try a clearer, well-lit photo.");
    } finally {
      setReading(false);
      setStatus(null);
    }
  }

  async function scanCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera access needed", "Enable camera access in Settings to scan.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    const a = res.assets?.[0];
    if (!res.canceled && a?.uri) void recognizeUri(a.uri);
  }

  async function choosePhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    const a = res.assets?.[0];
    if (!res.canceled && a?.uri) void recognizeUri(a.uri);
  }

  async function chooseDocument() {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
      ],
      copyToCacheDirectory: true,
    });
    const a = res.assets?.[0];
    if (res.canceled || !a) return;
    setReading(true);
    setStatus("Reading document…");
    try {
      const text = await extractDocument(
        a.uri,
        a.name,
        a.mimeType || "application/octet-stream",
      );
      if (text) {
        setDraft((d) => (d ? `${d}\n\n${text}` : text));
      } else {
        Alert.alert("Nothing found", "I couldn't read any text from that file.");
      }
    } catch (e) {
      Alert.alert(
        "Couldn't read it",
        e instanceof Error ? e.message : "Try a PDF, Word doc, or text file.",
      );
    } finally {
      setReading(false);
      setStatus(null);
    }
  }

  function attach() {
    if (streaming || reading) return;
    Haptics.selectionAsync().catch(() => {});
    Alert.alert("Add a document", "Read a document into this matter.", [
      { text: "Scan with camera", onPress: () => void scanCamera() },
      { text: "Choose a photo", onPress: () => void choosePhoto() },
      { text: "Choose a file (PDF, Word)", onPress: () => void chooseDocument() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  /** Dictation: hold-free tap to start, tap again to stop and transcribe. */
  async function toggleMic() {
    if (streaming) return;
    if (recording) {
      setRecording(false);
      try {
        await recorder.stop();
      } catch {
        /* ignore */
      }
      const uri = recorder.uri;
      if (uri) await transcribeInto(uri);
      return;
    }
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Microphone access needed",
        "Enable microphone access in Settings to dictate.",
      );
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      Haptics.selectionAsync().catch(() => {});
    } catch {
      Alert.alert("Couldn't start recording", "Please try again.");
    }
  }

  async function transcribeInto(uri: string) {
    setTranscribing(true);
    setStatus("Transcribing…");
    try {
      const text = await transcribeAudio(uri);
      if (text) setDraft((d) => (d ? `${d} ${text}` : text));
      else Alert.alert("Nothing heard", "I couldn't make out any speech.");
    } catch (e) {
      Alert.alert(
        "Couldn't transcribe",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setTranscribing(false);
      setStatus(null);
    }
  }

  const send = async () => {
    const text = draft.trim();
    if (!text || !active || streaming) return;
    Haptics.selectionAsync().catch(() => {});
    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));
    appendMessage(active.id, userMsg);
    setDraft("");
    setLive("");
    setStatus(null);
    setStreaming(true);

    let acc = "";
    const docs: { name: string; content: string }[] = [];
    try {
      await streamChat(
        { messages: history, agentId: "auto", matterId: active.id, matterMemory: null },
        (ev) => {
          if ((ev.t === "delta" || ev.t === "text") && ev.text) {
            acc += (ev.t === "text" && acc ? "\n\n" : "") + ev.text;
            setLive(acc);
          } else if (ev.t === "status" && ev.text) {
            setStatus(ev.text);
          } else if (ev.t === "document" && ev.name && ev.text) {
            docs.push({ name: ev.name, content: ev.text });
          } else if (ev.t === "error" && ev.text) {
            acc += `${acc ? "\n\n" : ""}⚠️ ${ev.text}`;
          }
        },
      );
    } catch {
      acc += `${acc ? "\n\n" : ""}⚠️ Connection error.`;
    }
    appendMessage(active.id, {
      role: "assistant",
      content: acc || "No response produced.",
      agentId: "auto",
      ...(docs.length ? { docs } : {}),
    });
    setLive("");
    setStatus(null);
    setStreaming(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingBottom: kbHeight }}>
          {/* header: cases drawer · matter · new case */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: palette.divider,
            }}
          >
            <Pressable
              onPress={openDrawer}
              hitSlop={8}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.bgRaised,
                borderWidth: 1,
                borderColor: palette.divider,
              }}
            >
              <SymbolView name="line.3.horizontal" size={16} tintColor={palette.ink} />
            </Pressable>
            <ThemedText
              variant="eyebrow"
              tone="accent"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {active?.name ?? "—"} · Orchestrator
            </ThemedText>
            <Pressable
              onPress={newCase}
              hitSlop={8}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: palette.bgRaised,
                borderWidth: 1,
                borderColor: palette.divider,
              }}
            >
              <SymbolView name="square.and.pencil" size={15} tintColor={palette.brand} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              padding: Spacing.lg,
              gap: Spacing.md,
              flexGrow: 1,
            }}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
            keyboardDismissMode="interactive"
          >
            {empty ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: Spacing.lg,
                  paddingTop: Spacing.xxl,
                }}
              >
                <Seal size={72} />
                <ThemedText variant="title" style={{ textAlign: "center" }}>
                  Ask in plain language
                </ThemedText>
                <ThemedText
                  variant="body"
                  tone="soft"
                  style={{ textAlign: "center", maxWidth: 300 }}
                >
                  Draft a letter, flag risk clauses, check citations — the
                  orchestrator routes it and verifies the result.
                </ThemedText>
              </View>
            ) : (
              messages.map((m, i) => <Bubble key={i} msg={m} />)
            )}

            {streaming && (
              <View>
                {status ? (
                  <ThemedText
                    variant="eyebrow"
                    tone="muted"
                    style={{ marginBottom: 4 }}
                  >
                    {status}
                  </ThemedText>
                ) : null}
                {live ? (
                  <Bubble msg={{ role: "assistant", content: live, agentId: "auto" }} />
                ) : (
                  <ActivityIndicator color={palette.brand} />
                )}
              </View>
            )}
          </ScrollView>

          {/* composer — flush on the keyboard when open, on the tab bar when not */}
          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingTop: Spacing.sm,
              paddingBottom:
                kbHeight > 0
                  ? Spacing.xs
                  : Math.max(insets.bottom, Spacing.sm) + Spacing.xs,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                gap: 4,
                backgroundColor: palette.bgRaised,
                borderRadius: 26,
                borderWidth: 1,
                borderColor: palette.divider,
                paddingHorizontal: 6,
                paddingVertical: 6,
              }}
            >
              <Pressable
                onPress={attach}
                disabled={streaming || reading}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: palette.bg,
                  opacity: streaming || reading ? 0.5 : 1,
                }}
              >
                {reading ? (
                  <ActivityIndicator color={palette.brand} />
                ) : (
                  <SymbolView name="plus" size={18} tintColor={palette.inkSoft} />
                )}
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask Lex anything…"
                placeholderTextColor={palette.inkMuted}
                multiline
                style={{
                  flex: 1,
                  maxHeight: 120,
                  minHeight: 38,
                  color: palette.ink,
                  paddingHorizontal: 6,
                  paddingTop: 9,
                  paddingBottom: 9,
                  fontSize: 16,
                }}
              />
              {recording ? (
                <Pressable
                  onPress={() => void toggleMic()}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#c0392b",
                  }}
                >
                  <SymbolView name="stop.fill" size={15} tintColor="#FFFFFF" />
                </Pressable>
              ) : transcribing ? (
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.bg,
                  }}
                >
                  <ActivityIndicator color={palette.brand} />
                </View>
              ) : draft.trim() ? (
                <Pressable
                  onPress={send}
                  disabled={streaming}
                  style={({ pressed }) => [
                    {
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: streaming ? palette.bg : palette.brand,
                    },
                    pressed && { transform: [{ scale: 0.95 }] },
                  ]}
                >
                  <SymbolView
                    name="arrow.up"
                    size={18}
                    tintColor={streaming ? palette.inkMuted : "#FFFFFF"}
                  />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void toggleMic()}
                  disabled={streaming}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.bg,
                  }}
                >
                  <SymbolView name="mic.fill" size={17} tintColor={palette.inkSoft} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Cases drawer */}
      {drawerOpen && (
        <Animated.View
          style={{ position: "absolute", inset: 0, opacity: backdrop }}
          pointerEvents="auto"
        >
          <Pressable onPress={closeDrawer} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
        </Animated.View>
      )}
      <Animated.View
        pointerEvents={drawerOpen ? "auto" : "none"}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: DRAWER_W,
          backgroundColor: palette.card,
          borderRightWidth: 1,
          borderRightColor: palette.divider,
          transform: [{ translateX: drawerX }],
        }}
      >
        <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, paddingHorizontal: Spacing.md }}>
          <ThemedText variant="eyebrow" tone="accent" style={{ marginTop: Spacing.sm, marginBottom: Spacing.sm }}>
            Cases
          </ThemedText>
          <Pressable
            onPress={newCase}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: Spacing.sm,
              paddingVertical: 13,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: palette.divider,
              backgroundColor: palette.bgRaised,
            }}
          >
            <SymbolView name="plus" size={15} tintColor={palette.brand} />
            <ThemedText variant="body" style={{ fontWeight: "700", color: palette.brand }}>
              New case
            </ThemedText>
          </Pressable>
          <ScrollView style={{ marginTop: Spacing.md }} contentContainerStyle={{ gap: 2 }} showsVerticalScrollIndicator={false}>
            {matters.map((m) => {
              const isActive = m.id === activeId;
              return (
                <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: 4 }}>
                  <Pressable
                    onPress={() => switchCase(m.id)}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: Spacing.sm,
                      paddingHorizontal: Spacing.sm,
                      paddingVertical: 10,
                      borderRadius: Radius.md,
                      backgroundColor: isActive ? palette.brandSoft : "transparent",
                    }}
                  >
                    <SymbolView name="briefcase.fill" size={14} tintColor={isActive ? palette.brand : palette.inkMuted} />
                    <ThemedText variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: isActive ? "700" : "500" }}>
                      {m.name}
                    </ThemedText>
                  </Pressable>
                  {matters.length > 1 && (
                    <Pressable hitSlop={8} onPress={() => deleteMatter(m.id)}>
                      <SymbolView name="trash" size={14} tintColor={palette.inkMuted} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const { palette } = useTheme();
  const isUser = msg.role === "user";
  const [speaking, setSpeaking] = useState(false);

  const toggleSpeak = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    Speech.stop();
    setSpeaking(true);
    Speech.speak(msg.content, {
      rate: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <View style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <ThemedText variant="eyebrow" tone="accent">
            {agentName(msg.agentId ?? "auto")}
          </ThemedText>
          <Pressable onPress={toggleSpeak} hitSlop={8}>
            <SymbolView
              name={speaking ? "stop.circle.fill" : "speaker.wave.2.fill"}
              size={13}
              tintColor={speaking ? palette.brand : palette.inkMuted}
            />
          </Pressable>
        </View>
      )}
      <View
        style={{
          maxWidth: "92%",
          borderRadius: Radius.lg,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm + 2,
          backgroundColor: isUser ? palette.brandSoft : palette.card,
          borderWidth: isUser ? 0 : 1,
          borderColor: palette.divider,
        }}
      >
        <ThemedText
          variant="body"
          style={{ color: palette.ink, fontSize: isUser ? 16 : 15.5, lineHeight: 23 }}
        >
          {msg.content}
        </ThemedText>
        {msg.docs?.map((d) => (
          <View
            key={d.name}
            style={{
              marginTop: Spacing.sm,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: palette.divider,
              backgroundColor: palette.bgRaised,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <SymbolView name="doc.text.fill" size={15} tintColor={palette.brand} />
            <ThemedText variant="mono" style={{ fontSize: 12 }} numberOfLines={1}>
              {d.name}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}
