import { useRef, type ChangeEvent } from "react";

import { buttonSecondary } from "../ui";

interface Props {
  label?: string;
  onFile: (file: File) => void;
}

// A visible, styled button that triggers a hidden native file input —
// <input type="file"> can't be restyled directly across browsers.
export function FileImportButton({ label = "Import", onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFile(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`px-3 py-1.5 text-sm ${buttonSecondary}`}
      >
        {label}
      </button>
    </>
  );
}
