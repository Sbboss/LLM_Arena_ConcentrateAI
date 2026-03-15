import type { LLMParams } from "../hooks/useStream";

interface ParamsPanelProps {
  params: LLMParams;
  onChange: (params: LLMParams) => void;
  disabled: boolean;
}

function Slider({
  label,
  value,
  defaultValue,
  min,
  max,
  step,
  onChange,
  disabled,
  format,
}: {
  label: string;
  value: number | null;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number | null) => void;
  disabled: boolean;
  format?: (v: number) => string;
}) {
  const active = value != null;
  const displayValue = value ?? defaultValue;
  const fmt = format ?? ((v: number) => String(v));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onChange(e.target.checked ? defaultValue : null)}
            disabled={disabled}
            className="rounded border-arena-border bg-arena-surface text-arena-accent
                       focus:ring-arena-accent focus:ring-offset-0 w-3.5 h-3.5"
          />
          <span className="text-xs text-arena-muted">{label}</span>
        </label>
        {active && (
          <span className="text-xs font-mono text-arena-text">
            {fmt(displayValue)}
          </span>
        )}
      </div>
      {active && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                     bg-arena-border accent-arena-accent
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}
    </div>
  );
}

export default function ParamsPanel({
  params,
  onChange,
  disabled,
}: ParamsPanelProps) {
  return (
    <div className="border border-arena-border rounded-xl bg-arena-surface p-4">
      <h3 className="text-xs font-semibold text-arena-muted uppercase tracking-wider mb-3">
        Parameters
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Slider
          label="Temperature"
          value={params.temperature}
          defaultValue={1.0}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => onChange({ ...params, temperature: v })}
          disabled={disabled}
        />
        <Slider
          label="Max Output Tokens"
          value={params.maxOutputTokens}
          defaultValue={2048}
          min={64}
          max={16384}
          step={64}
          onChange={(v) => onChange({ ...params, maxOutputTokens: v != null ? Math.round(v) : null })}
          disabled={disabled}
          format={(v) => v.toLocaleString()}
        />
        <Slider
          label="Top P"
          value={params.topP}
          defaultValue={1.0}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ ...params, topP: v })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
