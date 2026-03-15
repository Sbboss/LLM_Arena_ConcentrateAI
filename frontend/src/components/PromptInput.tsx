import { useState } from "react";

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
}

const EXAMPLE_PROMPTS = [
  "Explain quantum entanglement to a 10-year-old",
  "Write a Python function to find the longest palindromic substring",
  "Compare the pros and cons of microservices vs monoliths",
  "Write a short poem about artificial intelligence",
  "Explain how a transformer neural network works",
];

export default function PromptInput({ onSubmit, disabled }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt here..."
          disabled={disabled}
          rows={3}
          className="w-full bg-arena-surface border border-arena-border rounded-xl px-4 py-3
                     text-sm text-arena-text placeholder:text-arena-muted/50
                     focus:outline-none focus:border-arena-accent resize-none
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <span className="text-[10px] text-arena-muted hidden sm:inline">
            {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter
          </span>
          <button
            onClick={handleSubmit}
            disabled={disabled || !prompt.trim()}
            className="px-4 py-1.5 bg-arena-accent hover:bg-arena-accent-dim rounded-lg
                       text-xs font-semibold text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {disabled ? "Streaming..." : "Battle!"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] text-arena-muted uppercase tracking-wider self-center">
          Try:
        </span>
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            disabled={disabled}
            className="text-[11px] px-2.5 py-1 rounded-full border border-arena-border
                       text-arena-muted hover:text-arena-text hover:border-arena-accent/50
                       transition-colors disabled:opacity-40 truncate max-w-[200px]"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
