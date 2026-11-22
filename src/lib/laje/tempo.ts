// Relógio do jogo: o dia vira à meia-noite de Brasília. Funções puras, sem Date.now.

import { LAJE } from "./config";

export const MIN = 60_000;
export const HORA = 3_600_000;
export const DIA = 86_400_000;

const OFFSET = LAJE.fusoHoras * HORA;

/** O relógio do servidor, num lugar só (as telas de servidor chamam isto em vez de Date.now). */
export const relogio = () => Date.now();

/** Número do dia do jogo (inteiro) a que o instante `t` pertence. */
export const diaDe = (t: number) => Math.floor((t + OFFSET) / DIA);

/** Instante em que o dia `dia` começa. */
export const inicioDoDia = (dia: number) => dia * DIA - OFFSET;
