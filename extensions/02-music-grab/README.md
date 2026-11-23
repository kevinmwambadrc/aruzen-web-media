<img src="icons/128.png" width="64" alt="">

# Music Grab

**Extrait l'audio d'une page en MP3, M4A, Opus, FLAC ou WAV, avec pochette et tags.** · version 2.0.0 · catégorie : Vidéo & audio

## Nouveau dans la 2.0

- Nouveau format AAC, en plus de MP3, M4A, OPUS, FLAC et WAV
- Débit au choix : meilleur, 320, 192 ou 128 kb/s
- Extrait : seulement un passage
- Pochette intégrée aussi en FLAC et OPUS
- Bouton ↻ pour relancer un téléchargement en erreur, messages d'erreur clairs
- Chaque tâche travaille dans son propre dossier : deux téléchargements de la même vidéo ne s'écrasent plus (« nom (2) »)

## Fonctionnalités

- MP3 universel, M4A sans réencodage, Opus, FLAC ou WAV
- Pochette et métadonnées intégrées
- Clic droit et raccourci ⌥⇧M

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/02-music-grab`).

Hôte local requis : Oui : nécessite l'hôte local (voir le README principal, « Hôte local »).

## Utilisation

Sur une page qui lit du son, clique sur l'icône, choisis le format, puis « Extraire ».

Raccourcis : ⌥⇧M : Télécharger la musique de l'onglet

## Permissions

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `scripting` | Lit la position de lecture de l'onglet actif pour fixer le début ou la fin d'un extrait (bouton ⏱). |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
