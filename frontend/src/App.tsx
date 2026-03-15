import { useCallback, useEffect, useState } from "react";
import { fetchModels, type Model } from "./lib/api";
import { useStream, type LLMParams } from "./hooks/useStream";
import FileUpload, { type UploadedFile } from "./components/FileUpload";
import ModelPicker from "./components/ModelPicker";
import ParamsPanel from "./components/ParamsPanel";
import PromptInput from "./components/PromptInput";
import StreamPanel from "./components/StreamPanel";
import StatsBar from "./components/StatsBar";

const DEFAULT_PARAMS: LLMParams = {
  temperature: null,
  maxOutputTokens: null,
  topP: null,
};

export default function App() {
  const [models, setModels] = useState<Model[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelA, setModelA] = useState("");
  const [modelB, setModelB] = useState("");
  const [llmParams, setLlmParams] = useState<LLMParams>(DEFAULT_PARAMS);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const streamA = useStream();
  const streamB = useStream();

  const isStreaming =
    streamA.status === "streaming" || streamB.status === "streaming";

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .catch((err) => setModelsError(err.message));
  }, []);

  const handleBattle = useCallback(
    (prompt: string) => {
      if (!modelA || !modelB) return;
      const docText = uploadedFile?.text ?? null;
      streamA.start(modelA, prompt, llmParams, docText);
      streamB.start(modelB, prompt, llmParams, docText);
    },
    [modelA, modelB, streamA, streamB, llmParams, uploadedFile],
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-arena-border bg-arena-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-arena-accent">LLM</span> Arena
            </h1>
            <span className="text-[10px] text-arena-muted border border-arena-border rounded px-1.5 py-0.5">
              powered by Concentrate AI
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-arena-muted">
            <span>{models.length} models available</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Error state */}
        {modelsError && (
          <div className="bg-arena-red/10 border border-arena-red/30 rounded-xl p-4 text-sm text-arena-red">
            Failed to load models: {modelsError}. Make sure the backend is
            running at <code className="font-mono">localhost:8000</code>.
          </div>
        )}

        {/* Model pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModelPicker
            models={models}
            value={modelA}
            onChange={setModelA}
            label="Model A (Left)"
            disabled={isStreaming}
          />
          <ModelPicker
            models={models}
            value={modelB}
            onChange={setModelB}
            label="Model B (Right)"
            disabled={isStreaming}
          />
        </div>

        {/* LLM parameters */}
        <ParamsPanel
          params={llmParams}
          onChange={setLlmParams}
          disabled={isStreaming}
        />

        {/* File upload */}
        <FileUpload
          file={uploadedFile}
          onFileChange={setUploadedFile}
          disabled={isStreaming}
        />

        {/* Prompt input */}
        <PromptInput
          onSubmit={handleBattle}
          disabled={isStreaming || !modelA || !modelB}
        />

        {/* Stream panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          <StreamPanel
            modelId={modelA}
            text={streamA.text}
            status={streamA.status}
            stats={streamA.stats}
          />
          <StreamPanel
            modelId={modelB}
            text={streamB.text}
            status={streamB.status}
            stats={streamB.stats}
          />
        </div>

        {/* Stats comparison bar */}
        <StatsBar
          modelA={modelA}
          modelB={modelB}
          statsA={streamA.stats}
          statsB={streamB.stats}
          statusA={streamA.status}
          statusB={streamB.status}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-arena-border py-3 text-center text-[11px] text-arena-muted">
        LLM Arena &middot; Testing Concentrate AI&apos;s unified model API
      </footer>
    </div>
  );
}
