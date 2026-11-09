// Calendário do Diário de Bordo. Tudo em UTC e em datas ISO (AAAA-MM-DD), sem fuso no meio.
// Semanas começam na segunda. A semana 01 começa na primeira segunda do ano; os dias antes dela
// são a "Pré-missão". Cada semana pertence ao mês da sua segunda-feira.

export const ANO = 2027;
const DIA = 86_400_000;

export const MESES = [
  { slug: "janeiro", nome: "Janeiro", curto: "jan" },
  { slug: "fevereiro", nome: "Fevereiro", curto: "fev" },
  { slug: "marco", nome: "Março", curto: "mar" },
  { slug: "abril", nome: "Abril", curto: "abr" },
  { slug: "maio", nome: "Maio", curto: "mai" },
  { slug: "junho", nome: "Junho", curto: "jun" },
  { slug: "julho", nome: "Julho", curto: "jul" },
  { slug: "agosto", nome: "Agosto", curto: "ago" },
  { slug: "setembro", nome: "Setembro", curto: "set" },
  { slug: "outubro", nome: "Outubro", curto: "out" },
  { slug: "novembro", nome: "Novembro", curto: "nov" },
  { slug: "dezembro", nome: "Dezembro", curto: "dez" },
] as const;

export const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;

export type Semana = { n: number; inicio: string; fim: string; dias: string[]; mes: number };

export const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Lê uma data ISO; devolve null se não for uma data de verdade (ex.: 2027-02-30). */
export function deIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return iso(d) === s ? d : null;
}

export const somaDias = (s: string, n: number) => iso(new Date(deIso(s)!.getTime() + n * DIA));
const diasEntre = (a: string, b: string) => Math.round((deIso(b)!.getTime() - deIso(a)!.getTime()) / DIA);

export function primeiraSegunda(ano = ANO) {
  const jan1 = new Date(Date.UTC(ano, 0, 1));
  const dow = (jan1.getUTCDay() + 6) % 7; // 0 = segunda
  return iso(new Date(jan1.getTime() + ((7 - dow) % 7) * DIA));
}

/** Quantas segundas-feiras o ano tem: é o número de semanas do diário. */
export function totalSemanas(ano = ANO) {
  return Math.floor(diasEntre(primeiraSegunda(ano), `${ano}-12-31`) / 7) + 1;
}

export function semana(n: number, ano = ANO): Semana | null {
  if (!Number.isInteger(n) || n < 1 || n > totalSemanas(ano)) return null;
  const inicio = somaDias(primeiraSegunda(ano), (n - 1) * 7);
  const dias = Array.from({ length: 7 }, (_, i) => somaDias(inicio, i));
  return { n, inicio, fim: dias[6], dias, mes: Number(inicio.slice(5, 7)) };
}

export const semanas = (ano = ANO) => Array.from({ length: totalSemanas(ano) }, (_, i) => semana(i + 1, ano)!);
export const semanasDoMes = (mes: number, ano = ANO) => semanas(ano).filter((s) => s.mes === mes);

/** Os dias antes da semana 01 (em 2027: 01 a 03/jan). */
export function preMissao(ano = ANO) {
  const fim = primeiraSegunda(ano);
  const dias: string[] = [];
  for (let d = `${ano}-01-01`; d < fim; d = somaDias(d, 1)) dias.push(d);
  return dias;
}

/** Primeiro e último dia que o diário cobre (a semana 52 termina já no ano seguinte). */
export const inicioDoDiario = (ano = ANO) => `${ano}-01-01`;
export const fimDoDiario = (ano = ANO) => semana(totalSemanas(ano), ano)!.fim;
export const noDiario = (d: string, ano = ANO) => deIso(d) !== null && d >= inicioDoDiario(ano) && d <= fimDoDiario(ano);

/** Número da semana de uma data: 0 na Pré-missão, null fora do diário. */
export function semanaDaData(d: string, ano = ANO): number | null {
  if (!noDiario(d, ano)) return null;
  const desde = diasEntre(primeiraSegunda(ano), d);
  return desde < 0 ? 0 : Math.floor(desde / 7) + 1;
}

/** Mês do diário a que uma data pertence (o mês da semana dela; Pré-missão conta como janeiro). */
export function mesDaData(d: string, ano = ANO): number | null {
  const n = semanaDaData(d, ano);
  if (n === null) return null;
  return n === 0 ? 1 : semana(n, ano)!.mes;
}

/** Todos os dias do mês do calendário (para hábitos e humor). */
export function diasDoMes(mes: number, ano = ANO) {
  const total = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => iso(new Date(Date.UTC(ano, mes - 1, i + 1))));
}

export function mesPorSlug(slug: string) {
  const i = MESES.findIndex((m) => m.slug === slug);
  return i < 0 ? null : i + 1;
}

/** Hoje no horário de Brasília, como data ISO. */
export const hoje = (agora = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);

/** "04/jan" */
export const diaCurto = (d: string) => `${d.slice(8, 10)}/${MESES[Number(d.slice(5, 7)) - 1].curto}`;
export const dois = (n: number) => String(n).padStart(2, "0");
/** Segunda = 0 … domingo = 6 */
export const diaDaSemana = (d: string) => (deIso(d)!.getUTCDay() + 6) % 7;
