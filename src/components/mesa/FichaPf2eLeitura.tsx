import { Card } from '@/components/fichas/ui';
import { cx } from '@/lib/fichas/cx';
import {
  acharAntecedente,
  acharClasse,
  ATRIBUTOS,
  calcular,
  NOME_ATRIBUTO,
  NOME_PROF,
  resumoFicha,
  sinal,
  type Ficha,
} from '@/lib/pathfinder';
import { CONDICOES } from '@/lib/pathfinder-condicoes';
import { formatarVolume } from '@/lib/pathfinder-equip';
import { emJogo } from '@/lib/pathfinder-jogo';

/** Ficha de Pathfinder 2e só para leitura, como o mestre vê (sem as anotações do jogador). */
export function FichaPf2eLeitura({ ficha: f }: { ficha: Ficha }) {
  const base = calcular(f);
  const j = emJogo(f);
  const condicoes = CONDICOES.filter((c) => f.jogo.condicoes[c.id]);
  const talentos = Object.values(f.talentos).filter((t) => t.trim());
  const magias = Object.values(f.magias).filter((m) => m.trim());
  const dinheiro = (['pp', 'po', 'pa', 'pc'] as const).filter((k) => f.dinheiro[k]).map((k) => `${f.dinheiro[k]} ${k}`);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {[resumoFicha(f), acharAntecedente(f.antecedente)?.nome, base.tamanho].filter(Boolean).join(' · ')}
      </p>

      <Card title="Em jogo">
        <div className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">
          <Valor rotulo="PV" valor={`${j.pv}/${j.pvMax}${j.pvTemp ? ` +${j.pvTemp}` : ''}`} alerta={j.pv < j.pvMax} />
          <Valor rotulo="CA" valor={String(j.ca)} />
          <Valor rotulo="Fortitude" valor={sinal(j.fortitude)} />
          <Valor rotulo="Reflexos" valor={sinal(j.reflexos)} />
          <Valor rotulo="Vontade" valor={sinal(j.vontade)} />
          <Valor rotulo="Percepção" valor={sinal(j.percepcao)} />
        </div>
        <p className="mt-3 text-sm text-muted">
          Pontos de herói {f.jogo.heroi}
          {j.pontosFoco > 0 && ` · Foco ${j.pontosFoco - f.jogo.focoGasto}/${j.pontosFoco}`}
          {j.cdClasse !== null && ` · CD de classe ${j.cdClasse}`}
          {` · Deslocamento ${base.deslocamento} pés`}
        </p>
        {condicoes.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {condicoes.map((c) => (
              <li key={c.id} title={c.texto} className="rounded-full bg-warn/15 px-2 py-0.5 text-xs text-warn">
                {c.nome}
                {c.valor ? ` ${f.jogo.condicoes[c.id]}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Atributos">
          <ul className="grid grid-cols-3 gap-2 text-center text-sm">
            {ATRIBUTOS.map((a) => (
              <li key={a} className="rounded-md bg-surface-2 px-2 py-1.5">
                <div className="text-xs text-faint">{NOME_ATRIBUTO[a]}</div>
                <div className="font-mono">{sinal(base.attr[a])}</div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Perícias">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
            {j.pericias.map((p) => (
              <li key={p.id} className={cx('flex justify-between gap-2', p.prof === 'destreinado' && 'text-faint')}>
                <span>
                  {p.nome} <span className="text-xs text-faint">{NOME_PROF[p.prof]}</span>
                </span>
                <span className="font-mono">{sinal(p.bonus)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {j.ataques.length > 0 && (
        <Card title="Ataques">
          <ul className="flex flex-col gap-1 text-sm">
            {j.ataques.map((a, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2">
                <span>{a.nome}</span>
                <span className="font-mono text-muted">
                  {a.map.map(sinal).join(' / ')} · {a.dano}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(j.magia || magias.length > 0 || f.foco.some((x) => x.trim())) && (
        <Card title="Magia">
          {j.magia && (
            <p className="text-sm text-muted">
              Ataque {sinal(j.magia.ataque)} · CD {j.magia.cd}
            </p>
          )}
          {magias.length > 0 && <p className="mt-2 text-sm">{magias.join(', ')}</p>}
          {f.foco.some((x) => x.trim()) && <p className="mt-2 text-sm">Foco: {f.foco.filter((x) => x.trim()).join(', ')}</p>}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {talentos.length > 0 && (
          <Card title="Talentos">
            <p className="text-sm">{talentos.join(', ')}</p>
          </Card>
        )}
        <Card title="Equipamento">
          <ul className="flex flex-col gap-0.5 text-sm">
            {base.armadura && <li>{base.armadura.nome}</li>}
            {base.escudo && <li>{base.escudo.nome}</li>}
            {f.itens.map((it, i) => (
              <li key={i}>
                {it.qtd > 1 ? `${it.qtd}× ` : ''}
                {it.nome}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-faint">
            {dinheiro.length ? dinheiro.join(', ') : 'Sem dinheiro'} · Volume {formatarVolume(base.volume.total)}
            {base.sobrecarregado && <span className="text-warn"> · sobrecarregado</span>}
          </p>
        </Card>
      </div>

      {acharClasse(f.classe) && base.recursos.length > 0 && (
        <details className="rounded-xl border border-line bg-surface p-4 text-sm">
          <summary className="cursor-pointer font-display text-lg font-semibold">Habilidades de classe</summary>
          <ul className="mt-2 flex flex-col gap-1 text-muted">
            {base.recursos.map(([nivel, nome]) => (
              <li key={`${nivel}-${nome}`}>
                <span className="text-faint">Nv {nivel}:</span> {nome}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Valor({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-md bg-surface-2 px-2 py-1.5">
      <div className="text-xs text-faint">{rotulo}</div>
      <div className={cx('font-mono', alerta ? 'text-warn' : 'text-ink')}>{valor}</div>
    </div>
  );
}
