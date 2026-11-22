import { describe, expect, it } from "vitest";
import { aplicarAcao, lerAcao } from "./acoes";
import { carregarAgulha, faltaParaCarregar } from "./barco";
import { ILHA, MUNDO } from "./conteudo";
import { proximaDaAgulha } from "./estado";
import { menorRota, TRECHOS } from "./rotas";
import { avanco, escolherSave, migrar, prepararMigracaoLocal, saveCoerente } from "./save";
import { jogarHistoria, MIN, novoPirata, T0, viajar } from "./teste-util";
import { planejarViagem, sortearEventos, zarpar } from "./viagem";

const ordem = MUNDO.agulha.ordem;

describe("rotas e tempo de viagem", () => {
  it("cada mar de origem chega ao Monte pelo canal, e só por ele", () => {
    for (const m of MUNDO.mares) {
      const r = menorRota(m.ilhaOrigem, MUNDO.monte)!;
      expect(r.nos).toEqual([m.ilhaOrigem, m.bocaDoCanal, MUNDO.monte]);
      expect(r.trechos.map((t) => t.tipo)).toEqual(["mar", "canal"]);
    }
  });

  it("a rota segue as arestas e nunca inventa atalho por cima da Espinha", () => {
    const arestas = new Set(TRECHOS.flatMap((t) => [`${t.de}|${t.para}`, `${t.para}|${t.de}`]));
    const r = menorRota("pedra-salgada", "arquipelago-nuvem")!;
    for (let i = 0; i < r.nos.length - 1; i++) expect(arestas.has(`${r.nos[i]}|${r.nos[i + 1]}`)).toBe(true);
    expect(r.nos.at(-1)).toBe("arquipelago-nuvem");
  });

  it("não há rota para um ponto que não existe", () => {
    expect(menorRota("pedra-salgada", "lugar-nenhum")).toBeNull();
  });

  it("tempo = distância × velocidade × modificadores (conta feita na mão)", () => {
    // Sem ofício que mude o tempo, sem bônus de mar, casco cheio: só distância × minutos por légua × vento.
    let e = novoPirata("austral", "cozinheira");
    e = { ...e, barco: { ...e.barco, casco: MUNDO.barco.cascoBase, mantimentos: MUNDO.barco.mantimentosBase } };
    const p = planejarViagem(e, MUNDO.monte);
    if (!p.ok) throw new Error(p.erro);
    const base = p.plano.rota.graus * MUNDO.navegacao.leguasPorGrau * MUNDO.navegacao.minutosPorLegua;
    expect(p.plano.minutos).toBeCloseTo(base * p.plano.vento, 0);
  });

  it("navegador viaja mais rápido que cozinheira; velas melhores encurtam mais", () => {
    const base = (of: string, mar = "austral") => {
      const e = { ...novoPirata(mar, of) };
      e.barco = { ...e.barco, casco: MUNDO.barco.cascoBase, mantimentos: MUNDO.barco.mantimentosBase };
      const p = planejarViagem(e, MUNDO.monte);
      if (!p.ok) throw new Error(p.erro);
      return { e, min: p.plano.minutos };
    };
    const nav = base("navegador");
    const coz = base("cozinheira");
    expect(nav.min).toBeLessThan(coz.min);
    const comVelas = { ...coz.e, barco: { ...coz.e.barco, melhorias: ["velas-melhores"] } };
    const p = planejarViagem(comVelas, MUNDO.monte);
    if (!p.ok) throw new Error(p.erro);
    expect(p.plano.minutos).toBeLessThan(coz.min);
  });

  it("o tempo de cada viagem fica entre minutos e algumas horas", () => {
    for (const m of MUNDO.mares) {
      const e = novoPirata(m.id);
      const p = planejarViagem(e, MUNDO.monte);
      if (!p.ok) throw new Error(p.erro);
      expect(p.plano.minutos).toBeGreaterThan(5);
      expect(p.plano.minutos).toBeLessThan(6 * 60);
    }
  });
});

describe("viagem: começo, fim e uma de cada vez", () => {
  it("zarpar grava partiuEm e chegaEm do servidor, e muda nada de local", () => {
    const e = novoPirata();
    const r = zarpar(e, MUNDO.monte, T0);
    if (!r.ok) throw new Error(r.erro);
    expect(r.estado.viagem!.partiuEm).toBe(T0);
    expect(r.estado.viagem!.chegaEm).toBeGreaterThan(T0);
    expect(r.estado.barco.ilhaAtual).toBe("pedra-salgada"); // ainda no porto até chegar
  });

  it("só termina se agora >= chegaEm", () => {
    const z = zarpar(novoPirata(), MUNDO.monte, T0);
    if (!z.ok) throw new Error(z.erro);
    const cedo = aplicarAcao(z.estado, { t: "chegar" }, z.estado.viagem!.chegaEm - 1);
    expect(cedo).toEqual({ ok: false, erro: "nao-chegou" });
    const hora = aplicarAcao(z.estado, { t: "chegar" }, z.estado.viagem!.chegaEm);
    expect(hora.ok).toBe(true);
    if (hora.ok) expect(hora.estado.barco.ilhaAtual).toBe(MUNDO.monte);
  });

  it("não começa outra viagem com uma em andamento, nem com eventos por resolver", () => {
    const z = zarpar(novoPirata(), MUNDO.monte, T0);
    if (!z.ok) throw new Error(z.erro);
    expect(zarpar(z.estado, MUNDO.monte, T0 + 1)).toEqual({ ok: false, erro: "viagem-em-andamento" });
    const c = aplicarAcao(z.estado, { t: "chegar" }, z.estado.viagem!.chegaEm);
    if (!c.ok) throw new Error(c.erro);
    expect(c.estado.viagem!.eventos.length).toBeGreaterThan(0);
    expect(zarpar(c.estado, "ilha-do-relogio-quebrado", z.estado.viagem!.chegaEm)).toEqual({ ok: false, erro: "viagem-em-andamento" });
  });

  it("depois de resolver todos os eventos, a viagem fecha e uma nova pode começar", () => {
    const { estado } = viajar(novoPirata(), MUNDO.monte, T0);
    expect(estado.viagem!.resolvida).toBe(true);
    expect(planejarViagem(estado, "pedra-salgada").ok).toBe(true);
  });

  it("não deixa zarpar pra ilha travada, pra onde já está, nem pra uma ilha que não existe", () => {
    const e = novoPirata();
    expect(zarpar(e, "areal-de-sal", T0)).toEqual({ ok: false, erro: "travada" });
    expect(zarpar(e, "pedra-salgada", T0)).toEqual({ ok: false, erro: "ja-la" });
    expect(zarpar(e, "recife-das-lanternas", T0)).toEqual({ ok: false, erro: "travada" });
    expect(zarpar(e, "nao-existe", T0)).toEqual({ ok: false, erro: "sem-ilha" });
  });

  it("evento só se resolve depois da chegada, na ordem e com opção válida", () => {
    const z = zarpar(novoPirata(), MUNDO.monte, T0);
    if (!z.ok) throw new Error(z.erro);
    const ev = z.estado.viagem!.eventos[0];
    expect(aplicarAcao(z.estado, { t: "evento", id: ev.id, opcao: "x" }, T0)).toEqual({ ok: false, erro: "nao-chegou" });
    const c = aplicarAcao(z.estado, { t: "chegar" }, z.estado.viagem!.chegaEm);
    if (!c.ok) throw new Error(c.erro);
    expect(aplicarAcao(c.estado, { t: "evento", id: ev.id, opcao: "inventada" }, T0)).toEqual({ ok: false, erro: "opcao-invalida" });
    expect(aplicarAcao(c.estado, { t: "evento", id: "outro-evento", opcao: "x" }, T0)).toEqual({ ok: false, erro: "evento-invalido" });
  });

  it("o cliente não escolhe valores: ação com formato errado é descartada", () => {
    expect(lerAcao({ t: "zarpar" })).toBeNull();
    expect(lerAcao({ t: "ouro", valor: 999 })).toBeNull();
    expect(lerAcao({ t: "cena", ilha: "pedra-salgada", opcao: 5 })).toBeNull();
    expect(lerAcao({ t: "zarpar", destino: "areal-de-sal" })).toEqual({ t: "zarpar", destino: "areal-de-sal" });
  });
});

describe("eventos de viagem com semente", () => {
  it("mesma seed e mesma viagem dão os mesmos eventos", () => {
    const a = sortearEventos("sementeum", 3, 120, ["mar", "canal", "corrente"]);
    const b = sortearEventos("sementeum", 3, 120, ["mar", "canal", "corrente"]);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("outra seed ou outro número de viagem mudam o sorteio (em alguma das tentativas)", () => {
    const base = JSON.stringify(sortearEventos("sementeum", 1, 120, ["corrente"]));
    const outras = Array.from({ length: 12 }, (_, i) => JSON.stringify(sortearEventos(`semente${i}x`, 1 + i, 120, ["corrente"])));
    expect(outras.some((o) => o !== base)).toBe(true);
  });

  it("sem trecho de Corrente não sai criatura do Mar Parado", () => {
    for (let n = 1; n < 40; n++) {
      for (const ev of sortearEventos("seedcriatura", n, 200, ["mar", "canal"])) expect(ev.id.startsWith("criatura")).toBe(false);
    }
  });

  it("no jogo, o plano da viagem repete igual com o mesmo estado", () => {
    const e = novoPirata();
    const a = planejarViagem(e, MUNDO.monte);
    const b = planejarViagem(e, MUNDO.monte);
    expect(a).toEqual(b);
  });

  it("nunca repete o mesmo evento na mesma viagem quando há outros", () => {
    const ev = sortearEventos("umaseedqualquer", 7, 400, ["mar", "canal", "corrente"]);
    expect(new Set(ev.map((x) => x.id)).size).toBe(ev.length);
  });
});

describe("mantimentos", () => {
  it("a viagem gasta mantimentos ao chegar, sem passar de zero", () => {
    const e = novoPirata();
    const { estado } = viajar(e, MUNDO.monte, T0);
    expect(estado.barco.mantimentos).toBeLessThan(e.barco.mantimentos);
    expect(estado.barco.mantimentos).toBeGreaterThanOrEqual(0);
  });

  it("sem mantimentos a viagem fica mais lenta, e os eventos pioram", () => {
    const cheio = novoPirata("boreal", "navegador");
    const vazio = { ...cheio, barco: { ...cheio.barco, mantimentos: 0 } };
    const pc = planejarViagem(cheio, MUNDO.monte);
    const pv = planejarViagem(vazio, MUNDO.monte);
    if (!pc.ok || !pv.ok) throw new Error("plano");
    expect(pv.plano.faltouMantimento).toBe(true);
    expect(pc.plano.faltouMantimento).toBe(false);
    expect(pv.plano.minutos).toBeGreaterThan(pc.plano.minutos * (MUNDO.navegacao.fatorSemMantimentos - 0.01));

    // Eventos: o dano de uma tempestade dói mais com fome.
    const zc = zarpar(cheio, MUNDO.monte, T0);
    const zv = zarpar(vazio, MUNDO.monte, T0);
    if (!zc.ok || !zv.ok) throw new Error("zarpar");
    expect(zv.estado.viagem!.faltouMantimento).toBe(true);
  });

  it("a fome multiplica as perdas do evento", () => {
    const e = novoPirata("boreal", "navegador");
    const z = zarpar(e, MUNDO.monte, T0);
    if (!z.ok) throw new Error(z.erro);
    // Mesmo evento forçado: com fome, o casco perde mais.
    const forcado = (faltou: boolean) => {
      const v = { ...z.estado.viagem!, chegou: true, faltouMantimento: faltou, eventos: [{ id: "tempestade-curta", quando: 0.5, escolha: null }] };
      const est = { ...z.estado, viagem: v, barco: { ...z.estado.barco, casco: 100 } };
      const r = aplicarAcao(est, { t: "evento", id: "tempestade-curta", opcao: "enfrentar" }, T0);
      if (!r.ok) throw new Error(r.erro);
      return 100 - r.estado.barco.casco;
    };
    expect(forcado(true)).toBeGreaterThan(forcado(false));
  });

  it("abastecer e reparar custam ouro e respeitam o limite do barco", () => {
    // Pedra Salgada tem mercado; estaleiro só no Farol Velho e em Vela-Alta.
    let e = novoPirata();
    e = { ...e, ouro: 500, barco: { ...e.barco, mantimentos: 10 } };
    const r = aplicarAcao(e, { t: "abastecer" }, T0);
    if (!r.ok) throw new Error(r.erro);
    expect(r.estado.barco.mantimentos).toBe(MUNDO.barco.mantimentosBase);
    expect(r.estado.ouro).toBe(500 - (MUNDO.barco.mantimentosBase - 10) * MUNDO.barco.custoMantimentoPorPonto);
    expect(aplicarAcao(r.estado, { t: "abastecer" }, T0)).toEqual({ ok: false, erro: "nada-a-fazer" });
    expect(aplicarAcao(e, { t: "reparar" }, T0)).toEqual({ ok: false, erro: "sem-servico" });
    const pobre = { ...e, ouro: 0 };
    expect(aplicarAcao(pobre, { t: "abastecer" }, T0)).toEqual({ ok: false, erro: "sem-ouro" });
  });

  it("melhorias só se compram em estaleiro, com ouro, uma vez; as 'em breve' não se compram", () => {
    const base = novoPirata("nascente"); // Farol Velho tem estaleiro
    const rico = { ...base, ouro: 5000 };
    const r = aplicarAcao(rico, { t: "melhoria", id: "casco-reforcado" }, T0);
    if (!r.ok) throw new Error(r.erro);
    expect(r.estado.barco.melhorias).toContain("casco-reforcado");
    expect(r.estado.ouro).toBe(5000 - 250);
    expect(aplicarAcao(r.estado, { t: "melhoria", id: "casco-reforcado" }, T0)).toEqual({ ok: false, erro: "ja-tem" });
    expect(aplicarAcao(rico, { t: "melhoria", id: "casco-bolha" }, T0)).toEqual({ ok: false, erro: "em-breve" });
    expect(aplicarAcao({ ...base, ouro: 10 }, { t: "melhoria", id: "despensa" }, T0)).toEqual({ ok: false, erro: "sem-ouro" });
    expect(aplicarAcao(novoPirata("boreal"), { t: "melhoria", id: "despensa" }, T0)).toEqual({ ok: false, erro: "sem-servico" });
  });
});

describe("Agulha de Maré e a ordem do Lado Manso", () => {
  it("no começo só o Monte está liberado, e só dá pra navegar até ele", () => {
    const e = novoPirata();
    const liberadas = Object.entries(e.ilhas).filter(([, p]) => p.status === "liberada").map(([s]) => s);
    expect(liberadas).toEqual([MUNDO.monte]);
    expect(zarpar(e, ordem[1], T0)).toEqual({ ok: false, erro: "travada" });
  });

  it("chegar ao Monte cola a Agulha nele, ainda descarregada, e nada novo se libera", () => {
    const { estado } = viajar(novoPirata(), MUNDO.monte, T0);
    expect(estado.agulha).toMatchObject({ ilha: MUNDO.monte, carregada: false });
    expect(estado.ilhas[ordem[1]].status).toBe("travada");
    expect(proximaDaAgulha(estado)).toBeNull();
  });

  it("carregar a Agulha (ficando o tempo da config) aponta e libera a próxima ilha", () => {
    const { estado, agora } = viajar(novoPirata(), MUNDO.monte, T0);
    expect(carregarAgulha(estado, agora)).toEqual({ ok: false, erro: "nao-chegou" });
    expect(faltaParaCarregar(estado, agora)).toBeGreaterThan(0);
    const depois = agora + MUNDO.agulha.cargaSegundos * 1000;
    const r = aplicarAcao(estado, { t: "carregar" }, depois);
    if (!r.ok) throw new Error(r.erro);
    expect(proximaDaAgulha(r.estado)).toBe(ordem[1]);
    expect(r.estado.ilhas[ordem[1]].status).toBe("liberada");
    expect(r.estado.ilhas[ordem[2]].status).toBe("travada");
  });

  it("concluir a história de uma ilha também carrega a Agulha", () => {
    const { estado, agora } = viajar(novoPirata(), MUNDO.monte, T0);
    const fim = jogarHistoria(estado, MUNDO.monte, agora);
    expect(fim.ilhas[MUNDO.monte].status).toBe("concluida");
    expect(fim.ilhas[ordem[1]].status).toBe("liberada");
  });

  it("o Lado Manso abre em ordem, do Monte até o Arquipélago Nuvem, e nunca pula uma ilha", () => {
    let est = novoPirata("poente");
    let agora = T0;
    for (let i = 0; i < ordem.length; i++) {
      const slug = ordem[i];
      // Todas as seguintes ainda travadas antes de chegar nesta.
      for (const depois of ordem.slice(i + 1)) expect(est.ilhas[depois].status, `${depois} antes de ${slug}`).toBe("travada");
      const v = viajar({ ...est, ouro: est.ouro + 10, barco: { ...est.barco, mantimentos: 100, casco: 100 } }, slug, agora);
      est = v.estado;
      agora = v.agora + MIN;
      est = jogarHistoria(est, slug, agora);
      expect(est.ilhas[slug].status).toBe("concluida");
    }
    expect(est.ilhas[ordem.at(-1)!].status).toBe("concluida");
    // Depois da última ilha a Agulha não tem pra onde apontar: o resto é o Lado Bravo, que é "em breve".
    expect(proximaDaAgulha(est)).toBeNull();
  });

  it("não dá pra zarpar pra uma ilha do Lado Manso pulando a ordem", () => {
    const { estado } = viajar(novoPirata(), MUNDO.monte, T0);
    const r = zarpar(estado, ordem[3], T0 + 100 * MIN);
    expect(r).toEqual({ ok: false, erro: "travada" });
  });

  it("ilhas de origem de outros mares seguem travadas", () => {
    const e = novoPirata("boreal");
    for (const m of MUNDO.mares.filter((x) => x.id !== "boreal")) expect(e.ilhas[m.ilhaOrigem].status).toBe("travada");
  });
});

describe("histórias: efeitos e teto", () => {
  it("escolher aplica ouro, recompensa, item e passa pra próxima cena", () => {
    const e = novoPirata();
    // Pedra Salgada: "subir" -> "soltar" (ouro +30) -> fim com item e +150 de recompensa.
    const j = jogarHistoria(e, "pedra-salgada", T0);
    expect(j.ilhas["pedra-salgada"].status).toBe("concluida");
    expect(j.itens).toContain("sino-de-pedra");
    expect(j.ouro).toBe(e.ouro + 30);
    expect(j.recompensa).toBe(150);
  });

  it("escolhas de bom coração também sobem a recompensa (caminho do cais)", () => {
    const e = novoPirata();
    const j = jogarHistoria(e, "pedra-salgada", T0, (cena) => (cena === "chegada" ? 1 : 0));
    expect(j.recompensa).toBeGreaterThan(150);
    expect(j.barco.mantimentos).toBe(Math.max(0, e.barco.mantimentos - 5));
  });

  it("a recompensa de uma história nunca passa do teto da ilha, mesmo com conteúdo exagerado", () => {
    const orig = ILHA["pedra-salgada"].recompensaMax;
    const e = novoPirata();
    try {
      ILHA["pedra-salgada"].recompensaMax = { ouro: 5, recompensa: 100 };
      const j = jogarHistoria(e, "pedra-salgada", T0, (cena) => (cena === "chegada" ? 1 : 0));
      expect(j.recompensa).toBeLessThanOrEqual(100);
      expect(j.ilhas["pedra-salgada"].ganhoRecompensa).toBeLessThanOrEqual(100);
      expect(j.ouro - e.ouro).toBeLessThanOrEqual(5);
    } finally {
      ILHA["pedra-salgada"].recompensaMax = orig;
    }
  });

  it("não dá pra jogar a mesma ilha de novo pra juntar mais recompensa", () => {
    const e = jogarHistoria(novoPirata(), "pedra-salgada", T0);
    expect(aplicarAcao(e, { t: "cena", ilha: "pedra-salgada", opcao: "subir" }, T0)).toEqual({ ok: false, erro: "nada-a-fazer" });
  });

  it("só dá pra jogar a história da ilha onde o barco está, e com uma opção da cena atual", () => {
    const e = novoPirata();
    expect(aplicarAcao(e, { t: "cena", ilha: "recife-das-lanternas", opcao: "prometer" }, T0)).toEqual({ ok: false, erro: "fora-da-ilha" });
    expect(aplicarAcao(e, { t: "cena", ilha: "pedra-salgada", opcao: "soltar" }, T0)).toEqual({ ok: false, erro: "opcao-invalida" });
  });

  it("opção que custa ouro pede ouro", () => {
    // Inverno Parado: "oferecer" custa 20 de ouro. Aqui o pirata tem pouco ouro.
    const e = novoPirata();
    const noInverno = { ...e, ouro: 5, barco: { ...e.barco, ilhaAtual: "ilha-do-inverno-parado" }, ilhas: { ...e.ilhas, "ilha-do-inverno-parado": { ...e.ilhas["ilha-do-inverno-parado"], status: "visitada" as const } } };
    expect(aplicarAcao(noInverno, { t: "cena", ilha: "ilha-do-inverno-parado", opcao: "oferecer" }, T0)).toEqual({ ok: false, erro: "sem-ouro" });
  });

  it("o ouro e a recompensa de eventos respeitam o teto por evento", () => {
    const z = zarpar(novoPirata(), MUNDO.monte, T0);
    if (!z.ok) throw new Error(z.erro);
    const v = { ...z.estado.viagem!, chegou: true, eventos: [{ id: "criatura-sombra", quando: 0.5, escolha: null }] };
    const est = { ...z.estado, viagem: v };
    const r = aplicarAcao(est, { t: "evento", id: "criatura-sombra", opcao: "cantar" }, T0);
    if (!r.ok) throw new Error(r.erro);
    expect(r.estado.recompensa).toBeLessThanOrEqual(MUNDO.economia.eventoRecompensaMax);
  });

  it("o ofício dá vantagem em eventos do tipo dele", () => {
    const resolver = (oficio: string) => {
      const z = zarpar(novoPirata("boreal", oficio), MUNDO.monte, T0);
      if (!z.ok) throw new Error(z.erro);
      const v = { ...z.estado.viagem!, chegou: true, eventos: [{ id: "naufrago-balsa", quando: 0.5, escolha: null }] };
      const r = aplicarAcao({ ...z.estado, viagem: v }, { t: "evento", id: "naufrago-balsa", opcao: "resgatar" }, T0);
      if (!r.ok) throw new Error(r.erro);
      return r.estado.recompensa;
    };
    expect(resolver("medico")).toBeGreaterThan(resolver("atirador"));
  });
});

describe("save: migração e coerência", () => {
  it("um save atual passa pela migração e pela coerência", () => {
    const e = novoPirata();
    const m = migrar(JSON.parse(JSON.stringify(e)));
    expect(m).not.toBeNull();
    expect(saveCoerente(m!)).toBe(true);
  });

  it("migrar recusa lixo e versão do futuro", () => {
    expect(migrar(null)).toBeNull();
    expect(migrar({ v: 1, nome: 3 })).toBeNull();
    expect(migrar({ ...novoPirata(), v: 999 })).toBeNull();
  });

  it("migrar trata save sem versão como a primeira", () => {
    const { v: _v, ...semV } = novoPirata();
    void _v;
    expect(migrar(semV)?.v).toBe(1);
  });

  it("save com ouro ou recompensa impossíveis não vai pra conta", () => {
    const e = novoPirata();
    expect(prepararMigracaoLocal({ ...e, ouro: 9_999_999 })).toBeNull();
    expect(prepararMigracaoLocal({ ...e, recompensa: 9_999_999 })).toBeNull();
  });

  it("save com ilha concluída sem a história feita, ou item que não existe, não vai pra conta", () => {
    const e = novoPirata();
    const fraude = { ...e, ilhas: { ...e.ilhas, "pedra-salgada": { ...e.ilhas["pedra-salgada"], status: "concluida" as const } } };
    expect(prepararMigracaoLocal(fraude)).toBeNull();
    expect(prepararMigracaoLocal({ ...e, itens: ["espada-lendaria"] })).toBeNull();
  });

  it("o save local jogado de verdade migra pra conta, soltando só uma viagem no meio", () => {
    const { estado, agora } = viajar(novoPirata(), MUNDO.monte, T0);
    const jogado = jogarHistoria(estado, MUNDO.monte, agora);
    const z = zarpar(jogado, ordem[1], agora);
    if (!z.ok) throw new Error(z.erro);
    const bruto = JSON.parse(JSON.stringify(z.estado));
    const m = prepararMigracaoLocal(bruto);
    expect(m).not.toBeNull();
    expect(m!.viagem).toBeNull();
    expect(m!.recompensa).toBe(jogado.recompensa);
    expect(m!.ilhas[MUNDO.monte].status).toBe("concluida");
    expect(m!.versao).toBe(1);
  });

  it("entre o save do aparelho e o da conta, o mais avançado vence", () => {
    const novo = novoPirata();
    const { estado, agora } = viajar(novo, MUNDO.monte, T0);
    const adiantado = jogarHistoria(estado, MUNDO.monte, agora);
    expect(avanco(adiantado)).toBeGreaterThan(avanco(novo));
    expect(escolherSave(adiantado, novo).origem).toBe("local");
    expect(escolherSave(novo, adiantado).origem).toBe("remoto");
    expect(escolherSave(null, null).origem).toBe("nenhum");
    expect(escolherSave(novo, null).origem).toBe("local");
    expect(escolherSave(null, novo).origem).toBe("remoto");
  });
});

describe("criação do pirata", () => {
  const ok = { nome: "Rosa", aparencia: { silhueta: "esguio", cor: "cobre", chapeu: "nenhum", cicatriz: "nenhuma" }, mar: "poente", oficio: "musico", barco: "Maré Alta", bandeira: { fundo: "liso", fundoCor: "azul", forma: "lua", formaCor: "creme" }, seed: "abcdef123" };

  it("o mar de origem define a ilha inicial e o bônus pequeno (Austral começa com mais ouro)", async () => {
    const { criarPirata } = await import("./estado");
    const a = criarPirata({ ...ok, mar: "austral" }, T0);
    const b = criarPirata({ ...ok, mar: "boreal" }, T0);
    if (!a.ok || !b.ok) throw new Error("criar");
    expect(a.estado.barco.ilhaAtual).toBe("recife-das-lanternas");
    expect(b.estado.barco.ilhaAtual).toBe("pedra-salgada");
    expect(a.estado.ouro).toBeGreaterThan(b.estado.ouro);
  });

  it("recusa nome vazio, mar inventado, peça que não existe e bandeira de uma cor só", async () => {
    const { criarPirata } = await import("./estado");
    expect(criarPirata({ ...ok, nome: "  " }, T0)).toEqual({ ok: false, erro: "nome" });
    expect(criarPirata({ ...ok, mar: "atlantico" }, T0)).toEqual({ ok: false, erro: "mar" });
    expect(criarPirata({ ...ok, aparencia: { ...ok.aparencia, chapeu: "coroa-de-ouro" } }, T0)).toEqual({ ok: false, erro: "aparencia" });
    expect(criarPirata({ ...ok, bandeira: { ...ok.bandeira, formaCor: "azul" } }, T0)).toEqual({ ok: false, erro: "bandeira" });
    expect(criarPirata({ ...ok, oficio: "rei" }, T0)).toEqual({ ok: false, erro: "oficio" });
  });

  it("limpa o nome (sem tags nem espaços sobrando)", async () => {
    const { criarPirata } = await import("./estado");
    const r = criarPirata({ ...ok, nome: "  <b>Rosa</b>   do  Mar " }, T0);
    if (!r.ok) throw new Error(r.erro);
    expect(r.estado.nome).toBe("bRosa/b do Mar");
  });
});
