"use client";

// Globo 3D em react-three-fiber. Carregado só no navegador (dynamic import, sem SSR). A textura vem do mundo.json,
// as ilhas são marcadores por latitude/longitude e a viagem é um arco sobre a esfera.

import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { MUNDO } from "@/lib/mar-sem-fim/conteudo";
import { amostrarArco, paraVetor, type LatLng } from "@/lib/mar-sem-fim/geo";
import type { Estado } from "@/lib/mar-sem-fim/tipos";
import { MARCADORES, pontosDaRotaViagem, posicaoDoBarco, type Planeta } from "./mapa-comum";

type Props = {
  planeta: Planeta;
  estado: Estado;
  agora: number;
  selecionada: string | null;
  onSelecionar: (id: string) => void;
  autoRotacao: boolean;
  reduzido: boolean;
};

const RAIO = 1;

function Esfera({ planeta }: { planeta: Planeta }) {
  const [cor, relevo] = useMemo(() => {
    const c = new THREE.CanvasTexture(planeta.cor);
    c.colorSpace = THREE.SRGBColorSpace;
    c.anisotropy = 4;
    const r = new THREE.CanvasTexture(planeta.relevo);
    return [c, r];
  }, [planeta]);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[RAIO, 64, 48]} />
        <meshStandardMaterial map={cor} bumpMap={relevo} bumpScale={0.9} roughness={0.92} metalness={0} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[RAIO, 48, 32]} />
        <meshBasicMaterial color={MUNDO.planeta.corAtmosfera} transparent opacity={0.1} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Marcador({ m, estado, selecionada, onSelecionar }: { m: (typeof MARCADORES)[number]; estado: Estado; selecionada: boolean; onSelecionar: (id: string) => void }) {
  const status = m.emBreve ? "travada" : (estado.ilhas[m.id]?.status ?? "travada");
  const posicao = useMemo(() => new THREE.Vector3(...paraVetor(m, RAIO * 1.012)), [m]);
  const rot = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), posicao.clone().normalize()), [posicao]);
  const aberta = !m.emBreve && status !== "travada";
  return (
    <group position={posicao} quaternion={rot}>
      {/* Alvo de toque maior que o desenho. */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onSelecionar(m.id); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = ""; }}
      >
        <circleGeometry args={[0.055, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {aberta ? (
        <>
          <mesh><circleGeometry args={[0.022, 20]} /><meshBasicMaterial color={MUNDO.planeta.corIlha} /></mesh>
          <mesh position={[0, 0, 0.001]}><circleGeometry args={[0.01, 16]} /><meshBasicMaterial color={MUNDO.planeta.corIlhaPonto} /></mesh>
        </>
      ) : (
        <mesh><ringGeometry args={[0.014, 0.022, 20]} /><meshBasicMaterial color={MUNDO.planeta.corIlha} transparent opacity={0.55} side={THREE.DoubleSide} /></mesh>
      )}
      {selecionada && (
        <mesh position={[0, 0, 0.002]}><ringGeometry args={[0.032, 0.04, 28]} /><meshBasicMaterial color={MUNDO.planeta.corIlhaPonto} side={THREE.DoubleSide} /></mesh>
      )}
      {selecionada && (
        <Html center position={[0, 0.07, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
          <span className="rounded-[4px] bg-black/70 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-creme">{m.nome}</span>
        </Html>
      )}
    </group>
  );
}

function Barco({ pos }: { pos: LatLng }) {
  const p = useMemo(() => new THREE.Vector3(...paraVetor(pos, RAIO * 1.03)), [pos]);
  const rot = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().normalize()), [p]);
  return (
    <mesh position={p} quaternion={rot}>
      <coneGeometry args={[0.022, 0.06, 4]} />
      <meshBasicMaterial color="#dd5d05" />
    </mesh>
  );
}

function Rota({ pontos }: { pontos: LatLng[] }) {
  const linha = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i < pontos.length - 1; i++) for (const q of amostrarArco(pontos[i], pontos[i + 1], 24)) out.push(new THREE.Vector3(...paraVetor(q, RAIO * 1.008)));
    return out;
  }, [pontos]);
  return <Line points={linha} color="#f2a66e" lineWidth={2.2} dashed dashSize={0.03} gapSize={0.02} />;
}

/** Leva a câmera até a ilha escolhida, girando o globo (sem animação com movimento reduzido). */
function Foco({ alvo, reduzido }: { alvo: LatLng | null; reduzido: boolean }) {
  const { camera, invalidate } = useThree();
  const passos = useRef(0);
  const dir = useRef(new THREE.Vector3());
  useEffect(() => {
    if (!alvo) return;
    dir.current.set(...paraVetor(alvo)).normalize();
    passos.current = reduzido ? 1 : 80;
    invalidate();
  }, [alvo, reduzido, invalidate]);
  useFrame(() => {
    if (passos.current <= 0) return;
    const d = camera.position.length();
    const atual = camera.position.clone().normalize();
    const prox = reduzido ? dir.current.clone() : atual.lerp(dir.current, 0.09).normalize();
    camera.position.copy(prox.multiplyScalar(d));
    camera.lookAt(0, 0, 0);
    passos.current -= 1;
    if (atual.angleTo(dir.current) < 0.005) passos.current = 0;
    invalidate();
  });
  return null;
}

/** Distância da câmera que mantém o globo inteiro na tela, em retrato ou paisagem. */
const distanciaPara = (largura: number, altura: number) => Math.max(3.1, 3.05 / Math.max(0.2, largura / Math.max(1, altura)));

function Cena({ planeta, estado, agora, selecionada, onSelecionar, autoRotacao, reduzido }: Props) {
  const { camera, size, invalidate } = useThree();
  const barco = useMemo(() => posicaoDoBarco(estado, agora), [estado, agora]);
  const rota = useMemo(() => pontosDaRotaViagem(estado), [estado]);
  const foco = useMemo(() => {
    const m = MARCADORES.find((x) => x.id === (selecionada ?? estado.barco.ilhaAtual));
    return m ? { lat: m.lat, lng: m.lng } : null;
  }, [selecionada, estado.barco.ilhaAtual]);
  const rotacionar = autoRotacao && !reduzido;
  const dist = distanciaPara(size.width, size.height);

  // Em retrato o globo é mais largo que a tela: afasta a câmera pra ele caber.
  useEffect(() => {
    camera.position.setLength(dist);
    invalidate();
  }, [camera, dist, invalidate]);

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 2, 4]} intensity={1.6} />
      <Esfera planeta={planeta} />
      {MARCADORES.map((m) => (
        <Marcador key={m.id} m={m} estado={estado} selecionada={selecionada === m.id} onSelecionar={onSelecionar} />
      ))}
      {rota && rota.length > 1 && <Rota pontos={rota} />}
      <Barco pos={barco} />
      <Foco alvo={foco} reduzido={reduzido} />
      <OrbitControls makeDefault enablePan={false} enableDamping={!reduzido} minDistance={1.5} maxDistance={Math.max(4.5, dist * 1.25)} rotateSpeed={0.55} zoomSpeed={0.7} autoRotate={rotacionar} autoRotateSpeed={0.5} />
    </>
  );
}

export default function Globo3D(props: Props) {
  const rotacionar = props.autoRotacao && !props.reduzido;
  return (
    <Canvas
      className="size-full"
      frameloop={rotacionar ? "always" : "demand"}
      camera={{ position: [0, 0.3, 3.1], fov: 42, near: 0.1, far: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      aria-label={MUNDO.nome}
    >
      <Cena {...props} />
    </Canvas>
  );
}
