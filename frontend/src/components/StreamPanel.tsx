import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { StreamStatus, StreamStats } from "../hooks/useStream";

/** Normalize all LaTeX delimiter styles to $/$$ so remark-math can parse them. */
function normalizeLatex(text: string): string {
  // \[ ... \]  →  $$ ... $$  (display math)
  let result = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, inner) => `$$${inner}$$`);
  // \( ... \)  →  $ ... $    (inline math)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_match, inner) => `$${inner}$`);
  return result;
}

interface StreamPanelProps {
  modelId: string;
  text: string;
  status: StreamStatus;
  stats: StreamStats;
}

function StatusBadge({ status }: { status: StreamStatus }) {
  const config: Record<StreamStatus, { label: string; className: string }> = {
    idle: { label: "Ready", className: "bg-arena-border text-arena-muted" },
    streaming: {
      label: "Streaming",
      className: "bg-arena-accent/20 text-arena-accent",
    },
    done: {
      label: "Complete",
      className: "bg-arena-green/20 text-arena-green",
    },
    error: { label: "Error", className: "bg-arena-red/20 text-arena-red" },
  };

  const { label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${className}`}
    >
      {status === "streaming" && (
        <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse-dot" />
      )}
      {label}
    </span>
  );
}

export default function StreamPanel({
  modelId,
  text,
  status,
  stats,
}: StreamPanelProps) {
  const provider = modelId.split("/")[0] || "";
  const modelName = modelId.split("/").slice(1).join("/") || modelId;
  const normalizedText = useMemo(() => normalizeLatex(text), [text]);

  return (
    <div className="flex flex-col h-full border border-arena-border rounded-xl bg-arena-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-arena-border bg-arena-surface/50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{modelName || "No model"}</span>
          {provider && (
            <span className="text-[10px] text-arena-muted uppercase tracking-wide">
              {provider}
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
        {status === "idle" && !text && (
          <p className="text-arena-muted text-sm italic">
            Select a model and enter a prompt to begin...
          </p>
        )}
        {text && (
          <div className="markdown-body text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {normalizedText}
            </ReactMarkdown>
          </div>
        )}
        {status === "streaming" && (
          <span className="inline-block w-2 h-4 bg-arena-accent animate-pulse-dot ml-0.5 align-text-bottom" />
        )}
      </div>

      {/* Stats footer */}
      {status !== "idle" && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-arena-border text-[11px] text-arena-muted">
          {stats.timeToFirstTokenMs != null && (
            <span>
              TTFT: <strong className="text-arena-text">{stats.timeToFirstTokenMs}ms</strong>
            </span>
          )}
          {stats.totalTimeMs != null && (
            <span>
              Total: <strong className="text-arena-text">{(stats.totalTimeMs / 1000).toFixed(1)}s</strong>
            </span>
          )}
          {stats.inputTokens != null && (
            <span>
              In: <strong className="text-arena-text">{stats.inputTokens}</strong>
            </span>
          )}
          {stats.outputTokens != null && (
            <span>
              Out: <strong className="text-arena-text">{stats.outputTokens}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
