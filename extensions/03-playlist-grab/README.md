<img src="icons/128.png" width="64" alt="">

# Playlist Grab

**Télécharge une playlist, un album ou une chaîne entière, avec choix des éléments.** · version 2.0.0 · catégorie : Vidéo & audio

## Nouveau dans la 2.0

- Tous les formats vidéo et audio pour toute la playlist
- Éléments à cocher directement dans la liste
- Qualités 4K et 360p, débit audio réglable
- Bouton ↻ pour relancer un téléchargement en erreur, messages d'erreur clairs
- Chaque tâche travaille dans son propre dossier : deux téléchargements de la même vidéo ne s'écrasent plus (« nom (2) »)

## Fonctionnalités

- Analyse de la liste avant téléchargement
- Vidéo ou audio MP3, qualité au choix
- Sélection élément par élément
- File d'attente limitée à 2 téléchargements simultanés

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/03-playlist-grab`).

Hôte local requis : Oui : nécessite l'hôte local (voir le README principal, « Hôte local »).

## Utilisation

Ouvre une playlist, clique sur « Analyser », coche les éléments voulus, puis lance le téléchargement.

## Permissions

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
