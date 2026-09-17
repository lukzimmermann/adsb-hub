import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api, ApiError } from "../api/client";
import {
  useAirports,
  useCreateAirport,
  useDeleteAirport,
  useRecalculateFlights,
  useUpdateAirport,
} from "../api/queries";
import type { AirportResponse, AirportWriteRequest } from "../api/types";
import { FileImportButton } from "../components/FileImportButton";
import { downloadJson, readJsonFile } from "../lib/download";
import { buttonDanger, buttonPrimary, buttonSecondary, card, input, mutedText, pageTitle } from "../ui";

const EMPTY_FORM: AirportWriteRequest = {
  name: "",
  latitude: 0,
  longitude: 0,
  icao_code: "",
  iata_code: "",
  country_code: "",
};

function toWriteRequest(form: AirportWriteRequest): AirportWriteRequest {
  return {
    name: form.name.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    icao_code: form.icao_code?.trim() || null,
    iata_code: form.iata_code?.trim() || null,
    country_code: form.country_code?.trim() || null,
  };
}

function AirportFields({
  form,
  onChange,
}: {
  form: AirportWriteRequest;
  onChange: (form: AirportWriteRequest) => void;
}) {
  const fieldClass = `py-1 text-sm ${input}`;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
      <input
        className={`col-span-2 sm:col-span-2 ${fieldClass}`}
        placeholder="Name"
        value={form.name}
        onChange={(event) => onChange({ ...form, name: event.target.value })}
        required
      />
      <input
        className={fieldClass}
        placeholder="ICAO"
        maxLength={4}
        value={form.icao_code ?? ""}
        onChange={(event) => onChange({ ...form, icao_code: event.target.value.toUpperCase() })}
      />
      <input
        className={fieldClass}
        placeholder="IATA"
        maxLength={3}
        value={form.iata_code ?? ""}
        onChange={(event) => onChange({ ...form, iata_code: event.target.value.toUpperCase() })}
      />
      <input
        className={fieldClass}
        placeholder="Land"
        maxLength={2}
        value={form.country_code ?? ""}
        onChange={(event) => onChange({ ...form, country_code: event.target.value.toUpperCase() })}
      />
      <input
        className={fieldClass}
        placeholder="Lat"
        type="number"
        step="any"
        value={form.latitude}
        onChange={(event) => onChange({ ...form, latitude: Number(event.target.value) })}
        required
      />
      <input
        className={`col-span-2 sm:col-span-1 ${fieldClass}`}
        placeholder="Lon"
        type="number"
        step="any"
        value={form.longitude}
        onChange={(event) => onChange({ ...form, longitude: Number(event.target.value) })}
        required
      />
    </div>
  );
}

function AirportRow({ airport }: { airport: AirportResponse }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<AirportWriteRequest>(airport);
  const [error, setError] = useState<string | null>(null);
  const updateAirport = useUpdateAirport();
  const deleteAirport = useDeleteAirport();

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await updateAirport.mutateAsync({ id: airport.id, airport: toWriteRequest(form) });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen");
    }
  }

  if (isEditing) {
    return (
      <li className="space-y-2 px-3 py-2">
        <form onSubmit={handleSave} className="space-y-2">
          <AirportFields form={form} onChange={setForm} />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateAirport.isPending}
              className={`px-3 py-1 text-sm ${buttonPrimary}`}
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(airport);
                setIsEditing(false);
              }}
              className={`px-3 py-1 text-sm ${buttonSecondary}`}
            >
              Abbrechen
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
      <div className="min-w-0">
        <span className="font-medium text-white">{airport.name}</span>
        <span className="ml-2 text-slate-400">
          {[airport.icao_code, airport.iata_code, airport.country_code].filter(Boolean).join(" · ")}
        </span>
        <span className="ml-2 text-xs text-slate-500">
          {airport.latitude.toFixed(4)}, {airport.longitude.toFixed(4)}
        </span>
      </div>
      <div className="flex shrink-0 gap-3">
        <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-white">
          Bearbeiten
        </button>
        <button onClick={() => deleteAirport.mutate(airport.id)} className={buttonDanger}>
          Löschen
        </button>
      </div>
    </li>
  );
}

interface ImportedAirport {
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  icao_code?: unknown;
  iata_code?: unknown;
  country_code?: unknown;
}

export function AirportsPage() {
  const { data: airports, isLoading } = useAirports();
  const createAirport = useCreateAirport();
  const recalculateFlights = useRecalculateFlights();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AirportWriteRequest>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createAirport.mutateAsync(toWriteRequest(form));
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erstellen fehlgeschlagen");
    }
  }

  function handleExport() {
    downloadJson("airports.json", airports ?? []);
  }

  async function handleImport(file: File) {
    setIsImporting(true);
    setImportStatus(null);
    try {
      const parsed = await readJsonFile(file);
      if (!Array.isArray(parsed)) {
        throw new Error("Erwartet eine JSON-Liste von Flugplätzen");
      }
      let imported = 0;
      let skipped = 0;
      for (const entry of parsed as ImportedAirport[]) {
        if (
          typeof entry.name !== "string" ||
          typeof entry.latitude !== "number" ||
          typeof entry.longitude !== "number"
        ) {
          skipped += 1;
          continue;
        }
        try {
          await api.post("/airports", {
            name: entry.name,
            latitude: entry.latitude,
            longitude: entry.longitude,
            icao_code: typeof entry.icao_code === "string" ? entry.icao_code : null,
            iata_code: typeof entry.iata_code === "string" ? entry.iata_code : null,
            country_code: typeof entry.country_code === "string" ? entry.country_code : null,
          });
          imported += 1;
        } catch {
          // duplicate ICAO code or similar — skip and keep going.
          skipped += 1;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["airports"] });
      setImportStatus(`${imported} Flugplätze importiert${skipped > 0 ? `, ${skipped} übersprungen` : ""}`);
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : "Import fehlgeschlagen");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className={pageTitle}>Flugplätze</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExport} className={`px-3 py-1.5 text-sm ${buttonSecondary}`}>
            Export
          </button>
          <FileImportButton label={isImporting ? "Importiere…" : "Import"} onFile={handleImport} />
          <button
            onClick={() => recalculateFlights.mutate()}
            disabled={recalculateFlights.isPending}
            className={`px-3 py-1.5 text-sm ${buttonSecondary}`}
          >
            {recalculateFlights.isPending ? "Berechne…" : "Flüge neu berechnen"}
          </button>
          {recalculateFlights.isSuccess && (
            <span className="text-xs text-emerald-400">
              {recalculateFlights.data.updated_flights} Flüge aktualisiert
            </span>
          )}
          {recalculateFlights.isError && <span className="text-xs text-rose-400">Fehlgeschlagen</span>}
        </div>
      </div>
      {importStatus && <p className={`text-sm ${mutedText}`}>{importStatus}</p>}
      <p className={`text-sm ${mutedText}`}>
        Flughäfen dienen dazu, Start-/Zielort eines Flugs automatisch zu erkennen. Nach dem
        Hinzufügen, Bearbeiten oder Löschen eines Flugplatzes lohnt sich ein Klick auf "Flüge neu
        berechnen", damit bereits abgeschlossene Flüge den aktuellen Stand widerspiegeln.
      </p>

      <form onSubmit={handleCreate} className={`space-y-2 p-3 ${card}`}>
        <h2 className="text-sm font-medium text-slate-300">Neuer Flugplatz</h2>
        <AirportFields form={form} onChange={setForm} />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button type="submit" disabled={createAirport.isPending} className={`px-4 py-1.5 text-sm ${buttonPrimary}`}>
          Hinzufügen
        </button>
      </form>

      {isLoading && <p className={mutedText}>Lädt…</p>}
      <ul className={`divide-y divide-white/5 ${card}`}>
        {airports?.map((airport) => (
          <AirportRow key={airport.id} airport={airport} />
        ))}
      </ul>
    </div>
  );
}
