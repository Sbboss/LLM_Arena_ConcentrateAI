import { useCallback, useRef, useState } from "react";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

export interface StreamStats {
  timeToFirstTokenMs: number | null;
  totalTimeMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

const EMPTY_STATS: StreamStats = {
  timeToFirstTokenMs: null,
  totalTimeMs: null,
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
};

export interface LLMParams {
  temperature: number | null;
  maxOutputTokens: number | null;
  topP: number | null;
}

export function useStream() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [stats, setStats] = useState<StreamStats>(EMPTY_STATS);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(
    (model: string, prompt: string, llmParams?: LLMParams, documentText?: string | null) => {
    stop();

    setText("");
    setStatus("streaming");
    setStats(EMPTY_STATS);

    const controller = new AbortController();
    abortRef.current = controller;

    const body: Record<string, unknown> = { model, prompt };
    if (documentText) body.document_text = documentText;
    if (llmParams?.temperature != null) body.temperature = llmParams.temperature;
    if (llmParams?.maxOutputTokens != null) body.max_output_tokens = llmParams.maxOutputTokens;
    if (llmParams?.topP != null) body.top_p = llmParams.topP;

    (async () => {
      try {
        const res = await fetch("/api/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errText = await res.text();
          setText(`Error ${res.status}: ${errText}`);
          setStatus("error");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6);

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(dataStr);
            } catch {
              continue;
            }

            const type = event.type as string;

            if (type === "response.output_text.delta") {
              const delta = event.delta as string;
              setText((prev) => prev + delta);
            }

            if (type === "response.failed" || type === "error") {
              const resp = event.response as Record<string, unknown> | undefined;
              const errObj = resp?.error as Record<string, unknown> | undefined;
              const code = errObj?.code ?? (event.code as string | undefined) ?? "unknown";
              const msg = errObj?.message
                ?? (event.message as string | undefined)
                ?? "Request failed";
              const model = (resp?.model ?? event.model ?? "") as string;
              setText((prev) =>
                prev + `\n\n**Error (${code}):** ${msg}` + (model ? `\n\nModel: \`${model}\`` : ""),
              );
              setStatus("error");
            }

            if (type === "arena.stats") {
              const usage = (event.usage ?? {}) as Record<string, number>;
              setStats({
                timeToFirstTokenMs:
                  (event.time_to_first_token_ms as number) ?? null,
                totalTimeMs: (event.total_time_ms as number) ?? null,
                inputTokens: usage.input_tokens ?? null,
                outputTokens: usage.output_tokens ?? null,
                totalTokens: usage.total_tokens ?? null,
              });
            }

            if (
              type === "response.completed" ||
              type === "response.incomplete"
            ) {
              setStatus("done");
            }
          }
        }

        setStatus((prev) => (prev === "streaming" ? "done" : prev));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("done");
          return;
        }
        setText(`Connection error: ${err}`);
        setStatus("error");
      }
    })();
  }, [stop]);

  return { text, status, stats, start, stop };
}
