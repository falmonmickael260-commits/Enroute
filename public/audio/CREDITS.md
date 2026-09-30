# KILOMAX — audio credits and licences

Every recorded sound in this folder is released under **CC0 1.0 Universal**
(public domain dedication, https://creativecommons.org/publicdomain/zero/1.0/):
free to use, modify and distribute, in personal and **commercial** projects,
without attribution. Attribution is given here anyway, for provenance.

Processing (scripts/build-audio.py) is technical only: mono, DC offset
removed, peak normalised, silence trimmed, short fades, loops made seamless by
crossfading their ends, web encoding (WAV for the engine loops, MP3 otherwise).

## Engine — `engine/engine-low.wav`, `engine-mid.wav`, `engine-high.wav`

- "Racing car engine sound loops" by **domasx2** — OpenGameArt.org,
  https://opengameart.org/content/racing-car-engine-sound-loops — **CC0**
  (files `loop_0`, `loop_2`, `loop_5`: one road-car engine at rising rpm,
  recorded as seamless loops for the racing game banditracer).
- Retrieved from the mirror in https://github.com/Malay146/car-game
  (`public/audio/engine/loop0|2|5.wav`, licence file `engine/LICENSE.txt`);
  the same files are mirrored with the same CC0 statement in
  https://github.com/clhforensics/indygp and
  https://github.com/MohammedSafwan10/atlas-drive.

## Tyres and impacts — `sfx/`

| File | Original | Author | Licence | Source |
|---|---|---|---|---|
| skid.mp3 | `audio/skid.ogg` (Starter Kit Racing) | Landeplage, for Kenney | CC0 | https://github.com/KenneyNL/Starter-Kit-Racing (README: "The skid sound effect was made by Landeplage and is also CC0 licensed") |
| impact-car.mp3 | `audio/impact.ogg` (Starter Kit Racing) | Kenney | CC0 | https://github.com/KenneyNL/Starter-Kit-Racing (README: sound effects CC0) |
| metal-heavy.mp3 | `impactMetal_heavy_000.ogg` (Impact Sounds 1.0) | Kenney | CC0 | https://kenney.nl/assets/impact-sounds |
| metal-heavy-2.mp3 | `impactMetal_heavy_002.ogg` | Kenney | CC0 | idem |
| metal-medium.mp3 | `impactMetal_medium_001.ogg` | Kenney | CC0 | idem |
| metal-light.mp3 | `impactMetal_light_000.ogg` | Kenney | CC0 | idem |
| metal-light-2.mp3 | `impactMetal_light_003.ogg` | Kenney | CC0 | idem |
| plate-heavy.mp3 | `impactPlate_heavy_000.ogg` | Kenney | CC0 | idem |
| plank.mp3 | `impactPlank_medium_000.ogg` | Kenney | CC0 | idem |
| tick.mp3 | `impactGeneric_light_000.ogg` | Kenney | CC0 | idem |
| glass-light.mp3 | `impactGlass_light_000.ogg` | Kenney | CC0 | idem |

Kenney "Impact Sounds" retrieved from the copy in
https://github.com/teknolog1k/Interdiction (`Audio/Kenney/Impact Sounds`);
licence text of the pack (Kenney, "Creative Commons Zero, CC0 — free to use in
personal, educational and commercial projects") as distributed in
https://github.com/Malay146/car-game (`public/audio/LICENSE-impact-sounds.txt`).

## Cards and interface — `ui/`

| File | Original | Author | Licence | Source |
|---|---|---|---|---|
| card-draw.mp3 | `cardSlide1.ogg` (Casino Audio) | Kenney | CC0 | https://kenney.nl/assets/casino-audio |
| card-play.mp3 | `cardPlace1.ogg` (Casino Audio) | Kenney | CC0 | idem |
| card-discard.mp3 | `cardShove1.ogg` (Casino Audio) | Kenney | CC0 | idem |
| click.mp3 | `click1.ogg` (UI Audio) | Kenney | CC0 | https://kenney.nl/assets/ui-audio |
| victory.mp3 | a jingle of the Music Jingles pack (named `race-win.ogg` in the car-game copy) | Kenney | CC0 | https://kenney.nl/assets/music-jingles |

Casino Audio and UI Audio retrieved from https://github.com/pigdevstudio/assets
(`sandbox/audio/cassino_sfx`, `sandbox/audio/ui_sfx`); Music Jingles from
https://github.com/Malay146/car-game (`public/audio/jingles`, with its
`LICENSE-music-jingles.txt`).

## Outdoors — `ambience/`

| File | Original | Author | Licence | Source |
|---|---|---|---|---|
| wind.mp3 | "wind1" | Luke.RUSTLTD | CC0 | https://opengameart.org/content/wind1 |
| birds.mp3 | "Park ambiences" (`park_ambience_birds.wav`, 30 s cut) | Thimras | CC0 | https://opengameart.org/content/park-ambiences |
| crickets.mp3 | "Crickets Ambient Noise - loopable" | Wolfgang_ | CC0 | https://opengameart.org/content/crickets-ambient-noise-loopable |

Retrieved from https://github.com/Malay146/car-game (`public/audio/sfx/wind-loop.mp3`,
`public/audio/ambience/birds.mp3`, `crickets.mp3`), whose credits list these
originals as CC0; that copy was already trimmed and loudness-normalised.

## Generated in the browser (no recording)

Tyre roll on asphalt, air rushing past at speed, the whoosh of a car going
past, and the air escaping from a punctured tyre are shaped noise, made live
with the Web Audio API (game/audio). The engine's gear changes, overrun,
misfires (out of fuel) and restart are the engine recordings above, re-pitched
and shaped live.
