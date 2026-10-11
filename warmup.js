function hipCarStep(side, seconds = 45) {
  const label = side === 'l' ? 'gauche' : 'droite';
  return { name: `Cercle de hanche · ${label}`, seconds, visual: 'hipcar', side, video: { id: 'bzUvhatbQh8', start: 0, end: 13, mirror: side === 'r', by: 'PTC Performance' },
    cue: 'Hip CAR · 2–3 cercles lents avec un appui',
    instructions: [
      'Tiens un support de la main opposée. Pieds largeur de hanches, bassin et poitrine face devant.',
      'Plie le genou : talon derrière, genoux côte à côte. Recule légèrement la cuisse.',
      'Ouvre le genou sur le côté. Garde-le à cette place et fais pivoter la hanche pour orienter le pied vers le bas.',
      'Ramène le genou devant, puis redescends et repose le pied. Garde le geste lent et confortable.'
    ], care: 'Commence par un petit cercle. Le mouvement vient de la hanche : ne tords pas le genou et ne cambre pas pour monter plus haut. La hauteur du bassin n’est pas un objectif obligatoire.' };
}
const plans = {
  doux: {
    title: 'Mobilité douce', subtitle: 'Le matin ou avant la muscu · environ 5 min',
    intro: 'Mobilité active, sans étirement tenu. Si un geste augmente la douleur dans la fesse ou la jambe, réduis l’amplitude ou passe à la suite. Fais valider les mouvements qui déclenchent tes symptômes par ton kiné ou médecin.',
    steps: [
      { name: 'Marche sur place', seconds: 45, visual: 'march', cue: 'Réveille doucement le corps', instructions: ['Marche à un rythme facile en balançant naturellement les bras.', 'Respire librement ; garde les épaules détendues.'], care: 'Tu dois pouvoir parler facilement.' },
      hipCarStep('l'),
      hipCarStep('r'),
      { name: 'Bascule du bassin debout', seconds: 45, visual: 'pelvis', cue: 'Petit mouvement du bassin', instructions: ['Pieds à largeur de hanches, mains sur le bassin.', 'Bascule doucement le bassin vers l’avant puis vers l’arrière, sans forcer le bas du dos.'], care: 'Garde une petite amplitude, sans chercher une forte cambrure.' },
      { name: 'Hanches en arrière', seconds: 45, visual: 'hinge', cue: 'Prépare le mouvement du deadlift · sans charge', instructions: ['Pieds largeur de hanches, genoux souples. Pose les mains sur le haut des cuisses.', 'Recule les fesses en inclinant le buste d’un seul bloc, dos long. Descends peu, puis redresse-toi.'], care: 'Ce n’est pas une recherche d’étirement des ischios. Raccourcis le geste si cela tire dans la jambe.' },
      { name: 'Mini squats', seconds: 45, visual: 'squat', cue: 'Quelques flexions faciles', instructions: ['Pieds un peu plus larges que les hanches. Recule légèrement les fesses et fléchis les genoux.', 'Garde les talons au sol, les genoux dans la direction des pieds, puis remonte doucement.'], care: 'Descends peu. Place-toi près d’un support si tu as besoin d’équilibre.' },
      { name: 'Nuque : oui et non', seconds: 40, visual: 'neck', cue: 'Mobilité du cou, lente', instructions: ['Oui : baisse doucement le menton vers la poitrine, puis remonte en regardant droit devant.', 'Non : tourne lentement la tête à droite, puis à gauche, aussi loin que c’est confortable.', 'Alterne quelques oui et quelques non ; les épaules restent basses et immobiles.'], care: 'Gestes lents, sans forcer ni à-coups. Arrête si ça tire fort, si ça descend dans le bras ou si la tête tourne.' }
    ]
  },
  tennis: {
    title: 'Avant le tennis', subtitle: 'Progressif · environ 8 min',
    intro: 'Augmente le rythme progressivement. Si la douleur descend davantage dans la jambe, ralentis ou arrête le geste. Termine ensuite par des balles faciles avant les échanges rapides.',
    steps: [
      { name: 'Marche active', seconds: 90, visual: 'march', cue: 'Monte doucement en température', instructions: ['Marche sur place ou le long du court, avec les bras détendus.', 'Accélère progressivement tout en restant capable de parler.'], care: 'Pas de départ en sprint : laisse le corps monter en température.' },
      hipCarStep('l'),
      hipCarStep('r'),
      { name: 'Montées sur pointes', seconds: 45, visual: 'ankles', cue: 'Chevilles et mollets prêts à bouger', instructions: ['Monte sur les pointes de pieds puis redescends lentement.', 'Garde les genoux souples et contrôle la descente.'], care: 'Garde un appui si ton équilibre est incertain.' },
      { name: 'Mini squats', seconds: 45, visual: 'squat', cue: 'Prépare les flexions et les appuis', instructions: ['Pieds stables, fléchis un peu les hanches et les genoux.', 'Remonte en poussant dans tout le pied ; garde un geste souple.'], care: 'Une petite flexion suffit. Les talons restent posés.' },
      { name: 'Petits cercles de bras', seconds: 30, visual: 'arms', cue: 'Prépare les épaules', instructions: ['Écarte les bras un peu sous la hauteur des épaules et fais de petits cercles.', 'Change de sens après quelques tours, sans hausser les épaules.'], care: 'Le buste reste calme, sans cambrure forcée.' },
      { name: 'Montées de genoux marchées', seconds: 60, visual: 'knees', cue: 'Sans saut · hauteur confortable', instructions: ['Monte un genou puis l’autre, avec le bras opposé.', 'Reste droit et repose doucement chaque pied. Augmente le rythme seulement si c’est confortable.'], care: 'Ne tire pas le genou avec les mains. Il n’a pas besoin d’atteindre la poitrine.' },
      { name: 'Pas chassés', seconds: 60, visual: 'shuffle', cue: '30 s dans chaque sens', instructions: ['Fléchis un peu les genoux, buste stable, puis avance latéralement par petits pas.', 'Garde les pieds écartés ; commence lentement et accélère légèrement.'], care: 'Pas de grand écart ni de pas explosif au départ.' },
      { name: 'Frappes à vide progressives', seconds: 60, visual: 'swing', cue: 'Termine proche du jeu', instructions: ['Simule quelques coups droits et revers lents, avec de petits pas.', 'Augmente doucement la vitesse, sans forcer la rotation du bas du dos.'], care: 'Commence ensuite les premières balles tranquillement avant les échanges rapides.' }
    ]
  }
};

const planId = new URLSearchParams(location.search).get('plan') === 'tennis' ? 'tennis' : 'doux';
const plan = plans[planId];
const app = document.getElementById('warmupApp');
const storageKey = `warmup-v2-${planId}`;
const freshState = () => ({ index: 0, remainingMs: plan.steps[0].seconds * 1000, running: false, startedAt: null, done: false });
let state = freshState();
let audio = null;
let audioContext = null;
let wakeLock = null;

function save() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function remaining() { return Math.max(0, state.remainingMs - (state.running ? Date.now() - state.startedAt : 0)); }
function timeLabel(ms) { const seconds = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
const demos = {
  march: 'Jambes · hanches', pelvis: 'Bassin · abdominaux profonds',
  hipcar: 'Hanches · fessiers · fléchisseurs de hanche', hinge: 'Hanches · fessiers · ischios',
  arms: 'Épaules · haut du dos', squat: 'Cuisses · fessiers', neck: 'Nuque · haut des épaules',
  ankles: 'Mollets · chevilles', shuffle: 'Cuisses · fessiers · mollets',
  knees: 'Hanches · abdominaux · jambes', fastfeet: 'Mollets · appuis',
  swing: 'Épaules · tronc · jambes'
};
// Une vidéo de coach par mouvement (YouTube, lue dans la page). Choisies à la main : geste identique à la fiche, cadrage vertical, sans blabla.
const coachVideos = {
  march: { id: '16oJspYFz7s', start: 0, end: 12, by: 'Body Complete Services' },
  pelvis: { id: 'MnvcnjCf710', start: 0, end: 12, by: 'Rehab Hero' },
  hinge: { id: 'cY1nBB1Ki6E', start: 0, end: 12, by: 'Whole Body Health' },
  squat: { id: 'WF5sU0PU-w0', start: 0, end: 15, by: 'CU Anschutz Orthopedics' },
  neck: { id: 'avtdEwuAhVg', start: 0, end: 26, by: 'Heather Plumber' },
  ankles: { id: 'QgrGg9pGSZ8', start: 0, end: 18, by: 'Doctor O’Donovan' },
  arms: { id: 'Jf40owVcXmM', start: 0, end: 7, by: 'JoyFit Method' },
  knees: { id: 'LdcquWkKUFc', start: 0, end: 14, by: 'Inclusive Movement' },
  shuffle: { id: 'O9zzo7oiyK4', start: 0, end: 9, by: 'Fit Family Physical Therapy' },
  swing: { id: 'yFCLXFEYyAg', start: 0, end: 17, by: 'Sean Carson' }
};
const coachVideo = step => step.video || coachVideos[step.visual];
// Vidéos de coachs intégrées depuis YouTube (lecture dans la page, boucle sur le passage utile). Le personnage 3D reste disponible.
let demoMode = 'video';
try { demoMode = localStorage.getItem('warmup-demo-mode') === '3d' ? '3d' : 'video'; } catch (_) {}
let player = null;
function videoDemo(step) {
  const v = coachVideo(step), type = step.visual;
  const src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&iv_load_policy=3&loop=1&playlist=${v.id}&start=${v.start}&end=${v.end}&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  return `<section class="warmup-demo" aria-label="Démonstration de ${step.name}"><div class="warmup-yt${v.mirror ? ' mirrored' : ''}" style="aspect-ratio:${v.ratio || '9 / 16'}"><iframe id="ytDemo" src="${src}" title="Démonstration vidéo : ${step.name}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" loading="eager"></iframe><span class="media-badge">Coach</span></div><div class="motion-guide"><strong id="ytLabel">${v.mirror ? 'Vidéo en miroir : fais-le avec la jambe droite' : 'Observe le geste, puis fais pareil'}</strong><div class="motion-controls"><button type="button" id="ytPause" aria-pressed="false">Ⅱ Pause</button><button type="button" id="ytSlow" aria-pressed="false">Ralenti</button><button type="button" id="demoSwitch">Voir en 3D</button></div><p class="yt-credit">Vidéo : ${v.by} · <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">YouTube</a></p></div><p class="warmup-zones"><span>Zones mobilisées</span><strong>${demos[type]}</strong></p></section>`;
}
function setupVideoDemo(step) {
  const frame = document.getElementById('ytDemo');
  if (!frame) { player = null; return; }
  const v = coachVideo(step);
  const state = { paused: false, slow: false, ready: false };
  const send = (func, args = []) => { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args, id: 1 }), '*'); } catch (_) {} };
  const listen = () => { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (_) {} };
  const onMessage = event => {
    if (!/youtube(-nocookie)?\.com$/.test(new URL(event.origin).hostname)) return;
    let data; try { data = JSON.parse(event.data); } catch (_) { return; }
    if (data.event === 'onReady' || (data.event === 'infoDelivery' && !state.ready)) { state.ready = true; send('mute'); if (!state.paused) send('playVideo'); }
    if (data.event !== 'infoDelivery' || !data.info) return;
    const t = data.info.currentTime;
    if (typeof t === 'number' && (t >= v.end - 0.15 || t < v.start - 0.5)) { send('seekTo', [v.start, true]); if (!state.paused) send('playVideo'); }
    if (data.info.playerState === 0) { send('seekTo', [v.start, true]); if (!state.paused) send('playVideo'); }
  };
  window.addEventListener('message', onMessage);
  frame.addEventListener('load', () => { listen(); setTimeout(listen, 600); });
  listen();
  const pauseButton = document.getElementById('ytPause'), slowButton = document.getElementById('ytSlow');
  pauseButton.addEventListener('click', () => { state.paused = !state.paused; send(state.paused ? 'pauseVideo' : 'playVideo'); pauseButton.textContent = state.paused ? '▶ Lire' : 'Ⅱ Pause'; pauseButton.setAttribute('aria-pressed', String(state.paused)); });
  slowButton.addEventListener('click', () => { state.slow = !state.slow; send('setPlaybackRate', [state.slow ? 0.5 : 1]); slowButton.textContent = state.slow ? 'Vitesse × 0,5' : 'Ralenti'; slowButton.setAttribute('aria-pressed', String(state.slow)); });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { state.paused = true; pauseButton.textContent = '▶ Lire'; }
  player = { stop: () => window.removeEventListener('message', onMessage) };
}
function switchDemoMode(next) { demoMode = next; try { localStorage.setItem('warmup-demo-mode', next); } catch (_) {} render(); }
function demo(step) {
  const type=step.visual;
  if (coachVideo(step) && demoMode === 'video') return videoDemo(step);
  return `<section class="warmup-demo" aria-label="Démonstration de ${step.name}"><div class="warmup-video warmup-animation" id="warmupFigure" data-motion="${type}" data-side="${step.side||'l'}" role="img" aria-label="${step.name} : démonstration en boucle"><span class="warmup-loading">Chargement du mouvement…</span></div><div class="motion-guide"><strong id="motionPhase">Observe le mouvement</strong><label class="sr-only" for="motionRange">Position dans la démonstration</label><input id="motionRange" type="range" min="0" max="1000" value="0" step="1"><div class="motion-controls"><button type="button" id="motionPause" aria-pressed="false">Ⅱ Pause</button><button type="button" id="motionSlow" aria-pressed="false">Ralenti</button><button type="button" id="motionView">Vue : ¾</button></div>${coachVideo(step)?'<button type="button" id="demoSwitch" class="motion-amplitude">Voir la vidéo du coach</button>':''}${type==='hipcar'?'<button type="button" id="motionAmplitude" class="motion-amplitude" aria-pressed="false">Petit cercle</button><p class="motion-range-note">Choisis une amplitude confortable. Le bassin reste face devant.</p>':''}</div><p class="warmup-zones"><span>Rouge : zones mobilisées</span><strong>${demos[type]}</strong></p></section>`;
}
function render() {
  if (state.done) {
    player?.stop(); player = null;
    window.WarmupFigure?.unmount();
    app.innerHTML = `<div class="warmup-done"><span class="done-symbol" aria-hidden="true">✓</span><p class="eyebrow">ÉCHAUFFEMENT TERMINÉ</p><h1>${plan.title}</h1><p>Tu as terminé les ${plan.steps.length} mouvements. Reste à l’écoute de ton dos et de ta jambe pendant la suite.</p><button class="primary" id="restart" type="button">Recommencer</button><a class="secondary warmup-home-link" href="index.html">Retour aux séances</a></div>`;
    document.getElementById('restart').addEventListener('click', () => { state = freshState(); save(); render(); });
    return;
  }
  const step = plan.steps[state.index];
  const progress = Math.round(state.index / plan.steps.length * 100);
  app.innerHTML = `<nav class="warmup-top"><a href="index.html">← Séances</a><span>${state.index + 1} / ${plan.steps.length}</span></nav><p class="eyebrow">${plan.title.toUpperCase()}</p><div class="warmup-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${plan.steps.length}" aria-valuenow="${state.index}" aria-label="Progression de l’échauffement"><span style="width:${progress}%"></span></div><p class="warmup-subtitle">${plan.subtitle}</p><h1 class="warmup-title">${step.name}</h1><p class="warmup-cue">${step.cue}</p>${demo(step)}<ol class="steps">${step.instructions.map(item => `<li>${item}</li>`).join('')}</ol><p class="warmup-care">${step.care}</p><p class="warmup-intro">${plan.intro}</p><div class="warmup-bottom"><div class="elapsed"><span>DÉCOMPTE</span><strong id="warmupClock">${timeLabel(remaining())}</strong></div><button class="primary" id="startPause" type="button">${state.running ? 'Mettre en pause' : state.remainingMs < step.seconds * 1000 ? 'Reprendre' : 'Démarrer'} <span aria-hidden="true">${state.running ? 'Ⅱ' : '→'}</span></button><div class="warmup-nav"><button class="secondary" id="previous" type="button" ${state.index === 0 ? 'disabled' : ''}>Précédent</button><button class="secondary" id="next" type="button">${state.index === plan.steps.length - 1 ? 'Terminer' : 'Suivant'}</button></div></div>`;
  player?.stop(); player = null;
  window.WarmupFigure?.mount();
  setupVideoDemo(step);
  document.getElementById('demoSwitch')?.addEventListener('click', () => switchDemoMode(demoMode === 'video' ? '3d' : 'video'));
  document.getElementById('startPause').addEventListener('click', toggle);
  document.getElementById('previous').addEventListener('click', previous);
  document.getElementById('next').addEventListener('click', () => advance(false));
}
async function unlock() {
  try {
    audio ??= new Audio('alarm.wav'); audio.load();
    const Context = window.AudioContext || window.webkitAudioContext;
    if (Context) { audioContext ??= new Context(); if (audioContext.state === 'suspended') await audioContext.resume(); }
  } catch (_) {}
}
async function sound() {
  if (navigator.vibrate) navigator.vibrate([180, 80, 180]);
  try { audio ??= new Audio('alarm.wav'); audio.pause(); audio.currentTime = 0; await audio.play(); return; } catch (_) {}
  try {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') await audioContext.resume();
    const start = audioContext.currentTime + 0.02;
    [0, 0.3].forEach(delay => {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.frequency.value = 820; gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.2, start + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.24);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(start + delay); oscillator.stop(start + delay + 0.25);
    });
  } catch (_) {}
}
async function keepAwake() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {} }
function releaseWake() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
function toggle() {
  if (state.running) { state.remainingMs = remaining(); state.running = false; state.startedAt = null; releaseWake(); }
  else { state.running = true; state.startedAt = Date.now(); unlock(); keepAwake(); }
  save(); render();
}
function advance(auto) {
  const continueRunning = auto || state.running;
  if (state.index === plan.steps.length - 1) { state.done = true; state.running = false; releaseWake(); localStorage.removeItem(storageKey); render(); if (auto) sound(); return; }
  state.index += 1; state.remainingMs = plan.steps[state.index].seconds * 1000; state.running = continueRunning; state.startedAt = continueRunning ? Date.now() : null;
  save(); render(); if (auto) sound();
}
function previous() {
  if (state.index <= 0) return;
  state.index -= 1; state.remainingMs = plan.steps[state.index].seconds * 1000; state.running = false; state.startedAt = null; releaseWake(); save(); render();
}
function tick() {
  if (!state.running || state.done) return;
  const left = remaining();
  const clock = document.getElementById('warmupClock'); if (clock) clock.textContent = timeLabel(left);
  if (left <= 0) advance(true);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running) { state.remainingMs = remaining(); state.running = false; state.startedAt = null; releaseWake(); save(); }
  else if (!document.hidden) render();
});
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < plan.steps.length && Number.isFinite(saved.remainingMs)) {
    state = saved;
    if (state.running) { state.remainingMs = Math.max(0, state.remainingMs - (Date.now() - state.startedAt)); state.running = false; state.startedAt = null; save(); }
  }
} catch (_) { state = freshState(); }
render(); setInterval(tick, 200);
