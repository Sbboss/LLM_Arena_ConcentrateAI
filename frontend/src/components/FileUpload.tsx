import { useCallback, useRef, useState } from "react";

export interface UploadedFile {
  filename: string;
  text: string;
  charCount: number;
  wordCount: number;
}

interface FileUploadProps {
  file: UploadedFile | null;
  onFileChange: (file: UploadedFile | null) => void;
  disabled: boolean;
}

export default function FileUpload({ file, onFileChange, disabled }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setError(null);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", selected);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(data.detail || `Upload failed (${res.status})`);
        }

        const data = await res.json();
        onFileChange({
          filename: data.filename,
          text: data.text,
          charCount: data.char_count,
          wordCount: data.word_count,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onFileChange],
  );

  const handleRemove = () => {
    onFileChange(null);
    setError(null);
  };

  return (
    <div className="border border-arena-border rounded-xl bg-arena-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-arena-muted uppercase tracking-wider">
          Document Context
        </h3>
        <span className="text-[10px] text-arena-muted">PDF, DOCX, TXT (max 10 MB)</span>
      </div>

      {!file ? (
        <div className="flex flex-col items-center gap-2">
          <label
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed
                        border-arena-border rounded-lg cursor-pointer transition-colors
                        hover:border-arena-accent/50 hover:bg-arena-accent/5
                        ${disabled || uploading ? "opacity-50 pointer-events-none" : ""}`}
          >
            <svg className="w-5 h-5 text-arena-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <span className="text-sm text-arena-muted">
              {uploading ? "Extracting text..." : "Upload a document"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              onChange={handleUpload}
              disabled={disabled || uploading}
              className="hidden"
            />
          </label>
          {error && (
            <p className="text-xs text-arena-red">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-arena-bg rounded-lg px-3 py-2">
          <svg className="w-5 h-5 text-arena-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-arena-text truncate">{file.filename}</p>
            <p className="text-[11px] text-arena-muted">
              {file.wordCount.toLocaleString()} words &middot; {file.charCount.toLocaleString()} chars
            </p>
          </div>
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="p-1 rounded hover:bg-arena-border transition-colors text-arena-muted hover:text-arena-red
                       disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remove file"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
