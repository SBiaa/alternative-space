import { ImageResponse } from "next/og";
import { site } from "@/config/site";
import { decodificarGrade } from "@/lib/constelacao/compartilhar";
import { TEXTOS, PARTIDA } from "@/lib/constelacao/config";
import { dataBR, diaValido } from "@/lib/constelacao/dia";
import { caminhoEstrela } from "@/components/constelacao/Estrela";

// Imagem de compartilhar no visual Cozy / Carta Celeste. Recebe só a grade de estados (c/o/a): a palavra nunca passa por aqui.
// Cores: mesmos valores dos tokens em globals.css (espaço, noite, creme, areia, laranja-claro).
const COR = { fundo: "#0b2340", noite: "#01121e", creme: "#ece3be", areia: "#d9d2b0", estrela: "#f2a66e" };

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const grade = decodificarGrade(q.get("g"));
  const dia = q.get("d");
  if (!grade || !diaValido(dia)) return new Response("Pedido inválido", { status: 400 });
  const solved = q.get("s") === "1";

  const cols = grade[0].length;
  const passo = 84;
  const w = cols * passo;
  const h = grade.length * passo;
  const pt = (i: number, j: number) => ({ x: passo / 2 + j * passo, y: passo / 2 + i * passo });
  const acesas: { x: number; y: number }[] = [];
  grade.forEach((l, i) => l.forEach((e, j) => e === "certa" && acesas.push(pt(i, j))));
  const resumo = solved ? TEXTOS.compartilhar.resumoAcerto(grade.length, PARTIDA.tentativas) : TEXTOS.compartilhar.resumoErro(PARTIDA.tentativas);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: COR.fundo, color: COR.creme, padding: 48 }}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, textTransform: "uppercase", color: COR.estrela }}>{TEXTOS.titulo}</div>
        <div style={{ display: "flex", fontSize: 26, color: COR.areia, marginTop: 8 }}>{`${dataBR(dia)} · ${resumo}`}</div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            {acesas.slice(1).map((p, k) => (
              <line key={k} x1={acesas[k].x} y1={acesas[k].y} x2={p.x} y2={p.y} stroke={COR.areia} strokeWidth={2} opacity={0.7} />
            ))}
            {grade.map((linha, i) =>
              linha.map((e, j) => {
                const { x, y } = pt(i, j);
                if (e === "certa") return <path key={`${i}-${j}`} d={caminhoEstrela(x, y, 30)} fill={COR.estrela} stroke={COR.noite} strokeWidth={2} />;
                if (e === "outro") return <path key={`${i}-${j}`} d={caminhoEstrela(x, y, 24)} fill="none" stroke={COR.estrela} strokeWidth={3} strokeDasharray="6 5" />;
                return <circle key={`${i}-${j}`} cx={x} cy={y} r={5} fill={COR.creme} opacity={0.25} />;
              }),
            )}
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: COR.areia }}>{site.name}</div>
      </div>
    ),
    { width: 900, height: Math.max(630, h + 260) },
  );
}
