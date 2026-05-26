"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  Circle,
  Eraser,
  RotateCcw,
  Send,
  Sparkles,
  Trash2
} from "lucide-react";

type GuessResult = {
  guess: string;
  confidence: number | null;
  alternatives: string[];
};

const colors = ["#111827", "#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#6366f1"];
const sizes = [4, 8, 12, 18, 26];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(8);
  const [guess, setGuess] = useState<GuessResult | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);
  const [error, setError] = useState("");

  const getCanvasPoint = useCallback((event: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }, []);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [context.getImageData(0, 0, canvas.width, canvas.height)];
    setGuess(null);
    setError("");
  }, []);

  useEffect(() => {
    resetCanvas();
  }, [resetCanvas]);

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    historyRef.current = [
      ...historyRef.current.slice(-14),
      context.getImageData(0, 0, canvas.width, canvas.height)
    ];
  }, []);

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPoint(event);
    saveHistory();
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const lastPoint = lastPointRef.current;
    if (!canvas || !context || !lastPoint) {
      return;
    }

    const point = getCanvasPoint(event);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = size;
    context.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const history = historyRef.current;
    if (!canvas || !context || history.length === 0) {
      return;
    }

    const previous = history.pop();
    if (previous) {
      context.putImageData(previous, 0, 0);
      setGuess(null);
      setError("");
    }
  };

  const askAi = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    setIsGuessing(true);
    setError("");
    setGuess(null);

    try {
      const response = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: canvas.toDataURL("image/png") })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI guessing failed.");
      }

      setGuess({
        guess: data.guess || "No confident guess",
        confidence: typeof data.confidence === "number" ? data.confidence : null,
        alternatives: Array.isArray(data.alternatives) ? data.alternatives.slice(0, 3) : []
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI guessing failed.");
    } finally {
      setIsGuessing(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="game-header">
        <div>
          <p className="eyebrow">Gemini AI Guessing Game</p>
          <h1>AI-Gussing game</h1>
        </div>
        <button className="primary-button" onClick={askAi} disabled={isGuessing}>
          {isGuessing ? <Sparkles className="spin" size={18} /> : <Send size={18} />}
          {isGuessing ? "AI is guessing" : "Ask AI"}
        </button>
      </section>

      <section className="game-layout">
        <aside className="tool-panel" aria-label="Drawing tools">
          <div className="segmented">
            <button
              className={tool === "brush" ? "active" : ""}
              onClick={() => setTool("brush")}
              title="Brush"
            >
              <Brush size={18} />
            </button>
            <button
              className={tool === "eraser" ? "active" : ""}
              onClick={() => setTool("eraser")}
              title="Eraser"
            >
              <Eraser size={18} />
            </button>
          </div>

          <div className="control-group">
            <span>Color</span>
            <div className="swatches">
              {colors.map((item) => (
                <button
                  aria-label={`Select color ${item}`}
                  className={color === item ? "selected" : ""}
                  key={item}
                  onClick={() => {
                    setColor(item);
                    setTool("brush");
                  }}
                  style={{ backgroundColor: item }}
                />
              ))}
            </div>
          </div>

          <div className="control-group">
            <span>Size</span>
            <div className="size-row">
              {sizes.map((item) => (
                <button
                  className={size === item ? "selected" : ""}
                  key={item}
                  onClick={() => setSize(item)}
                  title={`${item}px`}
                >
                  <Circle fill="currentColor" size={Math.max(8, item)} />
                </button>
              ))}
            </div>
          </div>

          <div className="actions">
            <button onClick={undo}>
              <RotateCcw size={17} />
              Undo
            </button>
            <button onClick={resetCanvas}>
              <Trash2 size={17} />
              Clear
            </button>
          </div>
        </aside>

        <div className="canvas-wrap">
          <canvas
            aria-label="Drawing canvas"
            height={720}
            onPointerCancel={stopDrawing}
            onPointerDown={startDrawing}
            onPointerLeave={stopDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            ref={canvasRef}
            width={960}
          />
        </div>

        <aside className="result-panel">
          <p className="panel-label">AI Guess</p>
          {guess ? (
            <div className="guess-result">
              <strong>{guess.guess}</strong>
              {guess.confidence !== null ? <span>Confidence: {guess.confidence}%</span> : null}
              {guess.alternatives.length > 0 ? (
                <div className="alternatives">
                  {guess.alternatives.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={24} />
              <span>Draw something, then ask Gemini to guess it from the server.</span>
            </div>
          )}
          {error ? <p className="error">{error}</p> : null}
        </aside>
      </section>
    </main>
  );
}
