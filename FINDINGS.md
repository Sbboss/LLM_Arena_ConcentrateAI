# My Findings -- Concentrate AI Developer Experience

**Name:** Shiva
**Assignment:** Use the Concentrate AI APIs to build something and share feedback.

---

## What I Built

I built an "LLM Arena" -- a tool where you pick two models, type a prompt, and watch both respond side-by-side in real-time. The idea was to stress-test the core promise of Concentrate AI: one API, many providers, same behavior. A comparison tool is a good way to surface any inconsistencies because you're literally looking at two providers next to each other.

The app is a FastAPI backend proxying SSE streams from the Concentrate API, with a React frontend rendering both streams. It also supports document upload (PDF/DOCX), tunable parameters (temperature, top-p, max tokens), and tracks stats like time-to-first-token and token counts.

I used AI assistance to build the tool itself, but all the findings below are from my own experience integrating with and testing the API.

---

## The Good Stuff

**The unified format genuinely works.** This was the thing I was most skeptical about going in. Every AI gateway claims "one API for all providers" but the normalization usually breaks down somewhere -- different error formats, inconsistent token counting, streaming quirks. With Concentrate, I was able to swap `openai/gpt-5.2` for `anthropic/claude-opus-4-6` and literally nothing in my code changed. The request body is the same, the streaming events are the same shape, the usage object comes back with the same fields. That's not easy to pull off and it's clearly where a lot of engineering effort went.

**Streaming is rock solid.** I ran dozens of side-by-side comparisons across OpenAI, Anthropic, and Google models. Never saw a dropped event, never got an out-of-order sequence, never had a stream just hang. The event types are well-named and the lifecycle makes sense once you understand it. The `response.completed` event reliably carries the `usage` object, which made building the stats panel straightforward.

**The auto-routing idea is really compelling.** I didn't build auto-routing into my app, but reading through the docs, the `model: "auto"` with strategy/metric configuration is something I haven't seen elsewhere. Being able to say "give me the cheapest model right now" or "give me the lowest p50 latency" at the request level is a genuinely useful primitive. I'd love to build an explorer tool around this.

**The pricing data in the models API is a hidden gem.** The `/v1/models` endpoint returns per-provider pricing (input/output/cache costs per million tokens) which is incredibly useful. I only discovered this by inspecting the raw API response. More on that below.

---

## Where I Got Stuck

### The `/v1/models` endpoint was my biggest blocker

This cost me the most time and was the most frustrating part of the integration. Here's what happened:

The docs show examples like `model: "openai/gpt-4o"` throughout, so I assumed the models endpoint would return objects with an `id` field in that same format. I wrote my parser expecting `{ id: "openai/gpt-4o", ... }`. Instead, the endpoint returns a flat array with a completely different shape:

```json
{
  "slug": "gpt-5.2",
  "name": "ChatGPT 5.2",
  "author": { "slug": "openai" },
  "providers": {
    "openai": { "pricing": {...}, ... }
  }
}
```

There's no `id` field. There's no `data` wrapper. The model identifier is `slug`, not `id`. And to construct the string that the `/v1/responses` endpoint actually accepts (like `openai/gpt-5.2`), you have to iterate the `providers` object and concatenate `provider_key + "/" + slug` yourself.

My dropdown was completely empty until I figured this out by `curl`-ing the endpoint directly and reading the raw JSON.

**My suggestion:** Add an example response to the List Models docs page. Even better, include a ready-to-use `id` field in each model object so developers don't have to reverse-engineer the ID format.

### Some providers fail with opaque errors

Several models (e.g., `huggingface/qwen3.5-27b`) return a `response.failed` event with `"code": "server_error"` and `"message": "Internal Server Error"` -- no additional detail. Since the request goes through Concentrate's proxy, it's unclear whether the issue is on the provider side, a configuration problem, or a Concentrate routing issue. There's nothing actionable a developer can do with "Internal Server Error."

**My suggestion:** Surface more context in provider errors when possible -- even something like "upstream provider returned HTTP 500" would help developers know it's not their fault and they should try a different model.

### No way to tell what parameters were silently dropped

Some parameters (like `search_context_size` for web search) are silently ignored for certain providers. I only know this because the docs mention it in a small note. In practice, if I send a parameter and it gets dropped, there's no way to tell from the response. A response header like `X-Ignored-Params: search_context_size` would make debugging much easier.

---

## Suggestions for the Docs

These are things that would have saved me time:

1. **Show the actual `/v1/models` response body.** The List Models page has no response example. This was the single biggest source of confusion.

2. **Add a streaming quick-reference.** The streaming docs are thorough but hard to scan. A one-liner showing the event order (`created → output_item.added → content_part.added → delta* → text.done → completed`) at the top of the page would be really helpful.

3. **Document the pricing fields.** The models API returns detailed pricing that's super useful for building cost-aware apps, but the docs don't mention it.

4. **Add a "Building a Streaming Client" guide.** The trickiest part of the integration was correctly parsing SSE (buffering partial chunks, handling the `event:` vs `data:` lines). A copy-paste streaming helper for Python and TypeScript would save every developer 30+ minutes.

5. **Document input size limits.** I sent ~20K character prompts (extracted from PDFs) with no issues, but I had no idea what the limit was. The `context_window` field exists in the model metadata but the docs don't explain how it relates to input size.

---

## Ideas for Features I'd Love to See

- **Native document input** -- An `input_document` type (like the existing `input_image`) that accepts base64 PDF data and extracts text server-side. Right now every developer building document Q&A needs to bring their own extraction library.
- **Auto-routing fallback** -- If the selected provider fails, automatically try the next best option instead of returning a 424.
- **Streaming guardrails** -- Output redaction currently only works for non-streamed responses, but streaming is the default for chat UIs. Finding a way to make guardrails work with streaming would be a big deal for enterprise customers.
- **A lightweight SDK** -- Even a minimal Python/TypeScript client that handles SSE parsing and types the response objects would make the onboarding much smoother.

---

## Closing Thoughts

The core product is strong. The unified API format works, the streaming is reliable, and the model coverage is impressive. Most of my friction was with the docs and discoverability rather than the API itself -- which is a good sign because docs are fixable. The auto-routing and multi-provider abstraction are genuinely differentiated features that I think will matter a lot as teams start running AI workloads at scale.

I'd be excited to work on improving the developer experience from the inside -- whether that's the docs, SDKs, or the API surface itself.
