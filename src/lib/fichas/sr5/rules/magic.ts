import { label } from '../data';
import {
  addKarma,
  budget,
  castsSpells,
  hasPowers,
  isEmerged,
  issue,
  missing,
  needsTradition,
  round2,
  talentKey,
  talentLabel,
  type Ctx,
} from './context';

const MENTOR_SPIRIT = 'Mentor Spirit';

export function checkMagic(ctx: Ctx): void {
  const { draft, data, s } = ctx;
  const m = draft.magic;
  const k = talentKey(ctx);
  const name = talentLabel(ctx);
  const MAG = ctx.attrs.MAG.value;
  const RES = ctx.attrs.RES.value;

  // Tradição / corrente
  if (needsTradition(ctx)) {
    if (!m.traditionId) {
      issue(ctx, 'error', 'magic', 'tradition.missing', 'Escolha a tradição mágica (o jeito como o personagem entende a magia).');
    } else if (!data.traditions.some((t) => t.id === m.traditionId)) {
      issue(ctx, 'error', 'magic', 'tradition.unknown', 'Tradição desconhecida.');
    }
  } else if (m.traditionId) {
    issue(ctx, 'error', 'magic', 'tradition.notAllowed', `${name} não usa tradição mágica.`);
  }
  if (k === 'technomancer') {
    if (!m.streamId) {
      issue(ctx, 'error', 'magic', 'stream.missing', 'Escolha a corrente do tecnomante.');
    } else if (!data.streams.some((t) => t.id === m.streamId)) {
      issue(ctx, 'error', 'magic', 'stream.unknown', 'Corrente desconhecida.');
    }
  } else if (m.streamId) {
    issue(ctx, 'error', 'magic', 'stream.notAllowed', 'Só tecnomantes têm corrente.');
  }

  // Mentor: exige a qualidade Espírito Mentor
  const hasMentorQuality = [...ctx.ownedQualityIds].some((id) => ctx.idx.qualities.get(id)?.name === MENTOR_SPIRIT);
  if (m.mentorId && !hasMentorQuality) {
    issue(ctx, 'error', 'magic', 'mentor.noQuality', 'Para ter um mentor, compre a qualidade Espírito Mentor.');
  } else if (m.mentorId && !data.mentors.some((x) => x.id === m.mentorId)) {
    issue(ctx, 'error', 'magic', 'mentor.unknown', 'Mentor desconhecido.');
  } else if (!m.mentorId && hasMentorQuality) {
    issue(ctx, 'warning', 'magic', 'mentor.missing', 'Você comprou Espírito Mentor: escolha qual é o mentor.');
  }

  // Magias
  const freeSpells = ctx.talent?.freeSpells ?? 0;
  const spells = m.spellIds;
  if (spells.length && !castsSpells(ctx)) {
    issue(ctx, 'error', 'magic', 'spells.notAllowed',
      k === 'aspectedMagician' ? 'Só o Mago de Aspecto em Feitiçaria aprende magias.' : `${name} não aprende magias.`);
  }
  if (new Set(spells).size !== spells.length) {
    issue(ctx, 'error', 'magic', 'spells.duplicate', 'Há magias repetidas.');
  }
  spells.forEach((id, i) => {
    if (!data.spells.some((x) => x.id === id)) {
      issue(ctx, 'error', 'magic', 'spells.unknown', 'Magia desconhecida.', `magic.spellIds.${i}`);
    }
  });
  const spellLimit = MAG * 2;
  if (castsSpells(ctx) && spells.length > spellLimit) {
    issue(ctx, 'error', 'magic', 'spells.limit',
      `Na criação dá para conhecer até ${spellLimit} magias (Magia × 2); você escolheu ${spells.length}.`);
  }
  const extraSpells = Math.max(0, spells.length - freeSpells);
  addKarma(ctx, 'magias', extraSpells * s.karmaCosts.spell);
  ctx.budgets.freeSpells = budget(freeSpells, Math.min(spells.length, freeSpells));
  if (freeSpells > spells.length) {
    issue(ctx, 'warning', 'magic', 'spells.leftover',
      `${missing(freeSpells - spells.length, 'magia gratuita', 'magias gratuitas')} para escolher.`);
  }

  // Poderes de adepto
  let ppTotal = 0;
  if (k === 'adept') ppTotal = MAG;
  if (k === 'mysticAdept') {
    ppTotal = m.powerPointsBought;
    if (!Number.isInteger(m.powerPointsBought) || m.powerPointsBought < 0) {
      issue(ctx, 'error', 'magic', 'powerPoints.invalid', 'Pontos de poder comprados: use um número inteiro a partir de zero.');
    } else if (m.powerPointsBought > MAG) {
      issue(ctx, 'error', 'magic', 'powerPoints.overMagic',
        `O Adepto Místico compra no máximo ${MAG} pontos de poder (igual à Magia).`);
    }
    addKarma(ctx, 'pontos de poder', Math.max(0, m.powerPointsBought) * s.karmaCosts.mysticAdeptPowerPoint);
  } else if (m.powerPointsBought) {
    issue(ctx, 'error', 'magic', 'powerPoints.notAllowed', 'Só o Adepto Místico compra pontos de poder com karma.');
  }

  let ppSpent = 0;
  if (m.powers.length && !hasPowers(ctx)) {
    issue(ctx, 'error', 'magic', 'powers.notAllowed', `${name} não tem poderes de adepto.`);
  }
  const seenPowers = new Set<string>();
  m.powers.forEach((dp, i) => {
    const path = `magic.powers.${i}`;
    const p = data.powers.find((x) => x.id === dp.id);
    if (!p) {
      issue(ctx, 'error', 'magic', 'powers.unknown', 'Poder desconhecido.', path);
      return;
    }
    if (seenPowers.has(p.id)) {
      issue(ctx, 'error', 'magic', 'powers.duplicate', `${label(p)} aparece duas vezes.`, path);
      return;
    }
    seenPowers.add(p.id);
    const level = p.levels ? dp.level : 1;
    if (p.levels) {
      if (!Number.isInteger(level) || level < 1) {
        issue(ctx, 'error', 'magic', 'powers.level', `${label(p)}: nível inválido.`, path);
      } else if (p.maxLevels && level > p.maxLevels) {
        issue(ctx, 'error', 'magic', 'powers.level', `${label(p)}: o nível máximo é ${p.maxLevels}.`, path);
      } else if (level > MAG) {
        issue(ctx, 'error', 'magic', 'powers.level', `${label(p)}: o nível não pode passar da Magia (${MAG}).`, path);
      }
    }
    ppSpent += p.points * Math.max(1, level) + (p.extraPointCost ?? 0);
  });
  ppSpent = round2(ppSpent);
  ctx.budgets.powerPoints = budget(ppTotal, ppSpent);
  if (hasPowers(ctx)) {
    if (ppSpent > ppTotal) {
      issue(ctx, 'error', 'magic', 'powerPoints.overspent',
        `Os poderes custam ${ppSpent} pontos de poder, mas você tem ${ppTotal}.`);
    } else if (ppSpent < ppTotal) {
      issue(ctx, 'warning', 'magic', 'powerPoints.leftover',
        `Sobraram ${round2(ppTotal - ppSpent)} pontos de poder.`);
    }
  }

  // Formas complexas
  const freeCF = ctx.talent?.freeComplexForms ?? 0;
  const cfs = m.complexFormIds;
  if (cfs.length && !isEmerged(ctx)) {
    issue(ctx, 'error', 'magic', 'complexForms.notAllowed', 'Só tecnomantes usam formas complexas.');
  }
  if (new Set(cfs).size !== cfs.length) {
    issue(ctx, 'error', 'magic', 'complexForms.duplicate', 'Há formas complexas repetidas.');
  }
  cfs.forEach((id, i) => {
    if (!data.complexForms.some((x) => x.id === id)) {
      issue(ctx, 'error', 'magic', 'complexForms.unknown', 'Forma complexa desconhecida.', `magic.complexFormIds.${i}`);
    }
  });
  const cfLimit = RES * 2;
  if (isEmerged(ctx) && cfs.length > cfLimit) {
    issue(ctx, 'error', 'magic', 'complexForms.limit',
      `Na criação dá para ter até ${cfLimit} formas complexas (Ressonância × 2); você escolheu ${cfs.length}.`);
  }
  addKarma(ctx, 'formas complexas', Math.max(0, cfs.length - freeCF) * s.karmaCosts.newComplexForm);
  ctx.budgets.freeComplexForms = budget(freeCF, Math.min(cfs.length, freeCF));
  if (freeCF > cfs.length) {
    issue(ctx, 'warning', 'magic', 'complexForms.leftover',
      `${missing(freeCF - cfs.length, 'forma complexa gratuita', 'formas complexas gratuitas')} para escolher.`);
  }
}
