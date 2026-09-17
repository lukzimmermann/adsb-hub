import { useGroups } from "../api/queries";
import { input } from "../ui";

interface Props {
  value: string | null;
  onChange: (groupName: string | null) => void;
}

export function GroupSelect({ value, onChange }: Props) {
  const { data: groups } = useGroups();

  if (!groups || groups.length === 0) {
    return null;
  }

  return (
    <select
      className={`w-full py-1.5 text-sm ${input}`}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
    >
      <option value="" className="bg-slate-900 text-slate-100">
        Alle
      </option>
      {groups.map((group) => (
        <option key={group.name} value={group.name} className="bg-slate-900 text-slate-100">
          {group.name}
        </option>
      ))}
    </select>
  );
}
