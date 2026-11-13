import { ImageResponse } from "next/og";
import { site } from "@/config/site";
import { TEXTOS } from "@/lib/role/config";
import { acharPorSlug, melhorDe } from "@/lib/role/dados";
import { miniaturaDataUri } from "@/lib/role/miniatura";

export const alt = TEXTOS.pagina.titulo;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Cores do tema Cozy (mesmos valores dos tokens em globals.css): céu, noite, creme, creme-escuro, laranja-claro, linha forte, areia.
const COZY = { ceu: "#0b2340", noite: "#01121e", creme: "#ece3be", cremeEscuro: "#e3d8ac", laranjaClaro: "#f2a66e", linhaForte: "#4f5d66", areia: "#d9d2b0" };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await acharPorSlug(slug).catch(() => null);
  const publico = p && p.status === "published" ? p : null;
  const recorde = publico ? await melhorDe(publico.id, publico.userId).catch(() => null) : null;
  const criador = publico ? (publico.apelido ? `@${publico.apelido}` : publico.criador) : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: COZY.ceu, color: COZY.creme, padding: 56, position: "relative" }}>
        <div style={{ position: "absolute", top: -160, right: -120, width: 520, height: 520, borderRadius: 999, background: "rgba(242,166,110,0.16)", display: "flex" }} />
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: COZY.laranjaClaro }}>{TEXTOS.pagina.titulo}</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05, marginTop: 18, maxWidth: 1000 }}>{publico ? publico.title : TEXTOS.pagina.titulo}</div>
        {publico && (
          <div style={{ display: "flex", gap: 28, fontSize: 32, marginTop: 14, color: COZY.areia }}>
            <span>{TEXTOS.pico.por(criador)}</span>
            {recorde !== null && <span style={{ color: COZY.laranjaClaro }}>{`${TEXTOS.pico.recordeCriador}: ${TEXTOS.pico.pontos(recorde)}`}</span>}
          </div>
        )}
        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", marginTop: 24 }}>
          {publico && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={miniaturaDataUri(publico.layout, { fundo: COZY.noite, peca: COZY.cremeEscuro, grind: COZY.creme, linha: COZY.linhaForte })} width={1088} height={260} style={{ borderRadius: 8, objectFit: "contain" }} alt="" />
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 22, marginTop: 16, color: COZY.areia }}>{site.name}</div>
      </div>
    ),
    size,
  );
}
