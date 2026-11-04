<img src="icons/128.png" width="64" alt="">

# Vidéo Grab

**Télécharge la vidéo de la page en MP4, qualité au choix.** · version 1.0.0 · catégorie : Vidéo & audio

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

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
