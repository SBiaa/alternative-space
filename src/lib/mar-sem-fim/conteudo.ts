// Carrega o conteúdo de content/mar-sem-fim/ e valida com os schemas. Se um JSON estiver quebrado, o import falha,
// e o build também. Nada de nome, número ou texto do mundo fica nos componentes: tudo vem daqui.

import mundoJson from "../../../content/mar-sem-fim/mundo.json";
import eventosJson from "../../../content/mar-sem-fim/eventos.json";
import oficiosJson from "../../../content/mar-sem-fim/oficios.json";
import melhoriasJson from "../../../content/mar-sem-fim/melhorias.json";
import catalogoJson from "../../../content/mar-sem-fim/catalogo.json";
import aparenciaJson from "../../../content/mar-sem-fim/aparencia.json";
import pedraSalgada from "../../../content/mar-sem-fim/ilhas/pedra-salgada.json";
import recife from "../../../content/mar-sem-fim/ilhas/recife-das-lanternas.json";
import farol from "../../../content/mar-sem-fim/ilhas/farol-velho.json";
import ponta from "../../../content/mar-sem-fim/ilhas/ponta-do-vento.json";
import monte from "../../../content/mar-sem-fim/ilhas/monte-das-quatro-aguas.json";
import relogio from "../../../content/mar-sem-fim/ilhas/ilha-do-relogio-quebrado.json";
import areal from "../../../content/mar-sem-fim/ilhas/areal-de-sal.json";
import inverno from "../../../content/mar-sem-fim/ilhas/ilha-do-inverno-parado.json";
import velaAlta from "../../../content/mar-sem-fim/ilhas/vela-alta.json";
import nuvem from "../../../content/mar-sem-fim/ilhas/arquipelago-nuvem.json";
import { schemaAparencia, schemaCatalogo, schemaEventos, schemaIlha, schemaMelhorias, schemaMundo, schemaOficios, type Ilha } from "./tipos";

export const MUNDO = schemaMundo.parse(mundoJson);
export const EVENTOS = schemaEventos.parse(eventosJson);
export const OFICIOS = schemaOficios.parse(oficiosJson).oficios;
export const MELHORIAS = schemaMelhorias.parse(melhoriasJson).melhorias;
export const CATALOGO = schemaCatalogo.parse(catalogoJson);
export const APARENCIA = schemaAparencia.parse(aparenciaJson);

export const ILHAS: Ilha[] = [pedraSalgada, recife, farol, ponta, monte, relogio, areal, inverno, velaAlta, nuvem].map((i) => schemaIlha.parse(i));
export const ILHA: Record<string, Ilha> = Object.fromEntries(ILHAS.map((i) => [i.slug, i]));

export const ilhaDe = (slug: string): Ilha | undefined => ILHA[slug];
export const marDe = (id: string) => MUNDO.mares.find((m) => m.id === id);
export const oficioDe = (id: string) => OFICIOS.find((o) => o.id === id);
export const melhoriaDe = (id: string) => MELHORIAS.find((m) => m.id === id);
export const eventoDe = (id: string) => EVENTOS.eventos.find((e) => e.id === id);
