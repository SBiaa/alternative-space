// Arte do Assombrações da Vila: papel recortado em camadas, desenhada em SVG com os tokens do site.
// Tudo é decorativo (aria-hidden): a informação importante sempre aparece em texto.

import type { LugarId, TipoSinal } from "@/lib/assombracoes/config";

const c = (n: string) => `var(--color-${n})`;

/** Vila à noite: lua, mata escura ao fundo, casas de taipa e a luz da lamparina. */
export function VilaNoite({ className = "" }: { className?: string }) {
  const casa = (x: number, y: number, w: number, h: number, luz = true) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={w} height={h} fill={c("areia")} />
      <rect x={x} y={y + h - 4} width={w} height={4} fill={c("poeira")} />
      <path d={`M${x - 5} ${y}L${x + w / 2} ${y - h * 0.45}L${x + w + 5} ${y}Z`} fill={c("estrela")} />
      <path d={`M${x - 5} ${y}L${x + w / 2} ${y - h * 0.45}L${x + w + 5} ${y}`} fill="none" stroke={c("noite")} strokeOpacity={0.35} strokeWidth={1.5} />
      <rect x={x + w * 0.38} y={y + h * 0.35} width={w * 0.24} height={h * 0.42} rx={2} fill={luz ? c("laranja-claro") : c("cabine")} />
    </g>
  );
  return (
    <svg viewBox="0 0 400 240" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="240" fill={c("noite")} />
      <circle cx="318" cy="52" r="26" fill={c("creme")} />
      <circle cx="328" cy="46" r="24" fill={c("noite")} fillOpacity={0.12} />
      {[[40, 30], [90, 60], [150, 24], [210, 50], [260, 20], [370, 110], [20, 100]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill={c("creme")} fillOpacity={0.7} />
      ))}
      {/* morros e mata ao fundo */}
      <path d="M0 150Q70 110 140 140T280 130T400 150V240H0Z" fill={c("cabine")} />
      <path d="M0 175Q60 145 130 170T270 160T400 180V240H0Z" fill={c("ceu")} />
      {[18, 52, 88, 300, 338, 372].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 190l${8 + (i % 2) * 3} -${34 + (i % 3) * 6} l${8 + (i % 2) * 3} ${34 + (i % 3) * 6}z`} fill={c("noite")} />
          <rect x={x + 7} y={188} width={3} height={8} fill={c("noite")} />
        </g>
      ))}
      {/* casas */}
      {casa(110, 168, 52, 36)}
      {casa(176, 176, 44, 30, false)}
      {casa(232, 170, 56, 36)}
      {/* cajueiro da praça */}
      <rect x={196} y={196} width={5} height={12} fill={c("lareira-madeira")} />
      <circle cx={198} cy={190} r={13} fill={c("bege-tubo")} />
      {/* chão */}
      <path d="M0 208Q100 198 200 206T400 204V240H0Z" fill={c("lareira-madeira")} />
      <path d="M0 226Q120 214 240 224T400 220V240H0Z" fill={c("noite")} />
      {/* lamparina */}
      <circle cx="64" cy="212" r="22" fill={c("laranja-claro")} fillOpacity={0.18} />
      <circle cx="64" cy="212" r="11" fill={c("laranja-claro")} fillOpacity={0.3} />
      <rect x={62} y={196} width={4} height={18} fill={c("lareira-pedra")} />
      <rect x={58} y={204} width={12} height={9} rx={2} fill={c("laranja-claro")} />
    </svg>
  );
}

/** Ícone de cada lugar, num quadrado 64x64. */
export function IconeLugar({ id, className = "size-14" }: { id: LugarId; className?: string }) {
  const traco = { fill: "none", stroke: c("creme"), strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const luz = c("laranja-claro");
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {id === "praca" && (
        <g {...traco}>
          <path d="M32 54V34" />
          <circle cx="32" cy="24" r="12" fill={c("bege-tubo")} />
          <path d="M12 54h40M18 54v-6h28v6" />
        </g>
      )}
      {id === "igreja" && (
        <g {...traco}>
          <path d="M16 54V30l16-12 16 12v24z" />
          <path d="M32 18V8M28 12h8" />
          <path d="M27 54V42a5 5 0 0110 0v12" stroke={luz} />
        </g>
      )}
      {id === "rio" && (
        <g {...traco}>
          <path d="M8 24q8-6 16 0t16 0 16 0" />
          <path d="M8 36q8-6 16 0t16 0 16 0" stroke={luz} />
          <path d="M8 48q8-6 16 0t16 0 16 0" />
        </g>
      )}
      {id === "mata" && (
        <g {...traco}>
          <path d="M20 50l10-26 10 26z M32 50l12-30 12 30z" fill={c("bege-tubo")} />
          <path d="M26 54v-4M44 54v-4" />
        </g>
      )}
      {id === "sitio" && (
        <g {...traco}>
          <path d="M10 52V36l14-10 14 10v16z" />
          <path d="M42 52V30M48 52V26M54 52V32" stroke={luz} />
          <path d="M10 52h46" />
        </g>
      )}
      {id === "venda" && (
        <g {...traco}>
          <path d="M10 28h44l-4-12H14z" fill={c("estrela")} />
          <path d="M14 28v24h36V28" />
          <path d="M26 52V38h12v14" stroke={luz} />
        </g>
      )}
    </svg>
  );
}

/** Ícone do tipo de sinal. */
export function IconeSinal({ tipo, className = "size-8" }: { tipo: TipoSinal; className?: string }) {
  const traco = { fill: "none", stroke: c("laranja-claro"), strokeWidth: 2.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {tipo === "pegada" && (
        <g {...traco}>
          <ellipse cx="12" cy="20" rx="4" ry="6" />
          <ellipse cx="22" cy="12" rx="4" ry="6" />
        </g>
      )}
      {tipo === "redemoinho" && (
        <g {...traco}>
          <path d="M6 8h20M9 14h15M12 20h10M15 26h5" />
        </g>
      )}
      {tipo === "som" && (
        <g {...traco}>
          <path d="M6 12v8h5l7 5V7l-7 5z" />
          <path d="M23 11q3 5 0 10" />
        </g>
      )}
      {tipo === "objeto" && (
        <g {...traco}>
          <rect x="7" y="9" width="18" height="16" rx="2" strokeDasharray="3 3" />
          <path d="M16 4v5" />
        </g>
      )}
    </svg>
  );
}

/** Criatura em papel recortado. `silhueta` mostra só a sombra, pra quem ainda não conheceu. */
export function Criatura({ slug, silhueta = false, className = "" }: { slug: string; silhueta?: boolean; className?: string }) {
  const f = (cor: string) => (silhueta ? c("cabine") : cor);
  const bg = c("ceu");
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      <circle cx="80" cy="82" r="66" fill={bg} />
      {slug === "saci" && (
        <g>
          {/* redemoinho */}
          <path d="M34 124q46-8 92 0M42 134q38-6 76 0M52 144q28-5 56 0" fill="none" stroke={f(c("areia"))} strokeWidth="4" strokeLinecap="round" />
          {/* perna única */}
          <path d="M78 96v30q0 6 6 6h10" fill="none" stroke={f(c("lareira-couro"))} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          {/* corpo */}
          <path d="M60 64q20-8 40 0l-6 38q-14 6-28 0z" fill={f(c("laranja"))} />
          {/* braços */}
          <path d="M62 72l-18 14M98 72l20 -10" stroke={f(c("lareira-couro"))} strokeWidth="7" strokeLinecap="round" />
          {/* cabeça e gorro */}
          <circle cx="80" cy="50" r="17" fill={f(c("lareira-couro"))} />
          <path d="M62 46q18-26 38-2l-6 6q-14-8-26 2z" fill={f(c("estrela"))} />
          <path d="M98 40q12-6 16 6" fill="none" stroke={f(c("estrela"))} strokeWidth="5" strokeLinecap="round" />
          {!silhueta && (
            <>
              <circle cx="74" cy="53" r="2" fill={c("noite")} />
              <circle cx="87" cy="53" r="2" fill={c("noite")} />
              <path d="M74 60q6 5 13 0" fill="none" stroke={c("noite")} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}
      {slug === "curupira" && (
        <g>
          {/* chama do cabelo */}
          <path d="M80 12q-18 16-14 32 6-8 8-4-6 20 6 28-2-14 8-26 6 10 4 24 18-16 6-38-4 8-8 6 2-12-10-22z" fill={f(c("laranja"))} />
          <path d="M80 24q-10 10-6 22 8-6 12 2 6-10-6-24z" fill={f(c("lareira-vela"))} />
          {/* rosto */}
          <circle cx="80" cy="62" r="16" fill={f(c("lareira-couro"))} />
          {/* corpo */}
          <path d="M62 80q18-8 36 0l-4 36H66z" fill={f(c("bege-tubo"))} />
          {/* pés virados pra trás */}
          <path d="M68 116v12h-16 M92 116v12h16" fill="none" stroke={f(c("lareira-couro"))} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          {!silhueta && (
            <>
              <circle cx="74" cy="62" r="2" fill={c("noite")} />
              <circle cx="87" cy="62" r="2" fill={c("noite")} />
              <path d="M75 69q5 3 11 0" fill="none" stroke={c("noite")} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {/* folhas */}
          <path d="M30 130q10-14 22-4M110 128q12-12 22 2" fill="none" stroke={f(c("lareira-musgo"))} strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {slug === "iara" && (
        <g>
          {/* água */}
          <path d="M14 108q16-10 32 0t32 0 32 0 32 0V150H14z" fill={f(c("azul"))} />
          <path d="M14 122q16-10 32 0t32 0 32 0 32 0" fill="none" stroke={f(c("azul-claro"))} strokeWidth="3" strokeLinecap="round" />
          {/* cabelo longo */}
          <path d="M58 48q22-22 44 0l4 62H54z" fill={f(c("noite"))} />
          {/* rosto e ombros */}
          <circle cx="80" cy="56" r="15" fill={f(c("lareira-couro"))} />
          <path d="M62 108q4-26 18-26t18 26z" fill={f(c("lareira-couro"))} />
          {/* flor no cabelo */}
          <circle cx="98" cy="42" r="5" fill={f(c("laranja-claro"))} />
          {!silhueta && (
            <>
              <circle cx="74" cy="57" r="2" fill={c("noite")} />
              <circle cx="87" cy="57" r="2" fill={c("noite")} />
              <path d="M75 64q5 4 11 0" fill="none" stroke={c("noite")} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </g>
      )}
      {silhueta && slug !== "saci" && slug !== "curupira" && slug !== "iara" && (
        <path d="M80 40a20 20 0 0120 20v10l12 40H48l12-40V60a20 20 0 0120-20z" fill={c("cabine")} />
      )}
    </svg>
  );
}
