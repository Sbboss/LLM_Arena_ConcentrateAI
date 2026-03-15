import type { Model } from "../lib/api";

interface ModelPickerProps {
  models: Model[];
  value: string;
  onChange: (modelId: string) => void;
  label: string;
  disabled?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-600",
  anthropic: "bg-orange-600",
  google: "bg-blue-600",
  xai: "bg-purple-600",
  mistral: "bg-cyan-600",
  cohere: "bg-pink-600",
  aws: "bg-yellow-600",
  azure: "bg-sky-600",
  cloudflare: "bg-amber-600",
};

function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? "bg-gray-600";
}

export default function ModelPicker({
  models,
  value,
  onChange,
  label,
  disabled,
}: ModelPickerProps) {
  const grouped = models.reduce<Record<string, Model[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  const providers = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-arena-muted uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-arena-surface border border-arena-border rounded-lg px-3 py-2.5 text-sm
                   text-arena-text focus:outline-none focus:border-arena-accent
                   disabled:opacity-50 disabled:cursor-not-allowed appearance-none
                   cursor-pointer"
      >
        <option value="">Select a model...</option>
        {providers.map((provider) => (
          <optgroup key={provider} label={provider.toUpperCase()}>
            {grouped[provider].map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {value && (
        <span
          className={`inline-flex self-start items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase text-white ${providerColor(value.split("/")[0])}`}
        >
          {value.split("/")[0]}
        </span>
      )}
    </div>
  );
}
