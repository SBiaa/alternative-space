import { ImageResponse } from "next/og";
import { dataUri, svgBandeira, svgPirata } from "./arte";
import { T, formatarNumero } from "./textos";
import type { DadosCartaz } from "./tipos";

const COR = { papel: "#e3d8ac", claro: "#f6f0d6", noite: "#01121e", azul: "#093f7a", estrela: "#ab392f", neutro: "#5a5a5a" };

// Space Grotesk e Space Mono, só com as letras que o cartaz usa. Se a busca da fonte falhar, o cartaz sai com a fonte padrão.
async function fonte(familia: string, peso: number, texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${familia}:wght@${peso}&text=${encodeURIComponent(texto)}`, { headers: { "User-Agent": "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 Version/5.0.5 Safari/533.21.1" } })).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const r = await fetch(url);
    return r.ok ? await r.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Monta a imagem 1080×1350 do cartaz. */
export async function gerarCartaz(c: DadosCartaz) {
  const valor = formatarNumero(c.recompensa);
  const base = `${c.nome}${c.barco}${valor}${T.cartaz.titulo}${T.cartaz.subtitulo}${T.cartaz.recompensa}${T.cartaz.barco}${T.unidades.moeda}0123456789.,:`;
  const textos = base + base.toUpperCase(); // os rótulos saem em caixa alta
  const [grotesk, mono] = await Promise.all([fonte("Space+Grotesk", 700, textos), fonte("Space+Mono", 700, textos)]);
  const fontes = [
    ...(grotesk ? [{ name: "Space Grotesk", data: grotesk, weight: 700 as const }] : []),
    ...(mono ? [{ name: "Space Mono", data: mono, weight: 700 as const }] : []),
  ];

  const tamanhoNome = c.nome.length > 14 ? 96 : c.nome.length > 9 ? 128 : 160;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", background: COR.noite, padding: 48, fontFamily: "Space Grotesk" }}>
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", background: COR.papel, border: `4px solid ${COR.azul}`, borderRadius: 16, padding: "56px 56px 48px" }}>
          <div style={{ display: "flex", fontSize: 40, letterSpacing: 12, textTransform: "uppercase", color: COR.azul, fontFamily: "Space Mono" }}>{T.cartaz.titulo}</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: 520, height: 560, background: COR.claro, border: `3px solid ${COR.azul}`, borderRadius: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUri(svgPirata(c.aparencia))} width={420} height={525} alt="" />
          </div>
          <div style={{ display: "flex", fontSize: tamanhoNome, fontWeight: 700, color: COR.noite, lineHeight: 1, textAlign: "center", maxWidth: 900, justifyContent: "center" }}>{c.nome}</div>
          <div style={{ display: "flex", fontSize: 30, color: COR.neutro }}>{T.cartaz.subtitulo}</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, textTransform: "uppercase", color: COR.neutro, fontFamily: "Space Mono" }}>{T.cartaz.recompensa}</div>
            <div style={{ display: "flex", fontSize: 116, fontWeight: 700, color: COR.estrela, fontFamily: "Space Mono", lineHeight: 1.1 }}>{valor}</div>
            <div style={{ display: "flex", fontSize: 28, color: COR.neutro, fontFamily: "Space Mono" }}>{T.unidades.moeda}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, borderTop: `2px solid ${COR.azul}`, paddingTop: 24, width: "100%", justifyContent: "center", fontSize: 38, color: COR.noite }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dataUri(svgBandeira(c.bandeira))} width={105} height={70} alt="" />
            <div style={{ display: "flex", color: COR.neutro }}>{T.cartaz.barco}:</div>
            <div style={{ display: "flex", fontWeight: 700 }}>{c.barco}</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, fonts: fontes, headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } },
  );
}
