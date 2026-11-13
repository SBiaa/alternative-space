// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Web Audio de mentira: só conta o que foi criado.
const criados = { osc: 0, ruido: 0 };
function param() {
  return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} };
}
function no() {
  return { connect: (x: unknown) => x ?? no(), gain: param(), frequency: param(), Q: param(), type: "" };
}
class FakeAudioContext {
  state = "running";
  currentTime = 0;
  sampleRate = 8000;
  destination = {};
  resume() {
    return Promise.resolve();
  }
  createGain() {
    return no();
  }
  createBiquadFilter() {
    return no();
  }
  createOscillator() {
    criados.osc++;
    return { ...no(), start() {}, stop() {} };
  }
  createBufferSource() {
    criados.ruido++;
    return { ...no(), buffer: null, loop: false, start() {}, stop() {} };
  }
  createBuffer(_c: number, n: number) {
    return { getChannelData: () => new Float32Array(n) };
  }
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  criados.osc = 0;
  criados.ruido = 0;
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

const todos = ["zarpar", "moeda", "reparo", "dano", "raio", "tique", "giro", "reiAviso", "rei", "nivel", "naufragio", "recorde"] as const;

describe("sons do Log Pose", () => {
  it("toca todos os efeitos sem erro", async () => {
    const s = await import("./sons-logpose");
    s.destravarSom();
    for (const som of todos) {
      const antes = criados.osc + criados.ruido;
      s.tocar(som);
      expect(criados.osc + criados.ruido).toBeGreaterThan(antes);
    }
    s.ondas(true);
    s.ondas(false);
  });

  it("no mudo não toca nada e lembra a escolha", async () => {
    const s = await import("./sons-logpose");
    const avisado = vi.fn();
    s.assinarMudo(avisado);
    s.mudar(true);
    expect(avisado).toHaveBeenCalled();
    s.tocar("moeda");
    expect(criados.osc + criados.ruido).toBe(0);

    vi.resetModules();
    const s2 = await import("./sons-logpose");
    expect(s2.estaMudo()).toBe(true);
  });
});
