import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "@/hooks/use-theme";

export default function WorkspaceTabsLayout() {
  const { palette } = useTheme();
  return (
    <NativeTabs
      backgroundColor={palette.bg}
      indicatorColor={palette.brandSoft}
      labelStyle={{ selected: { color: palette.brand } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="bubble.left.and.text.bubble.right.fill" />
        <NativeTabs.Trigger.Label>Assistant</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cases">
        <NativeTabs.Trigger.Icon sf="briefcase.fill" />
        <NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="documents">
        <NativeTabs.Trigger.Icon sf="doc.text.fill" />
        <NativeTabs.Trigger.Label>Docs</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="research">
        <NativeTabs.Trigger.Icon sf="books.vertical.fill" />
        <NativeTabs.Trigger.Label>Research</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
