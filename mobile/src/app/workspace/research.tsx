import { SymbolView } from "expo-symbols";
import { EmptyCard, TabScaffold } from "@/components/tab-scaffold";
import { useTheme } from "@/hooks/use-theme";

export default function Research() {
  const { palette } = useTheme();
  return (
    <TabScaffold
      title="Research"
      subtitle="Case law and authority, grounded in real sources."
    >
      <EmptyCard
        icon={
          <SymbolView name="books.vertical.fill" size={30} tintColor={palette.brand} />
        }
        heading="Coming soon"
        body="Search CourtListener, regulations, and statutes right here. For now, ask the Assistant to look up authority for you."
      />
    </TabScaffold>
  );
}
