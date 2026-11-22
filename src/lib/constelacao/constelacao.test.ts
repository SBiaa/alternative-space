import { describe, expect, it } from "vitest";
import { codificarGrade, decodificarGrade, textoCompartilhar } from "./compartilhar";
import { diaDe, formatarContagem, msAteVirar, somarDias } from "./dia";
import { avaliarPartida, normalizar, processarPalpite, visaoPublica } from "./jogo";
import { estadoDasLetras, retornoPorLetra, type Estado } from "./retorno";
import { migrarSave, resolverSave, saveVazio, sequenciaDoSave } from "./save";
import { calcularSequencia, sequenciaVigente } from "./sequencia";

const C = "certa" as const;
const O = "outro" as const;
const A = "ausente" as const;

describe("retorno por letra", () => {
  it("marca certas, de outro lugar e ausentes", () => {
    expect(retornoPorLetra("PORTAL", "PORTAL")).toEqual([C, C, C, C, C, C]);
    expect(retornoPorLetra("PORTAL", "LATROP")).toEqual([O, O, O, O, O, O]);
    expect(retornoPorLetra("PIXEL", "ROBOS")).toEqual([A, A, A, A, A]);
  });

  it("letra repetida no palpite só acende o que a resposta tem", () => {
    // Resposta com um A só: o primeiro A do palpite é de outro lugar, o segundo não existe mais.
    expect(retornoPorLetra("NINJA", "AAAAA")).toEqual([A, A, A, A, C]);
    expect(retornoPorLetra("ESCUDO", "SESSAO")).toEqual([O, O, A, A, A, C]);
    expect(retornoPorLetra("GUILDA", "GALAXIA")).toEqual([A, A, A, A, A, A]); // tamanho diferente: nada acende
  });

  it("a letra certa tem prioridade sobre a de outro lugar", () => {
    // Resposta ROBOS: um R, dois O. Palpite OROOS: R de outro lugar, O (2º) e O (3º) disputam os dois O.
    expect(retornoPorLetra("ROBOS", "OROOS")).toEqual([O, O, A, C, C]);
    // Resposta TURNO com um T; palpite TTTTT: só a primeira posição é certa, o resto apaga.
    expect(retornoPorLetra("TURNO", "TTTTT")).toEqual([C, A, A, A, A]);
    // A certa vem depois da errada: o O do meio não rouba a ocorrência da certa.
    expect(retornoPorLetra("MOCHILA", "OOOOOOO")).toEqual([A, C, A, A, A, A, A]);
  });

  it("resume o melhor estado de cada letra pro teclado", () => {
    const m = estadoDasLetras(["PIXELS"], [retornoPorLetra("PORTAL", "PIXELS")]);
    expect(m.get("P")).toBe(C);
    expect(m.get("I")).toBe(A);
    expect(m.get("L")).toBe(O);
    // Um estado melhor numa tentativa seguinte vence o anterior.
    const m2 = estadoDasLetras(["PIXELS", "PORTAL"], [retornoPorLetra("PORTAL", "PIXELS"), retornoPorLetra("PORTAL", "PORTAL")]);
    expect(m2.get("L")).toBe(C);
  });
});

describe("partida", () => {
  const validas = new Set(["PIXEL", "NINJA", "ROBOS", "LASER", "HEROI", "VILAO"]);

  it("tira acentos e ignora o que não é letra", () => {
    expect(normalizar("dragão")).toBe("DRAGAO");
    expect(normalizar("Ação!")).toBe("ACAO");
  });

  it("para ao acertar e ao esgotar as tentativas", () => {
    const acerto = avaliarPartida("NINJA", ["PIXEL", "NINJA", "LASER"], validas);
    expect(acerto).toMatchObject({ solved: true, finalizada: true });
    expect(acerto.palpites).toEqual(["PIXEL", "NINJA"]);
    const seis = avaliarPartida("NINJA", Array(8).fill("PIXEL"), validas);
    expect(seis.palpites).toHaveLength(6);
    expect(seis).toMatchObject({ solved: false, finalizada: true });
  });

  it("corta no primeiro palpite inválido", () => {
    const p = avaliarPartida("NINJA", ["PIXEL", "ZZZZZ", "LASER"], validas);
    expect(p.palpites).toEqual(["PIXEL"]);
  });

  it("a resposta vale como palpite mesmo fora da lista", () => {
    expect(avaliarPartida("MAGICO", ["MAGICO"], new Set()).solved).toBe(true);
  });

  it("recusa palpite de tamanho errado, fora da lista e depois do fim", () => {
    const base = { resposta: "NINJA", validas };
    expect(processarPalpite({ ...base, anteriores: [], palpite: "PIX" })).toEqual({ ok: false, erro: "tamanho" });
    expect(processarPalpite({ ...base, anteriores: [], palpite: "ZZZZZ" })).toEqual({ ok: false, erro: "invalida" });
    expect(processarPalpite({ ...base, anteriores: ["NINJA"], palpite: "PIXEL" })).toEqual({ ok: false, erro: "finalizada" });
    const ok = processarPalpite({ ...base, anteriores: ["PIXEL"], palpite: "ninja" });
    expect(ok).toMatchObject({ ok: true, partida: { solved: true } });
  });
});

describe("conferência no servidor sem expor a resposta", () => {
  const validas = new Set(["PIXEL", "LASER"]);

  it("a visão pública não leva a resposta enquanto a partida está aberta", () => {
    const r = processarPalpite({ resposta: "NINJA", validas, anteriores: [], palpite: "PIXEL" });
    if (!r.ok) throw new Error("esperava ok");
    const visao = visaoPublica("NINJA", r.partida);
    expect(visao.resposta).toBeNull();
    expect(JSON.stringify(visao)).not.toContain("NINJA");
    expect(visao.retornos[0]).toEqual([A, C, A, A, A]); // só o I está no lugar certo
  });

  it("a resposta só aparece no fim: acerto ou sexta tentativa", () => {
    const acerto = avaliarPartida("NINJA", ["NINJA"], validas);
    expect(visaoPublica("NINJA", acerto).resposta).toBe("NINJA");
    const fim = avaliarPartida("NINJA", Array(6).fill("PIXEL"), validas);
    expect(visaoPublica("NINJA", fim).resposta).toBe("NINJA");
    const aberta = avaliarPartida("NINJA", Array(5).fill("PIXEL"), validas);
    expect(visaoPublica("NINJA", aberta).resposta).toBeNull();
  });

  it("a visão pública devolve só retorno por letra: nada além dos palpites do jogador revela a palavra", () => {
    const p = avaliarPartida("NINJA", ["PIXEL", "LASER"], validas);
    const chaves = Object.keys(visaoPublica("NINJA", p)).sort();
    expect(chaves).toEqual(["finalizada", "palpites", "resposta", "retornos", "solved", "tentativas"]);
  });
});

describe("virada do dia em Brasília", () => {
  it("usa o fuso de Brasília, não o UTC", () => {
    // 02:59 UTC ainda é o dia anterior em Brasília (UTC-3); 03:00 UTC já é o dia novo.
    expect(diaDe(new Date("2026-11-20T02:59:59Z"))).toBe("2026-11-19");
    expect(diaDe(new Date("2026-11-20T03:00:00Z"))).toBe("2026-11-20");
    expect(diaDe(new Date("2026-11-20T23:30:00-03:00"))).toBe("2026-11-20");
    expect(diaDe(new Date("2026-11-21T00:00:00-03:00"))).toBe("2026-11-21");
  });

  it("conta o tempo até a meia-noite de Brasília", () => {
    expect(msAteVirar(new Date("2026-11-20T23:59:00-03:00"))).toBe(60_000);
    expect(msAteVirar(new Date("2026-11-20T00:00:00-03:00"))).toBe(24 * 3_600_000);
    expect(msAteVirar(new Date("2026-11-20T02:59:59.500Z"))).toBe(500);
  });

  it("soma dias e formata a contagem", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(formatarContagem(3_725_000)).toBe("01:02:05");
  });
});

describe("sequência", () => {
  it("mantém e soma em dias seguidos", () => {
    const s = calcularSequencia([
      { dia: "2026-11-18", solved: true },
      { dia: "2026-11-19", solved: true },
      { dia: "2026-11-20", solved: true },
    ]);
    expect(s).toEqual({ current: 3, best: 3, lastDate: "2026-11-20" });
  });

  it("quebra ao errar e ao pular um dia, sem perder o recorde", () => {
    const errou = calcularSequencia([
      { dia: "2026-11-17", solved: true },
      { dia: "2026-11-18", solved: true },
      { dia: "2026-11-19", solved: false },
      { dia: "2026-11-20", solved: true },
    ]);
    expect(errou).toEqual({ current: 1, best: 2, lastDate: "2026-11-20" });
    const pulou = calcularSequencia([
      { dia: "2026-11-10", solved: true },
      { dia: "2026-11-11", solved: true },
      { dia: "2026-11-13", solved: true },
    ]);
    expect(pulou).toEqual({ current: 1, best: 2, lastDate: "2026-11-13" });
  });

  it("registra novo recorde quando a atual passa do melhor", () => {
    const s = calcularSequencia([
      { dia: "2026-11-01", solved: true },
      { dia: "2026-11-02", solved: false },
      { dia: "2026-11-03", solved: true },
      { dia: "2026-11-04", solved: true },
      { dia: "2026-11-05", solved: true },
    ]);
    expect(s).toEqual({ current: 3, best: 3, lastDate: "2026-11-05" });
  });

  it("ignora a ordem de entrada e o dia repetido", () => {
    const s = calcularSequencia([
      { dia: "2026-11-02", solved: true },
      { dia: "2026-11-01", solved: true },
      { dia: "2026-11-02", solved: false },
    ]);
    expect(s).toEqual({ current: 2, best: 2, lastDate: "2026-11-02" });
  });

  it("zera a atual de quem não jogou ontem nem hoje", () => {
    const s = { current: 4, best: 6, lastDate: "2026-11-18" };
    expect(sequenciaVigente(s, "2026-11-19").current).toBe(4);
    expect(sequenciaVigente(s, "2026-11-18").current).toBe(4);
    expect(sequenciaVigente(s, "2026-11-20")).toEqual({ current: 0, best: 6, lastDate: "2026-11-18" });
  });
});

describe("save local e migração pra conta", () => {
  const validas = new Set(["PIXEL", "LASER", "ROBOS"]);
  const puzzles = new Map([
    ["2026-11-18", { answer: "NINJA" }],
    ["2026-11-19", { answer: "ROBOS" }],
    ["2026-11-20", { answer: "LASER" }],
    ["2026-11-21", { answer: "PIXEL" }],
  ]);

  it("aceita save válido e recusa lixo", () => {
    expect(migrarSave(null)).toBeNull();
    expect(migrarSave({ versao: 2, dias: {} })).toBeNull();
    expect(migrarSave({ versao: 1, dias: { "2026-11-18": ["PIXEL", "nao"] } })).toBeNull();
    expect(migrarSave({ versao: 1, dias: { amanha: ["PIXEL"] } })).toBeNull();
    expect(migrarSave({ dias: { "2026-11-18": ["PIXEL"] } })).toEqual({ versao: 1, dias: { "2026-11-18": ["PIXEL"] } });
    expect(migrarSave(saveVazio())).toEqual(saveVazio());
  });

  it("o servidor reconfere cada dia e reconstrói a sequência", () => {
    const save = migrarSave({
      versao: 1,
      dias: {
        "2026-11-18": ["PIXEL", "NINJA"],
        "2026-11-19": ["ROBOS"],
        "2026-11-20": ["LASER"],
        "2026-11-21": ["PIXEL"], // dia que ainda não chegou: ignorado
      },
    })!;
    const dias = resolverSave(save, puzzles, "2026-11-20", validas);
    expect(dias.map((d) => d.dia)).toEqual(["2026-11-18", "2026-11-19", "2026-11-20"]);
    expect(dias.every((d) => d.partida.solved)).toBe(true);
    expect(sequenciaDoSave(dias)).toEqual({ current: 3, best: 3, lastDate: "2026-11-20" });
  });

  it("não aceita vitória inventada: palpite que não é a resposta não vira acerto", () => {
    const save = migrarSave({ versao: 1, dias: { "2026-11-18": ["PIXEL", "LASER", "ROBOS", "PIXEL", "LASER", "ROBOS"] } })!;
    const [d] = resolverSave(save, puzzles, "2026-11-20", validas);
    expect(d.partida).toMatchObject({ solved: false, finalizada: true });
    expect(sequenciaDoSave([d])).toEqual({ current: 0, best: 0, lastDate: "2026-11-18" });
  });

  it("partida em andamento migra sem entrar na sequência", () => {
    const save = migrarSave({ versao: 1, dias: { "2026-11-20": ["PIXEL"] } })!;
    const dias = resolverSave(save, puzzles, "2026-11-20", validas);
    expect(dias[0].partida.finalizada).toBe(false);
    expect(sequenciaDoSave(dias).current).toBe(0);
  });
});

describe("compartilhar", () => {
  const retornos: Estado[][] = [retornoPorLetra("NINJA", "PIXEL"), retornoPorLetra("NINJA", "NINJA")];

  it("traz a grade de estrelas e nunca a palavra", () => {
    const t = textoCompartilhar({ dia: "2026-11-20", solved: true, retornos, url: "https://exemplo.test/jogos/constelacao" });
    expect(t).toContain("20/11/2026");
    expect(t).toContain("2/6");
    expect(t).toContain("★★★★★");
    expect(t).not.toContain("NINJA");
    expect(t).not.toContain("PIXEL");
  });

  it("codifica e decodifica a grade da imagem, recusando entrada torta", () => {
    expect(decodificarGrade(codificarGrade(retornos))).toEqual(retornos);
    expect(decodificarGrade("ccccc-cc")).toBeNull();
    expect(decodificarGrade("xxxxx")).toBeNull();
    expect(decodificarGrade(Array(7).fill("ccccc").join("-"))).toBeNull();
    expect(decodificarGrade(undefined)).toBeNull();
  });
});
