// Logique pure (sans affichage) : dates, régularité, progression, choix du jour, minuteries.
import { ORDER, EXERCISES, SESSIONS, MOBILITY, MOVES, PLANK_LEVELS, TIMING } from './program.js';

const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toUTC = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
export const addDays = (k, n) => { const t = new Date(toUTC(k) + n * 864e5); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
export const weekday = k => new Date(toUTC(k)).getUTCDay(); // 0 = dimanche

export const emptyData = () => ({ v: 3, history: [], volume: 2, volumeSince: null, fallbackLetter: 'A', settings: { voice: true, count: true } });

export const seancesOf = data => data.history.filter(h => h.type === 'seance').sort((a, b) => a.ts - b.ts);
export const lastSeance = data => seancesOf(data).at(-1) ?? null;
export const lastSeanceBefore = (data, today) => seancesOf(data).filter(h => h.date < today).at(-1) ?? null;
export const nextLetter = data => { const last = lastSeance(data); if (!last) return ORDER.includes(data.fallbackLetter) ? data.fallbackLetter : 'A'; return ORDER[(ORDER.indexOf(last.letter) + 1) % ORDER.length]; };
// Séances dont la date est dans ]today - days, today]
export const countSeances = (data, today, days) => seancesOf(data).filter(h => { const g = daysBetween(h.date, today); return g >= 0 && g < days; }).length;

// Régularité sur 28 jours : séances faites / séances attendues (3 par semaine), plafonnée à 100.
export function regularity(data, today) {
  const s = seancesOf(data);
  if (!s.length) return 0;
  const win = Math.min(28, Math.max(1, daysBetween(s[0].date, today) + 1));
  const expected = Math.max(1, win * 3 / 7);
  return Math.min(100, Math.round(countSeances(data, today, win) / expected * 100));
}
export const regularityLabel = p => p >= 90 ? 'Machine' : p >= 70 ? 'Sérieux' : p >= 40 ? 'En route' : p > 0 ? 'On s’y remet' : 'C’est parti';

// Série : jours consécutifs avec une séance ou une mobilité validée (aujourd'hui pas encore fait ne casse rien).
export function streak(data, today) {
  const days = new Set(data.history.map(h => h.date));
  let k = days.has(today) ? today : addDays(today, -1), current = 0;
  while (days.has(k)) { current++; k = addDays(k, -1); }
  const sorted = [...days].sort();
  let best = 0, run = 0, prev = null;
  for (const d of sorted) { run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return { current, best: Math.max(best, current), doneToday: days.has(today) };
}

// Rigueur : les charges ne montent que si tu es dans le rythme.
export function rhythm(data, today) {
  const prev = lastSeanceBefore(data, today);
  if (!prev) return { ok: false, first: true, gap: null, reason: 'première séance du programme' };
  const gap = daysBetween(prev.date, today);
  if (gap > 14) return { ok: false, reprise: true, gap, reason: `reprise après ${gap} jours` };
  if (gap > 4) return { ok: false, gap, reason: `pause de ${gap} jours` };
  const first = seancesOf(data)[0];
  const win = Math.min(14, Math.max(1, daysBetween(first.date, today)));
  const done = countSeances(data, addDays(today, -1), win);
  if (done < 0.66 * win * 3 / 7) return { ok: false, gap, reason: 'séances sautées ces 2 semaines' };
  return { ok: true, gap };
}

export function lastRecord(data, exId) {
  const s = seancesOf(data);
  for (let i = s.length - 1; i >= 0; i--) if (s[i].ex?.[exId]) return { ...s[i].ex[exId], back: s[i].back, date: s[i].date };
  return null;
}

// Prescription d'un exercice pour aujourd'hui : objectif, charge et pourquoi.
export function prescribe(data, exId, today) {
  const ex = EXERCISES[exId];
  const last = lastRecord(data, exId);
  const r = rhythm(data, today);
  if (ex.kind === 'hold') {
    if (!last) return { level: 0, change: 'new', note: 'Premier test : tiens chaque appui jusqu’au bout.' };
    const L = PLANK_LEVELS[last.level] ?? PLANK_LEVELS[0];
    const complete = last.holds?.length && last.holds.every(h => h[0] >= L.face && h[1] >= L.side && h[2] >= L.side);
    if (!r.ok) return { level: last.level, change: '=', note: `Pareil : ${r.reason}.` };
    if (last.back === 'douleur') return { level: last.level, change: '=', note: 'Pareil : dos douloureux la dernière fois.' };
    if (!complete) return { level: last.level, change: '=', note: 'Pareil : tiens tous les appuis jusqu’au bout.' };
    if (last.level >= PLANK_LEVELS.length - 1) return { level: last.level, change: 'max', note: 'Niveau max : garde-le propre.' };
    return { level: last.level + 1, change: '+s', note: 'Plus long : tout tenu la dernière fois.' };
  }
  const loadStart = ex.load ? ex.load.start : null;
  if (!last) return { target: ex.start, load: loadStart, change: 'new', note: ex.load ? 'Premier essai : choisis une charge où les dernières reps sont dures mais propres.' : 'Premier essai : fais-en le plus possible proprement.' };
  const reps = (last.reps ?? []).filter(n => Number.isFinite(n));
  const minR = reps.length ? Math.min(...reps) : 0;
  const keep = note => ({ target: last.target, load: last.load ?? loadStart, change: '=', note });
  if (!r.ok) return keep(`Pareil : ${r.reason}.`);
  if (last.back === 'douleur') return keep('Pareil : dos douloureux la dernière fois.');
  if (minR < last.target) return keep(`Pareil : vise ${last.target} sur toutes les séries.`);
  if (minR >= ex.max) {
    if (ex.load) return { target: ex.min, load: (last.load ?? loadStart) + ex.load.inc, change: '+kg', note: `+${ex.load.inc} kg : ${ex.max} reps atteintes partout.` };
    if (ex.atMax === 'reset') return { target: ex.min, load: null, change: 'next', note: ex.atMaxNote };
    return { target: ex.max, load: null, change: 'max', note: ex.atMaxNote };
  }
  const target = Math.min(ex.max, Math.max(last.target, minR) + 1);
  return { target, load: last.load ?? loadStart, change: '+1', note: `+1 rep : tout réussi la dernière fois.` };
}

// Paliers de volume : 2 séries, puis 3 quand tu as été régulier 2 semaines.
export function volumeStatus(data, today) {
  const n = countSeances(data, today, 14);
  const pain = seancesOf(data).filter(h => { const g = daysBetween(h.date, today); return g >= 0 && g < 14 && h.back === 'douleur'; }).length;
  const since = data.volumeSince ? daysBetween(data.volumeSince, today) : 0;
  return { volume: data.volume, n, need: 6, pain, since, eligible: data.volume === 2 && n >= 6 && pain === 0 && since >= 14 };
}

export function sessionPlan(data, letter, today, { short = false } = {}) {
  const r = rhythm(data, today);
  const reprise = !!r.reprise;
  const sets = reprise || short ? 2 : data.volume;
  const items = SESSIONS[letter].exercises.map(id => ({ id, ...prescribe(data, id, today) }));
  return { letter, sets, reprise, gap: r.gap, items };
}

// Ce que le site propose aujourd'hui.
export function todayPlan(data, today) {
  const s = seancesOf(data);
  const last = s.at(-1) ?? null;
  const doneToday = s.filter(h => h.date === today);
  const mobToday = data.history.some(h => h.type === 'mobilite' && h.date === today);
  const gap = last ? daysBetween(last.date, today) : null;
  const letter = nextLetter(data);
  const lastTwo = s.slice(-2);
  const painHold = lastTwo.length === 2 && lastTwo.every(h => h.back === 'douleur') && gap !== null && gap <= 7;
  let hero;
  if (doneToday.length) hero = { kind: 'done', letter: doneToday.at(-1).letter, next: letter };
  else if (!last) hero = { kind: 'seance', letter };
  else if (painHold) hero = { kind: 'mobilite', reason: 'douleur', alt: letter };
  else if (gap === 1) hero = { kind: 'mobilite', reason: 'repos', alt: letter };
  else hero = { kind: 'seance', letter, gap };
  return { hero, mobToday, gap, letter };
}

// ——— Minuteries (déroulé pas à pas) ———
export function buildSessionTimeline(plan) {
  const steps = [{ t: 'prep', ex: plan.items[0].id, dur: TIMING.prep }];
  plan.items.forEach((item, i) => {
    const ex = EXERCISES[item.id];
    for (let s = 0; s < plan.sets; s++) {
      if (ex.kind === 'hold') {
        const L = PLANK_LEVELS[item.level];
        ex.holds.forEach((h, k) => {
          if (k) steps.push({ t: 'switch', ex: item.id, set: s, dur: TIMING.plankSwitch, label: h.name, hold: k });
          steps.push({ t: 'hold', ex: item.id, set: s, hold: k, dur: k ? L.side : L.face });
        });
      } else if (ex.perSide) {
        steps.push({ t: 'work', ex: item.id, set: s, side: 0 });
        steps.push({ t: 'switch', ex: item.id, set: s, dur: TIMING.switchSide, label: 'Change de côté' });
        steps.push({ t: 'work', ex: item.id, set: s, side: 1 });
      } else steps.push({ t: 'work', ex: item.id, set: s });
      const lastSet = s === plan.sets - 1, lastEx = i === plan.items.length - 1;
      if (lastSet && lastEx) continue;
      const next = lastSet ? plan.items[i + 1].id : item.id;
      steps.push({ t: 'rest', ex: item.id, set: s, dur: lastSet ? Math.max(ex.rest, 75) : ex.rest, next, newEx: lastSet });
    }
  });
  steps.push({ t: 'bilan' });
  return steps;
}

export function buildMobilityTimeline(variant) {
  const steps = [];
  MOBILITY[variant].steps.forEach(([id, sec], i) => {
    const m = MOVES[id];
    steps.push({ t: 'mgap', move: id, dur: i ? TIMING.mobilityGap : 5 });
    if (m.sides) {
      steps.push({ t: 'move', move: id, side: 0, dur: sec });
      steps.push({ t: 'switch', move: id, dur: 3, label: 'Change de côté' });
      steps.push({ t: 'move', move: id, side: 1, dur: sec });
    } else steps.push({ t: 'move', move: id, dur: sec });
  });
  steps.push({ t: 'mfin' });
  return steps;
}

// Durée estimée (secondes)
export function estimate(steps, plan) {
  return steps.reduce((sum, st) => {
    if (st.dur) return sum + st.dur;
    if (st.t === 'work') { const item = plan.items.find(i => i.id === st.ex); const ex = EXERCISES[st.ex]; return sum + ex.tempo * (item.target ?? ex.start) + 2; }
    return sum;
  }, 0);
}

export const fmtDuration = sec => {
  if (sec < 60) return `${Math.round(sec)} s`;
  if (sec < 300) { const half = Math.round(sec / 30) / 2, m = Math.floor(half); return half % 1 ? `${m} min 30` : `${m} min`; }
  return `${Math.round(sec / 60)} min`;
};
export const fmtClock = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; };
export const spokenDuration = sec => { const m = Math.floor(sec / 60), s = Math.round(sec % 60); return m ? `${m} minute${m > 1 ? 's' : ''}${s ? ` ${s}` : ''}` : `${s} secondes`; };

// Enregistre une séance validée et met à jour les paliers. Renvoie ce qui a changé (pour la fête).
export function validateSeance(data, rec, today) {
  const before = { streak: streak(data, today).current, reg: regularity(data, today) };
  const r = rhythm(data, today);
  data.history.push(rec);
  if (!data.volumeSince) data.volumeSince = today;
  let promoted = false, reset = false;
  if (r.reprise && data.volume !== 2) { data.volume = 2; data.volumeSince = today; reset = true; }
  const vs = volumeStatus(data, today);
  if (vs.eligible) { data.volume = 3; data.volumeSince = today; promoted = true; }
  return { before, after: { streak: streak(data, today).current, reg: regularity(data, today) }, promoted, reset };
}

export function validateMobility(data, rec, today) {
  const before = { streak: streak(data, today).current, reg: regularity(data, today) };
  data.history.push(rec);
  return { before, after: { streak: streak(data, today).current, reg: regularity(data, today) } };
}

// Comparaison avec la dernière fois (pour le bilan).
export function compare(prev, cur, exId) {
  const ex = EXERCISES[exId];
  if (!prev) return { tone: 'new', text: 'Première fois' };
  if (ex.kind === 'hold') {
    const sum = r => (r.holds ?? []).flat().reduce((a, b) => a + b, 0);
    const d = sum(cur) - sum(prev);
    return d > 0 ? { tone: 'up', text: `+${d} s de gainage` } : d < 0 ? { tone: 'down', text: `${d} s` } : { tone: 'same', text: 'Pareil' };
  }
  const dl = (cur.load ?? 0) - (prev.load ?? 0);
  if (dl > 0) return { tone: 'up', text: `+${dl} kg` };
  const sum = r => (r.reps ?? []).reduce((a, b) => a + (b || 0), 0);
  const dr = sum(cur) - sum(prev);
  if (dl < 0) return { tone: 'down', text: `${dl} kg` };
  return dr > 0 ? { tone: 'up', text: `+${dr} rep${dr > 1 ? 's' : ''}` } : dr < 0 ? { tone: 'down', text: `${dr} reps` } : { tone: 'same', text: 'Pareil' };
}
