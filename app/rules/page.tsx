import Link from "next/link";
import { InnerPage } from "@/game/components/ui/InnerPage";
import { RulesContent } from "@/game/components/rules/RulesContent";

export default function RulesPage() {
  return (
    <InnerPage backHref="/" backLabel="Accueil" title="Règles du jeu" wide>
      <RulesContent />

      <Link href="/play/create" className="btn-enroute-primary self-center">
        À toi de prendre la route
      </Link>
    </InnerPage>
  );
}
