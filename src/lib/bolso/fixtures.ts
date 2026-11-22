// Aventura e personagem mínimas só pros testes. Não é conteúdo do jogo.
import { validarAventura, type Aventura } from "./conteudo";
import { personagemPadrao, type Personagem } from "./personagem";

export const personagemTeste = (o: Partial<Personagem> = {}): Personagem => ({
  ...personagemPadrao(),
  nome: "Teste",
  attrs: { corpo: 2, mente: 3, labia: 2 },
  talentos: ["observador", "corredor"],
  ...o,
});

export const aventuraBruta = {
  slug: "teste",
  titulo: "Teste",
  tema: "fantasia",
  resumo: "Só pra testar.",
  duracaoMin: 10,
  classificacao: "Livre",
  inicio: "a",
  finalFolego: "f-folego",
  itens: [{ id: "chave", nome: "Chave", descricao: "Abre coisas." }],
  marcas: [{ id: "valente", nome: "Valente", descricao: "Encarou o desafio." }],
  cenas: [
    {
      id: "a",
      texto: "Começo.",
      opcoes: [
        {
          id: "arriscar",
          texto: "Arriscar",
          teste: { atributo: "mente", dificuldade: 8, talentos: ["observador"] },
          efeitos: { sucesso: { itens: ["chave"] }, custo: { folego: -1 }, falha: { folego: -2 } },
          proxima: "b",
          desvios: { falha: "c" },
        },
        { id: "cansar", texto: "Gastar tudo", efeitos: { sucesso: { folego: -6 } }, proxima: "b" },
        { id: "pegar-marca", texto: "Ser valente", efeitos: { sucesso: { marcas: ["valente"] } }, proxima: "b" },
      ],
    },
    {
      id: "b",
      texto: "Meio.",
      opcoes: [
        { id: "porta", texto: "Abrir com a chave", requisito: { item: "chave" }, proxima: "f-bom" },
        { id: "fim", texto: "Seguir", proxima: "f-custo" },
      ],
    },
    { id: "c", texto: "Desvio.", opcoes: [{ id: "seguir", texto: "Seguir", proxima: "f-custo" }] },
    { id: "f-bom", texto: "Bom.", opcoes: [], final: { id: "bom", titulo: "Deu certo", tipo: "bom", resumo: "Tudo certo." } },
    { id: "f-custo", texto: "Custo.", opcoes: [], final: { id: "custo", titulo: "Com custo", tipo: "custo", resumo: "Quase tudo certo." } },
    { id: "f-folego", texto: "Sem pique.", opcoes: [], final: { id: "folego", titulo: "Sem pique", tipo: "alternativo", resumo: "Parou pra descansar." } },
  ],
};

export const aventuraTeste = (): Aventura => {
  const r = validarAventura(aventuraBruta);
  if (!r.aventura) throw new Error(r.problemas.join("; "));
  return r.aventura;
};
