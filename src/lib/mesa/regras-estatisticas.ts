/**
 * Estatísticas da campanha: sessões, horas jogadas e presença por jogador.
 * Só conta presença onde o mestre marcou quem veio; sessão realizada sem essa marcação não entra na porcentagem.
 */
import type { StatusSessao } from './regras';

export interface SessaoStat {
  id: string;
  status: StatusSessao;
  iniciaEm: Date;
  duracaoMin: number;
}

export interface PresencaStat {
  sessaoId: string;
  userId: string;
  compareceu: boolean | null;
}

export interface JogadorStat {
  userId: string;
  nome: string;
  /** Quantidade de XP aceita na campanha. */
  xp: number;
  compareceu: number;
  /** Sessões realizadas em que a presença dele foi marcada. */
  de: number;
  /** 0 a 100, ou null se ainda não há presença marcada. */
  percentual: number | null;
  /** Quantas sessões seguidas ele veio, contando da mais recente. */
  sequencia: number;
}

export interface Resumo {
  realizadas: number;
  canceladas: number;
  proximas: number;
  /** Pela duração marcada de cada sessão realizada. */
  horasJogadas: number;
  /** Realizadas em que a presença foi marcada. */
  comPresenca: number;
  jogadores: JogadorStat[];
}

export function calcularResumo(d: {
  sessoes: SessaoStat[];
  jogadores: { userId: string; nome: string }[];
  presencas: PresencaStat[];
  xpPorJogador: Map<string, number>;
  agora: Date;
}): Resumo {
  const realizadas = d.sessoes.filter((s) => s.status === 'realizada');
  const porSessao = new Map<string, PresencaStat[]>();
  for (const p of d.presencas) porSessao.set(p.sessaoId, [...(porSessao.get(p.sessaoId) ?? []), p]);
  // Da mais recente para a mais antiga, só as que têm presença marcada.
  const marcadas = realizadas
    .filter((s) => (porSessao.get(s.id) ?? []).some((p) => p.compareceu !== null))
    .sort((a, b) => b.iniciaEm.getTime() - a.iniciaEm.getTime());

  const jogadores = d.jogadores.map((j): JogadorStat => {
    let compareceu = 0;
    let de = 0;
    let sequencia = 0;
    let seguindo = true;
    for (const s of marcadas) {
      const linha = (porSessao.get(s.id) ?? []).find((p) => p.userId === j.userId);
      if (!linha || linha.compareceu === null) continue; // entrou depois: essa sessão não conta para ele
      de++;
      if (linha.compareceu) {
        compareceu++;
        if (seguindo) sequencia++;
      } else seguindo = false;
    }
    return {
      userId: j.userId,
      nome: j.nome,
      xp: d.xpPorJogador.get(j.userId) ?? 0,
      compareceu,
      de,
      percentual: de ? Math.round((100 * compareceu) / de) : null,
      sequencia,
    };
  });

  const minutos = realizadas.reduce((soma, s) => soma + s.duracaoMin, 0);
  return {
    realizadas: realizadas.length,
    canceladas: d.sessoes.filter((s) => s.status === 'cancelada').length,
    proximas: d.sessoes.filter((s) => s.status === 'marcada' && s.iniciaEm.getTime() > d.agora.getTime()).length,
    horasJogadas: Math.round((minutos / 60) * 10) / 10,
    comPresenca: marcadas.length,
    jogadores,
  };
}
