import { Link } from "react-router-dom";

import { useGroups } from "../api/queries";
import { GroupDashboardCard } from "../components/GroupDashboardCard";
import { mutedText, pageTitle } from "../ui";

export function DashboardPage() {
  const { data: groups, isLoading } = useGroups();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className={pageTitle}>Dashboard</h1>

      {isLoading && <p className={mutedText}>Lädt…</p>}
      {groups?.length === 0 && (
        <p className={mutedText}>
          Noch keine Gruppen.{" "}
          <Link to="/groups" className="text-indigo-300 hover:text-indigo-200">
            Gruppe erstellen
          </Link>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {groups?.map((group) => (
          <GroupDashboardCard key={group.name} group={group} />
        ))}
      </div>
    </div>
  );
}
