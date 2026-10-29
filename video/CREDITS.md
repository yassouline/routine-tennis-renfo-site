# Vidéos de démonstration — sources et licences

Clips découpés, recadrés et recompressés (sans son) à partir de vidéos Mixkit et Pexels. Vérifié le 11/10/2026.

| Fichier | Exercice | Source | Licence |
|---|---|---|---|
| squat.mp4 | Squat avec haltère | [Mixkit 52106](https://mixkit.co/free-stock-video/a-young-woman-wearing-a-black-sportswear-outfit-performs-squats-52106/) | Mixkit Stock Video Free License |
| pushup.mp4 | Pompes | [Mixkit 32320](https://mixkit.co/free-stock-video/young-athletic-man-doing-push-ups-outdoors-32320/) | Mixkit Stock Video Restricted License (usage personnel non commercial) |
| pullup.mp4 | Tractions | [Mixkit 735](https://mixkit.co/free-stock-video/man-doing-pull-ups-735/) | Mixkit Stock Video Free License |
| plank.mp4 | Gainage (sur les pieds) | [Mixkit 36813](https://mixkit.co/free-stock-video/man-doing-plank-exercise-in-his-living-room-36813/) | Mixkit Stock Video Restricted License (usage personnel non commercial) |
| curl.mp4 | Curl haltères | [Mixkit 1313](https://mixkit.co/free-stock-video/woman-working-out-with-dumbbells-1313/) | Mixkit Stock Video Free License |
| lunge.mp4 | Fentes arrière | [Pexels 8456719](https://www.pexels.com/video/a-woman-doing-reverse-lunges-8456719/) (Mikhail Nilov) | Licence Pexels : usage libre et gratuit, modification permise, attribution non obligatoire |

- Licences : https://mixkit.co/license/ et https://www.pexels.com/license/ — conditions : https://mixkit.co/terms/
- Free License : usage commercial et non commercial, modification et diffusion permises, attribution non obligatoire.
- Restricted License : projets personnels non commerciaux uniquement. Ce site est personnel et gratuit : autorisé. Ne pas réutiliser ces clips dans un projet payant ou publicitaire.
- Les illustrations 3D et images fixes des anciennes versions ont été retirées le 24/10/2026 (reste `motion/crossreach.webp`).

## Version 3 (24/10/2026) : vidéos YouTube intégrées

Rien n'est téléchargé : le site intègre le lecteur YouTube officiel (youtube-nocookie.com), autorisé pour toute vidéo publique dont l'auteur n'a pas désactivé l'intégration (vérifié par oEmbed). Chaque clip est lu en boucle sur un extrait, sans son. Liste dans `js/program.js`.

| Mouvement | Vidéo | Extrait | Auteur |
|---|---|---|---|
| Squat avec haltère | `TgcAO3iJfd0` | 0 → 8,4 s | NeuStrength |
| Pompes sur poignées | `h3tPYS4CaRY` | 7 → 11,3 s | Pullup & Dip |
| Pallof press | `99evyH71IWs` | 0 → 7,2 s | Queens University of Charlotte |
| Soulevé de terre roumain | `hu3jRvTc_po` | 0 → 11 s | Andrew Kwong (DeltaBolic) |
| Gainage côté gauche / droit (miroir) | `OxUqMcC944g` | 0 → 10,7 s | Austin Longevity Clinic |
| Essuie-glaces | `1gJTsXD70V4` | 0 → 15,8 s | Total Sports Rehab |
| Jambes tendues : pieds dedans, dehors | `nayNurlGMTU` | 0 → 14,2 s | Bloom Physio |
| Jambe qui traverse | `bsijfpb_-Rw` | 0 → 16,6 s | Taylor Lorbiecki |
| Papillon | `tAf-0qO9kdQ` | 8 → 15,5 s | Thibault.coaching (le Short envoyé par Yoni) |
| Livre ouvert | `SKapoHxQxuk` | 0 → 10,7 s | Evolution Physical Therapy |
| Dos rond, dos creux | `gzF9eD4kqz4` | 0 → 19,5 s | Jenn Zedaker |
| 90/90, balancier adducteurs, cercles de hanche | `RGcO_beJ4CU` | 7→20, 21→32,5, 33→41,5 s | Overtime Athletes (vidéo envoyée par Noémie) |

- « Enroulé vers le sol » : dessin animé maison (SVG).
- 29/10/2026 : la mobilité express suit exactement le Short de Yoni (essuie-glaces, jambe qui traverse, jambes tendues, papillon) + le livre ouvert. Attention : oEmbed 200 ne garantit pas que la vidéo se lit hors de YouTube (`5AWUos_0_Yg` refuse) : toujours tester la lecture réelle.
- Bras–genou opposés : illustration `motion/crossreach.webp`.
- Les boucles de moins de 6 s réaffichent l'icône pause des Shorts à chaque tour : préférer des extraits de 8 s ou plus.
- YouTube refuse de démarrer un lecteur de moins de 200 × 200 px : le site le crée plus grand puis le réduit à l'écran.
- Les fichiers `video/squat.mp4` et `video/pushup.mp4` servent de secours si la vidéo YouTube n'est plus disponible.

## Voix du coach (29/10/2026)

Phrases enregistrées avec le clone ElevenLabs de Yoni (« Yoni (JLTA) », modèle eleven_v4) : texte dans `js/coach.json`, fichiers dans `audio/voice/`, régénérés par `tools/voice.py` (seulement les phrases nouvelles ou modifiées). Consignes tirées de NASM, McGill, Schoenfeld 2018 et des règles de Noémie (sources listées dans coach.json).
