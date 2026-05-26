# AI-Gussing game

A Next.js drawing game where the player sketches on a canvas and a server route calls the Gemini REST API to guess the drawing.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

3. Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Gemini API

The backend route is `app/api/guess/route.ts`. It does not use the Gemini SDK. It calls the Gemini REST API directly with `fetch`:

```text
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

The browser sends the canvas as a PNG data URL to the server, and the server forwards it as Gemini `inline_data`.
