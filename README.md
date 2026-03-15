# LLM Arena

Side-by-side LLM comparison app powered by [Concentrate AI](https://concentrate.ai). Pick any two models from 70+ providers, send the same prompt, and watch both responses stream in real-time with latency, token, and cost stats.

## Features

- **Side-by-side streaming** -- two models respond to the same prompt simultaneously
- **89 models** across 10+ providers (OpenAI, Anthropic, Google, xAI, Mistral, Cohere, etc.)
- **Adjustable parameters** -- temperature, max output tokens, top-p via UI sliders
- **Document upload** -- attach a PDF, DOCX, or TXT file as context for your prompt
- **Markdown + LaTeX** -- responses render with full math support (KaTeX)
- **Live stats** -- time-to-first-token, total time, input/output token counts with winner highlighting

## Prerequisites

- Python 3.10+
- Node.js 18+
- A Concentrate AI API key ([get one here](https://app.concentrate.ai))

## Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Edit .env and set your CONCENTRATE_API_KEY
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies `/api/*` requests to the backend at `localhost:8000`.

## Usage

1. Open `http://localhost:5173`
2. Pick two models from the dropdowns (e.g. `openai/gpt-5.2` vs `anthropic/claude-sonnet-4`)
3. (Optional) Upload a PDF/DOCX/TXT document as context
4. (Optional) Adjust temperature, max tokens, or top-p
5. Type a prompt and click **Battle!**
6. Watch both responses stream side-by-side
7. Compare stats in the comparison bar at the bottom

## Project Structure

```
backend/
  main.py              FastAPI server with streaming proxy + file upload
  requirements.txt     Python dependencies
  .env.example         API key placeholder

frontend/
  src/
    App.tsx             Main layout
    components/
      ModelPicker.tsx   Model selection dropdown (grouped by provider)
      ParamsPanel.tsx   Temperature / max tokens / top-p sliders
      FileUpload.tsx    PDF/DOCX/TXT upload with text extraction
      PromptInput.tsx   Prompt textarea + example prompts
      StreamPanel.tsx   Streaming response display with Markdown + LaTeX
      StatsBar.tsx      Side-by-side stats comparison
    hooks/
      useStream.ts      SSE streaming hook (POST-based)
    lib/
      api.ts            API helper functions
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/models` | GET | Lists available models (cached 5 min) |
| `/api/stream` | POST | SSE stream proxying Concentrate AI responses |
| `/api/upload` | POST | Extracts text from PDF, DOCX, or TXT files |
| `/api/health` | GET | Health check |
