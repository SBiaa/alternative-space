// Todos os talentos juntos. Cada arquivo foi escrito por partes (gerais/ancestralidade/perícia e classes).
import type { Talento } from "../tipos";
import { TALENTOS_CLASSE_1 } from "./talentos-classe-1";
import { TALENTOS_CLASSE_2 } from "./talentos-classe-2";
import { TALENTOS_GERAIS } from "./talentos-gerais";

export const TALENTOS: Talento[] = [...TALENTOS_GERAIS, ...TALENTOS_CLASSE_1, ...TALENTOS_CLASSE_2];
