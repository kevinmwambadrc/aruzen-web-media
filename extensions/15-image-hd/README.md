<img src="icons/128.png" width="64" alt="">

# Image HD

**Retrouve l'original haute définition des images, même quand le site n'affiche qu'une miniature.** · version 1.0.0 · catégorie : Images & documents

## Fonctionnalités

- Analyse des srcset, attributs cachés, liens plein écran, fonds, métadonnées et code de la page
- Règles pour les plateformes d'images courantes et les paramètres de taille (w=, width=, resize=…)
- Chaque version HD est vérifiée par un vrai chargement, avec le gain affiché (« HD ×4.2 »)
- Clic droit › « Télécharger cette image en HD »

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/15-image-hd`).

Hôte local requis : Non.

## Utilisation

Clique sur l'icône : la page de résultats liste les images et leur meilleure version. Coche puis « Télécharger ».

## Permissions

| Permission | Pourquoi |
|---|---|
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `<all_urls>` | Vérifie l'existence des versions HD sur les serveurs d'images du site consulté. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
