import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import {
  useAddRegistration,
  useCreateGroup,
  useDeleteGroup,
  useGroups,
  useRemoveRegistration,
} from "../api/queries";
import { api, ApiError } from "../api/client";
import type { GroupResponse } from "../api/types";
import { FileImportButton } from "../components/FileImportButton";
import { downloadJson, readJsonFile } from "../lib/download";
import { buttonDanger, buttonPrimary, buttonSecondary, card, input, mutedText, pageTitle } from "../ui";

function GroupCard({ group }: { group: GroupResponse }) {
  const [registration, setRegistration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const addRegistration = useAddRegistration(group.name);
  const removeRegistration = useRemoveRegistration(group.name);
  const deleteGroup = useDeleteGroup();

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await addRegistration.mutateAsync(registration.trim());
      setRegistration("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Hinzufügen fehlgeschlagen");
    }
  }

  return (
    <div className={`p-4 ${card}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">{group.name}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link to={`/?group=${encodeURIComponent(group.name)}`} className="text-slate-400 hover:text-white">
            Auf Karte
          </Link>
          <Link
            to={`/flights?group=${encodeURIComponent(group.name)}`}
            className="text-slate-400 hover:text-white"
          >
            Flüge
          </Link>
          <button onClick={() => deleteGroup.mutate(group.name)} className={buttonDanger}>
            Löschen
          </button>
        </div>
      </div>

      <ul className="mb-3 flex flex-wrap gap-2">
        {group.registrations.length === 0 && <li className={`text-sm ${mutedText}`}>Noch keine Registrierungen</li>}
        {group.registrations.map((registrationCode) => (
          <li
            key={registrationCode}
            className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-sm text-slate-200"
          >
            {registrationCode}
            <button
              onClick={() => removeRegistration.mutate(registrationCode)}
              className="text-slate-500 hover:text-rose-400"
              aria-label={`${registrationCode} entfernen`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          className={`flex-1 py-1.5 text-sm ${input}`}
          placeholder="Registrierung, z.B. HB-ABC"
          value={registration}
          onChange={(event) => setRegistration(event.target.value)}
          required
        />
        <button
          type="submit"
          disabled={addRegistration.isPending}
          className={`px-3 py-1.5 text-sm ${buttonPrimary}`}
        >
          Hinzufügen
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-rose-400">{error}</p>}
    </div>
  );
}

interface ImportedGroup {
  name?: unknown;
  registrations?: unknown;
}

export function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createGroup.mutateAsync(name.trim());
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erstellen fehlgeschlagen");
    }
  }

  function handleExport() {
    downloadJson("groups.json", groups ?? []);
  }

  async function handleImport(file: File) {
    setIsImporting(true);
    setImportStatus(null);
    try {
      const parsed = await readJsonFile(file);
      if (!Array.isArray(parsed)) {
        throw new Error("Erwartet eine JSON-Liste von Gruppen");
      }
      let imported = 0;
      let skipped = 0;
      for (const entry of parsed as ImportedGroup[]) {
        if (typeof entry.name !== "string" || entry.name.length === 0) {
          skipped += 1;
          continue;
        }
        const groupName = entry.name;
        try {
          await api.post("/groups", { name: groupName });
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 409)) {
            skipped += 1;
            continue;
          }
          // 409: group already exists — still (re-)apply its registrations below.
        }
        const registrations = Array.isArray(entry.registrations) ? entry.registrations : [];
        for (const registration of registrations) {
          if (typeof registration !== "string") continue;
          try {
            await api.post(`/groups/${encodeURIComponent(groupName)}/registrations`, { registration });
          } catch {
            // registration already present on the group — fine, skip silently.
          }
        }
        imported += 1;
      }
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setImportStatus(`${imported} Gruppen importiert${skipped > 0 ? `, ${skipped} übersprungen` : ""}`);
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Import fehlgeschlagen");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className={pageTitle}>Gruppen</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} className={`px-3 py-1.5 text-sm ${buttonSecondary}`}>
            Export
          </button>
          <FileImportButton label={isImporting ? "Importiere…" : "Import"} onFile={handleImport} />
        </div>
      </div>
      {importStatus && <p className={`text-sm ${mutedText}`}>{importStatus}</p>}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className={`flex-1 ${input}`}
          placeholder="Neue Gruppe (z.B. Meine Flotte)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          pattern="[a-zA-Z0-9 _-]+"
          required
        />
        <button type="submit" disabled={createGroup.isPending} className={buttonPrimary}>
          Erstellen
        </button>
      </form>
      {error && <p className="text-sm text-rose-400">{error}</p>}

      {isLoading && <p className={mutedText}>Lädt…</p>}
      {groups?.length === 0 && <p className={mutedText}>Noch keine Gruppen.</p>}

      <div className="space-y-3">
        {groups?.map((group) => (
          <GroupCard key={group.name} group={group} />
        ))}
      </div>
    </div>
  );
}
