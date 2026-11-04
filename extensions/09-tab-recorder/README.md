<img src="icons/128.png" width="64" alt="">

# Enregistreur d'onglet

**Enregistre l'image et le son d'un onglet en MP4.** · version 1.0.0 · catégorie : Vidéo & audio

## Fonctionnalités

- Trois niveaux de qualité
- Encodage matériel H.264, peu gourmand
- Idéal pour un live, un cours ou une réunion web

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/09-tab-recorder`).

Hôte local requis : Non.

## Utilisation

Sur l'onglet à capturer, clique sur « Démarrer l'enregistrement », puis à nouveau pour arrêter.

## Permissions

| Permission | Pourquoi |
|---|---|
| `tabCapture` | Capture l'image et le son de l'onglet que tu choisis d'enregistrer. |
| `offscreen` | Ouvre un document invisible pour les traitements que le service worker ne peut pas faire (encodage, conversion, assemblage de fichiers). |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
