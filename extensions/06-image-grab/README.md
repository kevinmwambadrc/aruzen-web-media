<img src="icons/128.png" width="64" alt="">

# Image Grab

**Affiche toutes les images d'une page et télécharge la sélection en un clic.** · version 2.0.0 · catégorie : Images & documents

## Nouveau dans la 2.0

- Filtre par type d'image (JPG, PNG, WEBP, GIF, SVG, AVIF…)
- Conversion à l'enregistrement en PNG, JPG ou WEBP, qualité réglable
- Copie des liens cochés

## Fonctionnalités

- Images, fonds CSS et versions haute résolution (srcset)
- Filtre par taille minimale
- Téléchargement groupé

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/06-image-grab`).

Hôte local requis : Non.

## Utilisation

Clique sur l'icône, filtre par taille, coche, puis « Télécharger la sélection ».

## Permissions

| Permission | Pourquoi |
|---|---|
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `<all_urls>` | Relit les images que tu as cochées pour les convertir en PNG, JPG ou WEBP. Rien n'est lu sans ton clic. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
