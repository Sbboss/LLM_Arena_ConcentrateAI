---
title: LLM Arena
sdk: docker
app_port: 7860
---

# LLM Arena

Side-by-side LLM evaluation tool built on the [Concentrate AI](https://concentrate.ai) unified model API. Compare any two models from 70+ options across OpenAI, Anthropic, Google, xAI, Mistral, and more -- same prompt, real-time streaming, quantitative metrics.

**Live demo:** [huggingface.co/spaces/Sbboss/LLM_Arena_ConcentrateAI](https://huggingface.co/spaces/Sbboss/LLM_Arena_ConcentrateAI)

## Demo

<video src="https://raw.githubusercontent.com/Sbboss/LLM_Arena_ConcentrateAI/releases/download/v1.0/LLM_Arena_demo.mp4" controls width="100%"></video>
<!-- [![Watch the video]](https://raw.githubusercontent.com/Sbboss/LLM_Arena_ConcentrateAI/releases/download/v1.0/LLM_Arena_demo.mp4) -->


## Features

- **Side-by-side streaming** -- both models respond simultaneously via Server-Sent Events
- **89 models, 10+ providers** -- OpenAI, Anthropic, Google, xAI, Mistral, Cohere, Hugging Face, and more
- **Inference parameter tuning** -- temperature, max output tokens, top-p (nucleus sampling)
- **Document-grounded evaluation** -- upload PDF, DOCX, or TXT files as context for RAG-style comparisons
- **Markdown + LaTeX rendering** -- full KaTeX math support with cross-provider delimiter normalization
- **Quantitative comparison** -- time-to-first-token, end-to-end latency, input/output token counts

## Architecture

```
Browser  ──POST /api/stream──►  FastAPI  ──POST /v1/responses──►  Concentrate AI
         ◄──── SSE events ────           ◄──── SSE events ──────
         (x2, one per model)
```

**Backend:** Python/FastAPI acting as an SSE proxy. Holds the API key server-side, streams responses from Concentrate AI's `/v1/responses` endpoint, and injects timing metadata (TTFT, total latency).

**Frontend:** React (Vite) + Tailwind CSS. Two parallel fetch streams render into side-by-side panels with live Markdown/LaTeX rendering and a stats comparison bar.

## Local Development

Requires Python 3.10+, Node.js 18+, and a [Concentrate AI API key](https://app.concentrate.ai).

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your CONCENTRATE_API_KEY
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Project Structure

```
backend/
  main.py              FastAPI server -- streaming proxy, file upload, model listing
  requirements.txt     Python dependencies

frontend/src/
  App.tsx              Main layout and state management
  components/
    ModelPicker.tsx     Provider-grouped model selection
    ParamsPanel.tsx     Inference parameter controls
    FileUpload.tsx      Document upload with server-side text extraction
    PromptInput.tsx     Prompt input with example prompts
    StreamPanel.tsx     Streaming response panel (Markdown + KaTeX)
    StatsBar.tsx        Side-by-side metric comparison
  hooks/
    useStream.ts        SSE consumption, text accumulation, stats tracking
```

## Deployment

Deployed on Hugging Face Spaces using Docker. The `Dockerfile` runs a multi-stage build (Node for the frontend, Python for the backend) and serves everything on a single port. The `CONCENTRATE_API_KEY` is set as a Space secret.
