import type { StreamStats, StreamStatus } from "../hooks/useStream";

interface StatsBarProps {
  modelA: string;
  modelB: string;
  statsA: StreamStats;
  statsB: StreamStats;
  statusA: StreamStatus;
  statusB: StreamStatus;
}

function Metric({
  label,
  valueA,
  valueB,
  format,
  lowerIsBetter = true,
}: {
  label: string;
  valueA: number | null;
  valueB: number | null;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}) {
  if (valueA == null && valueB == null) return null;

  let winnerA = false;
  let winnerB = false;

  if (valueA != null && valueB != null) {
    if (lowerIsBetter) {
      winnerA = valueA < valueB;
      winnerB = valueB < valueA;
    } else {
      winnerA = valueA > valueB;
      winnerB = valueB > valueA;
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 min-w-[120px]">
      <span className="text-[10px] text-arena-muted uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <span
          className={`text-sm font-mono font-semibold ${winnerA ? "text-arena-green" : "text-arena-text"}`}
        >
          {valueA != null ? format(valueA) : "-"}
          {winnerA && " *"}
        </span>
        <span className="text-arena-border text-xs">vs</span>
        <span
          className={`text-sm font-mono font-semibold ${winnerB ? "text-arena-green" : "text-arena-text"}`}
        >
          {valueB != null ? format(valueB) : "-"}
          {winnerB && " *"}
        </span>
      </div>
    </div>
  );
}

export default function StatsBar({
  modelA,
  modelB,
  statsA,
  statsB,
  statusA,
  statusB,
}: StatsBarProps) {
  const bothDone = statusA === "done" && statusB === "done";
  const anyStarted = statusA !== "idle" || statusB !== "idle";

  if (!anyStarted) return null;

  return (
    <div className="border border-arena-border rounded-xl bg-arena-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-arena-muted uppercase tracking-wider">
          Comparison
        </h3>
        {bothDone && (
          <span className="text-[10px] text-arena-green font-medium">
            * = winner in category
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-2 px-4">
        <span className="text-xs font-medium text-arena-accent w-[120px] text-center truncate">
          {modelA.split("/").pop()}
        </span>
        <div className="flex-1" />
        <span className="text-xs font-medium text-arena-accent w-[120px] text-center truncate">
          {modelB.split("/").pop()}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        <Metric
          label="Time to First Token"
          valueA={statsA.timeToFirstTokenMs}
          valueB={statsB.timeToFirstTokenMs}
          format={(v) => `${v}ms`}
          lowerIsBetter
        />
        <Metric
          label="Total Time"
          valueA={statsA.totalTimeMs}
          valueB={statsB.totalTimeMs}
          format={(v) => `${(v / 1000).toFixed(1)}s`}
          lowerIsBetter
        />
        <Metric
          label="Output Tokens"
          valueA={statsA.outputTokens}
          valueB={statsB.outputTokens}
          format={(v) => `${v}`}
          lowerIsBetter={false}
        />
        <Metric
          label="Total Tokens"
          valueA={statsA.totalTokens}
          valueB={statsB.totalTokens}
          format={(v) => `${v}`}
          lowerIsBetter
        />
      </div>
    </div>
  );
}
