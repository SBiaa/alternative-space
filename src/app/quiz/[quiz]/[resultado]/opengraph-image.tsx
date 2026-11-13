import { ImageResponse } from "next/og";
import { getQuiz, getResult } from "@/lib/quiz";
import { site } from "@/config/site";

export const alt = "Resultado do quiz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cores do tema Cozy (globals.css). Arte própria: nada de brasão ou fonte oficial.
const palette: Record<string, { bg: string; fg: string; accent: string }> = {
  azul: { bg: "#093f7a", fg: "#ece3be", accent: "#f2a66e" },
  noite: { bg: "#01121e", fg: "#ece3be", accent: "#f2a66e" },
  laranja: { bg: "#dd5d05", fg: "#01121e", accent: "#01121e" },
  estrela: { bg: "#ab392f", fg: "#ece3be", accent: "#e3d8ac" },
  creme: { bg: "#f6f0d6", fg: "#01121e", accent: "#093f7a" },
};

// Imagem de compartilhamento do resultado, no visual Cozy.
export default async function Image({ params }: { params: Promise<{ quiz: string; resultado: string }> }) {
  const { quiz: slug, resultado } = await params;
  const quiz = getQuiz(slug);
  const r = quiz && getResult(quiz, resultado);
  const c = palette[r?.color ?? "azul"] ?? palette.azul;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b2340", padding: 40 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: c.bg,
            color: c.fg,
            border: "6px solid #01121e",
            borderRadius: 32,
            boxShadow: "12px 12px 0 #01121e",
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, textTransform: "uppercase", color: c.accent }}>
            {quiz ? quiz.intro.title : site.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 36 }}>{quiz?.resultPrefix ?? "Meu resultado"}</div>
            <div style={{ display: "flex", fontSize: 108, fontWeight: 700, lineHeight: 1 }}>{r?.name ?? ""}</div>
            <div style={{ display: "flex", fontSize: 38, maxWidth: 950 }}>{r?.tagline ?? ""}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26 }}>
            <span>{site.name}</span>
            <span style={{ color: c.accent }}>✦ ✦ ✦</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
