const order = ['A', 'B', 'C'];
const workouts = {
  A: { focus: 'Jambes · poussée · stabilité', exercises: [
    { id: 'squat', name: 'Squat avec haltère', reps: '8–12 répétitions', muscles: 'Quadriceps · fessiers', steps: ['Haltère contre la poitrine, pieds stables.', 'Recule les hanches et descends vers la chaise.', 'Pousse le sol pour remonter en soufflant.'], tip: 'Descends seulement aussi bas que tu peux le faire confortablement.' },
    { id: 'pushup', name: 'Pompes sur poignées', reps: '8–12 répétitions', muscles: 'Pectoraux · triceps', steps: ['Mains sur les poignées, corps aligné.', 'Plie les coudes et approche la poitrine du sol.', 'Pousse pour revenir sans laisser tomber le bassin.'], tip: 'Sur les genoux ou contre un mur si 8 répétitions propres sont difficiles.' },
    { id: 'pallof', name: 'Pallof press', reps: '15 par côté', muscles: 'Abdos · obliques', steps: ['Fixe l’élastique à hauteur de poitrine, de côté.', 'Pousse les mains devant toi et tiens 2 secondes.', 'Ramène les mains sans tourner le buste.'], tip: 'Fais 3 séries de 15 par côté avec une résistance qui te permet de rester immobile. Vérifie la fixation de la porte.' }
  ]},
  B: { focus: 'Hanches · traction · abdos', exercises: [
    { id: 'rdl', name: 'Deadlift roumain', reps: '8–12 répétitions', muscles: 'Ischios · fessiers', steps: ['Haltères légers devant les cuisses, genoux un peu fléchis.', 'Recule les fesses ; les haltères longent les jambes, dos stable.', 'Arrête quand tu sens l’arrière des cuisses, puis pousse les hanches vers l’avant pour remonter.'], tip: 'Le mouvement part des hanches, pas du bas du dos. Ne cherche pas à toucher le sol. Si douleur lombaire, réduis l’amplitude ou fais un glute bridge.' },
    { id: 'pullup', name: 'Tractions', reps: '8–12 répétitions', muscles: 'Grand dorsal · biceps', rest: 120, steps: ['Suspends-toi avec les épaules actives.', 'Tire les coudes vers les côtes, sans balancer les jambes.', 'Redescends lentement jusqu’aux bras presque tendus.'], tip: 'Vise 8–12 seulement si la technique reste propre ; garde 1–3 répétitions en réserve.' },
    { id: 'crossreach', name: 'Bras–genou opposés au sol', reps: '15–20 paires', muscles: 'Abdos · obliques', phases: ['Genou droit · bras gauche', 'Genou gauche · bras droit'], steps: ['Allonge-toi sur le dos, tête et épaules posées sur le tapis.', 'Lève le genou droit et tends le bras gauche vers le plafond, sans chercher à les rapprocher.', 'Redescends lentement, puis fais genou gauche et bras droit. Garde le bassin stable.'], tip: 'Une paire = un mouvement de chaque côté. Commence par 15 paires ; va jusqu’à 20 si tu gardes le contrôle, sans douleur dans le bas du dos.' }
  ]},
  C: { focus: 'Fentes · gainage · biceps', exercises: [
    { id: 'lunge', name: 'Fentes arrière', reps: '8–10 par jambe', muscles: 'Quadriceps · fessiers', steps: ['Debout, pieds à largeur de hanches ; tiens un mur si besoin.', 'Recule un pied et fléchis doucement les deux genoux, buste stable.', 'Pousse dans le pied avant pour revenir debout, puis change de jambe.'], tip: 'Commence au poids du corps avec une petite amplitude. Si la douleur augmente, essaie plutôt le glute bridge : allongé, pieds à plat, soulève le bassin doucement.' },
    { id: 'plank', name: 'Gainage en planche', reps: '20–45 secondes', muscles: 'Abdos · obliques', phases: ['Avant-bras · genoux', 'Avant-bras · pieds'], steps: ['Place les coudes sous les épaules et serre légèrement les abdos.', 'Garde le corps aligné sans laisser tomber les hanches ; respire normalement.', 'Arrête dès que tu perds cette position ou si le bas du dos devient douloureux.'], tip: 'Trois séries courtes et propres suffisent. Le niveau 1 se fait sur les genoux ; les niveaux 2 et 3 sur les pieds.' },
    { id: 'curl', name: 'Curl haltères', reps: '10–15 répétitions', muscles: 'Biceps', steps: ['Tiens-toi droit, coudes près du corps.', 'Plie les coudes sans balancer les épaules.', 'Redescends lentement en gardant le buste immobile.'], tip: 'Si tu cambres ou te balances, allège la charge.' }
  ]}
};
const plankLevels = { 1: { seconds: 20, name: 'Genoux' }, 2: { seconds: 30, name: 'Pieds' }, 3: { seconds: 45, name: 'Pieds' } };
const home = document.getElementById('home');
const workoutView = document.getElementById('workout');
let selected = localStorage.getItem('nextSession');
if (!order.includes(selected)) selected = 'A';
let sets = Number(localStorage.getItem('sets') || 3);
if (![2, 3].includes(sets)) sets = 3;
let plankLevel = Number(localStorage.getItem('plankLevel') || 1);
if (!plankLevels[plankLevel]) plankLevel = 1;
let state = null, audioContext = null, alarmAudio = null, wakeLock = null, motionTimer = null, motionPhase = 0, motionPaused = false, lastCheckpoint = Date.now();
const REST_SECONDS = 90;
const nextLetter = letter => order[(order.indexOf(letter) + 1) % order.length];
const currentExercise = () => workouts[state.session].exercises[state.exerciseIndex];
const isPlank = () => state?.phase === 'active' && currentExercise().id === 'plank';
const targetText = ex => ex.id === 'plank' ? `niveau ${plankLevel} · ${plankLevels[plankLevel].seconds} s` : ex.reps;
function plankRemaining() { return Math.max(0, state.plankRemainingMs - (state.plankRunning && !state.paused ? Date.now() - state.plankStartedAt : 0)); }
function resetPlankSet() { state.plankRemainingMs = plankLevels[plankLevel].seconds * 1000; state.plankStartedAt = null; state.plankRunning = false; state.plankAttempted = false; state.plankDone = false; }
function formatTime(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function saveState() { if (state) localStorage.setItem('activeWorkout', JSON.stringify(state)); else localStorage.removeItem('activeWorkout'); }
function renderHome() {
  document.getElementById('restAlert')?.remove();
  home.classList.remove('hidden'); workoutView.classList.add('hidden');
  document.getElementById('sessionName').textContent = `Séance ${selected}`;
  document.getElementById('sessionIndex').textContent = `0${order.indexOf(selected) + 1} / 03`;
  document.getElementById('sessionFocus').textContent = workouts[selected].focus;
  document.getElementById('exerciseList').innerHTML = workouts[selected].exercises.map((ex, i) => `<li><span class="num">0${i + 1}</span>${thumbMarkup(ex)}<div><strong>${ex.name}</strong><small>${sets} séries · ${targetText(ex)}</small></div></li>`).join('');
  document.querySelectorAll('.tab').forEach(b => { const on = b.dataset.session === selected; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  document.querySelectorAll('.choice').forEach(b => { const on = Number(b.dataset.sets) === sets; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
}
function activeElapsed() { return state.activeAccumMs + (state.phase === 'active' && !state.paused ? Date.now() - state.activeStartedAt : 0); }
// Vidéos de démonstration réelles (Mixkit et Pexels, voir video/CREDITS.md). Les autres exercices gardent l'illustration animée.
const demoVideos = { squat: { ratio: '4 / 3', yt: { id: 'TgcAO3iJfd0', start: 0, end: 9, by: 'NeuStrength' } }, pushup: { ratio: '16 / 9', yt: { id: 'h3tPYS4CaRY', start: 7, end: 11.3, by: 'Pullup & Dip' } }, pullup: { ratio: '4 / 3' }, plank: { ratio: '16 / 9', note: 'Vidéo : version sur les pieds (niveaux 2 et 3).' }, curl: { ratio: '4 / 3' }, lunge: { ratio: '3 / 4', portrait: true } };
const MEDIA_VERSION = '20261011b';
const mediaView = {};
const mediaViewOf = ex => !demoVideos[ex.id] ? 'schema' : mediaView[ex.id] || (ex.id === 'plank' && plankLevel === 1 ? 'schema' : 'video');
const thumbMarkup = ex => demoVideos[ex.id] ? `<img class="ex-thumb" src="video/${ex.id}.webp?v=${MEDIA_VERSION}" alt="" loading="lazy">` : `<img class="ex-thumb ex-thumb-strip" src="motion/${ex.id}.webp" alt="" loading="lazy">`;
function imageMarkup(ex) {
  const video = demoVideos[ex.id];
  if (mediaViewOf(ex) === 'video' && video.yt) {
    const v = video.yt;
    const src = `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&iv_load_policy=3&loop=1&playlist=${v.id}&start=${v.start}&end=${v.end}&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    return `<div class="motion-visual"><div class="motion-window video-window portrait yt-window" style="aspect-ratio:${v.ratio || '9 / 16'}"><iframe id="ytDemo" src="${src}" title="Démonstration vidéo : ${ex.name}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe><span class="media-badge">Coach</span></div><div class="motion-caption"><button class="motion-toggle" id="videoToggle" type="button">Pause</button><button class="motion-toggle" id="videoSlow" type="button" aria-pressed="false">Ralenti</button><button class="media-switch" id="mediaSwitch" type="button">Voir les muscles</button></div><p class="media-note">Vidéo : ${v.by} · <a href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">YouTube</a>${video.note ? ` · ${video.note}` : ''}</p></div>`;
  }
  if (mediaViewOf(ex) === 'video') {
    return `<div class="motion-visual"><div class="motion-window video-window${video.portrait ? ' portrait' : ''}" style="aspect-ratio:${video.ratio}"><video class="demo-video" id="demoVideo" src="video/${ex.id}.mp4?v=${MEDIA_VERSION}" poster="video/${ex.id}.webp?v=${MEDIA_VERSION}" muted loop playsinline autoplay preload="auto" aria-label="Vidéo de démonstration : ${ex.name}"></video><span class="media-badge">Démo réelle</span></div><div class="motion-caption"><button class="motion-toggle" id="videoToggle" type="button">Pause</button><button class="motion-toggle" id="videoSlow" type="button" aria-pressed="false">Ralenti</button><button class="media-switch" id="mediaSwitch" type="button">Voir les muscles</button></div>${video.note ? `<p class="media-note">${video.note}</p>` : ''}</div>`;
  }
  const control = ex.id === 'plank' ? '<span>Appuie pour comparer</span>' : '<button class="motion-toggle" id="motionToggle" type="button">Pause animation</button>';
  const fallback = `onerror="this.onerror=null;this.closest('.motion-window').classList.add('still');this.src='images/${ex.id}.webp'"`;
  const switcher = video ? '<button class="media-switch" id="mediaSwitch" type="button">Voir la vidéo</button>' : '';
  return `<div class="motion-visual"><button class="motion-window" id="motionNext" type="button" aria-label="Voir la position suivante de ${ex.name}"><img class="motion-frame" src="motion/${ex.id}.webp" alt="Deux positions illustrées pour ${ex.name}, muscles principaux en rouge" ${fallback}><img class="motion-frame frame-b" src="motion/${ex.id}.webp" alt="" aria-hidden="true" onerror="this.remove()"></button><div class="motion-caption"><span id="phaseLabel">1 / 2 · ${ex.phases?.[0] || 'Départ'}</span>${control}${switcher}</div></div>`;
}
let ytPlayer = null;
function setupYoutube(ex) {
  const frame = document.getElementById('ytDemo'), toggle = document.getElementById('videoToggle'), slow = document.getElementById('videoSlow');
  if (!frame) return;
  const v = demoVideos[ex.id].yt, state = { paused: false, slow: false, ready: false };
  const send = (func, args = []) => { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args, id: 1 }), '*'); } catch (_) {} };
  const listen = () => { try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (_) {} };
  const onMessage = event => {
    if (!/youtube(-nocookie)?\.com$/.test(new URL(event.origin).hostname)) return;
    let data; try { data = JSON.parse(event.data); } catch (_) { return; }
    if (data.event === 'onReady' || (data.event === 'infoDelivery' && !state.ready)) { state.ready = true; send('mute'); if (!state.paused) send('playVideo'); }
    if (data.event !== 'infoDelivery' || !data.info) return;
    const t = data.info.currentTime;
    if ((typeof t === 'number' && (t >= v.end - 0.15 || t < v.start - 0.5)) || data.info.playerState === 0) { send('seekTo', [v.start, true]); if (!state.paused) send('playVideo'); }
  };
  window.addEventListener('message', onMessage);
  frame.addEventListener('load', () => { listen(); setTimeout(listen, 600); });
  listen();
  toggle.addEventListener('click', () => { state.paused = !state.paused; send(state.paused ? 'pauseVideo' : 'playVideo'); toggle.textContent = state.paused ? 'Lecture' : 'Pause'; });
  slow.addEventListener('click', () => { state.slow = !state.slow; send('setPlaybackRate', [state.slow ? 0.5 : 1]); slow.setAttribute('aria-pressed', String(state.slow)); slow.textContent = state.slow ? 'Vitesse normale' : 'Ralenti'; });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { state.paused = true; toggle.textContent = 'Lecture'; }
  ytPlayer = { stop: () => window.removeEventListener('message', onMessage) };
}
function setupVideo() {
  const video = document.getElementById('demoVideo'), toggle = document.getElementById('videoToggle'), slow = document.getElementById('videoSlow');
  if (!video) return;
  const sync = () => { toggle.textContent = video.paused ? 'Lecture' : 'Pause'; };
  video.addEventListener('play', sync); video.addEventListener('pause', sync);
  const flip = () => { if (video.paused) video.play().catch(() => {}); else video.pause(); };
  toggle.addEventListener('click', flip); video.addEventListener('click', flip);
  slow.addEventListener('click', () => { const on = video.playbackRate === 1; video.playbackRate = on ? 0.5 : 1; slow.setAttribute('aria-pressed', String(on)); slow.textContent = on ? 'Vitesse normale' : 'Ralenti'; });
  video.addEventListener('error', () => { mediaView[currentExercise().id] = 'schema'; renderWorkout(); }, { once: true });
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.pause(); else video.play().catch(sync);
  sync();
}
function stopMotion() { if (motionTimer) clearInterval(motionTimer); motionTimer = null; }
function showMotionPhase() {
  const frame = document.getElementById('motionNext'), label = document.getElementById('phaseLabel');
  if (frame) frame.classList.toggle('phase-b', motionPhase === 1);
  if (label) label.textContent = `${motionPhase + 1} / 2 · ${currentExercise().phases?.[motionPhase] || (motionPhase ? 'Fin' : 'Départ')}`;
}
function startMotion() { stopMotion(); motionTimer = setInterval(() => { if (!motionPaused && state?.phase === 'active') { motionPhase = 1 - motionPhase; showMotionPhase(); } }, 2200); }
function renderWorkout() {
  stopMotion(); ytPlayer?.stop(); ytPlayer = null;
  home.classList.add('hidden'); workoutView.classList.remove('hidden');
  if (state.phase === 'done') {
    workoutView.innerHTML = `<div class="done-card"><div class="done-symbol" aria-hidden="true">✓</div><p class="eyebrow">SÉANCE TERMINÉE</p><h1>Bien joué.</h1><p>Tu as terminé la séance ${state.session}. La prochaine sera la séance ${nextLetter(state.session)}.</p><button class="primary" id="doneButton" type="button">Retour à l’accueil</button></div>`;
    document.getElementById('doneButton').addEventListener('click', () => { state = null; saveState(); renderHome(); }); return;
  }
  const ex = currentExercise();
  const plank = ex.id === 'plank';
  if (plank && state.phase === 'active' && !Number.isFinite(state.plankRemainingMs)) { resetPlankSet(); saveState(); }
  const top = `<div class="workout-top"><span>SÉANCE ${state.session} · ${state.exerciseIndex + 1} / 3</span><button class="text-button" id="leaveButton" type="button">Quitter</button></div>`;
  if (state.phase === 'rest') {
    workoutView.innerHTML = `${top}<div class="rest-card"><p class="eyebrow">PAUSE · ALARME À 00:00</p><div class="clock" id="clock">${formatTime(state.restEndAt - Date.now())}</div><p class="rest-next">Ensuite : <strong>${ex.name}</strong><br>Série ${state.setIndex + 1} / ${state.sets}</p><div class="rest-actions"><button class="primary" id="skipRest" type="button">Passer la pause <span aria-hidden="true">→</span></button><button class="secondary" id="pauseButton" type="button">${state.paused ? 'Reprendre' : 'Mettre en pause'}</button></div></div>`;
    document.getElementById('skipRest').addEventListener('click', () => endRest(true));
  } else {
    const levels = plank ? `<div class="level-picker"><p>Choisis ton niveau</p><div class="level-options">${Object.entries(plankLevels).map(([number, level]) => `<button class="level-choice ${Number(number) === plankLevel ? 'active' : ''}" data-level="${number}" type="button" ${state.plankAttempted ? 'disabled' : ''} aria-pressed="${Number(number) === plankLevel}"><strong>Niveau ${number}</strong><small>${level.seconds} s · ${level.name}</small></button>`).join('')}</div></div>` : '';
    const action = plank ? (state.plankAttempted ? (state.plankDone ? 'Série terminée' : 'Arrêter la série') : 'Démarrer le gainage') : 'Série terminée';
    const time = plank ? formatTime(Math.ceil(plankRemaining() / 1000) * 1000) : formatTime(activeElapsed());
    workoutView.innerHTML = `${top}<div class="exercise-topline"><span class="eyebrow">EXERCICE ${state.exerciseIndex + 1}</span><span class="series-pill">SÉRIE ${state.setIndex + 1} / ${state.sets}</span></div><h1 class="exercise-title">${ex.name}</h1><p class="rep-target">${targetText(ex)}</p><p class="muscles">● MUSCLES : ${ex.muscles}</p>${levels}${imageMarkup(ex)}<ol class="steps">${ex.steps.map(step => `<li>${step}</li>`).join('')}</ol><p class="tip">${ex.tip}</p><div class="workout-bottom"><div class="elapsed"><span>${plank ? 'DÉCOMPTE' : 'CHRONO'}</span><strong id="clock">${time}</strong></div><button class="primary" id="finishSet" type="button" ${state.paused ? 'disabled' : ''}>${action} <span aria-hidden="true">→</span></button><button class="secondary" id="pauseButton" type="button">${state.paused ? 'Reprendre' : 'Mettre en pause'}</button></div>`;
    document.getElementById('finishSet').addEventListener('click', () => { if (plank && !state.plankAttempted) startPlank(); else finishSet(); });
    if (plank) document.querySelectorAll('.level-choice').forEach(button => button.addEventListener('click', () => { if (state.plankAttempted) return; plankLevel = Number(button.dataset.level); localStorage.setItem('plankLevel', String(plankLevel)); resetPlankSet(); saveState(); renderWorkout(); }));
    const view = mediaViewOf(ex);
    document.getElementById('mediaSwitch')?.addEventListener('click', () => { mediaView[ex.id] = view === 'video' ? 'schema' : 'video'; renderWorkout(); });
    if (view === 'video') { setupVideo(); setupYoutube(ex); }
    else {
      motionPhase = plank && plankLevel > 1 ? 1 : 0; motionPaused = plank || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (plank) showMotionPhase(); else { startMotion(); if (motionPaused) document.getElementById('motionToggle').textContent = 'Relancer'; }
      document.getElementById('motionNext').addEventListener('click', () => { motionPaused = true; motionPhase = 1 - motionPhase; showMotionPhase(); if (!plank) document.getElementById('motionToggle').textContent = 'Relancer'; });
      if (!plank) document.getElementById('motionToggle').addEventListener('click', event => { motionPaused = !motionPaused; event.currentTarget.textContent = motionPaused ? 'Relancer' : 'Pause animation'; });
    }
  }
  document.getElementById('leaveButton').addEventListener('click', () => { if (confirm('Quitter cette séance ? La progression en cours sera effacée.')) { state = null; saveState(); releaseWakeLock(); renderHome(); } });
  document.getElementById('pauseButton').addEventListener('click', togglePause);
  updateClock();
}
function updateClock() {
  if (!state || state.phase === 'done') return;
  const clock = document.getElementById('clock'); if (!clock) return;
  if (state.phase === 'active') {
    if (isPlank()) {
      const left = plankRemaining();
      clock.textContent = formatTime(Math.ceil(left / 1000) * 1000);
      if (state.plankRunning && !state.paused && left <= 0) {
        state.plankRemainingMs = 0; state.plankRunning = false; state.plankDone = true;
        saveState(); renderWorkout(); signal(); showRestAlert('Gainage terminé · série finie !'); return;
      }
    } else clock.textContent = formatTime(activeElapsed());
    if (!state.paused && Date.now() - lastCheckpoint > 5000) {
      state.activeAccumMs = activeElapsed(); state.activeStartedAt = Date.now(); lastCheckpoint = Date.now(); saveState();
    }
  }
  else { const left = state.paused ? state.restRemainingMs : state.restEndAt - Date.now(); clock.textContent = formatTime(Math.max(0, Math.ceil(left / 1000) * 1000)); if (!state.paused && left <= 0) endRest(); }
}
function startPlank() {
  if (!isPlank() || state.paused || state.plankAttempted) return;
  state.plankAttempted = true; state.plankRunning = true; state.plankStartedAt = Date.now();
  saveState(); renderWorkout();
}
function finishSet() {
  if (!state || state.phase !== 'active' || state.paused) return;
  if (isPlank() && !state.plankAttempted) return;
  if (isPlank()) state.plankRunning = false;
  document.getElementById('restAlert')?.remove();
  if (state.setIndex === state.sets - 1 && state.exerciseIndex === 2) {
    state.phase = 'done'; selected = nextLetter(state.session); localStorage.setItem('nextSession', selected); saveState(); releaseWakeLock(); signal(); renderWorkout(); return;
  }
  const restSeconds = currentExercise().rest || REST_SECONDS;
  if (state.setIndex < state.sets - 1) state.setIndex += 1; else { state.exerciseIndex += 1; state.setIndex = 0; }
  state.phase = 'rest'; state.paused = false; state.restEndAt = Date.now() + restSeconds * 1000; state.restRemainingMs = restSeconds * 1000; state.activeAccumMs = 0;
  saveState(); renderWorkout();
}
function showRestAlert(message = 'Pause terminée · à toi de jouer !') {
  const previous = document.getElementById('restAlert');
  if (previous) previous.remove();
  const alert = document.createElement('div');
  alert.id = 'restAlert'; alert.className = 'rest-alert'; alert.setAttribute('role', 'alert');
  alert.innerHTML = `<span>${message}</span><button type="button" aria-label="Fermer l’alerte">OK</button>`;
  alert.querySelector('button').addEventListener('click', () => alert.remove());
  document.body.appendChild(alert);
}
function endRest(manual = false) {
  if (!state || state.phase !== 'rest') return;
  state.phase = 'active'; state.paused = false; state.activeStartedAt = Date.now(); state.activeAccumMs = 0; state.restEndAt = null; state.restRemainingMs = null;
  if (currentExercise().id === 'plank') resetPlankSet();
  saveState(); renderWorkout();
  if (!manual) { signal(); showRestAlert(); }
}
function togglePause() {
  if (!state || state.phase === 'done') return;
  if (!state.paused) {
    if (state.phase === 'active') { state.activeAccumMs = activeElapsed(); if (isPlank() && state.plankRunning) { state.plankRemainingMs = plankRemaining(); state.plankRunning = false; } }
    else state.restRemainingMs = Math.max(0, state.restEndAt - Date.now());
    state.paused = true;
  } else {
    if (state.phase === 'active') { state.activeStartedAt = Date.now(); if (isPlank() && state.plankAttempted && !state.plankDone) { state.plankStartedAt = Date.now(); state.plankRunning = true; } }
    else state.restEndAt = Date.now() + state.restRemainingMs;
    state.paused = false;
  }
  saveState(); renderWorkout();
}
async function unlockAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return false;
  audioContext = audioContext || new Audio();
  if (audioContext.state === 'suspended') await audioContext.resume();
  return audioContext.state === 'running';
}
function getAlarmAudio() {
  if (!alarmAudio) { alarmAudio = new Audio('alarm.wav'); alarmAudio.preload = 'auto'; }
  return alarmAudio;
}
async function signal() {
  if (navigator.vibrate) navigator.vibrate([250, 100, 250, 100, 400]);
  try {
    const media = getAlarmAudio();
    media.pause(); media.currentTime = 0;
    await media.play();
    return true;
  } catch (_) { /* Le navigateur peut bloquer la lecture différée. */ }
  try {
    if (await unlockAudio()) {
      const start = audioContext.currentTime + 0.02;
      [0, 0.34, 0.68].forEach(delay => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = 860;
        gain.gain.setValueAtTime(0.0001, start + delay);
        gain.gain.exponentialRampToValueAtTime(0.24, start + delay + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.25);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(start + delay); oscillator.stop(start + delay + 0.27);
      });
      return true;
    }
  } catch (_) { /* Certains navigateurs suspendent le son en arrière-plan. */ }
  return false;
}
async function requestWakeLock() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {} }
function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
function startWorkout() {
  unlockAudio().catch(() => {});
  getAlarmAudio().load();
  state = { session: selected, sets, exerciseIndex: 0, setIndex: 0, phase: 'active', paused: false, activeStartedAt: Date.now(), activeAccumMs: 0, restEndAt: null, restRemainingMs: null };
  saveState(); requestWakeLock(); renderWorkout();
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { selected = b.dataset.session; localStorage.setItem('nextSession', selected); renderHome(); }));
document.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => { sets = Number(b.dataset.sets); localStorage.setItem('sets', String(sets)); renderHome(); }));
document.getElementById('startButton').addEventListener('click', startWorkout);
document.getElementById('soundTest').addEventListener('click', async () => {
  const status = document.getElementById('soundStatus');
  const ready = await signal();
  status.textContent = ready ? 'Test lancé. Si tu n’entends rien, vérifie le volume média et le mode silencieux.' : 'Le navigateur bloque le son ; la vibration et l’alerte visuelle restent disponibles si prises en charge.';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state?.phase === 'active' && !state.paused) {
    if (isPlank() && state.plankRunning) { state.plankRemainingMs = plankRemaining(); state.plankRunning = false; }
    state.activeAccumMs = activeElapsed(); state.paused = true; saveState();
  } else if (!document.hidden && state && state.phase !== 'done') { requestWakeLock(); renderWorkout(); }
});
setInterval(updateClock, 250);
try {
  const saved = JSON.parse(localStorage.getItem('activeWorkout') || 'null');
  if (saved && order.includes(saved.session) && ['active', 'rest', 'done'].includes(saved.phase) && Number.isInteger(saved.exerciseIndex) && saved.exerciseIndex >= 0 && saved.exerciseIndex < 3) {
    state = saved;
    if (state.phase === 'active' && !state.paused) { if (isPlank() && state.plankRunning) { state.plankRemainingMs = plankRemaining(); state.plankRunning = false; } state.activeAccumMs = Math.max(0, state.activeAccumMs || 0); state.paused = true; saveState(); }
    if (state.phase === 'rest' && !state.paused && state.restEndAt < Date.now()) endRest(); else renderWorkout();
  } else renderHome();
} catch (_) { state = null; renderHome(); }
if (document.modelContext?.registerTool) {
  const register = tool => { try { Promise.resolve(document.modelContext.registerTool(tool)).catch(() => {}); } catch (_) {} };
  register({ name: 'get_routine_state', title: 'Lire la routine', description: 'Lire la prochaine séance et la progression en cours.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ nextSession: selected, sets, active: state ? { session: state.session, exercise: state.exerciseIndex + 1, set: state.setIndex + 1, phase: state.phase } : null }) });
  register({ name: 'choose_routine_session', title: 'Choisir une séance', description: 'Choisir la séance A, B ou C à afficher avant de commencer.', inputSchema: { type: 'object', properties: { session: { type: 'string', enum: order } }, required: ['session'], additionalProperties: false }, execute: input => { if (state) throw new Error('Une séance est déjà en cours.'); if (!order.includes(input?.session)) throw new Error('Séance invalide.'); selected = input.session; localStorage.setItem('nextSession', selected); renderHome(); return { selected }; } });
  register({ name: 'start_routine_session', title: 'Démarrer une séance', description: 'Démarrer la séance sélectionnée avec le nombre de séries choisi.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => { if (state) throw new Error('Une séance est déjà en cours.'); startWorkout(); return { session: state.session, exercise: 1, set: 1 }; } });
}
