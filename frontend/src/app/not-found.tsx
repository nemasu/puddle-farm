import { LadderPageLayout } from "../components/ladder/PageLayout";
import { NotFoundContent } from "../components/NotFoundContent";

export default function NotFound() {
  return (
    <LadderPageLayout section="missing">
      <NotFoundContent />
    </LadderPageLayout>
  );
}
