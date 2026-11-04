<img src="icons/128.png" width="64" alt="">

# Widget vidéo

**Ajoute des boutons « Vidéo » et « MP3 » au survol de chaque vidéo.** · version 1.0.0 · catégorie : Vidéo & audio

## Fonctionnalités

- Boutons au survol, y compris dans les lecteurs intégrés
- Liste de tous les téléchargements
- Réglages de performance (téléchargements simultanés, qualité)

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/10-video-widget`).

Hôte local requis : Oui : nécessite l'hôte local (voir le README principal, « Hôte local »).

## Utilisation

Survole une vidéo et clique sur « Vidéo » ou « MP3 ». La fenêtre de l'extension regroupe tous les téléchargements.

## Permissions

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `content_scripts` | Un petit script vérifie la page toutes les 2,5 s, seulement quand l'onglet est visible, pour placer les boutons sur les vidéos. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
