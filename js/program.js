// Programme de Yoni : 3 séances de 3 exercices + 2 mobilités.
// Exercices validés avec son ostéo (Noémie, Ashdod) : ne rien changer sans son accord.
// Vidéos : lecteur YouTube intégré (rien n'est téléchargé) ou clips locaux, voir video/CREDITS.md.

export const ORDER = ['A', 'B', 'C'];

// Gainage : temps de chaque appui (secondes) par niveau.
export const PLANK_LEVELS = [
  { face: 30, side: 20 },
  { face: 45, side: 30 },
  { face: 60, side: 45 }
];

const yt = (id, start, end, by, extra = {}) => ({ yt: { id, start, end, by }, ratio: 9 / 16, ...extra });
const local = (file, ratio, extra = {}) => ({ src: `video/${file}.mp4`, poster: `video/${file}.webp`, ratio, ...extra });

export const EXERCISES = {
  squat: {
    name: 'Squat avec haltère', muscles: 'Quadriceps · fessiers', kind: 'reps',
    min: 8, max: 12, start: 10, tempo: 3, rest: 90,
    load: { label: 'haltère contre la poitrine', start: 10, inc: 2 },
    cues: ['Haltère contre la poitrine, recule les hanches vers la chaise.', 'Pousse le sol pour remonter en soufflant.'],
    media: yt('TgcAO3iJfd0', 0, 8.4, 'NeuStrength', { fallback: local('squat', 4 / 3) })
  },
  pushup: {
    name: 'Pompes sur poignées', muscles: 'Pectoraux · triceps', kind: 'reps',
    min: 8, max: 15, start: 10, tempo: 2.5, rest: 90, atMax: 'hold',
    atMaxNote: 'Plafond atteint : descends en 3 secondes.',
    cues: ['Corps gainé d’un bloc, coudes à 45°.', 'Poitrine vers le sol, pousse sans laisser tomber le bassin.'],
    media: yt('h3tPYS4CaRY', 7, 11.3, 'Pullup & Dip', { fallback: local('pushup', 16 / 9) })
  },
  pallof: {
    name: 'Pallof press', muscles: 'Abdos · anti-rotation', kind: 'reps', perSide: true,
    min: 10, max: 15, start: 10, tempo: 4, rest: 60, atMax: 'reset',
    atMaxNote: 'Recule d’un pas ou prends un élastique plus dur.',
    cues: ['Élastique de côté, à hauteur de poitrine.', 'Pousse les mains devant toi, tiens 2 secondes, reviens. Le buste ne tourne pas.'],
    media: yt('99evyH71IWs', 0, 7.2, 'Queens University of Charlotte')
  },
  rdl: {
    name: 'Soulevé de terre roumain', muscles: 'Ischios · fessiers', kind: 'reps',
    min: 8, max: 12, start: 10, tempo: 3.5, rest: 90,
    load: { label: 'par haltère', start: 8, inc: 2 },
    cues: ['Recule les fesses, haltères le long des cuisses, dos long.', 'Arrête avant que ça tire dans la jambe gauche, puis pousse les hanches.'],
    media: yt('hu3jRvTc_po', 0, 11, 'Andrew Kwong (DeltaBolic)')
  },
  pullup: {
    name: 'Tractions', muscles: 'Grand dorsal · biceps', kind: 'reps',
    min: 5, max: 12, start: 6, tempo: 3, rest: 120, atMax: 'hold',
    atMaxNote: 'Plafond atteint : redescends en 3 secondes.',
    cues: ['Épaules actives, tire les coudes vers les côtes.', 'Sans balancer, redescends bras presque tendus.'],
    media: local('pullup', 4 / 3)
  },
  curl: {
    name: 'Curl haltères', muscles: 'Biceps · avant-bras', kind: 'reps',
    min: 10, max: 15, start: 10, tempo: 3, rest: 75,
    load: { label: 'par haltère', start: 8, inc: 1 },
    cues: ['Coudes collés au corps, buste immobile.', 'Monte sans élan, redescends lentement.'],
    media: local('curl', 4 / 3)
  },
  lunge: {
    name: 'Fentes arrière', muscles: 'Quadriceps · fessiers', kind: 'reps', alternate: true,
    min: 8, max: 12, start: 8, tempo: 5, rest: 90,
    load: { label: 'par main (0 = poids du corps)', start: 0, inc: 2 },
    cues: ['Recule un pied, descends doucement, buste droit.', 'Pousse dans le pied avant, puis l’autre jambe. 1 = une fente de chaque côté.'],
    media: local('lunge', 3 / 4)
  },
  plank: {
    name: 'Gainage 3 faces', muscles: 'Abdos · obliques', kind: 'hold', rest: 60,
    holds: [
      { key: 'face', name: 'De face', cue: 'Coudes sous les épaules, corps aligné, respire.', media: local('plank', 16 / 9) },
      { key: 'gauche', name: 'Côté gauche', cue: 'Sur l’avant-bras gauche, bassin haut. Genoux au sol si besoin.', media: yt('OxUqMcC944g', 0, 10.7, 'Austin Longevity Clinic', { mirror: true }) },
      { key: 'droite', name: 'Côté droit', cue: 'Sur l’avant-bras droit, bassin haut. Genoux au sol si besoin.', media: yt('OxUqMcC944g', 0, 10.7, 'Austin Longevity Clinic') }
    ],
    cues: ['De face, puis chaque côté.', 'Arrête si le bas du dos se cambre.']
  },
  crossreach: {
    name: 'Bras–genou opposés', muscles: 'Abdos · coordination', kind: 'reps',
    min: 12, max: 20, start: 12, tempo: 3, rest: 60, atMax: 'hold', unit: 'paires',
    atMaxNote: 'Plafond atteint : tiens 2 secondes en haut.',
    cues: ['Sur le dos, genou droit et bras gauche vers le plafond, sans se toucher.', 'Redescends lentement, puis l’autre côté. Bassin immobile.'],
    media: { image: 'motion/crossreach.webp', ratio: 1 }
  }
};

export const SESSIONS = {
  A: { title: 'Jambes · poussée', focus: 'Squat, pompes, anti-rotation', exercises: ['squat', 'pushup', 'pallof'] },
  B: { title: 'Charnière · tirage', focus: 'Soulevé roumain, tractions, curl', exercises: ['rdl', 'pullup', 'curl'] },
  C: { title: 'Fentes · gainage', focus: 'Fentes, gainage 3 faces, abdos', exercises: ['lunge', 'plank', 'crossreach'] }
};

// Mouvements de mobilité. Les 4 premiers suivent exactement le Short de Yoni (tAf-0qO9kdQ : 30 essuie-glaces, 15 jambe qui traverse par côté,
// 30 jambes tendues, 30 papillons) ; les autres viennent des vidéos envoyées par Noémie. Pas d'étirement passif, sauf l'enroulé final (permis par Noémie de temps en temps).
const SHORT = 'tAf-0qO9kdQ';
export const MOVES = {
  wipers: { name: 'Essuie-glaces', hint: '≈ 30 allers-retours', cue: 'Sur le dos, bras en croix, pieds à plat et écartés. Bascule les deux genoux d’un côté puis de l’autre, en rythme.', media: yt('1gJTsXD70V4', 0, 15.8, 'Total Sports Rehab') },
  cross: { name: 'Jambe qui traverse', hint: '≈ 15 par côté', sides: true, cue: 'Bras en croix. Ramène un genou vers la poitrine, fais-le traverser de l’autre côté, puis rouvre.', media: yt('bsijfpb_-Rw', 0, 16.6, 'Taylor Lorbiecki', { crop: 1 }) },
  scissors: { name: 'Jambes tendues : pieds dedans, dehors', hint: '≈ 30', cue: 'Jambes tendues, pieds écartés, talons au sol. Tourne les deux jambes : pointes vers l’intérieur, puis vers l’extérieur.', media: yt('nayNurlGMTU', 0, 14.2, 'Bloom Physio', { crop: 0.8 }) },
  butterfly: { name: 'Papillon', hint: '≈ 30', cue: 'Genoux pliés, pieds collés au sol. Ouvre et referme les genoux en petites pulsations.', media: yt(SHORT, 8, 15.5, 'Thibault.coaching', { crop: 1 }) },
  openbook: { name: 'Livre ouvert', hint: '≈ 6 par côté', sides: true, cue: 'Couché sur le côté, genoux pliés collés. Ouvre le bras du dessus vers l’arrière en le suivant des yeux, puis reviens.', media: yt('SKapoHxQxuk', 0, 10.7, 'Evolution Physical Therapy') },
  catcow: { name: 'Dos rond, dos creux', hint: '≈ 4 lents', cue: 'À 4 pattes. Enroule le dos vertèbre par vertèbre, puis creuse doucement. Lent.', media: yt('gzF9eD4kqz4', 0, 19.5, 'Jenn Zedaker') },
  hipcar: { name: 'Cercles de hanche à 4 pattes', hint: '≈ 4 par sens', sides: true, cue: 'Genou plié, dessine un grand cercle lent avec la hanche. Nombril face au sol.', media: yt('RGcO_beJ4CU', 33, 41.5, 'Overtime Athletes') },
  ninety: { name: '90/90 assis', hint: '≈ 8', cue: 'Assis, pieds au sol écartés. Bascule les deux genoux d’un côté puis de l’autre, buste droit.', media: yt('RGcO_beJ4CU', 7, 20, 'Overtime Athletes') },
  adductor: { name: 'Balancier adducteurs', hint: '≈ 8 par côté', sides: true, cue: 'À 4 pattes, une jambe tendue sur le côté. Recule les fesses vers le talon, puis reviens.', media: yt('RGcO_beJ4CU', 21, 32.5, 'Overtime Athletes') },
  rolldown: { name: 'Enroulé vers le sol', hint: 'Doux, sans douleur', cue: 'Debout, genoux souples. Enroule le dos, laisse pendre les mains vers le sol et respire.', media: { icon: 'rolldown' } }
};

export const MOBILITY = {
  express: {
    title: 'Mobilité express', where: 'Au lit, sur le dos', short: 'express',
    steps: [['wipers', 30], ['cross', 18], ['scissors', 20], ['butterfly', 15], ['openbook', 15]]
  },
  complete: {
    title: 'Mobilité complète', where: 'Au sol, sur un tapis', short: 'complète',
    steps: [['wipers', 30], ['cross', 18], ['scissors', 20], ['butterfly', 15], ['openbook', 15], ['catcow', 30], ['hipcar', 25], ['ninety', 30], ['adductor', 25], ['rolldown', 20]]
  }
};

export const TIMING = { prep: 15, switchSide: 4, mobilityGap: 4, plankSwitch: 6 };
