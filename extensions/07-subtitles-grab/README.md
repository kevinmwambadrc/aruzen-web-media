<img src="icons/128.png" width="64" alt="">

# Sous-titres & Miniatures

**Télécharge les sous-titres d'une vidéo en SRT, et sa miniature HD.** · version 1.0.0 · catégorie : Vidéo & audio

## Fonctionnalités

- Toutes les langues disponibles, y compris les sous-titres automatiques
- Conversion en SRT
- Miniature en haute définition

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/07-subtitles-grab`).

Hôte local requis : Oui : nécessite l'hôte local (voir le README principal, « Hôte local »).

## Utilisation

Sur une page vidéo, choisis la langue puis « Télécharger les sous-titres (.srt) ».

## Permissions

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
