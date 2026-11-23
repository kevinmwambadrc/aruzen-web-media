<img src="icons/128.png" width="64" alt="">

# Vidéo Grab

**Télécharge la vidéo de la page en MP4, qualité au choix.** · version 2.0.0 · catégorie : Vidéo & audio

## Nouveau dans la 2.0

- Choix du format : MP4, WEBM, MKV, MOV, AVI, GIF animé ou audio seul (MP3, M4A, AAC, OPUS, FLAC, WAV)
- Taille estimée pour chaque qualité, jusqu'à la 4K ; codec compatible (H.264) ou meilleure qualité (AV1/VP9)
- Extrait : seulement un passage, début et fin (⏱ reprend la position de lecture)
- Sous-titres intégrés à la vidéo
- Clic droit › « Télécharger en… » pour choisir le format sans ouvrir la fenêtre
- Bouton ↻ pour relancer un téléchargement en erreur, messages d'erreur clairs
- Chaque tâche travaille dans son propre dossier : deux téléchargements de la même vidéo ne s'écrasent plus (« nom (2) »)

## Fonctionnalités

- Choix de la qualité (meilleure, 1080p, 720p…) et du format (MP4, MKV)
- Clic droit sur la page ou sur un lien
- Raccourci ⌥⇧V
- Suivi des téléchargements dans la fenêtre

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/01-video-grab`).

Hôte local requis : Oui : nécessite l'hôte local (voir le README principal, « Hôte local »).

## Utilisation

Ouvre une page vidéo, clique sur l'icône, choisis la qualité, puis « Télécharger ».

Raccourcis : ⌥⇧V : Télécharger la vidéo de l'onglet

## Permissions

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `scripting` | Lit la position de lecture de la vidéo de l'onglet actif pour fixer le début ou la fin d'un extrait (bouton ⏱). |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
