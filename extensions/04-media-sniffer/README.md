<img src="icons/128.png" width="64" alt="">

# Media Sniffer

**Repère les fichiers vidéo et audio réellement chargés par la page (MP4, MP3, HLS, DASH).** · version 1.0.0 · catégorie : Vidéo & audio

## Fonctionnalités

- Détection en direct des flux lus par la page
- Téléchargement direct ou via yt-dlp pour les flux segmentés
- Badge avec le nombre de médias trouvés

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/04-media-sniffer`).

Hôte local requis : Oui : nécessite l'hôte local (voir le README principal, « Hôte local »).

## Utilisation

Lance la lecture du média, ouvre l'extension : les flux détectés apparaissent dans « Flux en cours ».

## Permissions

| Permission | Pourquoi |
|---|---|
| `nativeMessaging` | Parle à l'hôte local `host/media_helper.py` (yt-dlp + ffmpeg sur ta machine). Aucun serveur distant. |
| `webRequest` | Observe sans les modifier les requêtes de la page pour repérer les fichiers MP4, MP3, m3u8 et DASH. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `<all_urls>` | Nécessaire pour que `webRequest` voie les requêtes de médias sur le site que tu consultes. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
