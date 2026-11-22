// Agenda de exemplo da Constelação do Dia: 30 dias a partir de hoje (dia de Brasília), só em desenvolvimento.
//   npm run seed:constelacao
// Não troca palavra já agendada. Recusa rodar com NODE_ENV=production ou VERCEL_ENV=production.
import { sql } from "../src/lib/db";
import { diaDe, somarDias } from "../src/lib/constelacao/dia";
import type { Tema } from "../src/lib/constelacao/config";

if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  console.error("Seed de exemplo: só em desenvolvimento.");
  process.exit(1);
}

// Palavras genéricas da cultura geek, sem acento. Sem marcas, franquias ou personagens. Quatro semanas de tema + 2 dias.
const SEMANAS: { tema: Tema; palavras: [string, string][] }[] = [
  { tema: "rpg", palavras: [["DRAGAO", "Guarda tesouros e cospe fogo"], ["ESPADA", "Arma de lâmina de quem enfrenta o chefe"], ["TAVERNA", "Onde o grupo se encontra pra começar a aventura"], ["MAGICO", "Quem lança feitiços"], ["ESCUDO", "Defende o golpe"], ["GUILDA", "Grupo de aventureiros com sede e regras"], ["PORTAL", "Passagem entre dois mundos"]] },
  { tema: "ficcao-cientifica", palavras: [["ROBOS", "Máquinas que andam e obedecem"], ["FOGUETE", "Sobe pro espaço"], ["GALAXIA", "Um conjunto enorme de estrelas"], ["PLANETA", "Gira em volta de uma estrela"], ["COMETA", "Bola de gelo com cauda brilhante"], ["ORBITA", "O caminho em volta de um astro"], ["LASER", "Feixe de luz concentrada"]] },
  { tema: "games", palavras: [["PIXEL", "O menor quadradinho da tela"], ["MISSAO", "Tarefa dada ao jogador"], ["TROFEU", "Prêmio por uma conquista"], ["MOCHILA", "Onde o jogador guarda os itens"], ["RANKING", "Lista de quem fez mais pontos"], ["TURNO", "A vez de cada jogador"], ["CHEFE", "O inimigo do fim da fase"]] },
  { tema: "quadrinhos", palavras: [["HEROI", "Salva o dia"], ["VILAO", "Atrapalha os planos do herói"], ["BALAO", "Onde fica a fala"], ["MASCARA", "Esconde a identidade"], ["TIRINHA", "História curtinha em poucos quadros"], ["ARTISTA", "Quem desenha a história"], ["QUADRO", "Cada cena separada por uma moldura"]] },
  { tema: "anime", palavras: [["NINJA", "Age nas sombras"], ["SAMURAI", "Guerreiro com código de honra"]] },
];

const lista = SEMANAS.flatMap((s) => s.palavras.map(([answer, hint]) => ({ answer, hint, theme: s.tema })));
const hoje = diaDe(new Date());

async function main() {
  let novos = 0;
  for (const [i, p] of lista.entries()) {
    const dia = somarDias(hoje, i);
    const r = await sql`
      insert into daily_puzzles (date, answer, length, theme, hint)
      values (${dia}::date, ${p.answer}, ${p.answer.length}, ${p.theme}, ${p.hint})
      on conflict (date) do nothing returning id`;
    if (r.length > 0) novos++;
  }
  console.log(`Constelação do Dia: ${novos} palavras novas na agenda (${lista.length - novos} dias já tinham palavra).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
