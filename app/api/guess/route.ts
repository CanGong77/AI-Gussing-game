import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: {
    message?: string;
  };
};

function parseDataUrl(image: string) {
  const match = image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY on the server. Configure .env.local first." },
      { status: 500 }
    );
  }

  let payload: { image?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!payload.image) {
    return NextResponse.json({ error: "Missing canvas image." }, { status: 400 });
  }

  const image = parseDataUrl(payload.image);
  if (!image) {
    return NextResponse.json(
      { error: "Invalid image format. Use a PNG, JPEG, or WebP data URL." },
      { status: 400 }
    );
  }

  const prompt = [
    "You are playing a drawing guessing game.",
    "Look at this sketch on a white background and guess what the player drew.",
    "Return only JSON. Do not use Markdown or explanations.",
    'Use this format: {"guess":"the most likely object name","confidence":0-100,"alternatives":["option 1","option 2","option 3"]}'
  ].join("\n");

  const response = await fetch(
    `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: image.mimeType,
                  data: image.data
                }
              },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    }
  );

  const result = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    return NextResponse.json(
      { error: result.error?.message || "Gemini API request failed." },
      { status: response.status }
    );
  }

  const text = result.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) {
    return NextResponse.json({ error: "Gemini did not return readable content." }, { status: 502 });
  }

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({
      guess: text.trim(),
      confidence: null,
      alternatives: []
    });
  }
}
