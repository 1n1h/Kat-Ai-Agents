import { SymbolView } from "expo-symbols";
import { EmptyCard, TabScaffold } from "@/components/tab-scaffold";
import { useTheme } from "@/hooks/use-theme";

export default function Documents() {
  const { palette } = useTheme();
  return (
    <TabScaffold
      title="Documents"
      subtitle="Drafts, letters, and filings for your matters."
    >
      <EmptyCard
        icon={
          <SymbolView name="doc.text.fill" size={30} tintColor={palette.brand} />
        }
        heading="Coming soon"
        body="Generated drafts and uploaded files will live here, organized by case. For now, attach a document in the Assistant tab to have Lex read it."
      />
    </TabScaffold>
  );
}
