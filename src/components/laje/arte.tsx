// Desenhos da Laje Verde: ilustração flat em SVG, luz quente. Cada fase da planta tem um desenho próprio.

import { planta, type Clima } from "@/lib/laje/config";
import type { Fase } from "@/lib/laje/tipos";

type Ponto = { x: number; y: number };

// Folha em forma de gota: do ponto (x,y) até (x+dx, y+dy), com largura `w`.
function folha({ x, y }: Ponto, dx: number, dy: number, w: number) {
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * w;
  const py = (dx / len) * w;
  const mx = x + dx / 2;
  const my = y + dy / 2;
  return `M${x} ${y}Q${mx + px} ${my + py} ${x + dx} ${y + dy}Q${mx - px} ${my - py} ${x} ${y}Z`;
}

/** A planta num quadrado 60×52, de baixo (terra) pra cima. `murcha` deixa as folhas caídas. */
export function PlantaSvg({ slug, fase, murcha }: { slug: string; fase: Fase; murcha: boolean }) {
  const p = planta(slug);
  const verde = murcha ? "#8a9a4a" : (p?.cor ?? "#4f9a3f");
  const terra = "#6b4a32";
  const base = { x: 30, y: 50 };
  const queda = murcha ? 1 : -1; // folha pra cima ou caída

  if (fase === "semente") {
    return (
      <g aria-hidden="true">
        <path d="M14 50q16-10 32 0z" fill={terra} />
        <ellipse cx="26" cy="46" rx="2.4" ry="1.6" fill="#e6d39a" />
        <ellipse cx="33" cy="47" rx="2.4" ry="1.6" fill="#e6d39a" />
      </g>
    );
  }

  const nFolhas = fase === "broto" ? 2 : fase === "crescendo" ? 4 : 6;
  const altura = fase === "broto" ? 12 : fase === "crescendo" ? 24 : 30;
  const tam = fase === "broto" ? 8 : fase === "crescendo" ? 11 : 13;
  const topo = { x: 30, y: base.y - altura * (murcha ? 0.85 : 1) };
  const folhas = Array.from({ length: nFolhas }, (_, i) => {
    const lado = i % 2 === 0 ? -1 : 1;
    const y = base.y - 4 - ((altura - 4) * (Math.floor(i / 2) + 1)) / (Math.ceil(nFolhas / 2) + 0.4);
    return folha({ x: 30, y }, lado * tam, queda * (murcha ? -tam * 0.5 : tam * 0.7), tam * 0.32);
  });
  const frutos = fase === "pronta" && p?.corFlor && p.slug !== "girassol";

  return (
    <g aria-hidden="true">
      <path d="M16 50q14-7 28 0z" fill={terra} />
      <path d={`M${base.x} ${base.y}Q${base.x + (murcha ? 5 : 0)} ${(base.y + topo.y) / 2} ${topo.x + (murcha ? 8 : 0)} ${topo.y}`} stroke={verde} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {folhas.map((d, i) => (
        <path key={i} d={d} fill={verde} />
      ))}
      <path d={folha({ x: topo.x + (murcha ? 8 : 0), y: topo.y }, murcha ? 6 : 0, murcha ? 4 : -tam * 0.9, tam * 0.3)} fill={verde} />
      {frutos && (
        <g className="laje-pronta">
          <circle cx="22" cy="36" r="4.2" fill={p.corFlor} />
          <circle cx="38" cy="32" r="4.2" fill={p.corFlor} />
          <circle cx="31" cy="24" r="4.2" fill={p.corFlor} />
        </g>
      )}
      {fase === "pronta" && p?.slug === "girassol" && (
        <g className="laje-pronta">
          <circle cx={topo.x} cy={topo.y - 3} r="10" fill={p.corFlor} />
          <circle cx={topo.x} cy={topo.y - 3} r="5" fill="#6b3b1e" />
        </g>
      )}
      {fase === "pronta" && !p?.corFlor && (
        <g className="laje-pronta">
          <circle cx="18" cy="22" r="1.8" fill="#fff6c8" />
          <circle cx="43" cy="26" r="1.8" fill="#fff6c8" />
          <circle cx="30" cy="12" r="1.8" fill="#fff6c8" />
        </g>
      )}
    </g>
  );
}

/** O vaso: nível 1 de barro, 2 de lata, 3 de lata pintada. Quadrado 60×20 que fica embaixo da planta. */
export function CorpoDoVaso({ nivel }: { nivel: number }) {
  if (nivel >= 3) {
    return (
      <g aria-hidden="true">
        <path d="M14 50h32l-4 18H18z" fill="var(--laje-lata-pintada)" />
        <path d="M14.8 55h30.4l-.5 3H15.3z" fill="#f2c94c" />
        <rect x="12" y="48" width="36" height="4" rx="1.5" fill="#25766c" />
      </g>
    );
  }
  if (nivel === 2) {
    return (
      <g aria-hidden="true">
        <path d="M15 50h30l-3 18H18z" fill="var(--laje-lata)" />
        <path d="M17 56h26M17.8 61h24.4" stroke="var(--laje-lata-escura)" strokeWidth="1.2" />
        <rect x="13" y="48" width="34" height="4" rx="1.5" fill="var(--laje-lata-escura)" />
      </g>
    );
  }
  return (
    <g aria-hidden="true">
      <path d="M15 50h30l-4 18H19z" fill="var(--laje-barro)" />
      <rect x="12" y="48" width="36" height="5" rx="1.5" fill="var(--laje-barro-escuro)" />
    </g>
  );
}

export function VasoSvg({ nivel, planta: slug, fase, murcha }: { nivel: number; planta: string | null; fase: Fase | null; murcha: boolean }) {
  return (
    <svg viewBox="0 0 60 70" className="h-[72px] w-[62px]" aria-hidden="true" focusable="false">
      {slug && fase ? <PlantaSvg slug={slug} fase={fase} murcha={murcha} /> : <path d="M16 50q14-6 28 0z" fill="#6b4a32" />}
      <CorpoDoVaso nivel={nivel} />
    </svg>
  );
}

export function GotaSvg({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true" focusable="false">
      <path d="M8 1.5C5.6 5 3.6 7.4 3.6 10a4.4 4.4 0 0 0 8.8 0C12.4 7.4 10.4 5 8 1.5z" fill="var(--laje-agua)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function PomboSvg({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <ellipse cx="24" cy="28" rx="15" ry="11" fill="#8f98a3" />
      <path d="M10 28q-8-2-8-8 8 0 12 5z" fill="#6f7782" />
      <circle cx="35" cy="18" r="7" fill="#9aa3ad" />
      <path d="M41 18l6 2-6 2z" fill="#e8a33a" />
      <circle cx="36.5" cy="16.6" r="1.4" fill="#01121e" />
      <path d="M22 40l-1 6M28 40l1 6" stroke="#e8a33a" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 26q6-6 14 0" stroke="#6f7782" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function DecoSvg({ slug, className = "h-14 w-14" }: { slug: string; className?: string }) {
  switch (slug) {
    case "banquinho":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
          <rect x="9" y="18" width="30" height="6" rx="2" fill="#b8884a" />
          <path d="M13 24l-3 18M35 24l3 18M24 24v18" stroke="#8a5f2e" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "vaso-lata":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
          <path d="M11 22h26l-3 20H14z" fill="#d9573f" />
          <rect x="9" y="19" width="30" height="5" rx="1.5" fill="#a63e2b" />
          <path d="M24 19c-6-2-8-8-6-12 4 1 7 5 6 12zM24 19c6-2 8-8 6-12-4 1-7 5-6 12z" fill="var(--laje-folha)" />
          <path d="M13 31h22" stroke="#f2c94c" strokeWidth="3" />
        </svg>
      );
    case "luzinhas":
      return (
        <svg viewBox="0 0 96 32" className={className} aria-hidden="true" focusable="false">
          <path d="M2 6q23 18 46 6t46-6" stroke="#4b3f33" strokeWidth="1.6" fill="none" />
          {[14, 30, 46, 62, 78].map((x, i) => (
            <circle key={x} cx={x} cy={[15, 19, 19, 17, 12][i]} r="3.4" fill={["#f6c445", "#f2a66e", "#fff3b0", "#f6c445", "#f2a66e"][i]} />
          ))}
        </svg>
      );
    case "rede":
      return (
        <svg viewBox="0 0 72 40" className={className} aria-hidden="true" focusable="false">
          <path d="M4 6v28M68 6v28" stroke="#6b4a32" strokeWidth="3" strokeLinecap="round" />
          <path d="M4 10q32 34 64 0z" fill="#e0643c" stroke="#a63e2b" strokeWidth="1.6" />
          <path d="M16 16q20 14 40 0M26 22q10 6 20 0" stroke="#f6c445" strokeWidth="2" fill="none" />
        </svg>
      );
    case "espantalho":
      return (
        <svg viewBox="0 0 48 64" className={className} aria-hidden="true" focusable="false">
          <path d="M24 20v40M6 32h36" stroke="#8a5f2e" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="24" cy="14" r="8" fill="#e8c27a" />
          <path d="M13 11h22l-4-8H17z" fill="#6b3b1e" />
          <path d="M14 32l4 12H8zM34 32l4 12h-10z" fill="#d9573f" />
          <path d="M19 14h2M27 14h2" stroke="#01121e" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

/** Céu de fim de tarde com a cidade em silhueta, a caixa d'água, o varal e o clima do dia. */
export function CenaCeu({ clima, enfeites }: { clima: Clima; enfeites: { varal?: string; mureta?: string } }) {
  return (
    <svg viewBox="0 0 390 210" className="block h-auto w-full" role="img" aria-label="Laje ao fim da tarde, com a cidade ao fundo, a caixa d'água e o varal" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="laje-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--laje-ceu-topo)" />
          <stop offset="0.62" stopColor="var(--laje-ceu-meio)" />
          <stop offset="1" stopColor="var(--laje-ceu-horizonte)" />
        </linearGradient>
      </defs>
      <rect width="390" height="210" fill="url(#laje-ceu)" />

      {(clima === "sol" || clima === "solForte") && (
        <g>
          <circle cx="86" cy="116" r={clima === "solForte" ? 30 : 22} fill="var(--laje-sol)" />
          {clima === "solForte" &&
            [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const a = (i * Math.PI) / 4;
              return <path key={i} d={`M${86 + Math.cos(a) * 36} ${116 + Math.sin(a) * 36}L${86 + Math.cos(a) * 46} ${116 + Math.sin(a) * 46}`} stroke="var(--laje-sol)" strokeWidth="4" strokeLinecap="round" />;
            })}
        </g>
      )}
      {(clima === "nublado" || clima === "chuva") && (
        <g fill={clima === "chuva" ? "#6d6f95" : "#e7c2b0"}>
          <ellipse cx="80" cy="46" rx="42" ry="15" />
          <ellipse cx="108" cy="36" rx="26" ry="14" />
          <ellipse cx="290" cy="60" rx="46" ry="16" />
          <ellipse cx="316" cy="48" rx="28" ry="14" />
        </g>
      )}
      {clima === "chuva" && (
        <g className="laje-chuva" stroke="#c8e0f5" strokeWidth="2" strokeLinecap="round">
          {[60, 84, 106, 270, 294, 318].map((x, i) => (
            <line key={x} x1={x} y1={70 + (i % 2) * 14} x2={x - 4} y2={84 + (i % 2) * 14} />
          ))}
        </g>
      )}

      {/* cidade em silhueta */}
      <path
        d="M0 210V150h18v-22h20v30h14v-44h24v36h16v-18h18v30h22v-52h26v38h14v-24h20v34h18v-28h22v40h16v-20h24v34h20v-46h28v52h16v-30h20v40h16V210z"
        fill="var(--laje-cidade)"
      />
      <g fill="#f6c445" opacity="0.8">
        {[[46, 140], [100, 150], [168, 134], [228, 158], [300, 142], [346, 164]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="4" height="5" />
        ))}
      </g>

      {/* caixa d'água */}
      <g>
        <path d="M296 70v28M340 70v28" stroke="var(--laje-linha)" strokeWidth="4" />
        <rect x="286" y="102" width="64" height="76" rx="6" fill="var(--laje-caixa)" />
        <rect x="286" y="102" width="64" height="12" rx="4" fill="var(--laje-caixa-escura)" />
        <path d="M290 128h56M290 152h56" stroke="var(--laje-caixa-escura)" strokeWidth="3" />
        <path d="M318 178v22" stroke="var(--laje-linha)" strokeWidth="5" />
      </g>

      {/* varal com roupa */}
      <g>
        <path d="M14 150V90M246 150V90" stroke="var(--laje-linha)" strokeWidth="4" strokeLinecap="round" />
        <path d="M14 94Q130 116 246 94" stroke="#4b3f33" strokeWidth="2" fill="none" />
        <path d="M44 100h22l-3 30H47z" fill="#e0643c" />
        <path d="M98 104h26v20H98zM98 104l-6-6h8" fill="#f1e8d2" />
        <path d="M156 105h24l-2 22h-20z" fill="#3b7fb8" />
        <path d="M200 101h20l3 26h-26z" fill="#f6c445" />
      </g>

      {enfeites.varal && (
        <svg x="30" y="72" width="200" height="32" viewBox="0 0 96 32">
          <DecoLuzes />
        </svg>
      )}
      {enfeites.mureta && (
        <svg x="150" y="150" width="56" height="56" viewBox="0 0 48 48" aria-hidden="true">
          <DecoNaMureta slug={enfeites.mureta} />
        </svg>
      )}
    </svg>
  );
}

function DecoLuzes() {
  return (
    <g>
      <path d="M2 6q23 18 46 6t46-6" stroke="#4b3f33" strokeWidth="1.6" fill="none" />
      {[14, 30, 46, 62, 78].map((x, i) => (
        <circle key={x} cx={x} cy={[15, 19, 19, 17, 12][i]} r="3.4" fill={["#f6c445", "#f2a66e", "#fff3b0", "#f6c445", "#f2a66e"][i]} />
      ))}
    </g>
  );
}

function DecoNaMureta({ slug }: { slug: string }) {
  if (slug === "luzinhas") return <DecoLuzes />;
  return slug === "vaso-lata" ? (
    <g>
      <path d="M11 22h26l-3 20H14z" fill="#d9573f" />
      <rect x="9" y="19" width="30" height="5" rx="1.5" fill="#a63e2b" />
      <path d="M24 19c-6-2-8-8-6-12 4 1 7 5 6 12zM24 19c6-2 8-8 6-12-4 1-7 5-6 12z" fill="var(--laje-folha)" />
    </g>
  ) : null;
}
