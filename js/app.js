// Ma routine — interface. Logique pure dans engine.js, programme dans program.js.
import { ORDER, EXERCISES, SESSIONS, MOBILITY, MOVES, PLANK_LEVELS } from './program.js?v=3.1';
import {
  dayKey, daysBetween, addDays, weekday, emptyData, seancesOf, nextLetter, regularity, regularityLabel, streak,
  lastRecord, prescribe, volumeStatus, sessionPlan, todayPlan, buildSessionTimeline, buildMobilityTimeline,
  estimate, fmtDuration, fmtClock, validateSeance, validateMobility, compare
} from './engine.js?v=3.1';

const KEY = 'routine.v3', ACTIVE = 'routine.v3.active', UI = 'routine.v3.ui';
const app = document.getElementById('app');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dlog = /[?&]debug\b/.test(location.search) ? m => { try { fetch('/__log?' + encodeURIComponent(m)).catch(() => { }); } catch { } } : () => { };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const today = () => dayKey();
// Appli iPhone (dossier ios/) : pont natif. Mémoire synchronisée par iCloud, voix et bips joués par l'appli
// (même écran verrouillé, par-dessus la musique), rappels, écran allumé. Absent sur le site web.
const NATIVE = window.RoutineApp || null;
const store = {
  get(k) { try { return JSON.parse(NATIVE ? NATIVE.storage[k] ?? 'null' : localStorage.getItem(k)); } catch { return null; } },
  set(k, v) {
    if (NATIVE) { const s = v === null ? null : JSON.stringify(v); if (s === null) delete NATIVE.storage[k]; else NATIVE.storage[k] = s; NATIVE.post({ t: 'set', k, v: s }); return; }
    try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { }
  }
};
// Horloge du lecteur : réelle, ou simulée pour calculer la suite d'une séance écran verrouillé (appli).
let SIM = null, QUIET = false;
const now = () => SIM ? SIM.t : Date.now();
// Appli : les sons partent vers l'appli, ou sont notés à leur heure pendant une simulation.
const emit = ev => { if (QUIET) return; if (SIM) SIM.events.push({ at: SIM.t, ...ev }); else NATIVE.post(ev); };

// ——— Données ———
function loadData() {
  const base = emptyData(), d = store.get(KEY);
  if (d?.v === 3) return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
  try { const old = localStorage.getItem('nextSession'); if (ORDER.includes(old)) base.fallbackLetter = old; } catch { }
  return base;
}
let data = loadData();
const save = () => { store.set(KEY, data); syncReminders(); };
let ui = { mobVariant: null, short: false, installHidden: false, ...(store.get(UI) || {}) };
const saveUi = () => store.set(UI, ui);
const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 700;
const mobVariant = () => ui.mobVariant || (isPhone() ? 'express' : 'complete');
try { navigator.storage?.persist?.(); } catch { }

// ——— Son et voix ———
const Voice = {
  voice: null, primed: false,
  pick() { try { const vs = speechSynthesis.getVoices(); this.voice = vs.find(v => /fr[-_]FR/i.test(v.lang) && /Thomas|Audrey|Amélie|Aurélie|Marie|Google/i.test(v.name)) || vs.find(v => /^fr/i.test(v.lang)) || null; } catch { } },
  prime() { if (!('speechSynthesis' in window) || this.primed) return; this.pick(); const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); this.primed = true; },
  say(text, interrupt = false) {
    if (!data.settings.voice || !('speechSynthesis' in window) || !text) return;
    try { if (interrupt && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; if (this.voice) u.voice = this.voice; u.rate = 1.04; speechSynthesis.speak(u); } catch { }
  }
};
try { speechSynthesis.addEventListener('voiceschanged', () => Voice.pick()); } catch { }
const Sound = {
  ctx: null,
  unlock() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { }
    try { this.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch { }
    Voice.prime();
  },
  tone(freq, dur = 0.12, vol = 0.22) {
    const c = this.ctx; if (!c) return;
    try { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.03); } catch { }
  },
  tick() { this.tone(660, 0.09, 0.16); },
  go() { this.tone(988, 0.12, 0.25); setTimeout(() => this.tone(1319, 0.22, 0.25), 120); },
  win() { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 0.2), i * 110)); }
};
// Mode test silencieux (?mute) : aucun son ni voix.
const MUTED = /[?&]mute\b/.test(location.search);
if (MUTED) { Sound.tone = () => { }; Voice.say = () => { }; }
if (NATIVE) Object.assign(Sound, { unlock() { }, tick() { emit({ t: 'fx', name: 'tick' }); }, go() { emit({ t: 'fx', name: 'go' }); }, win() { emit({ t: 'fx', name: 'win' }); } });

// Voix du coach : phrases enregistrées avec le clone ElevenLabs de Yoni (audio/voice, texte dans js/coach.json).
const Coach = {
  index: {}, lines: {}, buffers: new Map(), gain: null, busyUntil: 0, current: null, loadingSince: 0,
  ready: fetch('audio/voice/index.json?v=3.1').then(r => r.json()).then(i => { Coach.index = i; }).catch(() => { })
    .then(() => fetch('js/coach.json?v=3.1')).then(r => r?.json()).then(c => { if (c) Coach.lines = c.lines; }).catch(() => { }),
  dur(id) { return this.index[id]?.d ?? 0; },
  ids(prefix) { return Object.keys(this.index).filter(k => k.startsWith(prefix)); },
  out() { const c = Sound.ctx; if (!c) return null; if (!this.gain || this.gain.context !== c) { this.gain = c.createGain(); this.gain.gain.value = MUTED ? 0 : 1; this.gain.connect(c.destination); } return this.gain; },
  load(ids) {
    const c = Sound.ctx; if (!c) return;
    this.loadingSince = now();
    ids.filter(id => this.index[id] && !this.buffers.has(id)).forEach(id => {
      this.buffers.set(id, null);
      fetch(`audio/voice/${id}.mp3?v=${this.index[id].h}`).then(r => r.arrayBuffer()).then(ab => new Promise((ok, ko) => c.decodeAudioData(ab, ok, ko)))
        .then(buf => this.buffers.set(id, buf)).catch(() => this.buffers.delete(id));
    });
  },
  busy() { return now() < this.busyUntil; },
  // Renvoie false s'il faut réessayer plus tard (voix occupée ou phrase en cours de chargement).
  say(id, { force = false } = {}) {
    if (!data.settings.voice || !id || QUIET) return true;
    if (!force && this.busy()) return false;
    if (window.__said) window.__said.push([Math.round(now()), id, NATIVE ? 'app' : this.buffers.get(id) ? 'mp3' : this.buffers.has(id) ? 'loading' : 'tts']);
    if (NATIVE) {
      const text = this.index[id] ? undefined : this.lines[id];
      emit({ t: 'say', id, force, text }); this.busyUntil = now() + (this.dur(id) || (text || '').length * 0.065) * 1000 + 180; return true;
    }
    const buf = this.buffers.get(id);
    if (buf === null && now() - this.loadingSince < 6000) return false;
    if (force) this.stop();
    const out = this.out();
    if (buf && out) {
      try { const src = Sound.ctx.createBufferSource(); src.buffer = buf; src.connect(out); src.start(); this.current = src; } catch { }
      this.busyUntil = now() + buf.duration * 1000 + 180; return true;
    }
    const text = this.lines[id]; if (!text) return true;
    Voice.say(text, force); this.busyUntil = now() + Math.max(this.dur(id), text.length * 0.065) * 1000 + 200; return true;
  },
  stop() { if (NATIVE) emit({ t: 'stop' }); try { this.current?.stop(); } catch { } this.current = null; this.busyUntil = 0; try { speechSynthesis.cancel(); } catch { } }
};
const CHG_LINE = { new: 'g.chg.new', '+1': 'g.chg.plus1', '+kg': 'g.chg.kg', '+s': 'g.chg.temps', '=': 'g.chg.same', max: 'g.chg.max', next: 'g.chg.palier' };
// Laisse le temps à la voix : préparation et repos avant un nouvel exercice assez longs pour l'explication.
function voicedSessionTimeline(plan) {
  const steps = buildSessionTimeline(plan), d = id => Coach.dur(id), g = 0.45;
  const first = plan.items[0];
  steps[0].dur = Math.max(steps[0].dur, Math.ceil(0.3 + d(`g.seance.${plan.letter}`) + d(`ex.${first.id}.intro`) + d(CHG_LINE[first.change]) + 3 * g + 3));
  steps.forEach(st => { if (st.t === 'rest' && st.newEx) { const it = plan.items.find(i => i.id === st.next); st.dur = Math.max(st.dur, Math.ceil(3.5 + d(`ex.${st.next}.intro`) + d(CHG_LINE[it.change]) + 2 * g + 12)); } });
  return steps;
}
function voicedMobilityTimeline(variant) {
  const steps = buildMobilityTimeline(variant), d = id => Coach.dur(id);
  // L'explication démarre pendant la préparation et continue pendant les premières secondes du mouvement (la vidéo montre le geste).
  if (steps[0]?.t === 'mgap') steps[0].dur = Math.max(steps[0].dur, Math.ceil(d(`mob.${variant}.start`) + 3));
  return steps;
}
const Wake = {
  lock: null,
  async on() { if (NATIVE) return NATIVE.post({ t: 'session', on: true }); try { if (!this.lock && navigator.wakeLock) { this.lock = await navigator.wakeLock.request('screen'); this.lock.addEventListener('release', () => { this.lock = null; }); } } catch { } },
  off() { if (NATIVE) return NATIVE.post({ t: 'session', on: false }); try { this.lock?.release(); } catch { } this.lock = null; }
};

// ——— Médias : YouTube intégré, vidéo locale, illustration ———
let ytPromise = null;
function loadYT() {
  if (window.YT?.Player) return Promise.resolve(true);
  return ytPromise ||= new Promise(res => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); res(true); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true; s.onerror = () => res(false);
    document.head.append(s); setTimeout(() => res(!!window.YT?.Player), 9000);
  });
}
const ICONS = {
  rolldown: `<svg viewBox="0 0 120 120" class="pose" aria-hidden="true"><g class="pose-a"><circle cx="60" cy="18" r="9"/><path d="M60 28v36M60 64l-12 40M60 64l12 40M60 36l-16 22M60 36l16 22"/></g><g class="pose-b"><circle cx="42" cy="64" r="9"/><path d="M50 58c10-12 16-18 22-6M72 52l-12 52M72 52l12 52M48 70l2 26M54 70l8 24"/></g></svg>`
};
class Media {
  constructor(host) { this.host = host; this.key = null; this.cleanup = []; this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(host); }
  show(spec, key, label = '') {
    if (key && key === this.key) return; this.key = key;
    this.clear();
    if (!spec) { this.host.innerHTML = ''; return; }
    this.spec = spec;
    const thumb = spec.yt ? `https://i.ytimg.com/vi/${spec.yt.id}/hqdefault.jpg` : spec.poster || spec.image || '';
    this.host.innerHTML = `${thumb ? `<img class="m-back" src="${esc(thumb)}" alt="" aria-hidden="true">` : ''}<div class="m-stage${spec.mirror ? ' mirror' : ''}"><div class="m-fill"></div></div><div class="m-shield"></div>${spec.yt ? `<span class="m-credit">${esc(spec.yt.by)}</span>` : ''}`;
    this.stage = this.host.querySelector('.m-stage'); this.fillEl = this.host.querySelector('.m-fill');
    this.host.setAttribute('aria-label', label ? `Démonstration : ${label}` : 'Démonstration');
    this.fit();
    if (spec.yt) this.mountYT(spec);
    else if (spec.src) this.mountVideo(spec);
    else if (spec.image) this.mountImage(spec);
    else this.mountIcon(spec);
    this.fit();
  }
  fit() {
    if (!this.stage || !this.spec) return;
    const W = this.host.clientWidth, H = this.host.clientHeight; if (!W || !H) return;
    const S = this.spec.ratio || 16 / 9, V = this.spec.crop || S;
    let w = W, h = W / V; if (h > H) { h = H; w = H * V; }
    Object.assign(this.stage.style, { width: `${w}px`, height: `${h}px` });
    let fw = w, fh = w / S; if (fh < h) { fh = h; fw = h * S; }
    // YouTube refuse de démarrer sous 200 × 200 px : on crée le lecteur plus grand, puis on le réduit à l'écran.
    const k = this.spec.yt ? Math.max(1, 260 / Math.min(fw, fh)) : 1;
    Object.assign(this.fillEl.style, { width: `${fw * k}px`, height: `${fh * k}px`, transform: `translate(-50%, -50%) scale(${1 / k})` });
  }
  mountVideo(spec) {
    this.fillEl.innerHTML = `<video src="${esc(spec.src)}" poster="${esc(spec.poster || '')}" muted loop playsinline autoplay preload="auto"></video>`;
    const v = this.fillEl.querySelector('video'); v.muted = true;
    const play = () => v.play().catch(() => { }); play(); v.addEventListener('loadeddata', play, { once: true });
    v.addEventListener('error', () => this.failed(), { once: true });
    this.video = v;
  }
  mountImage(spec) {
    this.fillEl.innerHTML = `<div class="m-duo"><img src="${esc(spec.image)}" alt=""><img class="b" src="${esc(spec.image)}" alt=""></div>`;
    if (!reduced) { const duo = this.fillEl.querySelector('.m-duo'); const id = setInterval(() => duo.classList.toggle('alt'), 1700); this.cleanup.push(() => clearInterval(id)); }
  }
  mountIcon(spec) { this.fillEl.innerHTML = `<div class="m-icon">${ICONS[spec.icon] || ''}</div>`; this.host.querySelector('.m-back')?.remove(); }
  async mountYT(spec) {
    const { id, start } = spec.yt; let end = spec.yt.end; const token = Symbol(); this.token = token;
    const ok = await loadYT(); dlog('yt-api ' + ok + ' ' + id); if (this.token !== token) return;
    if (!ok) return this.failed();
    const div = document.createElement('div'); this.fillEl.append(div); dlog(`mount ${id} host=${this.host.clientWidth}x${this.host.clientHeight} fill=${this.fillEl.style.width}x${this.fillEl.style.height}`);
    let poll = null;
    const player = new YT.Player(div, {
      host: 'https://www.youtube-nocookie.com', videoId: id, width: '100%', height: '100%',
      playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, start: Math.floor(start), end: Math.ceil(end), origin: location.origin },
      events: {
        onReady: e => { dlog('ready ' + id + ' ' + this.host.clientWidth + 'x' + this.host.clientHeight); try { const d = e.target.getDuration(); if (d > start + 1) end = Math.min(end, d - 0.3); e.target.mute(); e.target.seekTo(start, true); e.target.playVideo(); } catch { } poll = setInterval(() => { try { const p = e.target, t = p.getCurrentTime(), st = p.getPlayerState(); if (t >= end - 0.08 || t < start - 0.6) p.seekTo(start, true); if (!this.paused && st !== 1 && st !== 3) p.playVideo(); } catch { } }, 90); this.host.classList.add('ready'); },
        onStateChange: e => { dlog('state ' + id + ' ' + e.data); try { if (e.data === YT.PlayerState.ENDED) { e.target.seekTo(start, true); e.target.playVideo(); } } catch { } },
        onError: ev => { dlog('error ' + id + ' ' + ev.data); this.failed(); }
      }
    });
    this.yt = player;
    this.cleanup.push(() => { clearInterval(poll); try { player.destroy(); } catch { } });
  }
  failed() {
    if (this.spec?.fallback && this.spec.fallback !== this.spec) { const fb = this.spec.fallback; this.key += ':fb'; this.clear(); this.spec = fb; this.host.innerHTML = `<img class="m-back" src="${esc(fb.poster)}" alt="" aria-hidden="true"><div class="m-stage"><div class="m-fill"></div></div><div class="m-shield"></div>`; this.stage = this.host.querySelector('.m-stage'); this.fillEl = this.host.querySelector('.m-fill'); this.mountVideo(fb); this.fit(); return; }
    this.fillEl && (this.fillEl.innerHTML = '<div class="m-off">Vidéo indisponible hors connexion</div>');
  }
  pause(on) { this.paused = on; try { if (this.yt?.pauseVideo) on ? this.yt.pauseVideo() : this.yt.playVideo(); } catch { } try { if (this.video) on ? this.video.pause() : this.video.play().catch(() => { }); } catch { } }
  clear() { this.cleanup.forEach(f => f()); this.cleanup = []; this.yt = null; this.video = null; this.token = null; }
  destroy() { this.clear(); this.ro.disconnect(); }
}

// ——— Petits composants ———
const ring = (pct, { size = 64, stroke = 7, cls = '' } = {}) => {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg class="ring ${cls}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/><circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - Math.max(0, Math.min(100, pct)) / 100)}"/></svg>`;
};
const flame = `<svg class="flame" viewBox="0 0 32 40" aria-hidden="true"><path class="f-out" d="M16 2c2 7 10 11 10 22a10 10 0 0 1-20 0c0-6 3-9 5-12 1 4 3 5 4 5-1-6 0-11 1-15z"/><path class="f-in" d="M16 18c1 4 5 6 5 11a5 5 0 0 1-10 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 0-8z"/></svg>`;
function animateRings(root = app) { requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.ring-fg[data-target]').forEach(el => { el.style.strokeDashoffset = el.dataset.target; }))); }
function countUp(el, from, to, ms = 900) {
  if (!el) return; if (reduced || from === to) { el.textContent = to; return; }
  const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step);
}
const loadText = (exId, load) => { const ex = EXERCISES[exId]; if (!ex.load || load === null || load === undefined) return ''; return load === 0 ? 'poids du corps' : `${load} kg`; };
const unitOf = ex => ex.unit || (ex.perSide ? 'par côté' : ex.alternate ? 'par jambe' : 'reps');
function prescriptionText(item, sets) {
  const ex = EXERCISES[item.id];
  if (ex.kind === 'hold') { const L = PLANK_LEVELS[item.level]; return `${sets} tours · ${L.face} s + ${L.side} s × 2`; }
  const l = loadText(item.id, item.load);
  return `${sets} × ${item.target} ${unitOf(ex)}${l ? ` · ${l}` : ''}`;
}
const CHANGE = { new: ['Nouveau', 'new'], '+1': ['+1 rep', 'up'], '+kg': ['+ charge', 'up'], '+s': ['+ temps', 'up'], '=': ['Pareil', 'same'], max: ['Max', 'same'], next: ['Palier', 'up'] };
const changeChip = c => { const [t, k] = CHANGE[c] || ['', 'same']; return t ? `<span class="chip chip-${k}">${t}</span>` : ''; };
const dayName = k => ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][weekday(k)];
const longDate = k => { const [y, m, d] = k.split('-').map(Number); return `${dayName(k)} ${d} ${['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][m - 1]}`; };

// ——— Accueil « Aujourd'hui » ———
function weekStrip(t) {
  const start = addDays(t, -weekday(t));
  const byDay = new Map(); data.history.forEach(h => { const a = byDay.get(h.date) || []; a.push(h); byDay.set(h.date, a); });
  return `<div class="week" aria-label="Ta semaine">${Array.from({ length: 7 }, (_, i) => {
    const k = addDays(start, i), items = byDay.get(k) || [], s = items.find(h => h.type === 'seance'), m = items.some(h => h.type === 'mobilite');
    return `<div class="wd${k === t ? ' today' : ''}${k > t ? ' future' : ''}"><span class="wd-l">${'DLMMJVS'[i]}</span><span class="wd-dot${s ? ' s' : ''}${m ? ' m' : ''}">${s ? s.letter : m ? '' : ''}</span></div>`;
  }).join('')}</div>`;
}
function statsBlock(t) {
  const st = streak(data, t), reg = regularity(data, t);
  return `<section class="stats rise" style="--d:0">
    <div class="stat stat-streak${st.doneToday ? ' lit' : ''}">${flame}<div><b class="num" data-count="${st.current}">${st.current}</b><span>${st.current > 1 ? 'jours de suite' : 'jour de suite'}</span><small>${st.doneToday ? 'Prolongée aujourd’hui' : st.current ? 'À prolonger aujourd’hui' : st.best ? `Record : ${st.best} j` : 'Lance ta série'}</small></div></div>
    <div class="stat stat-reg">${ring(reg, { size: 58, stroke: 6 })}<div><b><span class="num" data-count="${reg}">${reg}</span><i>%</i></b><span>régularité</span><small>${regularityLabel(reg)}</small></div></div>
    ${weekStrip(t)}
  </section>`;
}
function seanceHero(letter, t, kicker) {
  const plan = sessionPlan(data, letter, t, { short: ui.short && data.volume === 3 });
  const steps = voicedSessionTimeline(plan), dur = estimate(steps, plan);
  const vs = volumeStatus(data, t), S = SESSIONS[letter];
  const palier = plan.reprise ? `<p class="palier warn">Reprise après ${plan.gap} jours : 2 séries, mêmes charges.</p>`
    : data.volume === 2 ? `<div class="palier"><div class="pal-top"><span>Palier 2 séries</span><span>${Math.min(vs.n, 6)}/6</span></div><div class="bar"><i style="--w:${Math.min(100, vs.n / 6 * 100)}%"></i></div><small>6 séances en 2 semaines, sans douleur, débloquent 3 séries.</small></div>`
      : `<div class="palier"><div class="pal-top"><span>Palier 3 séries</span><span>débloqué</span></div><label class="switch"><input type="checkbox" id="shortToggle" ${ui.short ? 'checked' : ''}><span></span>Version courte (2 séries) pour aujourd’hui</label></div>`;
  return `<section class="hero card rise" style="--d:1">
    <p class="kicker">${kicker || 'Aujourd’hui'}</p>
    <div class="hero-head"><h1>Séance ${letter}</h1><span class="hero-dur">≈ ${fmtDuration(dur)}</span></div>
    <p class="hero-sub">${esc(S.title)}</p>
    <ol class="ex-list">${plan.items.map((it, i) => `<li><span class="ex-n">${i + 1}</span><div><strong>${esc(EXERCISES[it.id].name)}</strong><small>${prescriptionText(it, plan.sets)}</small></div>${changeChip(it.change)}</li>`).join('')}</ol>
    ${palier}
    <button class="btn btn-go" data-act="start-seance" data-letter="${letter}"><span>Lancer</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></button>
    <p class="fine">Mains libres : la voix compte, tu touches l’écran quand tu as fini une série.</p>
  </section>`;
}
function mobilityCard(t, { hero = false, kicker = '', note = '' } = {}) {
  const v = mobVariant(), M = MOBILITY[v], dur = voicedMobilityTimeline(v).reduce((a, s) => a + (s.dur || 0), 0);
  const done = data.history.some(h => h.type === 'mobilite' && h.date === t);
  if (done && !hero) return `<section class="card mob-card done rise" style="--d:2"><span class="check-dot">✓</span><div><strong>Mobilité faite</strong><small>Tes hanches et ton dos te disent merci.</small></div></section>`;
  return `<section class="card ${hero ? 'hero' : 'mob-card'} rise" style="--d:${hero ? 1 : 2}">
    ${hero ? `<p class="kicker">${esc(kicker)}</p>` : ''}
    <div class="${hero ? 'hero-head' : 'mob-head'}">${hero ? `<h1>${M.title}</h1>` : `<div><strong>${M.title}</strong><small>${M.where} · ≈ ${fmtDuration(dur)}</small></div>`}${hero ? `<span class="hero-dur">≈ ${fmtDuration(dur)}</span>` : ''}</div>
    ${hero ? `<p class="hero-sub">${M.where} · ${M.steps.length} mouvements</p>${note ? `<p class="note">${note}</p>` : ''}` : ''}
    <div class="seg" role="radiogroup" aria-label="Durée de la mobilité"><button role="radio" aria-checked="${v === 'express'}" data-act="mob-variant" data-v="express">Express · au lit</button><button role="radio" aria-checked="${v === 'complete'}" data-act="mob-variant" data-v="complete">Complète · au sol</button></div>
    <button class="btn ${hero ? 'btn-go' : 'btn-soft'}" data-act="start-mob"><span>${hero ? 'Lancer' : 'Lancer la mobilité'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg></button>
  </section>`;
}
function renderToday() {
  const t = today(), plan = todayPlan(data, t), h = plan.hero;
  const hour = new Date().getHours();
  const active = store.get(ACTIVE);
  const resume = active && Date.now() - (active.savedAt || 0) < 6 * 3600e3 ? active : null;
  let main = '';
  if (resume) main += `<section class="card resume rise" style="--d:1"><div><strong>${resume.kind === 'seance' ? `Séance ${resume.letter}` : MOBILITY[resume.variant].title} en cours</strong><small>Étape ${resume.i + 1} sur ${resume.steps.length}</small></div><button class="btn btn-go small" data-act="resume">Reprendre</button><button class="link" data-act="drop">Abandonner</button></section>`;
  if (h.kind === 'seance') main += seanceHero(h.letter, t, h.gap && h.gap > 2 ? `Séance ${h.letter} · ${h.gap} jours depuis la dernière` : '') + mobilityCard(t);
  else if (h.kind === 'mobilite') main += mobilityCard(t, { hero: true, kicker: h.reason === 'douleur' ? 'Ton dos a dit « douleur » deux fois' : 'Jour de récup · séance demain', note: h.reason === 'douleur' ? 'Aujourd’hui, mobilité seulement. Si la douleur dépasse 3-4/10 plusieurs jours, appelle Noémie.' : 'La séance ' + h.alt + ' sera proposée demain.' })
    + `<button class="card alt-link rise" style="--d:2" data-act="start-seance" data-letter="${h.alt}"><span>Faire quand même la séance ${h.alt}</span><span aria-hidden="true">→</span></button>`;
  else main += `<section class="card hero done-hero rise" style="--d:1"><p class="kicker">Séance ${h.letter} faite</p><div class="hero-head"><h1>Bien joué.</h1><span class="big-check">✓</span></div><p class="hero-sub">Prochaine : séance ${h.next}, après-demain. Demain, mobilité.</p></section>` + mobilityCard(t);
  app.innerHTML = `<div class="page today-page">
    <header class="top rise" style="--d:0"><div><p class="hello">${hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'} Yoni</p><p class="date">${longDate(t)}</p></div><a class="icon-btn" href="#progres" aria-label="Voir mes progrès"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V10M10 19V5M16 19v-7M22 19H2"/></svg></a></header>
    <div class="today-grid">${statsBlock(t)}<div class="today-main">${main}
      <section class="others rise" style="--d:3"><p class="mini-title">Autre chose ?</p><div class="chips">${ORDER.map(L => `<button class="chip-btn" data-act="start-seance" data-letter="${L}">Séance ${L}</button>`).join('')}<button class="chip-btn" data-act="start-mob" data-v="express">Mobilité express</button><button class="chip-btn" data-act="start-mob" data-v="complete">Mobilité complète</button><button class="chip-btn" data-act="log-past">Noter une séance déjà faite</button></div></section>
      ${installHint()}
    </div></div>
  </div>`;
  app.querySelectorAll('.num[data-count]').forEach(el => countUp(el, 0, +el.dataset.count, 700));
  animateRings();
}
function installHint() {
  if (NATIVE) return '';
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (standalone || !ios || ui.installHidden) return '';
  return `<section class="install rise" style="--d:4"><div><strong>Mets Ma routine sur ton écran d’accueil</strong><small>Dans Safari : touche ≡ à gauche de l’adresse, puis Partager, En voir plus, Sur l’écran d’accueil, Ajouter. Ensuite, ouvre toujours Ma routine depuis l’icône : Safari, la navigation privée et l’icône ont chacun leur propre mémoire.</small></div><button class="x" data-act="hide-install" aria-label="Masquer">×</button></section>`;
}

// ——— Historique et séance oubliée ———
function historyList() {
  const items = [...data.history].sort((a, b) => b.ts - a.ts).slice(0, 10);
  if (!items.length) return '<p class="muted">Rien pour l’instant.</p>';
  return `<ul class="hist">${items.map(h => `<li><span class="hist-dot ${h.type === 'seance' ? 's' : 'm'}">${h.type === 'seance' ? h.letter : ''}</span><div><strong>${h.type === 'seance' ? `Séance ${h.letter}` : MOBILITY[h.variant]?.title || 'Mobilité'}</strong><small>${longDate(h.date)}${h.manual ? ' · notée à la main' : ''}</small></div><button class="x" data-act="del-hist" data-ts="${h.ts}" aria-label="Supprimer">×</button></li>`).join('')}</ul>`;
}
let logPick = null;
function renderLogPast() {
  const t = today();
  logPick ||= { day: t, what: nextLetter(data) };
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, -i));
  const label = k => k === t ? 'Aujourd’hui' : k === addDays(t, -1) ? 'Hier' : dayName(k).replace(/^./, c => c.toUpperCase()) + ' ' + +k.slice(8);
  const opt = (act, val, cur, text) => `<button class="pick${val === cur ? ' on' : ''}" data-act="${act}" data-v="${val}" aria-pressed="${val === cur}">${text}</button>`;
  app.innerHTML = `<div class="page log-page">
    <header class="top rise" style="--d:0"><a class="back" href="#">← Aujourd’hui</a><h1 class="page-title">Séance déjà faite</h1></header>
    <section class="card rise" style="--d:1"><p class="mini-title">Quel jour ?</p><div class="picks">${days.map(k => opt('log-day', k, logPick.day, label(k))).join('')}</div></section>
    <section class="card rise" style="--d:2"><p class="mini-title">Quoi ?</p><div class="picks">${ORDER.map(L => opt('log-what', L, logPick.what, `Séance ${L}`)).join('')}${opt('log-what', 'mob', logPick.what, 'Mobilité')}</div>
      <p class="muted fine">Sans les charges ni les reps : la prochaine fois, le site te proposera les mêmes objectifs.</p></section>
    <button class="btn btn-go rise" style="--d:3" data-act="log-save">Enregistrer</button>
  </div>`;
}
function saveLogPast() {
  const { day, what } = logPick, t = today(), ts = Date.parse(`${day}T19:00:00`);
  if (what === 'mob') { const res = validateMobility(data, { type: 'mobilite', variant: 'express', date: day, ts, manual: true }, t); save(); logPick = null; return celebrate({ title: 'Mobilité notée', res, records: [] }); }
  const res = validateSeance(data, { type: 'seance', date: day, ts, letter: what, sets: data.volume, back: 'ok', ex: {}, manual: true }, t);
  save(); logPick = null; celebrate({ title: `Séance ${what} notée`, res, records: [] });
}

// ——— Progrès ———
function sparkline(values) {
  if (values.length < 2) return '<span class="spark-empty">—</span>';
  const w = 120, h = 34, min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/><circle cx="${w}" cy="${pts.split(' ').at(-1).split(',')[1]}" r="3"/></svg>`;
}
function renderProgress() {
  const t = today(), st = streak(data, t), reg = regularity(data, t), s = seancesOf(data), vs = volumeStatus(data, t), nextDay = s.at(-1)?.date === t ? addDays(t, 2) : t;
  const start = addDays(t, -weekday(t) - 35);
  const byDay = new Map(); data.history.forEach(h => { const a = byDay.get(h.date) || []; a.push(h); byDay.set(h.date, a); });
  const cal = Array.from({ length: 42 }, (_, i) => { const k = addDays(start, i), items = byDay.get(k) || [], se = items.find(h => h.type === 'seance'), m = items.some(h => h.type === 'mobilite'); return `<span class="cal-d${se ? ' s' : ''}${m ? ' m' : ''}${k === t ? ' today' : ''}${k > t ? ' future' : ''}" title="${k}">${se ? se.letter : ''}</span>`; }).join('');
  const exRows = ORDER.flatMap(L => SESSIONS[L].exercises).map(id => {
    const ex = EXERCISES[id], recs = s.filter(h => h.ex?.[id]).map(h => ({ ...h.ex[id], date: h.date })).slice(-10), last = recs.at(-1), next = prescribe(data, id, nextDay);
    const vals = recs.map(r => ex.kind === 'hold' ? (r.holds || []).flat().reduce((a, b) => a + b, 0) : ex.load ? (r.load || 0) * 100 + Math.max(...(r.reps || [0])) : (r.reps || []).reduce((a, b) => a + (b || 0), 0));
    const lastTxt = !last ? 'Pas encore fait' : ex.kind === 'hold' ? `${(last.holds || []).map(r => r.join('/')).join(' · ')} s` : `${(last.reps || []).join(' · ')} ${unitOf(ex)}${loadText(id, last.load) ? ` · ${loadText(id, last.load)}` : ''}`;
    const nextTxt = ex.kind === 'hold' ? `${PLANK_LEVELS[next.level].face} s + ${PLANK_LEVELS[next.level].side} s × 2` : `${next.target} ${unitOf(ex)}${loadText(id, next.load) ? ` · ${loadText(id, next.load)}` : ''}`;
    return `<li><div class="ex-info"><strong>${esc(ex.name)}</strong><small>Dernière fois : ${esc(lastTxt)}</small><small class="nx">Prochaine : ${esc(nextTxt)} ${changeChip(next.change)}</small></div>${sparkline(vals)}</li>`;
  }).join('');
  app.innerHTML = `<div class="page progress-page">
    <header class="top rise" style="--d:0"><a class="back" href="#">← Aujourd’hui</a><h1 class="page-title">Progrès</h1></header>
    <section class="pg-stats rise" style="--d:1">
      <div class="card tile">${flame}<b class="num" data-count="${st.current}">${st.current}</b><span>${st.current > 1 ? 'jours' : 'jour'} de suite</span><small>Record ${st.best} j</small></div>
      <div class="card tile"><div class="ring-box">${ring(reg, { size: 70, stroke: 7 })}<b><span class="num" data-count="${reg}">${reg}</span><i>%</i></b></div><span>régularité</span><small>${regularityLabel(reg)}</small></div>
      <div class="card tile"><b class="num big" data-count="${s.length}">${s.length}</b><span>${s.length > 1 ? 'séances' : 'séance'}</span><small>${(n => `${n} ${n > 1 ? 'mobilités' : 'mobilité'}`)(data.history.filter(h => h.type === 'mobilite').length)}</small></div>
    </section>
    <section class="card rise" style="--d:2"><p class="mini-title">Palier</p>${data.volume === 3 ? '<p class="pal-big">3 séries par exercice <span class="chip chip-up">Débloqué</span></p>' : `<p class="pal-big">2 séries par exercice</p><div class="bar"><i style="--w:${Math.min(100, vs.n / 6 * 100)}%"></i></div><small class="muted">${Math.min(vs.n, 6)}/6 séances sur les 14 derniers jours${vs.pain ? ' · sans douleur' : ''}. Les charges et les reps ne montent que si tu restes dans le rythme (4 jours max entre deux séances).</small>`}</section>
    <section class="card rise" style="--d:3"><p class="mini-title">6 dernières semaines</p><div class="cal-head">${'DLMMJVS'.split('').map(c => `<span>${c}</span>`).join('')}</div><div class="cal">${cal}</div><div class="legend"><span><i class="lg s"></i>Séance</span><span><i class="lg m"></i>Mobilité</span></div></section>
    <section class="card rise" style="--d:4"><p class="mini-title">Exercices</p><ul class="ex-progress">${exRows}</ul></section>
    <section class="card rise" style="--d:5"><p class="mini-title">Historique</p>${historyList()}<button class="btn btn-soft small hist-add" data-act="log-past">Noter une séance déjà faite</button></section>
    <section class="card rise" style="--d:6"><p class="mini-title">Réglages</p>
      <label class="switch"><input type="checkbox" data-set="voice" ${data.settings.voice ? 'checked' : ''}><span></span>Voix du coach</label>
      <label class="switch"><input type="checkbox" data-set="count" ${data.settings.count ? 'checked' : ''}><span></span>Compter les répétitions à voix haute</label>
      ${NATIVE ? `<label class="switch"><input type="checkbox" data-set="reminders" ${data.settings.reminders !== false ? 'checked' : ''}><span></span>Rappels</label>
      <div class="times">${[['seanceAt', 'Séance'], ['mobAt', 'Mobilité'], ['dangerAt', 'Série en danger']].map(([k, l]) => `<label>${l}<input type="time" data-time="${k}" value="${esc(data.settings[k] || REMIND[k])}"></label>`).join('')}</div>` : ''}
      <div class="row-btns"><button class="btn btn-soft small" data-act="test-sound">Tester le son</button><button class="btn btn-soft small" data-act="export">Sauvegarder mes données</button><label class="btn btn-soft small file">Restaurer<input type="file" accept="application/json" data-act="import" hidden></label></div>
      <p class="muted fine">${NATIVE ? 'Tes progrès sont gardés dans l’appli et synchronisés par iCloud entre ton iPhone et ton iPad.' : 'Tes progrès sont gardés sur cet appareil, à cet endroit précis : Safari, la navigation privée et l’icône d’écran d’accueil ont chacun leur propre mémoire.'} Voix : ton clone ElevenLabs. Vidéos : coachs YouTube intégrés et clips Mixkit/Pexels.</p>
    </section>
  </div>`;
  app.querySelectorAll('.num[data-count]').forEach(el => countUp(el, 0, +el.dataset.count, 700));
  animateRings();
}

// ——— Lecteur (séance ou mobilité, mains libres) ———
let P = null, media = null, timer = null;
const step = () => P.steps[P.i];
const exOf = st => EXERCISES[st.ex];
const itemOf = id => P.plan.items.find(i => i.id === id);
function saveActive() { if (!P) return store.set(ACTIVE, null); store.set(ACTIVE, { ...P, savedAt: Date.now() }); }
function elapsed() { const t = now(); return (t - P.stepStart - P.stepPaused - (P.pausedAt ? t - P.pausedAt : 0)) / 1000; }

function startSeance(letter) {
  Sound.unlock(); Wake.on();
  const t = today(), plan = sessionPlan(data, letter, t, { short: ui.short && data.volume === 3 });
  const log = {}; plan.items.forEach(it => { log[it.id] = EXERCISES[it.id].kind === 'hold' ? { level: it.level, holds: [] } : { target: it.target, load: it.load, reps: [], sides: [[], []] }; });
  P = { kind: 'seance', letter, plan, steps: voicedSessionTimeline(plan), i: 0, stepStart: now(), stepPaused: 0, pausedAt: null, log, date: t, started: Date.now(), cue: {} };
  preloadVoice(); openPlayer();
}
function startMobility(variant) {
  Sound.unlock(); Wake.on();
  P = { kind: 'mobilite', variant, steps: voicedMobilityTimeline(variant), i: 0, stepStart: now(), stepPaused: 0, pausedAt: null, date: today(), started: Date.now(), cue: {} };
  preloadVoice(); openPlayer();
}
function resumeActive() {
  const a = store.get(ACTIVE); if (!a) return;
  Sound.unlock(); Wake.on();
  P = a; delete P.savedAt; if (!P.pausedAt) P.pausedAt = now(); P.cue ||= {};
  preloadVoice(); openPlayer(); togglePause(false);
}
function preloadVoice() {
  if (P.kind === 'seance') Coach.load([...Coach.ids('n.'), ...Coach.ids('g.'), ...P.plan.items.flatMap(it => Coach.ids(`ex.${it.id}.`))]);
  else Coach.load([...Coach.ids('g.switch'), `mob.${P.variant}.start`, 'mob.ten', 'mob.end', ...MOBILITY[P.variant].steps.flatMap(([id]) => Coach.ids(`mob.${id}.`))]);
}
function openPlayer() {
  location.hash = '';
  app.innerHTML = `<div class="player" id="player">
    <header class="pl-top"><div class="segs" id="segs"></div><div class="pl-meta"><span class="pl-kicker" id="plKicker"></span><button class="pl-pause" id="plPause" aria-label="Pause"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg></button></div></header>
    <div class="pl-grid">
      <div class="pl-media" id="plMedia"></div>
      <div class="pl-body">
        <p class="pl-eyebrow" id="plEyebrow"></p>
        <h1 class="pl-title" id="plTitle"></h1>
        <p class="pl-target" id="plTarget"></p>
        <div class="pl-center" id="plCenter"></div>
        <p class="pl-hint" id="plHint"></p>
        <div class="pl-panel" id="plPanel"></div>
        <div class="pl-actions" id="plActions"></div>
      </div>
    </div>
    <div class="pl-overlay" id="plOverlay" hidden></div>
  </div>`;
  media?.destroy(); media = new Media(document.getElementById('plMedia'));
  document.getElementById('plPause').addEventListener('click', e => { e.stopPropagation(); togglePause(); });
  document.getElementById('player').addEventListener('click', onPlayerTap);
  enterStep(true);
  clearInterval(timer); timer = setInterval(tick, 100);
}
function closePlayer() { clearInterval(timer); timer = null; media?.destroy(); media = null; P = null; Wake.off(); Coach.stop(); saveActive(); }

function segsHtml() {
  if (P.kind === 'seance') {
    return P.plan.items.map(it => { const idx = P.steps.map((s, k) => [s, k]).filter(([s]) => s.ex === it.id && s.t !== 'rest'); const first = idx[0][1], last = idx.at(-1)[1]; const pct = P.i > last ? 100 : P.i < first ? 0 : Math.round((P.i - first) / (last - first + 1) * 100); return `<span class="seg-b"><i style="width:${pct}%"></i></span>`; }).join('');
  }
  const moves = P.steps.filter(s => s.t === 'mgap'); const cur = P.steps.slice(0, P.i + 1).filter(s => s.t === 'mgap').length;
  return moves.map((_, k) => `<span class="seg-b"><i style="width:${k < cur - 1 ? 100 : k === cur - 1 ? 50 : 0}%"></i></span>`).join('');
}
function mediaFor(st) {
  if (P.kind === 'mobilite') { const m = MOVES[st.move]; if (!m) return [null, null]; const spec = st.side === 1 && m.media.yt ? { ...m.media, mirror: !m.media.mirror } : m.media; return [spec, `${st.move}:${st.side === 1 ? 1 : 0}`]; }
  if (st.t === 'bilan') return [null, 'bilan'];
  const id = st.t === 'rest' ? st.next : st.ex, ex = EXERCISES[id];
  if (ex.kind === 'hold') { const k = st.t === 'rest' ? 0 : st.hold ?? 0; return [ex.holds[k].media, `${id}:${k}`]; }
  return [ex.media, id];
}
function setText(id, html) { if (SIM) return; const el = document.getElementById(id); if (el) el.innerHTML = html; }

function enterStep(initial = false) {
  const st = step(); if (!st) return;
  P.fired = {}; P.lastSec = null; P.count = 0; P.script = []; P.si = 0; P.after = [];
  if (SIM) { if (P.kind === 'seance') enterSeanceStep(st, initial); else enterMobilityStep(st, initial); return; }
  const pl = document.getElementById('player'); if (!pl) return;
  pl.dataset.phase = st.t;
  setText('segs', segsHtml());
  const [spec, key] = mediaFor(st);
  if (st.t === 'bilan' || st.t === 'mfin') { media.show(null, key); pl.classList.add('no-media'); } else { pl.classList.remove('no-media'); media.show(spec, key, spec ? '' : ''); }
  setText('plPanel', ''); setText('plActions', ''); setText('plTarget', ''); setText('plHint', '');
  if (P.kind === 'seance') enterSeanceStep(st, initial); else enterMobilityStep(st, initial);
  pl.querySelector('.pl-body')?.classList.remove('swap'); void pl.offsetWidth; pl.querySelector('.pl-body')?.classList.add('swap');
  saveActive(); updateDynamic();
}
function enterSeanceStep(st, initial) {
  const S = SESSIONS[P.letter], exIndex = st.ex ? P.plan.items.findIndex(i => i.id === (st.t === 'rest' && st.newEx ? st.ex : st.ex)) : 0;
  setText('plKicker', `Séance ${P.letter} · exercice ${Math.max(1, exIndex + 1)}/${P.plan.items.length}`);
  if (st.t === 'prep') {
    const ex = exOf(st), it = itemOf(st.ex);
    setText('plEyebrow', 'Prépare-toi'); setText('plTitle', esc(ex.name)); setText('plTarget', targetLine(st.ex));
    setText('plHint', 'Touche l’écran pour démarrer tout de suite');
    setText('plPanel', `${loadEditor(st.ex, 'Charge')}<ul class="cues">${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul><p class="why">${esc(it.note || '')}</p>`);
    P.script = [{ at: 0.3, id: `g.seance.${P.letter}`, force: true }, { at: 0.3, id: `ex.${st.ex}.intro` }, { at: 0.3, id: CHG_LINE[it.change] }];
  } else if (st.t === 'work') {
    const ex = exOf(st);
    setText('plEyebrow', `Série ${st.set + 1}/${P.plan.sets}${ex.perSide ? ` · ${st.side ? '2e côté' : '1er côté'}` : ''}`);
    setText('plTitle', esc(ex.name)); setText('plTarget', targetLine(st.ex));
    setText('plHint', data.settings.count ? 'Suis la voix · touche l’écran quand tu as fini' : 'Touche l’écran quand tu as fini');
    setText('plActions', `<button class="btn btn-go" data-act="done-work">Fini</button>`);
    const last = st.set === P.plan.sets - 1 && st.set > 0;
    const ann = ex.perSide && st.side ? 'g.side2' : st.set === 0 ? (ex.perSide ? 'g.side1' : 'g.go') : last ? 'g.last' : `g.set${st.set + 1}`;
    P.script = [{ at: 0, id: ann, force: true }]; Sound.go();
  } else if (st.t === 'switch') {
    const ex = exOf(st);
    setText('plEyebrow', `Série ${st.set + 1}/${P.plan.sets}`); setText('plTitle', esc(st.label)); setText('plTarget', esc(ex.name));
    if (ex.kind === 'hold') setText('plPanel', `<p class="cue-one">${esc(ex.holds[st.hold].cue)}</p>`);
    setText('plHint', 'Touche l’écran pour enchaîner');
    P.script = [{ at: 0, id: ex.kind === 'hold' ? `g.hold.${ex.holds[st.hold].key}` : 'g.switch', force: true }];
  } else if (st.t === 'hold') {
    const ex = exOf(st), h = ex.holds[st.hold];
    setText('plEyebrow', `Tour ${st.set + 1}/${P.plan.sets} · ${h.name}`); setText('plTitle', esc(ex.name));
    setText('plTarget', `${st.dur} secondes`); setText('plHint', 'Touche l’écran si tu lâches avant la fin');
    setText('plActions', `<button class="btn btn-soft" data-act="done-work">J’ai lâché</button>`);
    P.script = st.hold === 0 ? [{ at: 0, id: 'g.hold.face', force: true }] : [];
    for (let at = 6; at < st.dur - 7; at += 8) P.script.push({ at, id: nextCue(st.ex), until: at + 3 });
    if (st.dur >= 25) P.script.push({ at: st.dur - 10, id: 'g.hold.ten', until: st.dur - 7 });
    Sound.go();
  } else if (st.t === 'rest') {
    const ex = exOf(st), nx = EXERCISES[st.next], it = itemOf(st.next);
    setText('plEyebrow', st.newEx ? 'Repos · exercice suivant' : 'Repos');
    setText('plTitle', st.newEx ? esc(nx.name) : `Série ${st.set + 2}/${P.plan.sets}`);
    setText('plTarget', st.newEx ? targetLine(st.next) : `Vise ${targetShort(st.ex)}`);
    setText('plPanel', `${doneEditor(st.ex, st.set)}${st.newEx ? loadEditor(st.next, 'Prépare') + `<p class="why">${esc(it.note || '')}</p>` : ''}`);
    setText('plActions', `<button class="btn btn-soft small" data-act="rest-plus">+15 s</button><button class="btn btn-soft small" data-act="skip">Passer</button>`);
    P.script = [{ at: 0, id: st.newEx ? 'g.restnew' : 'g.rest', force: true }];
    if (st.newEx) P.script.push({ at: 3.5, id: `ex.${st.next}.intro` }, { at: 3.5, id: CHG_LINE[it.change] });
    else P.script.push({ at: 5, id: `ex.${st.ex}.rest.${(st.set % 2) + 1}`, until: st.dur - 14 });
    if (st.dur >= 20) P.script.push({ at: st.dur - 10, id: 'g.ten', until: st.dur - 6 });
  } else if (st.t === 'bilan') renderBilan();
}
function enterMobilityStep(st) {
  const M = MOBILITY[P.variant];
  const moves = P.steps.filter(s => s.t === 'mgap'), idx = P.steps.slice(0, P.i + 1).filter(s => s.t === 'mgap').length;
  setText('plKicker', `${M.title} · ${Math.max(1, idx)}/${moves.length}`);
  if (st.t === 'mgap') {
    const m = MOVES[st.move], sec = P.steps[P.i + 1]?.dur;
    setText('plEyebrow', P.i === 0 ? 'Mets-toi en place' : 'Ensuite'); setText('plTitle', esc(m.name)); setText('plTarget', esc(m.hint));
    setText('plPanel', `<p class="cue-one">${esc(m.cue)}</p>`); setText('plHint', 'Touche l’écran pour démarrer');
    P.script = P.i === 0 ? [{ at: 0.2, id: `mob.${P.variant}.start`, force: true }, { at: 0.2, id: `mob.${st.move}.intro` }] : [{ at: 0.2, id: `mob.${st.move}.intro`, force: true }];
  } else if (st.t === 'move') {
    const m = MOVES[st.move];
    setText('plEyebrow', m.sides ? (st.side ? '2e côté' : '1er côté') : 'En rythme, sans forcer'); setText('plTitle', esc(m.name)); setText('plTarget', esc(m.hint));
    setText('plPanel', `<p class="cue-one">${esc(m.cue)}</p>`); setText('plHint', 'Touche l’écran pour mettre en pause');
    P.script = st.dur >= 14 ? [{ at: st.dur * 0.3, id: `mob.${st.move}.cue.1`, until: st.dur * 0.3 + 4 }, { at: st.dur * 0.62, id: `mob.${st.move}.cue.2`, until: st.dur * 0.62 + 4 }] : [];
    if (st.dur >= 25) P.script.push({ at: st.dur - 10, id: 'mob.ten', until: st.dur - 7 });
    Sound.go();
  } else if (st.t === 'switch') {
    setText('plEyebrow', esc(MOVES[st.move].name)); setText('plTitle', 'Change de côté'); setText('plHint', '');
    P.script = [{ at: 0, id: 'g.switch', force: true }];
  } else if (st.t === 'mfin') renderMobilityEnd();
}
const targetShort = id => { const it = itemOf(id), ex = EXERCISES[id]; if (ex.kind === 'hold') { const L = PLANK_LEVELS[it.level]; return `${L.face} s + ${L.side} s × 2`; } return `${it.target} ${unitOf(ex)}`; };
function targetLine(id) { const it = itemOf(id), l = loadText(id, P.log[id].load ?? it.load); return `Objectif ${targetShort(id)}${l ? ` · ${l}` : ''} ${changeChip(it.change)}`; }
function stepper(act, value, label, unit) { return `<div class="stepper"><span class="st-l">${label}</span><button data-act="${act}" data-d="-1" aria-label="Moins">−</button><output>${value}${unit ? `<small>${unit}</small>` : ''}</output><button data-act="${act}" data-d="1" aria-label="Plus">+</button></div>`; }
function loadEditor(id, label) { const ex = EXERCISES[id]; if (!ex.load) return ''; const v = P.log[id].load ?? 0; return `<div class="editor" data-ex="${id}">${stepper('load', v, `${label} · ${ex.load.label}`, 'kg')}</div>`; }
function doneEditor(id, set, title) {
  const ex = EXERCISES[id], lg = P.log[id];
  if (ex.kind === 'hold') { const r = lg.holds[set] || []; return `<div class="editor done-ed"><span class="st-l">Tour ${set + 1} tenu</span><p class="holds">${ex.holds.map((h, k) => `<span class="${(r[k] ?? 0) >= (k ? PLANK_LEVELS[lg.level].side : PLANK_LEVELS[lg.level].face) ? 'ok' : 'ko'}">${esc(h.name)} ${r[k] ?? 0} s</span>`).join('')}</p></div>`; }
  return `<div class="editor done-ed" data-ex="${id}" data-set="${set}">${stepper('reps', lg.reps[set] ?? 0, title || `Série ${set + 1} faite`, unitOf(ex) === 'reps' ? 'reps' : unitOf(ex))}${ex.load ? stepper('load', lg.load ?? 0, 'Charge', 'kg') : ''}</div>`;
}

function onPlayerTap(e) {
  if (!P) return;
  Sound.unlock();
  const b = e.target.closest('[data-act]');
  if (b) return handleAct(b, e);
  if (e.target.closest('.editor, .pl-overlay, .pl-top, button, input, label')) return;
  const st = step(); if (P.pausedAt) return;
  if (now() - P.stepStart < 700) return;
  if (st.t === 'work' || st.t === 'hold') endWork();
  else if (['prep', 'switch', 'mgap'].includes(st.t)) advance();
  else if (st.t === 'move') togglePause(true);
}
function endWork() {
  const st = step(), ex = exOf(st), lg = P.log[st.ex];
  if (st.t === 'hold') { (lg.holds[st.set] ||= [])[st.hold] = Math.min(st.dur, Math.round(elapsed())); return advance(); }
  const c = data.settings.count ? P.count : itemOf(st.ex).target;
  if (ex.perSide) { lg.sides[st.side][st.set] = c; lg.reps[st.set] = st.side ? Math.min(lg.sides[0][st.set] ?? c, c) : c; }
  else lg.reps[st.set] = c;
  advance();
}
function advance() {
  if (!P) return;
  P.i = Math.min(P.i + 1, P.steps.length - 1); P.stepStart = now(); P.stepPaused = 0; P.pausedAt = null;
  enterStep();
}
function togglePause(force) {
  if (!P) return;
  const on = force ?? !P.pausedAt;
  if (on && !P.pausedAt) { P.pausedAt = now(); Coach.stop(); }
  else if (!on && P.pausedAt) { P.stepPaused += now() - P.pausedAt; P.pausedAt = null; Sound.unlock(); Wake.on(); }
  media?.pause(!!P.pausedAt);
  const ov = document.getElementById('plOverlay');
  if (ov) {
    ov.hidden = !P.pausedAt;
    if (P.pausedAt) ov.innerHTML = `<div class="ov-card"><p class="kicker">En pause</p><button class="btn btn-go" data-act="unpause">Reprendre</button>${P.kind === 'seance' ? '<button class="btn btn-soft" data-act="skip-ex">Passer cet exercice</button>' : '<button class="btn btn-soft" data-act="skip">Mouvement suivant</button>'}<button class="btn btn-soft" data-act="restart-step">Recommencer l’étape</button><button class="link danger" data-act="quit">Quitter sans valider</button></div>`;
  }
  saveActive(); updateDynamic();
}

function nextCue(exId) {
  const cues = Coach.ids(`ex.${exId}.cue.`); if (!cues.length) return null;
  P.cue[exId] = ((P.cue[exId] ?? -1) + 1) % cues.length; return `ex.${exId}.cue.${P.cue[exId] + 1}`;
}
function runVoice(e) {
  const s = P.script || [];
  while (P.si < s.length) {
    const it = s[P.si];
    if (e < it.at) break;
    if (it.until !== undefined && e > it.until) { P.si++; continue; }
    if (!Coach.say(it.id, { force: it.force })) break;
    P.si++;
  }
  if (P.si >= s.length && P.after?.length && !Coach.busy()) {
    const a = P.after.shift(); if (now() - a.t < 2500) Coach.say(a.id);
  }
}
function tick() {
  if (!P || P.pausedAt || (away && !SIM)) return;
  const st = step(); if (!st) return;
  const e = elapsed();
  runVoice(e);
  if (st.dur) {
    const rem = st.dur - e, sec = Math.ceil(rem);
    if (sec !== P.lastSec) {
      P.lastSec = sec;
      if (sec <= 3 && sec >= 1 && ['rest', 'prep', 'hold', 'mgap', 'move'].includes(st.t)) Sound.tick();
    }
    if (rem <= 0) { if (st.t === 'hold') { const lg = P.log[st.ex]; (lg.holds[st.set] ||= [])[st.hold] = st.dur; } return advance(); }
  } else if (st.t === 'work') {
    const ex = exOf(st), it = itemOf(st.ex);
    if (data.settings.count) {
      const c = Math.floor(Math.max(0, e - 0.4) / ex.tempo);
      if (c !== P.count) {
        // Écran verrouillé : personne pour toucher « Fini », la série s'arrête à l'objectif.
        if (SIM && c > it.target) { P.count = it.target; return endWork(); }
        P.count = c;
        if (c > 0) {
          Coach.say(`n.${Math.min(c, 20)}`);
          if (c === it.target) P.after.push({ id: c < ex.max ? 'g.target' : 'g.targetmax', t: now() });
          else if (c % 2 === 0 && c < it.target) P.after.push({ id: nextCue(st.ex), t: now() });
        }
        const n = !SIM && document.getElementById('plCount'); if (n) { n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
        if (c >= ex.max) return endWork();
      }
    }
  }
  updateDynamic();
}
function updateDynamic() {
  if (!P || SIM) return;
  const st = step(), center = document.getElementById('plCenter'); if (!center) return;
  const e = elapsed();
  if (st.t === 'work') {
    const it = itemOf(st.ex);
    if (data.settings.count) {
      const pct = Math.min(100, P.count / it.target * 100);
      center.innerHTML = `<div class="count-wrap${P.count >= it.target ? ' hit' : ''}"><span class="count" id="plCount">${P.count}</span><span class="count-of">/ ${it.target}</span><div class="count-bar"><i style="width:${pct}%"></i></div></div>`;
    } else center.innerHTML = `<div class="count-wrap"><span class="count small">${fmtClock(e)}</span></div>`;
  } else if (st.dur) {
    const rem = Math.max(0, st.dur - e), pct = rem / st.dur;
    const size = 220, sw = 12, r = (size - sw) / 2, c = 2 * Math.PI * r;
    center.innerHTML = `<div class="timer ${st.t}"><svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="t-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/><circle class="t-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg><span class="t-num">${st.dur >= 60 ? fmtClock(rem) : Math.ceil(rem)}</span></div>`;
  } else center.innerHTML = '';
  const pause = document.getElementById('plPause'); if (pause) pause.classList.toggle('on', !!P.pausedAt);
}

function handleAct(b, e) {
  e?.stopPropagation();
  const act = b.dataset.act;
  if (act === 'done-work') return endWork();
  if (act === 'skip') return advance();
  if (act === 'rest-plus') { step().dur += 15; return updateDynamic(); }
  if (act === 'unpause') return togglePause(false);
  if (act === 'restart-step') { P.stepStart = now(); P.stepPaused = 0; P.pausedAt = null; togglePause(false); return enterStep(); }
  if (act === 'skip-ex') { const cur = step().ex; let k = P.steps.findIndex((s, j) => j > P.i && s.ex !== cur && s.ex); if (k < 0) k = P.steps.length - 1; else if (P.steps[k - 1]?.t === 'rest') k -= 1; P.i = k - 1; P.pausedAt = null; togglePause(false); return advance(); }
  if (act === 'quit') { if (confirm('Quitter ? Cette séance ne sera pas comptée.')) { closePlayer(); renderRoute(); } return; }
  if (act === 'load' || act === 'reps') {
    const ed = b.closest('.editor'), id = ed.dataset.ex, d = +b.dataset.d, lg = P.log[id];
    if (act === 'load') lg.load = Math.max(0, Math.round(((lg.load ?? 0) + d) * 2) / 2);
    else { const s = +ed.dataset.set; lg.reps[s] = Math.max(0, (lg.reps[s] ?? 0) + d); }
    b.parentElement.querySelector('output').innerHTML = `${act === 'load' ? lg.load : lg.reps[+ed.dataset.set]}<small>${act === 'load' ? 'kg' : unitOf(EXERCISES[id]) === 'reps' ? 'reps' : unitOf(EXERCISES[id])}</small>`;
    if (act === 'load') { const t = document.getElementById('plTarget'), st = step(); if (t && (st.t === 'prep' || (st.t === 'rest' && st.newEx && id === st.next))) t.innerHTML = targetLine(id); }
    return saveActive();
  }
  if (act === 'validate') return validate(b.dataset.back);
  if (act === 'validate-mob') return validateMob();
  if (act === 'home') { closeCelebration(); renderRoute(); return; }
}

function renderBilan() {
  if (SIM) { Coach.say('g.bilan', { force: true }); Sound.win(); return; }
  const pl = document.getElementById('player');
  setText('plKicker', `Séance ${P.letter} · bilan`);
  setText('plEyebrow', 'Séance terminée'); setText('plTitle', 'Comment va ton dos ?'); setText('plTarget', '');
  const lastId = P.plan.items.at(-1).id, lastEx = EXERCISES[lastId];
  const rows = P.plan.items.map(it => {
    const ex = EXERCISES[it.id], lg = P.log[it.id], prev = lastRecord(data, it.id), cmp = compare(prev, lg, it.id);
    const txt = ex.kind === 'hold' ? (lg.holds.map(r => (r || []).join('/')).join(' · ') + ' s') : `${lg.reps.map(n => n ?? 0).join(' · ')} ${unitOf(ex)}${loadText(it.id, lg.load) ? ` · ${loadText(it.id, lg.load)}` : ''}`;
    return `<li><div><strong>${esc(ex.name)}</strong><small>${esc(txt)}</small></div><span class="chip chip-${cmp.tone === 'up' ? 'up' : cmp.tone === 'down' ? 'down' : cmp.tone === 'new' ? 'new' : 'same'}">${esc(cmp.text)}</span></li>`;
  }).join('');
  setText('plPanel', `<ul class="bilan">${rows}</ul>${lastEx.kind !== 'hold' ? doneEditor(lastId, P.plan.sets - 1, `${lastEx.name} · série ${P.plan.sets}`) : ''}`);
  setText('plActions', `<div class="back-btns"><button class="btn btn-go" data-act="validate" data-back="ok">J’ai terminé · dos OK</button><div class="duo"><button class="btn btn-soft" data-act="validate" data-back="gene">Petite gêne</button><button class="btn btn-soft warn" data-act="validate" data-back="douleur">Douleur</button></div><button class="link" data-act="quit">Quitter sans valider</button></div>`);
  setText('plHint', '');
  Coach.say('g.bilan', { force: true }); Sound.win();
  pl.classList.add('no-media');
}
function renderMobilityEnd() {
  if (SIM) { Coach.say('mob.end', { force: true }); Sound.win(); return; }
  setText('plKicker', MOBILITY[P.variant].title); setText('plEyebrow', 'Terminé'); setText('plTitle', 'Mobilité faite ?');
  setText('plPanel', '<p class="cue-one">Tes hanches et ton dos ont bougé. Valide pour prolonger ta série.</p>');
  setText('plActions', `<div class="back-btns"><button class="btn btn-go" data-act="validate-mob">J’ai terminé</button><button class="link" data-act="quit">Quitter sans valider</button></div>`);
  Coach.say('mob.end', { force: true }); Sound.win();
}
function validate(back) {
  const t = P.date || today();
  const ex = {}; P.plan.items.forEach(it => { const lg = P.log[it.id]; ex[it.id] = EXERCISES[it.id].kind === 'hold' ? { level: lg.level, holds: lg.holds.map(r => r || []) } : { target: lg.target, load: EXERCISES[it.id].load ? lg.load : null, reps: lg.reps.map(n => n ?? 0) }; });
  const records = P.plan.items.map(it => ({ id: it.id, cmp: compare(lastRecord(data, it.id), ex[it.id], it.id) }));
  const res = validateSeance(data, { type: 'seance', date: t, ts: Date.now(), letter: P.letter, sets: P.plan.sets, reprise: P.plan.reprise, back, ex, mins: Math.round((Date.now() - P.started) / 60000) }, t);
  save(); const letter = P.letter; closePlayer();
  celebrate({ title: `Séance ${letter} validée`, res, records, back });
}
function validateMob() {
  const t = P.date || today(), variant = P.variant;
  const res = validateMobility(data, { type: 'mobilite', variant, date: t, ts: Date.now() }, t);
  save(); closePlayer();
  celebrate({ title: `${MOBILITY[variant].title} validée`, res, records: [] });
}

// ——— Fête ———
function celebrate({ title, res, records, back }) {
  const t = today(), next = todayPlan(data, addDays(t, 1));
  const ups = records.filter(r => r.cmp.tone === 'up');
  app.innerHTML = `<div class="page celebrate">
    <div class="cel-check"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52"/><path d="M38 62l15 15 30-34"/></svg></div>
    <h1 class="cel-title">${esc(title)}</h1>
    <div class="cel-stats">
      <div class="card tile">${flame}<b class="num" id="celStreak">${res.before.streak}</b><span>${res.after.streak > 1 ? 'jours' : 'jour'} de suite</span></div>
      <div class="card tile"><div class="ring-box">${ring(res.after.reg, { size: 70, stroke: 7 })}<b><span class="num" id="celReg">${res.before.reg}</span><i>%</i></b></div><span>régularité</span></div>
    </div>
    ${res.promoted ? '<div class="card promo"><span class="promo-badge">Palier débloqué</span><strong>3 séries par exercice</strong><small>Deux semaines régulières : tu passes au niveau supérieur.</small></div>' : ''}
    ${res.reset ? '<div class="card promo soft"><strong>Reprise en douceur</strong><small>Retour à 2 séries le temps de retrouver le rythme.</small></div>' : ''}
    ${ups.length ? `<div class="card"><p class="mini-title">Mieux que la dernière fois</p><ul class="bilan">${ups.map(r => `<li><div><strong>${esc(EXERCISES[r.id].name)}</strong></div><span class="chip chip-up">${esc(r.cmp.text)}</span></li>`).join('')}</ul></div>` : ''}
    ${back === 'douleur' ? '<p class="note">Douleur notée : les charges restent pareilles la prochaine fois. Si ça dépasse 3-4/10, repos et Noémie.</p>' : ''}
    <p class="cel-next">${next.hero.kind === 'mobilite' ? 'Demain : mobilité. Séance ' + next.hero.alt + ' après-demain.' : next.hero.kind === 'seance' ? `Prochaine : séance ${next.hero.letter}.` : ''}</p>
    <button class="btn btn-go" data-act="home">Retour à l’accueil</button>
  </div>`;
  app.querySelector('[data-act="home"]').addEventListener('click', () => { closeCelebration(); location.hash = ''; renderRoute(); });
  countUp(document.getElementById('celStreak'), res.before.streak, res.after.streak, 1200);
  countUp(document.getElementById('celReg'), res.before.reg, res.after.reg, 1200);
  animateRings();
  Sound.win(); confetti(); setTimeout(() => Coach.say('g.valid', { force: true }), 700);
}
let confettiRaf = null;
function confetti() {
  if (reduced) return;
  const cv = document.getElementById('confetti'), ctx = cv.getContext('2d'), dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr); cv.classList.add('on');
  const colors = ['#c8f06a', '#ffffff', '#ff8a5b', '#66c7ff', '#a58bff'];
  const parts = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.32, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4, s: Math.random() * 7 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.random() * colors.length | 0] }));
  const t0 = performance.now();
  cancelAnimationFrame(confettiRaf);
  const frame = t => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (t - t0 < 3200) confettiRaf = requestAnimationFrame(frame); else { ctx.clearRect(0, 0, innerWidth, innerHeight); cv.classList.remove('on'); }
  };
  confettiRaf = requestAnimationFrame(frame);
}
function closeCelebration() { cancelAnimationFrame(confettiRaf); document.getElementById('confetti')?.classList.remove('on'); }

// ——— Appli iPhone : écran verrouillé et rappels ———
// Écran verrouillé, iOS met la page en pause. Avant, on calcule la suite de la séance avec les règles de tick
// (horloge simulée) et l'appli joue phrases et bips à l'heure dite ; au retour, la même simulation rattrape l'état.
let away = null;
function simulate(from, to) {
  SIM = { t: from, events: [] };
  try {
    while (SIM.t < to && P && !P.pausedAt) {
      const st = step(); if (!st || st.t === 'bilan' || st.t === 'mfin' || (st.t === 'work' && !data.settings.count)) break;
      tick(); SIM.t += 100;
    }
    return SIM.events;
  } finally { SIM = null; }
}
function goAway() {
  if (!NATIVE || !P || P.pausedAt || away) return;
  const snap = JSON.stringify(P), t0 = Date.now(), events = simulate(t0, t0 + 45 * 60e3);
  P = JSON.parse(snap); away = { t0, snap };
  NATIVE.post({ t: 'schedule', events });
}
function comeBack() {
  if (!away) return;
  const { t0, snap } = away; away = null;
  NATIVE.post({ t: 'schedule', events: [] });
  if (!P) return;
  P = JSON.parse(snap); simulate(t0, Date.now());
  // Redessine l'étape atteinte sans rejouer ses sons ni remettre ses compteurs à zéro.
  const keep = { fired: P.fired, lastSec: P.lastSec, count: P.count, script: P.script, si: P.si, after: P.after, cue: { ...P.cue } };
  QUIET = true; try { enterStep(); } finally { QUIET = false; }
  Object.assign(P, keep); saveActive(); updateDynamic();
}
const REMIND = { seanceAt: '18:00', mobAt: '08:00', dangerAt: '21:00' };
// Rappels d'aujourd'hui et des 6 jours suivants (si rien n'est fait d'ici là) ; recalculés à chaque changement, l'appli remplace les anciens.
function reminders() {
  const s = data.settings, t = today(), out = [];
  if (s.reminders === false) return out;
  const at = (k, key) => new Date(`${k}T${s[key] || REMIND[key]}:00`).getTime();
  const mobDur = fmtDuration(voicedMobilityTimeline('express').reduce((a, st) => a + (st.dur || 0), 0));
  for (let i = 0; i < 7; i++) {
    const k = addDays(t, i), h = todayPlan(data, k).hero;
    if (h.kind === 'seance') {
      const plan = sessionPlan(data, h.letter, k);
      out.push({ id: `seance-${k}`, at: at(k, 'seanceAt'), title: `Séance ${h.letter} aujourd’hui`, body: `${plan.items.map(it => EXERCISES[it.id].name).join(', ')} · ≈ ${fmtDuration(estimate(voicedSessionTimeline(plan), plan))}. La voix te guide.` });
    } else if (h.kind === 'mobilite' && !data.history.some(x => x.type === 'mobilite' && x.date === k))
      out.push({ id: `mob-${k}`, at: at(k, 'mobAt'), title: 'Mobilité express', body: `${mobDur} au lit, avant de te lever. Séance ${h.alt} demain.` });
  }
  const st = streak(data, t);
  if (st.current >= 2) out.push({ id: 'serie', at: at(st.doneToday ? addDays(t, 1) : t, 'dangerAt'), title: `Ta série de ${st.current} jours`, body: `Rien de validé aujourd’hui : ${mobDur} de mobilité au lit suffisent pour la garder.` });
  return out.filter(r => r.at > Date.now() + 60e3);
}
function syncReminders() { if (NATIVE) NATIVE.post({ t: 'reminders', items: reminders() }); }
if (NATIVE) Object.assign(NATIVE, {
  away: goAway, back: comeBack,
  // Changement venu d'iCloud (autre appareil).
  onStorage(k, s) { if (s == null) delete NATIVE.storage[k]; else NATIVE.storage[k] = s; if (k === KEY) { data = loadData(); syncReminders(); if (!P) renderRoute(); } }
});

// ——— Navigation et actions de l'accueil ———
function renderRoute() {
  if (P) return;
  if (location.hash === '#progres') renderProgress(); else if (location.hash === '#noter') renderLogPast(); else { logPick = null; renderToday(); }
  window.scrollTo(0, 0);
}
app.addEventListener('click', e => {
  if (P) return;
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'start-seance') return startSeance(b.dataset.letter);
  if (act === 'start-mob') { const v = b.dataset.v || mobVariant(); return startMobility(v); }
  if (act === 'mob-variant') { ui.mobVariant = b.dataset.v; saveUi(); return renderToday(); }
  if (act === 'resume') return resumeActive();
  if (act === 'drop') { if (confirm('Abandonner la séance en cours ?')) { store.set(ACTIVE, null); renderToday(); } return; }
  if (act === 'log-past') { location.hash = '#noter'; return; }
  if (act === 'log-day') { logPick.day = b.dataset.v; return renderLogPast(); }
  if (act === 'log-what') { logPick.what = b.dataset.v; return renderLogPast(); }
  if (act === 'log-save') return saveLogPast();
  if (act === 'del-hist') { const h = data.history.find(x => String(x.ts) === b.dataset.ts); if (h && confirm(`Supprimer ${h.type === 'seance' ? `la séance ${h.letter}` : 'cette mobilité'} du ${longDate(h.date)} ?`)) { data.history = data.history.filter(x => x !== h); save(); renderProgress(); } return; }
  if (act === 'hide-install') { ui.installHidden = true; saveUi(); b.closest('.install')?.remove(); return; }
  if (act === 'test-sound') { Sound.unlock(); Coach.load(['g.go']); Sound.go(); setTimeout(() => Coach.say('g.go', { force: true }), 900); return; }
  if (act === 'export') {
    const json = JSON.stringify(data, null, 1);
    if (NATIVE) return NATIVE.post({ t: 'share', name: `ma-routine-${today()}.json`, text: json });
    const blob = new Blob([json], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `ma-routine-${today()}.json`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return;
  }
});
app.addEventListener('change', e => {
  if (P) return;
  const el = e.target;
  if (el.id === 'shortToggle') { ui.short = el.checked; saveUi(); return renderToday(); }
  if (el.dataset.set) { data.settings[el.dataset.set] = el.checked; save(); return; }
  if (el.dataset.time) { if (el.value) { data.settings[el.dataset.time] = el.value; save(); } return; }
  if (el.dataset.act === 'import' && el.files?.[0]) {
    el.files[0].text().then(txt => { const d = JSON.parse(txt); if (d?.v !== 3 || !Array.isArray(d.history)) throw new Error(); if (!confirm(`Restaurer ${d.history.length} activités ? Les données actuelles seront remplacées.`)) return; data = { ...emptyData(), ...d }; save(); renderProgress(); }).catch(() => alert('Fichier non reconnu.'));
  }
});
addEventListener('hashchange', renderRoute);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { comeBack(); if (P) { Wake.on(); tick(); } else { renderRoute(); syncReminders(); } }
  else goAway();
});
let lastDay = today(); setInterval(() => { if (!P && today() !== lastDay) { lastDay = today(); renderRoute(); } }, 60000);

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
try { localStorage.removeItem('activeWorkout'); } catch { }
if (/[?&]debug\b/.test(location.search)) { window.__dbg = { get P() { return P; }, advance, endWork, get data() { return data; }, save, renderRoute, startSeance, startMobility, simulate, goAway, comeBack, reminders }; const q = new URLSearchParams(location.search).get('start'); if (q) setTimeout(() => { if (q.startsWith('mob-')) { startMobility(q.slice(4)); const n = +(new URLSearchParams(location.search).get('skip') || 0); for (let k = 0; k < n; k++) advance(); } else { startSeance(q); const n = +(new URLSearchParams(location.search).get('skip') || 0); for (let k = 0; k < n; k++) { const st = P.steps[P.i]; if (st.t === 'work') { P.count = 10; endWork(); } else advance(); } } }, 300); }
renderRoute();
Coach.ready.then(() => { if (!P) renderRoute(); syncReminders(); });
