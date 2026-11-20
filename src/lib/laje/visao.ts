// O que a tela recebe: o save já assentado em `agora` mais tudo o que ela precisa mostrar (fases, clima, pombo, vizinho).
// A tela não calcula nada disso: no modo logado vem do servidor; no save local roda este mesmo código no aparelho.

import { climaDoDia } from "./clima";
import type { Clima } from "./config";
import { atualizar, infoDoVaso, pomboAgora, vizinhoDeHoje } from "./motor";
import { diaDe } from "./tempo";
import type { Info, Save } from "./tipos";

export type Visao = {
  agora: number;
  save: Save;
  infos: (Info | null)[];
  clima: { tipo: Clima; chuvaIni: number | null; chuvaFim: number | null };
  pombo: { aqui: boolean; ate: number };
  vizinho: { propostaId: string; jaTrocou: boolean };
  bicados: number[];
};

export function montarVisao(save: Save, agora: number): Visao {
  const s = atualizar(save, agora);
  const c = climaDoDia(s.seed, diaDe(agora));
  const v = vizinhoDeHoje(s, agora);
  return {
    agora,
    save: s,
    infos: s.vasos.map(infoDoVaso),
    clima: { tipo: c.clima, chuvaIni: c.chuvaIni, chuvaFim: c.chuvaFim },
    pombo: pomboAgora(s, agora),
    vizinho: { propostaId: v.proposta.id, jaTrocou: v.jaTrocou },
    bicados: s.inventario.meta.bicados,
  };
}
