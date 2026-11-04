<img src="icons/128.png" width="64" alt="">

# Retouche

**Gomme intelligente : peins une zone et l'image se reconstitue d'après son contenu, en local.** · version 1.0.0 · catégorie : Images & documents

## Fonctionnalités

- Pinceau (B), rectangle (R), gomme du masque (E)
- Reconstruction PatchMatch calculée dans le navigateur, rien n'est envoyé en ligne
- Annulation ⌘Z, comparaison avec l'original (touche A)

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/16-retouche`).

Hôte local requis : Non.

## Utilisation

Clic droit sur une image › « Retoucher cette image », ou glisse une image dans l'atelier. À utiliser sur tes propres images ou celles dont tu as les droits.

## Permissions

| Permission | Pourquoi |
|---|---|
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `contextMenus` | Ajoute ses entrées au clic droit. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `<all_urls>` | Charge l'image choisie au clic droit depuis son serveur d'origine. |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
