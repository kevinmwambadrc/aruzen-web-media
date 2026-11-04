<img src="icons/128.png" width="64" alt="">

# PDF Studio

**Enregistre une page en PDF A4 propre et récupère tous les PDF liés.** · version 1.0.0 · catégorie : Images & documents

## Fonctionnalités

- PDF A4 portrait ou paysage, sans publicités ni menus parasites
- Liste et téléchargement groupé des PDF liés à la page

## Installation

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **Mode développeur**.
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier (`extensions/05-pdf-studio`).

Hôte local requis : Non.

## Utilisation

Clique sur « Enregistrer la page en PDF », ou coche les PDF liés puis « Télécharger la sélection ».

## Permissions

| Permission | Pourquoi |
|---|---|
| `debugger` | Utilise la commande d'impression PDF de Chrome (protocole DevTools `Page.printToPDF`) sur l'onglet actif. Chrome affiche un bandeau pendant l'opération. |
| `downloads` | Enregistre les fichiers dans Téléchargements › Web Media. |
| `scripting` | Injecte un script d'analyse ou d'insertion dans la page, seulement à ta demande. |
| `activeTab` | Accède à l'onglet actif seulement quand tu cliques sur l'icône, un raccourci ou le menu. |
| `storage` | Garde tes réglages et ton historique dans le stockage local du navigateur. |
| `offscreen` | Ouvre un document invisible pour les traitements que le service worker ne peut pas faire (encodage, conversion, assemblage de fichiers). |

## Confidentialité

Tout reste sur ta machine : stockage local du navigateur et dossier Téléchargements › Web Media. Aucune statistique, aucune télémétrie, aucun serveur de l'auteur.

---
Fait partie d'[Aruzen Web Media](../../README.md) · Licence [PolyForm Noncommercial 1.0.0](../../LICENSE.md)
