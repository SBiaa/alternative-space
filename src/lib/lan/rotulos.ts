// Texto dos efeitos de cada nível, pra mostrar nos cartões de melhoria. Os números vêm do catálogo.

import type { Efeito, TipoItem } from "./tipos";

const pct = (v: number) => `${Math.round(v * 100)}%`;
const PLANOS = ["discada (sem jogo on-line)", "banda larga básica", "banda larga boa"];

export function descreverEfeito(kind: TipoItem, e: Efeito | undefined): string {
  if (!e) return "";
  const p: string[] = [];
  if (e.pcs) p.push("+1 máquina no salão");
  if (e.telaFina) p.push("tela fina em todas as máquinas, menos luz");
  if (e.mouseOptico) p.push("sem sujeira de mouse");
  if (e.fone) p.push("fone em todas as máquinas");
  if (e.plano !== undefined) p.push(PLANOS[e.plano] ?? "", `quedas ${pct(e.quedaMult ?? 1)} do normal`, `R$ ${e.conta}/semana`);
  if (e.nobreakSeg) p.push(`segura ${e.nobreakSeg}s sem luz`);
  if (e.virusMult !== undefined) p.push(`vírus ${pct(e.virusMult)} do normal`);
  if (e.antivirusRapido) p.push("varredura na metade do tempo");
  if (e.congelar) p.push("o fuçador não instala nada");
  if (e.jogoBonus) p.push(`+${pct(e.jogoBonus)} na satisfação de quem joga`);
  if (e.impressora) p.push(e.impressora >= 2 ? "imprime colorido" : "imprime preto e branco");
  if (e.gravador) p.push("grava CD");
  if (e.scanner) p.push("digitaliza fotos");
  if (e.xerox) p.push("tira xerox");
  if (kind === "balcao" && e.capacidade) p.push(`${e.capacidade} por dia`, `vende a R$ ${e.preco}`, `custa R$ ${e.custo}`, `qualidade ${pct(e.satisfacao ?? 0)}`);
  if (kind === "conforto" && e.conforto) p.push(`conforto ${pct(e.conforto)}`);
  if (e.pacienciaMult !== undefined && e.pacienciaMult < 1) p.push(`paciência cai ${pct(1 - e.pacienciaMult)} mais devagar`);
  if (e.luz) p.push(`+R$ ${e.luz}/dia de luz`);
  if (e.divisoria) p.push("barulho não passa pro outro lado");
  if (e.satisfacao && kind !== "balcao") p.push(`+${pct(e.satisfacao)} de satisfação`);
  if (e.reputacao) p.push(`+${e.reputacao.toFixed(3)} de reputação por cliente`);
  if (e.barulhoMult !== undefined && e.barulhoMult < 1) p.push(`barulho ${pct(e.barulhoMult)} do normal`);
  if (e.colunas && e.linhas) p.push(`salão de ${e.colunas} por ${e.linhas} casas`);
  if (e.corujao) p.push("abre das 22h às 4h");
  if (e.salaGamer) p.push("barulho das gamer quase não sai");
  return p.filter(Boolean).join(" · ");
}
